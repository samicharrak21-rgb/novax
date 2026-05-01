import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Search() {
  const [q, setQ] = useState("");
  const search = useQuery({
    queryKey: ["search-users", q],
    queryFn: async () => {
      if (q.trim().length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url,verified,bio")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(30);
      return data ?? [];
    },
  });

  return (
    <div className="p-4 space-y-3">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن مستخدم…" className="h-12 rounded-full" />
      {search.data?.map((u: any) => (
        <Link key={u.id} to={`/u/${u.username}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary">
          <Avatar><AvatarImage src={u.avatar_url ?? undefined} /><AvatarFallback className="gradient-brand text-primary-foreground">{u.username[0]?.toUpperCase()}</AvatarFallback></Avatar>
          <div className="flex-1 text-right">
            <div className="font-bold text-sm">{u.display_name || u.username}</div>
            <div className="text-xs text-muted-foreground">@{u.username}</div>
          </div>
        </Link>
      ))}
      {q.length >= 2 && search.data?.length === 0 && !search.isLoading && (
        <p className="text-center text-sm text-muted-foreground py-6">لا نتائج</p>
      )}
    </div>
  );
}
