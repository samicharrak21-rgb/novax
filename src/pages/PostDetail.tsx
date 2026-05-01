import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchFeed, toggleLike, toggleSave, deletePost, type FeedPost } from "@/lib/feed";
import PostCard from "@/components/PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";

async function fetchPost(id: string, currentUserId: string): Promise<FeedPost | null> {
  const all = await fetchFeed(currentUserId);
  return all.find((p) => p.id === id) ?? null;
}

async function fetchComments(postId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select("id,content,created_at,user_id,author:profiles!comments_user_id_fkey(username,display_name,avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export default function PostDetail() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const postQ = useQuery({
    queryKey: ["post", id, user?.id],
    queryFn: () => fetchPost(id, user!.id),
    enabled: !!user && !!id,
  });

  const commentsQ = useQuery({
    queryKey: ["comments", id],
    queryFn: () => fetchComments(id),
    enabled: !!id,
  });

  const post = postQ.data;
  if (postQ.isLoading) return <p className="text-center py-10 text-muted-foreground">…</p>;
  if (!post) return <p className="text-center py-10 text-muted-foreground">لم يُعثر على المنشور</p>;

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user) return;
    const content = text.trim();
    setText("");
    try {
      const { error } = await supabase.from("comments").insert({ post_id: id, user_id: user.id, content });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["comments", id] });
      qc.invalidateQueries({ queryKey: ["post", id] });
    } catch (e: any) { toast.error(e?.message || "تعذّر التعليق"); setText(content); }
  }

  return (
    <div>
      <PostCard
        post={post}
        isOwn={user?.id === post.user_id}
        onLike={async () => { await toggleLike(post.id, user!.id, !post.liked); qc.invalidateQueries({ queryKey: ["post", id] }); }}
        onSave={async () => { await toggleSave(post.id, user!.id, !post.saved); qc.invalidateQueries({ queryKey: ["post", id] }); }}
        onComment={() => {}}
        onDelete={async () => { if (!confirm("حذف؟")) return; await deletePost(post.id); navigate(-1); }}
      />

      <div className="px-3 py-2 space-y-3">
        <h2 className="text-sm font-bold">التعليقات</h2>
        {commentsQ.data?.length === 0 && <p className="text-xs text-muted-foreground">لا تعليقات بعد</p>}
        {commentsQ.data?.map((c: any) => (
          <div key={c.id} className="flex gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={c.author?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs gradient-brand text-primary-foreground">{(c.author?.username || "?")[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-xs"><b>{c.author?.display_name || c.author?.username}</b> <span className="text-muted-foreground">· {timeAgo(c.created_at)}</span></div>
              <div className="text-sm whitespace-pre-wrap">{c.content}</div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={addComment} className="sticky bottom-16 bg-background border-t border-border p-2 flex gap-2 max-w-2xl mx-auto">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب تعليقًا…" className="rounded-full" />
        <Button type="submit" disabled={!text.trim()} className="rounded-full">إرسال</Button>
      </form>
    </div>
  );
}
