import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useUnreadCounts() {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  async function fetchUnread() {
    if (!user) return;

    // 1. Fetch unread notifications
    const { count: notifsCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);
    
    setUnreadNotifications(notifsCount || 0);

    // 2. Fetch unread messages
    // This is more complex: count messages in conversations where user is participant AND message.created_at > last_read_at
    const { data: myConvs } = await supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);

    if (myConvs && myConvs.length > 0) {
      let totalUnread = 0;
      for (const conv of myConvs) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.conversation_id)
          .gt("created_at", conv.last_read_at)
          .neq("sender_id", user.id); // Don't count own messages
        
        totalUnread += count || 0;
      }
      setUnreadMessages(totalUnread);
    }
  }

  useEffect(() => {
    if (!user) return;

    fetchUnread();

    // Listen for new messages
    const msgsChannel = supabase
      .channel("unread-msgs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => fetchUnread()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_participants", filter: `user_id=eq.${user.id}` },
        () => fetchUnread()
      )
      .subscribe();

    // Listen for notifications
    const notifsChannel = supabase
      .channel("unread-notifs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchUnread()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgsChannel);
      supabase.removeChannel(notifsChannel);
    };
  }, [user?.id]);

  return { unreadMessages, unreadNotifications };
}
