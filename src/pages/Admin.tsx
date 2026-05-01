import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserBadge, { type BadgeKind } from "@/components/UserBadge";
import { ArrowLeft, ChevronLeft, Shield, Search as SearchIcon, BadgeCheck, Crown, X } from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAIL = "samicharrak@gmail.com";

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  verified: boolean | null;
  badge: string | null;
};

const BADGE_OPTIONS: { kind: Exclude<BadgeKind, null>; label: string; icon: typeof BadgeCheck }[] = [
  { kind: "none", label: "لا شيء / None", icon: X },
  { kind: "blue", label: "زرقاء / Blue", icon: BadgeCheck },
  { kind: "yellow", label: "صفراء / Yellow", icon: BadgeCheck },
  { kind: "gold", label: "ذهبية / Gold", icon: Crown },
];

export default function Admin() {
  const { user, profile } = useAuth();
  const { dir } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const Back = dir === "rtl" ? ChevronLeft : ArrowLeft;

  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Strict client-side gate. Server-side enforcement should be added via DB role,
  // but until then we restrict UI to the configured admin email.
  const isAdmin = (user?.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (!user) return <p className="text-center py-10 text-muted-foreground">…</p>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const usersQ = useQuery({
    queryKey: ["admin-users", q],
    queryFn: async (): Promise<ProfileRow[]> => {
      let query = supabase
        .from("profiles")
        // badge column may not exist yet — request it loosely
        .select("id, username, display_name, avatar_url, verified, badge" as any)
        .order("created_at", { ascending: false })
        .limit(40);
      if (q.trim().length >= 2) {
        query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return ((data ?? []) as unknown) as ProfileRow[];
    },
    enabled: !!user,
  });

  async function setBadge(p: ProfileRow, kind: Exclude<BadgeKind, null>) {
    setBusyId(p.id);
    try {
      const verified = kind !== "none";
      const payload: any = { badge: kind === "none" ? null : kind, verified };
      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", p.id);
      if (error) throw error;
      toast.success("✓");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="pb-20">
      <header className="sticky top-14 z-30 glass border-b border-border h-12 flex items-center px-3 gap-2">
        <button onClick={() => navigate(-1)} aria-label="back" className="p-1.5 rounded-full hover:bg-secondary">
          <Back className="h-5 w-5" />
        </button>
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="font-black text-lg">Admin</h1>
        <span className="ms-auto text-[11px] text-muted-foreground truncate max-w-[40%]">{profile?.username}</span>
      </header>

      <div className="p-4">
        <div className="relative">
          <SearchIcon className="h-4 w-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search users…"
            className="h-11 rounded-full ps-9"
          />
        </div>
      </div>

      <div>
        {(usersQ.data ?? []).map((p) => {
          const initial = (p.display_name || p.username || "?")[0]?.toUpperCase();
          const current = (p.badge as BadgeKind) || (p.verified ? "blue" : "none");
          return (
            <div key={p.id} className="px-4 py-3 border-b border-border space-y-2.5">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback className="gradient-brand text-primary-foreground">{initial}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm flex items-center gap-1.5 truncate">
                    {p.display_name || p.username}
                    <UserBadge badge={p.badge as BadgeKind} verified={p.verified} className="h-4 w-4" />
                  </div>
                  <div className="text-xs text-muted-foreground truncate">@{p.username}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {BADGE_OPTIONS.map((b) => {
                  const active = current === b.kind;
                  const Icon = b.icon;
                  return (
                    <Button
                      key={b.kind}
                      size="sm"
                      variant={active ? "default" : "outline"}
                      disabled={busyId === p.id}
                      onClick={() => setBadge(p, b.kind)}
                      className="rounded-full h-8 text-xs gap-1"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {b.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {usersQ.isLoading && <p className="text-center py-6 text-xs text-muted-foreground">…</p>}
        {!usersQ.isLoading && (usersQ.data ?? []).length === 0 && (
          <p className="text-center py-10 text-xs text-muted-foreground">No users</p>
        )}
      </div>
    </div>
  );
}
