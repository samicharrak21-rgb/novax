import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";
import { Camera, ImagePlus } from "lucide-react";

export default function ProfileSetup() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [coverUrl, setCoverUrl] = useState<string | null>(profile?.cover_url ?? null);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleAvatarPick(file: File) {
    if (!user) return;
    setAvatarBusy(true);
    try {
      const url = await uploadMedia(file, user.id, "avatars");
      setAvatarUrl(url);
      toast.success("تم تحديث صورة الحساب");
    } catch (e: any) {
      toast.error(e?.message || "فشل الرفع");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleCoverPick(file: File) {
    if (!user) return;
    setBannerBusy(true);
    try {
      const url = await uploadMedia(file, user.id, "covers");
      setCoverUrl(url);
      toast.success("تم تحديث الغلاف");
    } catch (e: any) {
      toast.error(e?.message || "فشل الرفع");
    } finally {
      setBannerBusy(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || busy) return;
    const cleaned = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleaned.length < 3) {
      toast.error("اسم المستخدم 3 أحرف على الأقل (إنجليزية/أرقام/_)");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        id: user.id,
        username: cleaned,
        display_name: displayName.trim() || cleaned,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        cover_url: coverUrl,
      };
      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      if (error) {
        if (error.code === "23505") toast.error("اسم المستخدم محجوز، جرّب غيره");
        else throw error;
        return;
      }
      await refreshProfile();
      toast.success("تم حفظ الملف الشخصي");
      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "تعذّر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  const initial = (displayName || username || "؟")[0]?.toUpperCase();

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6 mt-6">
        <header className="text-center">
          <h1 className="text-2xl font-black">أكمل ملفك الشخصي</h1>
          <p className="text-sm text-muted-foreground mt-2">حتى يتعرّف عليك أصدقاؤك</p>
        </header>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Cover banner */}
          <label className="relative block h-32 rounded-2xl overflow-hidden bg-secondary border border-border cursor-pointer group">
            {coverUrl ? (
              <img src={coverUrl} alt="غلاف" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 gradient-brand opacity-30" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 group-hover:opacity-100 transition">
              <ImagePlus className="h-7 w-7 text-foreground" />
            </div>
            <span className="absolute bottom-2 left-2 text-xs px-2 py-1 rounded-full bg-background/70">
              {bannerBusy ? "جاري الرفع…" : "تغيير الغلاف"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleCoverPick(e.target.files[0])}
            />
          </label>

          <label className="flex flex-col items-center gap-2 cursor-pointer">
            <div className="relative">
              <Avatar className="h-24 w-24 border border-border">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback className="text-2xl gradient-brand text-primary-foreground">{initial}</AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5 border-2 border-background">
                <Camera className="h-4 w-4 text-primary-foreground" />
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{avatarBusy ? "جاري الرفع…" : "صورة الحساب"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatarPick(e.target.files[0])}
            />
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="username">اسم المستخدم</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              dir="ltr"
              className="h-12 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="displayName">الاسم الظاهر</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="اسمك الكامل"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">نبذة</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="اكتب عن نفسك..."
              className="rounded-xl min-h-24"
              maxLength={200}
            />
          </div>

          <Button type="submit" disabled={busy} className="w-full h-12 text-base rounded-full font-bold">
            {busy ? "..." : "حفظ والمتابعة"}
          </Button>
        </form>

        <button onClick={() => signOut()} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
