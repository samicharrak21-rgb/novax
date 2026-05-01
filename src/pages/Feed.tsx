import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchFeed, toggleLike, toggleSave, deletePost, type FeedPost } from "@/lib/feed";
import PostCard from "@/components/PostCard";
import StoryViewer, { type StoryItem } from "@/components/StoryViewer";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";

async function fetchStories(): Promise<StoryItem[]> {
  const { data: rows, error } = await supabase
    .from("stories")
    .select("id, user_id, image_url, caption, created_at")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(30);
  if (error || !rows?.length) return [];
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);
  const map = new Map((profs ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({
    ...r,
    author: (map.get(r.user_id) as any) ?? null,
  }));
}

export default function Feed() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const [tab, setTab] = useState<"forYou" | "following">("forYou");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const feedQ = useQuery({
    queryKey: ["feed", tab, user?.id],
    queryFn: () => fetchFeed(user!.id, { reels: false, following: tab === "following" }),
    enabled: !!user,
  });

  const storiesQ = useQuery({ queryKey: ["stories"], queryFn: fetchStories });
  const stories = storiesQ.data ?? [];

  const posts = feedQ.data ?? [];

  function patch(id: string, fn: (p: FeedPost) => FeedPost) {
    qc.setQueryData<FeedPost[]>(["feed", tab, user?.id], (old) => old?.map((p) => (p.id === id ? fn(p) : p)));
  }

  async function onLike(p: FeedPost) {
    if (!user) return;
    const next = !p.liked;
    patch(p.id, (x) => ({ ...x, liked: next, like_count: x.like_count + (next ? 1 : -1) }));
    try { await toggleLike(p.id, user.id, next); }
    catch { patch(p.id, (x) => ({ ...x, liked: !next, like_count: x.like_count + (next ? -1 : 1) })); toast.error("تعذّر التحديث"); }
  }

  async function onSave(p: FeedPost) {
    if (!user) return;
    const next = !p.saved;
    patch(p.id, (x) => ({ ...x, saved: next }));
    try { await toggleSave(p.id, user.id, next); if (next) toast.success("تم الحفظ"); }
    catch { patch(p.id, (x) => ({ ...x, saved: !next })); toast.error("تعذّر الحفظ"); }
  }

  async function onDelete(p: FeedPost) {
    if (!confirm("حذف هذا المنشور؟")) return;
    try {
      await deletePost(p.id);
      qc.setQueryData<FeedPost[]>(["feed", tab, user?.id], (old) => old?.filter((x) => x.id !== p.id));
      toast.success("تم الحذف");
    } catch (e: any) { toast.error(e?.message || "تعذّر الحذف"); }
  }

  return (
    <div>
      <div className="sticky top-14 lg:top-0 z-30 glass border-b border-border flex items-center">
        {(["forYou", "following"] as const).map((tk) => {
          const active = tab === tk;
          return (
            <button
              key={tk}
              onClick={() => setTab(tk)}
              className={`flex-1 py-3.5 text-sm font-bold relative ${active ? "text-foreground" : "text-muted-foreground"}`}
            >
              {tk === "forYou" ? t("for_you") : t("following")}
              {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-3 py-3 border-b border-border">
        <Link to="/story/new" className="flex flex-col items-center gap-1 shrink-0 w-16">
          <div className="relative">
            <Avatar className="h-14 w-14 border border-border">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="gradient-brand text-primary-foreground">
                {(profile?.username || "؟")[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -end-1 bg-primary rounded-full p-0.5 border-2 border-background">
              <Plus className="h-3.5 w-3.5 text-primary-foreground" />
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground truncate w-full text-center">{t("add_story")}</span>
        </Link>
        {stories.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setViewerIndex(i)}
            className="flex flex-col items-center gap-1 shrink-0 w-16"
          >
            <div className="story-ring">
              <div className="bg-background rounded-full p-0.5">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={s.author?.avatar_url ?? s.image_url} />
                  <AvatarFallback className="gradient-brand text-primary-foreground text-xs">
                    {(s.author?.username || "؟")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <span className="text-[10px] truncate w-full text-center">{s.author?.username}</span>
          </button>
        ))}
      </div>

      {feedQ.isLoading && <p className="text-center py-10 text-muted-foreground">{t("loading")}</p>}
      {feedQ.isError && <p className="text-center py-10 text-destructive">!</p>}
      {!feedQ.isLoading && posts.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="mb-3">{t("no_posts")}</p>
          <button onClick={() => navigate("/create")} className="text-primary font-semibold">{t("publish_first")}</button>
        </div>
      )}
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          isOwn={user?.id === p.user_id}
          onLike={() => onLike(p)}
          onSave={() => onSave(p)}
          onComment={() => navigate(`/p/${p.id}`)}
          onDelete={() => onDelete(p)}
        />
      ))}

      {viewerIndex !== null && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}
