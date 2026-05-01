import { supabase } from "@/integrations/supabase/client";

export type AuthorMini = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  verified: boolean;
  badge?: string | null;
};

export type ParentPost = {
  id: string;
  user_id: string;
  caption: string | null;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  author: AuthorMini | null;
};

export type FeedPost = {
  id: string;
  user_id: string;
  caption: string | null;
  image_url: string | null;
  video_url: string | null;
  is_reel: boolean;
  created_at: string;
  author: AuthorMini | null;
  like_count: number;
  comment_count: number;
  liked: boolean;
  saved: boolean;
  // X-style extensions
  post_type: "post" | "repost" | "quote";
  parent_post_id: string | null;
  hashtags: string[] | null;
  views_count: number;
  repost_count: number;
  reposted: boolean;
  parent_post: ParentPost | null;
};

type RawPost = {
  id: string; user_id: string; caption: string | null; image_url: string | null;
  video_url: string | null; is_reel: boolean; created_at: string;
  post_type: string | null; parent_post_id: string | null;
  hashtags: string[] | null; views_count: number | null;
  author: AuthorMini | null;
};

export async function fetchFeed(
  currentUserId: string,
  opts: { reels?: boolean; userId?: string; following?: boolean; hashtag?: string; before?: string } = {},
): Promise<FeedPost[]> {
  let query = supabase
    .from("posts")
    .select(
      "id,user_id,caption,image_url,video_url,is_reel,created_at,post_type,parent_post_id,hashtags,views_count,author:profiles!posts_user_id_fkey(id,username,display_name,avatar_url,verified)",
    )
    .order("created_at", { ascending: false })
    .limit(15);

  if (opts.reels !== undefined) query = query.eq("is_reel", opts.reels);
  if (opts.userId) query = query.eq("user_id", opts.userId);
  if (opts.hashtag) query = query.contains("hashtags", [opts.hashtag.toLowerCase()]);
  if (opts.before) query = query.lt("created_at", opts.before);

  if (opts.following) {
    const { data: follows } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", currentUserId);
    const ids = (follows ?? []).map((f: any) => f.following_id);
    ids.push(currentUserId);
    query = query.in("user_id", ids);
  }

  const { data, error } = await query;
  if (error) throw error;
  const posts = (data ?? []) as unknown as RawPost[];
  if (posts.length === 0) return [];

  const ids = posts.map((p) => p.id);
  const parentIds = posts
    .map((p) => p.parent_post_id)
    .filter((x): x is string => !!x);

  const [likesAgg, commentsAgg, repostsAgg, myLikes, mySaves, myReposts, parentsRes] =
    await Promise.all([
      supabase.from("likes").select("post_id").in("post_id", ids),
      supabase.from("comments").select("post_id").in("post_id", ids),
      supabase.from("posts").select("parent_post_id").in("parent_post_id", ids).eq("post_type", "repost"),
      supabase.from("likes").select("post_id").in("post_id", ids).eq("user_id", currentUserId),
      supabase.from("saved_posts").select("post_id").in("post_id", ids).eq("user_id", currentUserId),
      supabase
        .from("posts")
        .select("parent_post_id")
        .in("parent_post_id", ids)
        .eq("post_type", "repost")
        .eq("user_id", currentUserId),
      parentIds.length
        ? supabase
            .from("posts")
            .select(
              "id,user_id,caption,image_url,video_url,created_at,author:profiles!posts_user_id_fkey(id,username,display_name,avatar_url,verified)",
            )
            .in("id", parentIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

  const likeCount = new Map<string, number>();
  (likesAgg.data ?? []).forEach((r: any) => likeCount.set(r.post_id, (likeCount.get(r.post_id) ?? 0) + 1));
  const commentCount = new Map<string, number>();
  (commentsAgg.data ?? []).forEach((r: any) => commentCount.set(r.post_id, (commentCount.get(r.post_id) ?? 0) + 1));
  const repostCount = new Map<string, number>();
  (repostsAgg.data ?? []).forEach((r: any) => repostCount.set(r.parent_post_id, (repostCount.get(r.parent_post_id) ?? 0) + 1));
  const liked = new Set((myLikes.data ?? []).map((r: any) => r.post_id));
  const saved = new Set((mySaves.data ?? []).map((r: any) => r.post_id));
  const reposted = new Set((myReposts.data ?? []).map((r: any) => r.parent_post_id));
  const parentMap = new Map<string, ParentPost>();
  ((parentsRes.data ?? []) as any[]).forEach((p) => parentMap.set(p.id, p as ParentPost));

  return posts.map((p) => ({
    id: p.id,
    user_id: p.user_id,
    caption: p.caption,
    image_url: p.image_url,
    video_url: p.video_url,
    is_reel: p.is_reel,
    created_at: p.created_at,
    author: p.author,
    like_count: likeCount.get(p.id) ?? 0,
    comment_count: commentCount.get(p.id) ?? 0,
    liked: liked.has(p.id),
    saved: saved.has(p.id),
    post_type: ((p.post_type as any) ?? "post") as "post" | "repost" | "quote",
    parent_post_id: p.parent_post_id,
    hashtags: p.hashtags,
    views_count: p.views_count ?? 0,
    repost_count: repostCount.get(p.id) ?? 0,
    reposted: reposted.has(p.id),
    parent_post: p.parent_post_id ? parentMap.get(p.parent_post_id) ?? null : null,
  }));
}

export async function toggleLike(postId: string, userId: string, like: boolean) {
  if (like) {
    await supabase.from("likes").insert({ post_id: postId, user_id: userId });
  } else {
    await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
  }
}

export async function toggleSave(postId: string, userId: string, save: boolean) {
  if (save) {
    await supabase.from("saved_posts").insert({ post_id: postId, user_id: userId });
  } else {
    await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", userId);
  }
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}
