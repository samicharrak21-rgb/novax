import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/format";
import { Heart, MessageCircle, UserPlus, AtSign, Mail, Repeat2, Quote } from "lucide-react";

const ICONS: Record<string, { Icon: typeof Heart; cls: string }> = {
  like: { Icon: Heart, cls: "text-ig-red" },
  comment: { Icon: MessageCircle, cls: "text-primary" },
  follow: { Icon: UserPlus, cls: "text-primary" },
  mention: { Icon: AtSign, cls: "text-primary" },
  message: { Icon: Mail, cls: "text-primary" },
  repost: { Icon: Repeat2, cls: "text-emerald-500" },
  quote: { Icon: Quote, cls: "text-primary" },
  story_reply: { Icon: MessageCircle, cls: "text-primary" },
  story_like: { Icon: Heart, cls: "text-ig-red" },
};

export default function Notifications() {
  const { user } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["notifs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id,type,read,created_at,comment_text,actor:profiles!notifications_actor_id_fkey(username,display_name,avatar_url)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Real-time updates + mark all as read on view
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notifs:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifs", user.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  useEffect(() => {
    if (!user || !q.data || q.data.length === 0) return;
    const unread = q.data.filter((n: any) => !n.read).map((n: any) => n.id);
    if (unread.length === 0) return;
    supabase.from("notifications").update({ read: true }).in("id", unread).then(() => {
      qc.invalidateQueries({ queryKey: ["notifs", user.id] });
    });
  }, [q.data, user, qc]);

  const items = q.data ?? [];
  const labels: Record<string, string> = {
    like: t("notif_like"),
    comment: t("notif_comment"),
    follow: t("notif_follow"),
    message: t("notif_message"),
    mention: t("notif_mention"),
    repost: "أعاد نشر منشورك",
    quote: "اقتبس منشورك",
    story_reply: "ردّ على قصتك",
    story_like: "أعجب بقصتك",
  };

  return (
    <div>
      <h1 className="text-xl font-black p-4">{t("notifications")}</h1>
      {q.isLoading && <p className="text-center py-10 text-muted-foreground text-sm">{t("loading")}</p>}
      {!q.isLoading && items.length === 0 && (
        <p className="text-center py-10 text-muted-foreground text-sm">{t("no_notifications")}</p>
      )}
      {items.map((n: any) => {
        const meta = ICONS[n.type];
        const Icon = meta?.Icon;
        return (
          <div key={n.id} className={`flex items-center gap-3 px-4 py-3 border-b border-border ${!n.read ? "bg-primary/5" : ""}`}>
            <div className="relative shrink-0">
              <Avatar>
                <AvatarImage src={n.actor?.avatar_url ?? undefined} />
                <AvatarFallback className="gradient-brand text-primary-foreground">
                  {(n.actor?.username || "?")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {Icon && (
                <span className={`absolute -bottom-0.5 -end-0.5 bg-background rounded-full p-0.5 border border-border ${meta.cls}`}>
                  <Icon className="h-3 w-3" fill={n.type === "like" ? "currentColor" : "none"} />
                </span>
              )}
            </div>
            <div className="flex-1 text-sm min-w-0">
              <div className="truncate">
                <b>{n.actor?.display_name || n.actor?.username}</b>{" "}
                <span className="text-muted-foreground">{labels[n.type] || n.type}</span>
              </div>
              {n.comment_text && (
                <div className="text-xs text-muted-foreground truncate">«{n.comment_text}»</div>
              )}
              <div className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
