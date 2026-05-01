import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { fetchFeed, toggleLike, toggleSave, deletePost, type FeedPost } from "@/lib/feed";
import PostCard from "@/components/PostCard";
import { toast } from "sonner";

export default function Reels() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const q = useQuery({
    queryKey: ["reels", user?.id],
    queryFn: () => fetchFeed(user!.id, { reels: true }),
    enabled: !!user,
  });
  const reels = q.data ?? [];

  function patch(id: string, fn: (p: FeedPost) => FeedPost) {
    qc.setQueryData<FeedPost[]>(["reels", user?.id], (old) =>
      old?.map((p) => (p.id === id ? fn(p) : p)),
    );
  }

  async function onLike(p: FeedPost) {
    if (!user) return;
    const next = !p.liked;
    patch(p.id, (x) => ({ ...x, liked: next, like_count: x.like_count + (next ? 1 : -1) }));
    try {
      await toggleLike(p.id, user.id, next);
    } catch {
      patch(p.id, (x) => ({ ...x, liked: !next, like_count: x.like_count + (next ? -1 : 1) }));
      toast.error("تعذّر التحديث");
    }
  }

  async function onSave(p: FeedPost) {
    if (!user) return;
    const next = !p.saved;
    patch(p.id, (x) => ({ ...x, saved: next }));
    try {
      await toggleSave(p.id, user.id, next);
      if (next) toast.success("تم الحفظ");
    } catch {
      patch(p.id, (x) => ({ ...x, saved: !next }));
      toast.error("تعذّر الحفظ");
    }
  }

  async function onDelete(p: FeedPost) {
    if (!confirm("حذف هذا الريل؟")) return;
    try {
      await deletePost(p.id);
      qc.setQueryData<FeedPost[]>(["reels", user?.id], (old) => old?.filter((x) => x.id !== p.id));
      toast.success("تم الحذف");
    } catch (e: any) {
      toast.error(e?.message || "تعذّر الحذف");
    }
  }

  // Autoplay the most-visible reel video
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const videos = Array.from(root.querySelectorAll("video"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const v = entry.target as HTMLVideoElement;
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            v.muted = true;
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: [0, 0.6, 1] },
    );
    videos.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [reels]);

  return (
    <div ref={containerRef}>
      <h1 className="text-xl font-black p-4">ريلز</h1>
      {q.isLoading && <p className="text-center py-10 text-muted-foreground">جاري التحميل…</p>}
      {!q.isLoading && reels.length === 0 && (
        <p className="text-center py-10 text-muted-foreground">لا يوجد ريلز بعد</p>
      )}
      {reels.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          isOwn={user?.id === p.user_id}
          autoPlay
          onLike={() => onLike(p)}
          onSave={() => onSave(p)}
          onComment={() => navigate(`/p/${p.id}`)}
          onDelete={() => onDelete(p)}
        />
      ))}
    </div>
  );
}
