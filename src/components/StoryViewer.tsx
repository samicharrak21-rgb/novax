import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Heart, Send, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type StoryItem = {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string | null;
  created_at?: string;
  author?: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

type Viewer = {
  viewer_id: string;
  created_at: string;
  liked: boolean;
  profile: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

const DURATION_MS = 5000;

export default function StoryViewer({
  stories,
  startIndex = 0,
  onClose,
}: {
  stories: StoryItem[];
  startIndex?: number;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const pausedRef = useRef(false);

  const story = stories[index];
  const isOwner = user?.id === story?.user_id;

  // Register view + load like state when story changes
  useEffect(() => {
    if (!story || !user) return;
    setLiked(false);
    setReply("");
    // Record view (idempotent: PK = story_id+viewer_id)
    supabase.from("story_views").insert({ story_id: story.id, viewer_id: user.id }).then(() => {});
    // Check if I liked this story
    supabase
      .from("story_likes")
      .select("story_id")
      .eq("story_id", story.id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [story?.id, user?.id]);

  // Animation loop
  useEffect(() => {
    setProgress(0);
    startRef.current = performance.now();
    function tick(now: number) {
      if (!pausedRef.current) {
        const elapsed = now - startRef.current;
        const p = Math.min(1, elapsed / DURATION_MS);
        setProgress(p);
        if (p >= 1) {
          if (index < stories.length - 1) setIndex((i) => i + 1);
          else onClose();
          return;
        }
      } else {
        startRef.current = now - progress * DURATION_MS;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }
  function next() {
    if (index >= stories.length - 1) onClose();
    else setIndex((i) => i + 1);
  }

  async function toggleLike() {
    if (!user || !story) return;
    const newLiked = !liked;
    setLiked(newLiked);
    try {
      if (newLiked) {
        await supabase.from("story_likes").insert({ story_id: story.id, user_id: user.id });
      } else {
        await supabase
          .from("story_likes")
          .delete()
          .eq("story_id", story.id)
          .eq("user_id", user.id);
      }
    } catch {
      setLiked(!newLiked);
      toast.error("تعذّر التحديث");
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !story || !reply.trim() || sending || isOwner) return;
    setSending(true);
    try {
      const { error } = await supabase.from("story_messages").insert({
        story_id: story.id,
        sender_id: user.id,
        content: reply.trim(),
      });
      if (error) throw error;
      setReply("");
      toast.success("تم إرسال الرسالة");
    } catch (e: any) {
      toast.error(e?.message || "تعذّر الإرسال");
    } finally {
      setSending(false);
    }
  }

  async function openViewers() {
    if (!story || !isOwner) return;
    pausedRef.current = true;
    setViewersOpen(true);
    setLoadingViewers(true);
    try {
      const [{ data: views }, { data: likes }] = await Promise.all([
        supabase
          .from("story_views")
          .select("viewer_id, created_at")
          .eq("story_id", story.id)
          .order("created_at", { ascending: false }),
        supabase.from("story_likes").select("user_id").eq("story_id", story.id),
      ]);
      const ids = (views ?? []).map((v) => v.viewer_id);
      const likedSet = new Set((likes ?? []).map((l) => l.user_id));
      let profiles: any[] = [];
      if (ids.length) {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", ids);
        profiles = data ?? [];
      }
      const pmap = new Map(profiles.map((p) => [p.id, p]));
      setViewers(
        (views ?? []).map((v) => ({
          viewer_id: v.viewer_id,
          created_at: v.created_at,
          liked: likedSet.has(v.viewer_id),
          profile: pmap.get(v.viewer_id) ?? null,
        })),
      );
    } catch {
      toast.error("تعذّر تحميل المشاهدين");
    } finally {
      setLoadingViewers(false);
    }
  }

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none">
      {/* Progress bars */}
      <div className="absolute top-2 inset-x-2 flex gap-1 z-20">
        {stories.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-[width] ease-linear"
              style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-5 inset-x-3 flex items-center gap-2 z-20">
        <Avatar className="h-8 w-8 border border-white/30">
          <AvatarImage src={story.author?.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs gradient-brand text-white">
            {(story.author?.username || "?")[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-white text-sm">
          <div className="font-bold leading-tight">
            {story.author?.display_name || story.author?.username}
          </div>
          {story.created_at && (
            <div className="text-[11px] text-white/70 leading-tight">{timeAgo(story.created_at)}</div>
          )}
        </div>
        <button onClick={onClose} aria-label="close" className="ms-auto p-2 text-white">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Pause zone (image area) */}
      <div
        className="absolute inset-0 z-0"
        onMouseDown={() => (pausedRef.current = true)}
        onMouseUp={() => (pausedRef.current = false)}
        onTouchStart={() => (pausedRef.current = true)}
        onTouchEnd={() => (pausedRef.current = false)}
      />

      {/* Image */}
      <img
        src={story.image_url}
        alt=""
        className="max-h-full max-w-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* Caption */}
      {story.caption && (
        <div className="absolute bottom-24 inset-x-4 text-center text-white text-sm bg-black/40 backdrop-blur-sm rounded-2xl px-3 py-2 z-10">
          {story.caption}
        </div>
      )}

      {/* Tap zones */}
      <button
        onClick={prev}
        className="absolute inset-y-16 left-0 w-1/4 z-10 flex items-center justify-start pl-1 text-white/0 hover:text-white/30"
        aria-label="previous"
      >
        <ChevronLeft className="h-7 w-7" />
      </button>
      <button
        onClick={next}
        className="absolute inset-y-16 right-0 w-1/4 z-10 flex items-center justify-end pr-1 text-white/0 hover:text-white/30"
        aria-label="next"
      >
        <ChevronRight className="h-7 w-7" />
      </button>

      {/* Bottom action bar */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-3 bg-gradient-to-t from-black/70 to-transparent">
        {isOwner ? (
          <button
            onClick={openViewers}
            className="flex items-center gap-2 text-white/90 text-sm bg-white/10 backdrop-blur rounded-full px-4 py-2 mx-auto"
          >
            <Eye className="h-4 w-4" />
            <span>المشاهدون</span>
          </button>
        ) : (
          <form onSubmit={sendReply} className="flex items-center gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onFocus={() => (pausedRef.current = true)}
              onBlur={() => (pausedRef.current = false)}
              placeholder="أرسل رسالة…"
              className="flex-1 bg-transparent border border-white/40 rounded-full px-4 py-2 text-white placeholder-white/60 text-sm focus:outline-none focus:border-white"
            />
            <button
              type="button"
              onClick={toggleLike}
              aria-label="إعجاب"
              className="p-2 text-white"
            >
              <Heart
                className={`h-7 w-7 transition-transform active:scale-125 ${
                  liked ? "fill-ig-red text-ig-red" : ""
                }`}
              />
            </button>
            {reply.trim() && (
              <button
                type="submit"
                disabled={sending}
                aria-label="إرسال"
                className="p-2 text-white disabled:opacity-50"
              >
                <Send className="h-6 w-6" />
              </button>
            )}
          </form>
        )}
      </div>

      {/* Viewers sheet */}
      <Sheet
        open={viewersOpen}
        onOpenChange={(o) => {
          setViewersOpen(o);
          pausedRef.current = o;
        }}
      >
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-right">
              المشاهدون ({viewers.length})
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {loadingViewers && (
              <p className="text-center text-muted-foreground py-6">جاري التحميل…</p>
            )}
            {!loadingViewers && viewers.length === 0 && (
              <p className="text-center text-muted-foreground py-6">لا يوجد مشاهدون بعد</p>
            )}
            {viewers.map((v) => (
              <div key={v.viewer_id} className="flex items-center gap-3 py-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={v.profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="gradient-brand text-primary-foreground text-xs">
                    {(v.profile?.username || "؟")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">
                    {v.profile?.display_name || v.profile?.username}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    @{v.profile?.username} · {timeAgo(v.created_at)}
                  </div>
                </div>
                {v.liked && <Heart className="h-5 w-5 fill-ig-red text-ig-red" />}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
