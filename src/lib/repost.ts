import { supabase } from "@/integrations/supabase/client";

export async function repost(originalPostId: string, currentUserId: string, originalAuthorId: string) {
  const { error } = await supabase.from("posts").insert({
    user_id: currentUserId,
    post_type: "repost",
    parent_post_id: originalPostId,
    caption: null,
  });
  if (error) throw error;
  if (originalAuthorId !== currentUserId) {
    await supabase.from("notifications").insert({
      user_id: originalAuthorId,
      actor_id: currentUserId,
      type: "repost",
      post_id: originalPostId,
    });
  }
}

export async function quotePost(
  originalPostId: string,
  currentUserId: string,
  originalAuthorId: string,
  caption: string,
) {
  const hashtags = extractHashtags(caption);
  const { error } = await supabase.from("posts").insert({
    user_id: currentUserId,
    post_type: "quote",
    parent_post_id: originalPostId,
    caption,
    hashtags,
  });
  if (error) throw error;
  if (originalAuthorId !== currentUserId) {
    await supabase.from("notifications").insert({
      user_id: originalAuthorId,
      actor_id: currentUserId,
      type: "quote",
      post_id: originalPostId,
      comment_text: caption.slice(0, 200),
    });
  }
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  return Array.from(new Set(matches.map((h) => h.slice(1).toLowerCase())));
}

export async function recordView(postId: string, userId: string) {
  // ignore failures (duplicate inserts are fine)
  await supabase.from("post_views").insert({ post_id: postId, user_id: userId });
}
