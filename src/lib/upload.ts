import { supabase } from "@/integrations/supabase/client";

export async function uploadMedia(file: File, userId: string, folder = "uploads"): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

// pass-through helper kept for parity with original codebase
export function objectUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  return url;
}
