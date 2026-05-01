import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/format";
import { Users, PenSquare } from "lucide-react";

type ChatItem = {
  id: string;
  is_group: boolean;
  title: string | null;
  avatar_url: string | null;
  last: string | null;
  other: { username: string; display_name: string | null; avatar_url: string | null } | null;
  others_count: number;
};

export default function ChatList() {
  const { user } = useAuth();
  const { t } = useI18n();
  const q = useQuery({
    queryKey: ["chats", user?.id],
    queryFn: async (): Promise<ChatItem[]> => {
      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("conversation_id, conversations(id,last_message_at,is_group,title,avatar_url)")
        .eq("user_id", user!.id);
      const convIds = (parts ?? []).map((p: any) => p.conversation_id);
      if (convIds.length === 0) return [];
      const { data: others } = await supabase
        .from("conversation_participants")
        .select("conversation_id, profiles:profiles!conversation_participants_user_id_fkey(id,username,display_name,avatar_url)")
        .in("conversation_id", convIds)
        .neq("user_id", user!.id);

      const convMeta: Record<string, any> = {};
      (parts ?? []).forEach((p: any) => { convMeta[p.conversation_id] = p.conversations; });

      const byConv: Record<string, any[]> = {};
      (others ?? []).forEach((o: any) => {
        (byConv[o.conversation_id] ||= []).push(o.profiles);
      });

      return convIds.map((cid) => {
        const meta = convMeta[cid] || {};
        const list = byConv[cid] || [];
        return {
          id: cid,
          is_group: !!meta.is_group,
          title: meta.title ?? null,
          avatar_url: meta.avatar_url ?? null,
          last: meta.last_message_at ?? null,
          other: list[0] || null,
          others_count: list.length,
        };
      }).sort((a, b) => (b.last || "").localeCompare(a.last || ""));
    },
    enabled: !!user,
  });

  const items = q.data ?? [];

  return (
    <div className="pb-20">
      <header className="sticky top-14 lg:top-0 z-30 glass border-b border-border h-14 flex items-center justify-between px-4">
        <h1 className="text-xl font-black">{t("chats")}</h1>
        <div className="flex gap-1">
          <Link to="/chats/new-group" className="p-2 rounded-full hover:bg-secondary" aria-label={t("new_group")}>
            <Users className="h-5 w-5" />
          </Link>
          <Link to="/search" className="p-2 rounded-full hover:bg-secondary" aria-label={t("new_chat")}>
            <PenSquare className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {items.length === 0 && <p className="text-center py-10 text-muted-foreground text-sm">{t("no_chats")}</p>}

      {items.map((c) => {
        const name = c.is_group
          ? (c.title || t("new_group"))
          : (c.other?.display_name || c.other?.username || "—");
        const sub = c.is_group
          ? `${c.others_count + 1} ${t("members")}`
          : c.other?.username ? `@${c.other.username}` : "";
        const avatar = c.is_group ? c.avatar_url : c.other?.avatar_url;
        const initial = (c.is_group ? (c.title || "G") : (c.other?.username || "?"))[0]?.toUpperCase();
        return (
          <Link key={c.id} to={`/chats/${c.id}`} className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-secondary">
            <Avatar>
              <AvatarImage src={avatar ?? undefined} />
              <AvatarFallback className="gradient-brand text-primary-foreground">
                {c.is_group ? <Users className="h-5 w-5" /> : initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate flex items-center gap-1.5">
                {name}
                {c.is_group && <span className="text-[10px] text-muted-foreground font-normal">· {t("members")}</span>}
              </div>
              <div className="text-xs text-muted-foreground truncate">{sub}</div>
            </div>
            {c.last && <span className="text-xs text-muted-foreground">{timeAgo(c.last)}</span>}
          </Link>
        );
      })}
    </div>
  );
}
