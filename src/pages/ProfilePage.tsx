import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { fetchFeed } from "@/lib/feed";
import { Grid3x3, LogOut, MessageCircle } from "lucide-react";
import UserBadge from "@/components/UserBadge";
import { toast } from "sonner";
import { useState, useEffect } from "react";

async function loadProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadStats(userId: string) {
  const [posts, followers, following] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("followers").select("follower_id", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("followers").select("following_id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { posts: posts.count ?? 0, followers: followers.count ?? 0, following: following.count ?? 0 };
}

export default function ProfilePage() {
  const { username = "" } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [following, setFollowing] = useState(false);

  const profileQ = useQuery({
    queryKey: ["profile", username],
    queryFn: () => loadProfileByUsername(username),
    enabled: !!username,
  });

  const profile = profileQ.data;
  const isMe = !!profile && profile.id === user?.id;

  const statsQ = useQuery({
    queryKey: ["profile-stats", profile?.id],
    queryFn: () => loadStats(profile!.id),
    enabled: !!profile,
  });

  const postsQ = useQuery({
    queryKey: ["user-posts", profile?.id],
    queryFn: () => fetchFeed(user!.id, { userId: profile!.id }),
    enabled: !!profile && !!user,
  });

  useEffect(() => {
    if (!profile || !user || isMe) return;
    supabase.from("followers")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.id)
      .maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [profile, user, isMe]);

  async function toggleFollow() {
    if (!user || !profile) return;
    const next = !following;
    setFollowing(next);
    try {
      if (next) await supabase.from("followers").insert({ follower_id: user.id, following_id: profile.id });
      else await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", profile.id);
    } catch { setFollowing(!next); toast.error("تعذّر التحديث"); }
  }

  const [opening, setOpening] = useState(false);
  async function openDirectMessage() {
    if (!user || !profile || isMe || opening) return;
    setOpening(true);
    try {
      // 1. Get all 1-on-1 conversations the current user is part of
      const { data: userConvs, error: userConvsErr } = await supabase
        .from("conversation_participants")
        .select("conversation_id, conversations!inner(is_group)")
        .eq("user_id", user.id);

      if (userConvsErr) throw userConvsErr;

      const my1on1ConvIds = (userConvs ?? [])
        .filter((r: any) => r.conversations && !r.conversations.is_group)
        .map((r: any) => r.conversation_id);

      let convId: string | null = null;

      // 2. Check if the profile user is in any of these 1-on-1 conversations
      if (my1on1ConvIds.length > 0) {
        const { data: shared, error: sharedErr } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", profile.id)
          .in("conversation_id", my1on1ConvIds)
          .limit(1)
          .maybeSingle();
        
        if (sharedErr) throw sharedErr;
        convId = shared?.conversation_id ?? null;
      }

      // 3. Create a new conversation if none exists
      if (!convId) {
        // We use a transaction-like approach by inserting conversation first
        // If it fails, RLS or DB constraints will catch it
        const { data: newConv, error: cErr } = await supabase
          .from("conversations")
          .insert({
            is_group: false,
            created_by: user.id
          })
          .select()
          .single();
        
        if (cErr) throw cErr;
        const newConvId = newConv.id;

        // Insert participants (self and the profile owner)
        const { error: pErr } = await supabase
          .from("conversation_participants")
          .insert([
            { conversation_id: newConvId, user_id: user.id },
            { conversation_id: newConvId, user_id: profile.id },
          ]);
        
        if (pErr) {
          // If adding participants fails, the conversation might be "orphaned"
          // but RLS should ideally handle visibility.
          throw pErr;
        }
        convId = newConvId;
      }

      navigate(`/chats/${convId}`);
    } catch (e: any) {
      console.error("Chat error:", e);
      toast.error(
        dir === "rtl" 
          ? "فشل فتح المحادثة. يرجى المحاولة لاحقاً." 
          : "Failed to open conversation. Please try again later."
      );
    } finally {
      setOpening(false);
    }
  }

  if (profileQ.isLoading) return <p className="text-center py-10 text-muted-foreground">جاري التحميل…</p>;
  if (!profile) return <p className="text-center py-10 text-muted-foreground">لا يوجد مستخدم بهذا الاسم</p>;

  const stats = statsQ.data ?? { posts: 0, followers: 0, following: 0 };
  const posts = postsQ.data ?? [];
  const initial = (profile.display_name || profile.username || "؟")[0]?.toUpperCase();

  return (
    <div className="pb-4">
      {/* Cover */}
      <div className="relative h-32 sm:h-44 lg:h-52 bg-gradient-to-br from-primary/20 via-secondary to-accent overflow-hidden">
        {profile.cover_url && (
          <img src={profile.cover_url} className="w-full h-full object-cover" alt="" />
        )}
      </div>

      {/* Header section */}
      <div className="px-4 -mt-12 sm:-mt-16 relative">
        <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shrink-0">
            <AvatarImage src={profile.avatar_url ?? undefined} className="object-cover" />
            <AvatarFallback className="text-3xl gradient-brand text-primary-foreground">{initial}</AvatarFallback>
          </Avatar>
          <div className="mb-1 flex gap-2 shrink-0">
            {isMe ? (
              <>
                <Button variant="outline" onClick={() => navigate("/setup")} className="rounded-full font-bold">تعديل الملف</Button>
                <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="خروج"><LogOut className="h-5 w-5" /></Button>
              </>
            ) : (
              <>
                <Button onClick={toggleFollow} variant={following ? "outline" : "default"} className="rounded-full font-bold min-w-[110px]">
                  {following ? "متابَع" : "متابعة"}
                </Button>
                <Button
                  onClick={openDirectMessage}
                  variant="outline"
                  className="rounded-full font-bold"
                  disabled={opening}
                  aria-label="رسالة"
                >
                  <MessageCircle className="h-4 w-4 ml-1" />
                  رسالة
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-1.5 flex-wrap">
            <span className="truncate">{profile.display_name || profile.username}</span>
            <UserBadge badge={(profile as any).badge} verified={profile.verified} className="h-5 w-5 shrink-0" />
          </h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="text-sm whitespace-pre-wrap mt-2 break-words">{profile.bio}</p>}
        </div>

        {/* Stats — clean grid, no overflow */}
        <div className="grid grid-cols-3 gap-2 mt-5 max-w-md">
          <div className="text-center sm:text-start">
            <div className="text-lg font-black">{stats.posts}</div>
            <div className="text-xs text-muted-foreground">منشور</div>
          </div>
          <div className="text-center sm:text-start">
            <div className="text-lg font-black">{stats.followers}</div>
            <div className="text-xs text-muted-foreground">متابِع</div>
          </div>
          <div className="text-center sm:text-start">
            <div className="text-lg font-black">{stats.following}</div>
            <div className="text-xs text-muted-foreground">يتابع</div>
          </div>
        </div>
      </div>

      <div className="border-t border-border mt-5 flex justify-center py-2">
        <Grid3x3 className="h-5 w-5 text-foreground" />
      </div>

      <div className="grid grid-cols-3 gap-0.5">
        {posts.map((p) => (
          <button key={p.id} onClick={() => navigate(`/p/${p.id}`)} className="aspect-square bg-secondary overflow-hidden">
            {p.image_url ? (
              <img src={p.image_url} className="w-full h-full object-cover" alt="" loading="lazy" />
            ) : p.video_url ? (
              <video src={p.video_url} className="w-full h-full object-cover" muted />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs p-2 text-center break-words">{p.caption?.slice(0, 60)}</div>
            )}
          </button>
        ))}
      </div>
      {posts.length === 0 && (
        <p className="text-center py-10 text-muted-foreground text-sm">لا توجد منشورات بعد</p>
      )}
    </div>
  );
}
