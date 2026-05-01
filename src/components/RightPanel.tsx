import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Hash, TrendingUp } from "lucide-react";
import { followUser, unfollowUser } from "@/lib/follow";
import { fetchTrending } from "@/lib/trending";
import { toast } from "sonner";
import { useState } from "react";

type SuggestedProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function RightPanel() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  const trendingQ = useQuery({
    queryKey: ["trending-tags"],
    queryFn: () => fetchTrending(6),
    staleTime: 60_000,
  });

  const suggestionsQ = useQuery({
    queryKey: ["suggested-profiles", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SuggestedProfile[]> => {
      // exclude users I already follow
      const { data: follows } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", user!.id);
      const excluded = new Set([user!.id, ...((follows ?? []).map((f: any) => f.following_id))]);
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []).filter((p) => !excluded.has(p.id)).slice(0, 5);
    },
  });

  async function handleFollow(targetId: string) {
    if (!user || pendingId) return;
    const willFollow = !followingMap[targetId];
    setPendingId(targetId);
    setFollowingMap((m) => ({ ...m, [targetId]: willFollow }));
    try {
      if (willFollow) await followUser(user.id, targetId);
      else await unfollowUser(user.id, targetId);
      qc.invalidateQueries({ queryKey: ["feed"] });
    } catch (e: any) {
      setFollowingMap((m) => ({ ...m, [targetId]: !willFollow }));
      toast.error(e?.message || "تعذّر التحديث");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {profile && (
        <Link
          to={`/u/${profile.username}`}
          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/60 transition-colors"
        >
          <Avatar className="h-14 w-14 border border-border">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="gradient-brand text-primary-foreground text-lg">
              {(profile.display_name || profile.username || "؟")[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{profile.display_name || profile.username}</div>
            <div className="text-sm text-muted-foreground truncate">@{profile.username}</div>
          </div>
        </Link>
      )}

      {/* Trending */}
      <div className="rounded-3xl bg-secondary/40 p-4">
        <div className="flex items-center gap-2 mb-3 px-1">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-base">{t("trending") || "الأكثر تداولاً"}</h3>
        </div>
        {trendingQ.isLoading && (
          <div className="text-sm text-muted-foreground px-1 py-2">{t("loading")}</div>
        )}
        {trendingQ.data && trendingQ.data.length === 0 && (
          <div className="text-sm text-muted-foreground px-1 py-2">لا توجد هاشتاقات بعد</div>
        )}
        <div className="space-y-1">
          {trendingQ.data?.map((tag) => (
            <Link
              key={tag.tag}
              to={`/tag/${encodeURIComponent(tag.tag)}`}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-background/60 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-semibold truncate">{tag.tag}</span>
              </div>
              <span className="text-xs text-muted-foreground">{tag.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Suggestions */}
      <div className="rounded-3xl bg-secondary/40 p-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-bold text-base">{t("suggested") || "اقتراحات لك"}</h3>
        </div>
        {suggestionsQ.isLoading && (
          <div className="text-sm text-muted-foreground px-1 py-4">{t("loading")}</div>
        )}
        {suggestionsQ.data && suggestionsQ.data.length === 0 && (
          <div className="text-sm text-muted-foreground px-1 py-4">{t("no_results")}</div>
        )}
        <div className="space-y-1">
          {suggestionsQ.data?.map((p) => {
            const following = !!followingMap[p.id];
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-background/60 transition-colors"
              >
                <Link to={`/u/${p.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback className="gradient-brand text-primary-foreground text-sm">
                      {(p.display_name || p.username)[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate text-sm">{p.display_name || p.username}</div>
                    <div className="text-xs text-muted-foreground truncate">@{p.username}</div>
                  </div>
                </Link>
                <Button
                  size="sm"
                  variant={following ? "outline" : "default"}
                  className="h-8 rounded-full text-xs"
                  disabled={pendingId === p.id}
                  onClick={() => handleFollow(p.id)}
                >
                  {following ? (t("following") || "متابَع") : (t("follow") || "متابعة")}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-muted-foreground px-2 leading-relaxed">
        © {new Date().getFullYear()} Xnovas
      </div>
    </div>
  );
}
