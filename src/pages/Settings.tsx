import { useNavigate } from "react-router-dom";
import { useI18n, type Lang } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, ChevronLeft, Globe, LogOut, User2, Info, Shield } from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";

const ADMIN_EMAIL = "samicharrak@gmail.com";

export default function Settings() {
  const { t, lang, setLang, dir } = useI18n();
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const Back = dir === "rtl" ? ChevronLeft : ArrowLeft;
  const isAdmin = (user?.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return (
    <div className="pb-24 lg:pb-8 max-w-2xl mx-auto">
      <header className="sticky top-0 lg:top-14 z-30 glass border-b border-border h-14 flex items-center px-4 gap-2">
        <button onClick={() => navigate(-1)} aria-label="back" className="p-2 rounded-full hover:bg-secondary transition-colors">
          <Back className="h-5 w-5" />
        </button>
        <h1 className="font-black text-xl">{t("settings")}</h1>
      </header>

      <div className="p-4 space-y-8">
        {/* Profile Section */}
        <section>
          <div className="flex items-center gap-4 p-4 rounded-3xl bg-secondary/50 backdrop-blur-sm border border-border/50">
            <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
              <AvatarImage src={profile?.avatar_url ?? undefined} className="object-cover" />
              <AvatarFallback className="text-xl gradient-brand text-primary-foreground">
                {(profile?.username || "?")[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-black text-lg truncate">{profile?.display_name || profile?.username}</div>
              <div className="text-sm text-muted-foreground truncate">@{profile?.username}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate("/setup")} className="rounded-full">
              <User2 className="h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* Language Section */}
        <section className="space-y-3">
          <div className="px-1 text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Globe className="h-4 w-4" /> {t("language")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["ar", "en"] as Lang[]).map((l) => {
              const active = lang === l;
              return (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all duration-200 ${
                    active
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-transparent bg-secondary/50 text-muted-foreground hover:bg-secondary hover:border-border"
                  }`}
                >
                  {l === "ar" ? "العربية" : "English"}
                </button>
              );
            })}
          </div>
        </section>

        {/* Account Actions */}
        <section className="space-y-3">
          <div className="px-1 text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Shield className="h-4 w-4" /> {t("account")}
          </div>
          <div className="grid gap-2">
            <Button 
              variant="outline" 
              className="w-full justify-start rounded-2xl h-14 text-base font-bold border-border/60 hover:bg-secondary transition-all" 
              onClick={() => navigate("/setup")}
            >
              <User2 className="h-5 w-5 me-3 opacity-70" />
              {t("edit_profile")}
            </Button>
            
            {isAdmin && (
              <Button
                variant="outline"
                className="w-full justify-start rounded-2xl h-14 text-base font-bold border-primary/20 text-primary hover:bg-primary/5 transition-all"
                onClick={() => navigate("/admin")}
              >
                <Shield className="h-5 w-5 me-3 opacity-70" /> {t("admin_panel")}
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full justify-start rounded-2xl h-14 text-base font-bold text-destructive border-destructive/10 hover:bg-destructive/5 hover:border-destructive/30 transition-all"
              onClick={() => signOut()}
            >
              <LogOut className="h-5 w-5 me-3 opacity-70" /> {t("sign_out")}
            </Button>
          </div>
        </section>

        {/* App Info & Install */}
        <section className="space-y-6 pt-4">
          <InstallAppButton />
          
          <div className="space-y-3">
            <div className="px-1 text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4" /> {t("about")}
            </div>
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 flex justify-between items-center">
              <span className="font-bold text-sm">Xnova</span>
              <span className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded-full border border-border/30">v1.0.2</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
