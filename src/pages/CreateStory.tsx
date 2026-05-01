import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadMedia } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

export default function CreateStory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  function pickFile(f: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || busy) return;
    if (!file) {
      toast.error("اختر صورة للستوري");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadMedia(file, user.id, "stories");
      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        image_url: url,
        caption: caption.trim() || null,
      });
      if (error) throw error;
      toast.success("تم نشر الستوري");
      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "تعذّر النشر");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-black">ستوري جديد</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {previewUrl ? (
          <div className="relative rounded-2xl overflow-hidden bg-secondary">
            <img src={previewUrl} className="w-full max-h-[60vh] object-contain" alt="معاينة" />
            <button
              type="button"
              onClick={() => pickFile(null)}
              className="absolute top-2 right-2 bg-background/80 rounded-full p-1.5"
              aria-label="إزالة"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 h-48 rounded-2xl border border-dashed border-border bg-secondary cursor-pointer hover:bg-accent">
            <ImagePlus className="h-9 w-9 text-primary" />
            <span className="text-sm">اختر صورة للستوري</span>
            <span className="text-xs text-muted-foreground">تختفي بعد 24 ساعة</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </label>
        )}

        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="نص قصير (اختياري)"
          className="h-12 rounded-xl"
          maxLength={120}
        />

        <Button type="submit" disabled={busy} className="w-full h-12 rounded-full text-base font-bold">
          {busy ? "جاري النشر…" : "نشر الستوري"}
        </Button>
      </form>
    </div>
  );
}