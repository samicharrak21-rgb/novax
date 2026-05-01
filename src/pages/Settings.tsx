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
    <div className="pb-8">
      <header className="sticky top-14 z-30 glass border-b border-border h-12 flex items-center px-3 gap-2">
        <button onClick={() => navigate(-1)} aria-label="back" className="p-1.5 rounded-full hover:bg-secondary">
          <Back className="h-5 w-5" />
        </button>
        <h1 className="font-black text-lg">{t("settings")}</h1>
      </header>

      <section className="p-4">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="gradient-brand text-primary-foreground">
              {(profile?.username || "?")[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-bold text-sm">{profile?.display_name || profile?.username}</div>
            <div className="text-xs text-muted-foreground">@{profile?.username}</div>
          </div>
        </div>
      </section>

      <section className="px-4 space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Globe className="h-3.5 w-3.5" /> {t("language")}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["ar", "en"] as Lang[]).map((l) => {
            const active = lang === l;
            return (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`p-3 rounded-2xl border text-sm font-bold transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {l === "ar" ? "العربية" : "English"}
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-4 mt-6 space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <User2 className="h-3.5 w-3.5" /> {t("account")}
        </div>
        <Button variant="outline" className="w-full justify-start rounded-2xl h-12" onClick={() => navigate("/setup")}>
          {t("edit_profile")}
        </Button>
        {isAdmin && (
          <Button
            variant="outline"
            className="w-full justify-start rounded-2xl h-12 border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => navigate("/admin")}
          >
            <Shield className="h-4 w-4 me-2" /> {t("admin_panel")}
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full justify-start rounded-2xl h-12 text-destructive border-destructive/40 hover:bg-destructive/10"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4 me-2" /> {t("sign_out")}
        </Button>
      </section>

      <section className="px-4 mt-4">
        <InstallAppButton />
      </section>

      <section className="px-4 mt-6 space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Info className="h-3.5 w-3.5" /> {t("about")}
        </div>
        <p className="text-xs text-muted-foreground p-3 rounded-2xl bg-secondary">
          Xnova · v1.0
        </p>
      </section>
    </div>
  );
}
