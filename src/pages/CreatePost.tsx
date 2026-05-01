import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadMedia } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Film, X } from "lucide-react";
import { toast } from "sonner";
import { extractHashtags } from "@/lib/repost";

export default function CreatePost() {
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
    if (!file && !caption.trim()) {
      toast.error("أضف صورة/فيديو أو نصًا");
      return;
    }
    setBusy(true);
    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;
      let isReel = false;
      if (file) {
        const url = await uploadMedia(file, user.id, "posts");
        if (file.type.startsWith("video/")) { videoUrl = url; isReel = true; }
        else imageUrl = url;
      }
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        caption: caption.trim() || null,
        image_url: imageUrl,
        video_url: videoUrl,
        is_reel: isReel,
        hashtags: extractHashtags(caption),
      });
      if (error) throw error;
      toast.success("تم النشر");
      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "تعذّر النشر");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-black">منشور جديد</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {previewUrl ? (
          <div className="relative rounded-2xl overflow-hidden bg-secondary">
            {file?.type.startsWith("video/") ? (
              <video src={previewUrl} className="w-full max-h-[60vh]" controls />
            ) : (
              <img src={previewUrl} className="w-full max-h-[60vh] object-contain" alt="معاينة" />
            )}
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
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-2xl border border-dashed border-border bg-secondary cursor-pointer hover:bg-accent">
              <ImagePlus className="h-7 w-7 text-primary" />
              <span className="text-sm">صورة</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            </label>
            <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-2xl border border-dashed border-border bg-secondary cursor-pointer hover:bg-accent">
              <Film className="h-7 w-7 text-primary" />
              <span className="text-sm">فيديو / ريلز</span>
              <input type="file" accept="video/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        )}

        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="اكتب وصفًا… يمكنك استخدام #هاشتاج و @ذكر"
          className="rounded-2xl min-h-32 text-base"
          maxLength={2200}
        />

        <Button type="submit" disabled={busy} className="w-full h-12 rounded-full text-base font-bold">
          {busy ? "جاري النشر…" : "نشر"}
        </Button>
      </form>
    </div>
  );
}
