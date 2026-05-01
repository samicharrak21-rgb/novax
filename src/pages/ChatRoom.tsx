import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Smile, ImagePlus, Send, ArrowLeft, ChevronLeft, Users } from "lucide-react";
import ChatMediaPicker from "@/components/ChatMediaPicker";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";

type Message = {
  id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
};

type ConvMeta = {
  id: string;
  is_group: boolean;
  title: string | null;
  avatar_url: string | null;
  other: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export default function ChatRoom() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const Back = dir === "rtl" ? ChevronLeft : ArrowLeft;

  const metaQ = useQuery({
    queryKey: ["chat-meta", id, user?.id],
    queryFn: async (): Promise<ConvMeta | null> => {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, is_group, title, avatar_url")
        .eq("id", id)
        .maybeSingle();
      if (!conv) return null;
      const { data: others } = await supabase
        .from("conversation_participants")
        .select("profiles:profiles!conversation_participants_user_id_fkey(username, display_name, avatar_url)")
        .eq("conversation_id", id)
        .neq("user_id", user!.id)
        .limit(1);
      const c = conv as any;
      return {
        id: c.id,
        is_group: !!c.is_group,
        title: c.title ?? null,
        avatar_url: c.avatar_url ?? null,
        other: ((others ?? [])[0] as any)?.profiles ?? null,
      };
    },
    enabled: !!id && !!user,
  });

  const q = useQuery({
    queryKey: ["messages", id],
    queryFn: async (): Promise<Message[]> => {
      const { data } = await supabase
        .from("messages")
        // attachment_* columns are added by a separate migration; types may lag behind
        .select("id,sender_id,content,attachment_url,attachment_type,created_at" as any)
        .eq("conversation_id", id)
        .order("created_at", { ascending: true })
        .limit(200);
      return ((data ?? []) as unknown) as Message[];
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`messages:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["messages", id] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, qc]);

  useEffect(() => {
    if (q.data) {
      const timer = setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [q.data]);

  async function sendMessage(payload: { content?: string; attachment_url?: string; attachment_type?: string }) {
    if (!user) return;
    const row: any = { conversation_id: id, sender_id: user.id };
    if (payload.content) row.content = payload.content;
    if (payload.attachment_url) {
      row.attachment_url = payload.attachment_url;
      row.attachment_type = payload.attachment_type || "image";
    }
    
    const { error } = await supabase.from("messages").insert(row);
    if (error) {
      console.error("Send error:", error);
      toast.error(dir === "rtl" ? "فشل إرسال الرسالة" : "Failed to send message");
      return false;
    }
    return true;
  }

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    
    setText("");
    const ok = await sendMessage({ content });
    if (!ok) {
      // Restore text if it failed
      setText(content);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    setUploading(true);
    try {
      const url = await uploadMedia(f, user.id, "chat");
      await sendMessage({ attachment_url: url, attachment_type: "image" });
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(dir === "rtl" ? "فشل رفع الصورة" : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const meta = metaQ.data;
  const headerName = meta?.is_group
    ? (meta.title || t("new_group"))
    : (meta?.other?.display_name || meta?.other?.username || "");
  const headerSub = meta?.is_group ? t("members") : meta?.other?.username ? `@${meta.other.username}` : "";
  const headerAvatar = meta?.is_group ? meta.avatar_url : meta?.other?.avatar_url;

  const headerInitial = useMemo(() => {
    const s = meta?.is_group ? (meta.title || "G") : (meta?.other?.username || "?");
    return s[0]?.toUpperCase();
  }, [meta]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Chat header */}
      <header className="border-b border-border h-14 flex items-center px-2 gap-2 bg-background">
        <button onClick={() => navigate("/chats")} aria-label="back" className="p-1.5 rounded-full hover:bg-secondary">
          <Back className="h-5 w-5" />
        </button>
        {meta?.is_group ? (
          <Avatar className="h-9 w-9">
            <AvatarImage src={headerAvatar ?? undefined} />
            <AvatarFallback className="gradient-brand text-primary-foreground">
              <Users className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <Link to={meta?.other?.username ? `/u/${meta.other.username}` : "#"}>
            <Avatar className="h-9 w-9">
              <AvatarImage src={headerAvatar ?? undefined} />
              <AvatarFallback className="gradient-brand text-primary-foreground text-xs">
                {headerInitial}
              </AvatarFallback>
            </Avatar>
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{headerName}</div>
          <div className="text-[11px] text-muted-foreground truncate">{headerSub}</div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {q.data?.map((m) => {
          const me = m.sender_id === user?.id;
          const isMedia = !!m.attachment_url;
          const isSticker = m.attachment_type === "sticker";
          const isGif = m.attachment_type === "gif";
          return (
            <div key={m.id} className={`flex ${me ? "justify-end" : "justify-start"}`}>
              {isMedia && (isSticker || isGif) ? (
                <img
                  src={m.attachment_url!}
                  alt=""
                  className={isSticker ? "w-28 h-28 object-contain" : "max-w-[70%] rounded-2xl"}
                  loading="lazy"
                />
              ) : isMedia ? (
                <div className={`max-w-[75%] rounded-2xl overflow-hidden ${me ? "chat-bubble-me" : "chat-bubble-them"} p-1`}>
                  <img src={m.attachment_url!} alt="" className="rounded-xl max-h-72 object-cover" loading="lazy" />
                  {m.content && <div className="text-sm px-2 py-1.5">{m.content}</div>}
                </div>
              ) : (
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${me ? "chat-bubble-me" : "chat-bubble-them"}`}>
                  {m.content}
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Picker */}
      {picker && (
        <ChatMediaPicker
          onClose={() => setPicker(false)}
          onPickEmoji={(e) => setText((s) => s + e)}
          onPickSticker={(url) => { setPicker(false); sendMessage({ attachment_url: url, attachment_type: "sticker" }); }}
          onPickGif={(url) => { setPicker(false); sendMessage({ attachment_url: url, attachment_type: "gif" }); }}
        />
      )}

      {/* Composer */}
      <form onSubmit={sendText} className="border-t border-border p-2 flex items-center gap-1.5 bg-background">
        <button
          type="button"
          onClick={() => setPicker((p) => !p)}
          aria-label={t("emoji")}
          className="p-2 rounded-full hover:bg-secondary text-muted-foreground"
        >
          <Smile className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label={t("attach_image")}
          disabled={uploading}
          className="p-2 rounded-full hover:bg-secondary text-muted-foreground"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setPicker(false)}
          placeholder={t("type_message")}
          className="rounded-full flex-1"
        />
        <Button
          type="submit"
          disabled={!text.trim()}
          size="icon"
          className="rounded-full h-10 w-10 shrink-0"
          aria-label={t("send")}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
