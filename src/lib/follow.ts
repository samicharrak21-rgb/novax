import { supabase } from "@/integrations/supabase/client";

export async function followUser(currentUserId: string, targetId: string) {
  if (currentUserId === targetId) throw new Error("لا يمكن متابعة نفسك");
  const { error } = await supabase
    .from("followers")
    .insert({ follower_id: currentUserId, following_id: targetId });
  if (error && !error.message.includes("duplicate")) throw error;
  // create notification
  await supabase.from("notifications").insert({
    user_id: targetId,
    actor_id: currentUserId,
    type: "follow",
  });
}

export async function unfollowUser(currentUserId: string, targetId: string) {
  const { error } = await supabase
    .from("followers")
    .delete()
    .eq("follower_id", currentUserId)
    .eq("following_id", targetId);
  if (error) throw error;
}

export async function isFollowing(currentUserId: string, targetId: string): Promise<boolean> {
  const { data } = await supabase
    .from("followers")
    .select("follower_id")
    .eq("follower_id", currentUserId)
    .eq("following_id", targetId)
    .maybeSingle();
  return !!data;
}

export async function getFollowCounts(userId: string) {
  const [followers, following] = await Promise.all([
    supabase.from("followers").select("follower_id", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("followers").select("following_id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  };
}
