import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, ArrowLeft, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

type Profile = { id: string; username: string; display_name: string | null; avatar_url: string | null };

export default function NewGroup() {
  const { user } = useAuth();
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const Back = dir === "rtl" ? ChevronLeft : ArrowLeft;

  const [title, setTitle] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, Profile>>({});
  const [submitting, setSubmitting] = useState(false);

  const usersQ = useQuery({
    queryKey: ["new-group-search", q],
    queryFn: async (): Promise<Profile[]> => {
      const query = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .neq("id", user!.id)
        .limit(40);
      const { data } = q.trim().length >= 2
        ? await query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        : await query;
      return data ?? [];
    },
    enabled: !!user,
  });

  function toggle(p: Profile) {
    setSelected((s) => {
      const n = { ...s };
      if (n[p.id]) delete n[p.id];
      else n[p.id] = p;
      return n;
    });
  }

  async function submit() {
    if (!user) return;
    const ids = Object.keys(selected);
    if (ids.length === 0) { toast.error(t("add_members")); return; }
    if (!title.trim()) { toast.error(t("group_name")); return; }
    setSubmitting(true);
    try {
      // 1. Create the conversation first and get the generated ID
      // We don't use .single() directly here to avoid issues if SELECT policy takes a moment to propagate
      const { data: convs, error: cErr } = await supabase
        .from("conversations")
        .insert({ 
          is_group: true, 
          title: title.trim(), 
          created_by: user.id 
        })
        .select();

      if (cErr) throw cErr;
      if (!convs || convs.length === 0) throw new Error("Failed to create conversation entry");
      const convId = convs[0].id;
      
      // 2. Prepare participants rows (ensure unique user IDs)
      const participantIds = Array.from(new Set([user.id, ...ids]));
      const rows = participantIds.map((uid) => ({ 
        conversation_id: convId, 
        user_id: uid 
      }));

      // 3. Insert participants
      const { error: pErr } = await supabase.from("conversation_participants").insert(rows);
      
      if (pErr) {
        console.error("Participants error:", pErr);
        throw pErr;
      }
      
      toast.success(dir === "rtl" ? "تم إنشاء المجموعة بنجاح" : "Group created successfully");
      navigate(`/chats/${convId}`, { replace: true });
    } catch (e: any) {
      console.error("Group creation error:", e);
      toast.error(
        dir === "rtl" 
          ? `فشل إنشاء المجموعة: ${e.message || "تأكد من اتصالك بالإنترنت"}` 
          : `Failed to create group: ${e.message || "Check your connection"}`
      );
    } finally {
      setSubmitting(false);
    }
  }

  const selectedList = Object.values(selected);

  return (
      <div className="flex flex-col min-h-full">
        <header className="sticky top-14 lg:top-0 z-30 glass border-b border-border h-14 flex items-center px-3 gap-2 shrink-0">
        <button onClick={() => navigate(-1)} aria-label="back" className="p-1.5 rounded-full hover:bg-secondary">
          <Back className="h-5 w-5" />
        </button>
        <h1 className="font-black text-lg">{t("new_group")}</h1>
        <Button
          onClick={submit}
          disabled={submitting || selectedList.length === 0 || !title.trim()}
          className="ms-auto rounded-full h-9"
        >
          {t("create_group")}
        </Button>
      </header>

      <div className="p-4 space-y-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("group_name")}
          className="h-12 rounded-full"
        />
        {selectedList.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {selectedList.map((p) => (
              <button key={p.id} onClick={() => toggle(p)} className="flex flex-col items-center gap-1 shrink-0 w-14">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs gradient-brand text-primary-foreground">
                    {p.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] truncate w-full text-center">{p.username}</span>
              </button>
            ))}
          </div>
        )}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search_users")}
          className="h-11 rounded-full"
        />
      </div>

      <div>
        {(usersQ.data ?? []).map((p) => {
          const checked = !!selected[p.id];
          return (
            <button
              key={p.id}
              onClick={() => toggle(p)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary"
            >
              <Avatar>
                <AvatarImage src={p.avatar_url ?? undefined} />
                <AvatarFallback className="gradient-brand text-primary-foreground">
                  {p.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-start">
                <div className="font-bold text-sm">{p.display_name || p.username}</div>
                <div className="text-xs text-muted-foreground">@{p.username}</div>
              </div>
              <span className={`h-6 w-6 rounded-full border flex items-center justify-center ${
                checked ? "bg-primary border-primary text-primary-foreground" : "border-border"
              }`}>
                {checked && <Check className="h-4 w-4" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
