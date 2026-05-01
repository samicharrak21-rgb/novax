import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Sparkles, MessageCircle, Film, Hash } from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("تم إنشاء حسابك! 🎉");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/invalid/i.test(error.message)) throw new Error("بريد أو كلمة مرور غير صحيحة");
          throw error;
        }
        toast.success("مرحبًا بعودتك 👋");
      }
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ");
    } finally {
      setBusy(false);
    }
  }

  const features = [
    { icon: Sparkles, label: "قصص يومية", color: "from-primary to-primary-glow" },
    { icon: Film, label: "ريلز قصيرة", color: "from-[hsl(var(--story-pink))] to-[hsl(var(--story-orange))]" },
    { icon: MessageCircle, label: "دردشات فورية", color: "from-[hsl(var(--story-purple))] to-primary" },
    { icon: Hash, label: "هاشتاقات تتداول", color: "from-[hsl(var(--story-orange))] to-[hsl(var(--story-pink))]" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Animated background blobs */}
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] start-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-15%] end-[-10%] w-[600px] h-[600px] rounded-full bg-[hsl(var(--story-pink))]/15 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-[40%] start-[40%] w-[400px] h-[400px] rounded-full bg-[hsl(var(--story-purple))]/15 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* LEFT: Brand / Marketing — desktop only */}
        <div className="hidden lg:flex flex-1 flex-col justify-between p-12 xl:p-16 relative">
          <div>
            <span className="brand-x text-7xl xl:text-8xl block leading-none text-gradient-brand">𝕏</span>
            <h2 className="text-4xl xl:text-5xl font-black mt-8 leading-tight">
              عالم جديد من<br />
              <span className="text-gradient-brand">المحادثات والقصص</span>
            </h2>
            <p className="text-lg text-muted-foreground mt-5 max-w-md leading-relaxed">
              منصة عربية حديثة. شارك لحظاتك، تابع ما يهمك، وتواصل بسهولة.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md mt-10">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/40 backdrop-blur border border-border hover:bg-secondary/60 transition-colors"
                >
                  <span className={`flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br ${f.color}`}>
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </span>
                  <span className="font-bold text-sm">{f.label}</span>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground mt-10">
            © {new Date().getFullYear()} Nova X — كل الحقوق محفوظة
          </p>
        </div>

        {/* RIGHT: Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile brand */}
            <div className="lg:hidden text-center mb-8">
              <span className="brand-x text-6xl block leading-none text-gradient-brand">𝕏</span>
              <h1 className="text-2xl font-black mt-4">انضم إلى المحادثة</h1>
              <p className="text-sm text-muted-foreground mt-2">
                شارك القصص والريلز على Nova X
              </p>
            </div>

            {/* Card */}
            <div className="bg-secondary/30 backdrop-blur-xl rounded-3xl border border-border p-6 sm:p-8 shadow-glow">
              {/* Tabs */}
              <div className="flex items-center bg-background/60 p-1 rounded-full mb-6">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-full transition-all ${
                    mode === "signin"
                      ? "bg-foreground text-background shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-full transition-all ${
                    mode === "signup"
                      ? "bg-foreground text-background shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  حساب جديد
                </button>
              </div>

              <h2 className="text-2xl font-black mb-1">
                {mode === "signin" ? "أهلًا بعودتك 👋" : "أنشئ حسابك ✨"}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {mode === "signin"
                  ? "ادخل بيانات حسابك للمتابعة"
                  : "ابدأ رحلتك مع Nova X في دقيقة"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4 text-right">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-bold">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    dir="ltr"
                    className="h-12 text-base rounded-xl bg-background/60 border-border focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-bold">كلمة المرور</Label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline font-semibold"
                        onClick={() => toast.info("ميزة استرجاع كلمة المرور قريبًا")}
                      >
                        نسيتها؟
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      dir="ltr"
                      className="h-12 text-base rounded-xl pr-12 bg-background/60 border-border focus-visible:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPwd ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {mode === "signup" && (
                    <p className="text-[11px] text-muted-foreground pt-1">
                      6 أحرف على الأقل. ينصح بمزج أحرف وأرقام.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full h-12 text-base rounded-full font-black mt-4 gradient-brand text-primary-foreground hover:opacity-90 shadow-glow border-0"
                >
                  {busy ? "..." : mode === "signin" ? "دخول" : "إنشاء الحساب"}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  {mode === "signin" ? "ليس لديك حساب؟ " : "لديك حساب؟ "}
                  <button
                    type="button"
                    onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                    className="text-primary hover:underline font-bold"
                  >
                    {mode === "signin" ? "أنشئ حسابًا" : "سجّل الدخول"}
                  </button>
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              <InstallAppButton className="flex flex-col items-center" />
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed max-w-xs">
                بالاستمرار، فإنك توافق على شروط الخدمة وسياسة الخصوصية.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
