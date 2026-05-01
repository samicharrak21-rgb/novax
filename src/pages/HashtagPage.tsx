import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchFeed, type FeedPost, toggleLike, toggleSave, deletePost } from "@/lib/feed";
import PostCard from "@/components/PostCard";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Hash } from "lucide-react";

export default function HashtagPage() {
  const { tag = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["hashtag", tag, user?.id],
    queryFn: () => fetchFeed(user!.id, { hashtag: tag }),
    enabled: !!user && !!tag,
  });

  function patch(id: string, fn: (p: FeedPost) => FeedPost) {
    qc.setQueryData<FeedPost[]>(["hashtag", tag, user?.id], (old) => old?.map((p) => (p.id === id ? fn(p) : p)));
  }

  async function onLike(p: FeedPost) {
    if (!user) return;
    const next = !p.liked;
    patch(p.id, (x) => ({ ...x, liked: next, like_count: x.like_count + (next ? 1 : -1) }));
    try { await toggleLike(p.id, user.id, next); }
    catch { patch(p.id, (x) => ({ ...x, liked: !next, like_count: x.like_count + (next ? -1 : 1) })); }
  }
  async function onSave(p: FeedPost) {
    if (!user) return;
    const next = !p.saved;
    patch(p.id, (x) => ({ ...x, saved: next }));
    try { await toggleSave(p.id, user.id, next); }
    catch { patch(p.id, (x) => ({ ...x, saved: !next })); }
  }
  async function onDelete(p: FeedPost) {
    if (!confirm("حذف؟")) return;
    try {
      await deletePost(p.id);
      qc.setQueryData<FeedPost[]>(["hashtag", tag, user?.id], (old) => old?.filter((x) => x.id !== p.id));
      toast.success("تم الحذف");
    } catch (e: any) { toast.error(e?.message || "تعذّر الحذف"); }
  }

  const posts = q.data ?? [];

  return (
    <div>
      <div className="sticky top-0 z-30 glass border-b border-border flex items-center gap-3 px-3 h-14">
        <button onClick={() => navigate(-1)} aria-label="رجوع"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <div className="font-bold flex items-center gap-1"><Hash className="h-4 w-4" />{tag}</div>
          <div className="text-xs text-muted-foreground">{posts.length} منشور</div>
        </div>
      </div>

      {q.isLoading && <p className="text-center py-10 text-muted-foreground">جاري التحميل…</p>}
      {!q.isLoading && posts.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">لا توجد منشورات بهذا الهاشتاق</div>
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
    </div>
  );
}
