import { supabase } from "@/integrations/supabase/client";

export type TrendingTag = { tag: string; count: number };

export async function fetchTrending(limit = 8): Promise<TrendingTag[]> {
  // pull recent posts with hashtags and aggregate client-side (cheap for small datasets)
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("posts")
    .select("hashtags")
    .gte("created_at", since)
    .not("hashtags", "is", null)
    .limit(500);

  const counts = new Map<string, number>();
  (data ?? []).forEach((row: any) => {
    (row.hashtags as string[] | null)?.forEach((h) => {
      if (!h) return;
      const k = h.toLowerCase();
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
