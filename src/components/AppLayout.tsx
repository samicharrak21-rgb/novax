import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home,
  Search,
  PlusSquare,
  Film,
  MessageCircle,
  Bell,
  Settings,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import RightPanel from "@/components/RightPanel";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const { t, dir } = useI18n();
  const { unreadMessages, unreadNotifications } = useUnreadCounts();

  const initial = (profile?.display_name || profile?.username || "؟")[0]?.toUpperCase();
  const profileHref = profile?.username ? `/u/${profile.username}` : "/setup";

  const navItems = [
    { to: "/", icon: Home, label: t("home") },
    { to: "/search", icon: Search, label: t("search") },
    { to: "/reels", icon: Film, label: t("reels") },
    { to: "/chats", icon: MessageCircle, label: t("chats"), badge: unreadMessages },
    { to: "/notifications", icon: Bell, label: t("notifications"), badge: unreadNotifications },
    { to: "/create", icon: PlusSquare, label: t("create") },
    { to: profileHref, icon: User, label: t("edit_profile") || "Profile" },
  ];

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");

  // Mobile bottom-bar tabs (subset)
  const bottomTabs = [
    { to: "/", icon: Home, label: t("home") },
    { to: "/search", icon: Search, label: t("search") },
    { to: "/create", icon: PlusSquare, label: t("create"), primary: true },
    { to: "/reels", icon: Film, label: t("reels") },
    { to: "/settings", icon: Settings, label: t("settings") },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      {/* ========== MOBILE TOP BAR ========== */}
      <header className="lg:hidden sticky top-0 z-40 glass border-b border-border h-14 flex items-center justify-between px-4">
        <Link to="/" className="brand-x text-3xl">𝕏</Link>
        <div className="flex items-center gap-1">
          <Link
            to="/notifications"
            aria-label={t("notifications")}
            className="p-2 rounded-full hover:bg-secondary transition-colors relative"
          >
            <Bell className="h-5 w-5" />
            <Badge count={unreadNotifications} />
          </Link>
          <Link
            to="/chats"
            aria-label={t("chats")}
            className="p-2 rounded-full hover:bg-secondary transition-colors relative"
          >
            <MessageCircle className="h-5 w-5" />
            <Badge count={unreadMessages} />
          </Link>
          <Link to={profileHref} aria-label="account">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs gradient-brand text-primary-foreground">
                {initial}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </header>

      {/* ========== DESKTOP THREE-COLUMN LAYOUT ========== */}
      <div className="lg:flex lg:items-start lg:justify-center lg:gap-0 lg:max-w-[1290px] lg:mx-auto">
        {/* Sidebar (desktop) */}
        <aside
          className={`hidden lg:flex sticky top-0 h-screen flex-col items-stretch shrink-0 border-border ${
            dir === "rtl" ? "border-l" : "border-r"
          } px-2 py-4 w-[72px] xl:w-[88px] z-30 bg-background`}
        >
          <Link
            to="/"
            className="brand-x text-3xl flex items-center justify-center h-12 w-12 rounded-full hover:bg-secondary/60 transition-colors mx-auto mb-4"
            aria-label="Home"
          >
            𝕏
          </Link>

          <nav className="flex-1 flex flex-col items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  aria-label={item.label}
                  className={`flex items-center justify-center h-12 w-12 rounded-full transition-colors relative ${
                    active ? "bg-secondary" : "hover:bg-secondary/60"
                  }`}
                >
                  <Icon
                    className="h-6 w-6"
                    strokeWidth={active ? 2.5 : 1.8}
                    fill={active ? "currentColor" : "none"}
                  />
                  {"badge" in item && <Badge count={item.badge as number} />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col items-center gap-1">
            <Link
              to="/settings"
              title={t("settings")}
              aria-label={t("settings")}
              className="flex items-center justify-center h-12 w-12 rounded-full hover:bg-secondary/60 transition-colors"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <Link
              to={profileHref}
              aria-label="account"
              className="flex items-center justify-center h-12 w-12 rounded-full hover:bg-secondary/60 transition-colors"
            >
              <Avatar className="h-9 w-9 border border-border">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="gradient-brand text-primary-foreground text-sm">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </aside>

        {/* Main content column */}
        <main className="w-full lg:w-[600px] lg:max-w-[600px] lg:shrink-0 min-w-0 pb-20 lg:pb-6 lg:border-border lg:border-x lg:min-h-screen">
          {children}
        </main>

        {/* Right panel */}
        <aside className="hidden xl:block w-[340px] shrink-0 sticky top-0 h-screen overflow-y-auto px-6 py-4 scrollbar-hide">
          <RightPanel />
        </aside>
      </div>

      {/* ========== MOBILE BOTTOM BAR ========== */}
      <nav
        dir="ltr"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border h-16 flex items-center justify-around"
      >
        {bottomTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.to);
          if ("primary" in tab && tab.primary) {
            return (
              <Link
                key={tab.to}
                to={tab.to}
                aria-label={tab.label}
                className="flex items-center justify-center"
              >
                <span className="gradient-brand rounded-2xl p-2.5 -mt-3 shadow-glow ring-4 ring-background">
                  <Icon className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={tab.to}
              to={tab.to}
              aria-label={tab.label}
              className={`flex flex-col items-center justify-center w-12 transition-colors relative ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon
                className="h-6 w-6"
                strokeWidth={active ? 2.4 : 1.8}
                fill={active ? "currentColor" : "none"}
              />
              {tab.to === "/notifications" && <Badge count={unreadNotifications} />}
              {tab.to === "/chats" && <Badge count={unreadMessages} />}
              {tab.to === "/settings" && (unreadMessages > 0 || unreadNotifications > 0) && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
