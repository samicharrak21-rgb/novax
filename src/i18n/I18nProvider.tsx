import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

type Dict = Record<string, string>;

const ar: Dict = {
  // tabs / nav
  home: "الرئيسية",
  search: "بحث",
  create: "نشر",
  reels: "ريلز",
  notifications: "الإشعارات",
  chats: "المحادثات",
  settings: "الإعدادات",
  // common
  send: "إرسال",
  cancel: "إلغاء",
  save: "حفظ",
  loading: "جاري التحميل…",
  search_users: "ابحث عن مستخدم…",
  no_results: "لا نتائج",
  no_chats: "لا محادثات بعد",
  type_message: "اكتب رسالة…",
  // settings
  language: "اللغة",
  account: "الحساب",
  edit_profile: "تعديل الملف الشخصي",
  sign_out: "تسجيل الخروج",
  about: "عن التطبيق",
  arabic: "العربية",
  english: "English",
  appearance: "المظهر",
  // chat
  new_group: "مجموعة جديدة",
  new_chat: "محادثة جديدة",
  group_name: "اسم المجموعة",
  add_members: "إضافة أعضاء",
  create_group: "إنشاء المجموعة",
  members: "أعضاء",
  emoji: "إيموجي",
  stickers: "ملصقات",
  gifs: "GIF",
  search_gifs: "ابحث عن GIF…",
  attach_image: "إرفاق صورة",
  // story
  story: "ستوري",
  add_story: "أضف ستوري",
  // feed
  for_you: "لك",
  following: "المتابَعون",
  no_posts: "لا توجد منشورات بعد",
  publish_first: "انشر أول منشور لك",
  // notifications
  notif_like: "أعجب بمنشورك",
  notif_comment: "علّق على منشورك",
  notif_follow: "بدأ بمتابعتك",
  notif_message: "أرسل رسالة",
  notif_mention: "ذكرك في منشور",
  no_notifications: "لا إشعارات بعد",
  // admin
  admin_panel: "لوحة الإدارة",
  // panels
  suggested: "اقتراحات لك",
  follow: "متابعة",
  trending: "الأكثر تداولاً",
};

const en: Dict = {
  home: "Home",
  search: "Search",
  create: "Post",
  reels: "Reels",
  notifications: "Notifications",
  chats: "Chats",
  settings: "Settings",
  send: "Send",
  cancel: "Cancel",
  save: "Save",
  loading: "Loading…",
  search_users: "Search users…",
  no_results: "No results",
  no_chats: "No chats yet",
  type_message: "Type a message…",
  language: "Language",
  account: "Account",
  edit_profile: "Edit profile",
  sign_out: "Sign out",
  about: "About",
  arabic: "العربية",
  english: "English",
  appearance: "Appearance",
  new_group: "New group",
  new_chat: "New chat",
  group_name: "Group name",
  add_members: "Add members",
  create_group: "Create group",
  members: "Members",
  emoji: "Emoji",
  stickers: "Stickers",
  gifs: "GIFs",
  search_gifs: "Search GIFs…",
  attach_image: "Attach image",
  story: "Story",
  add_story: "Add story",
  for_you: "For you",
  following: "Following",
  no_posts: "No posts yet",
  publish_first: "Publish your first post",
  notif_like: "liked your post",
  notif_comment: "commented on your post",
  notif_follow: "started following you",
  notif_message: "sent you a message",
  notif_mention: "mentioned you in a post",
  no_notifications: "No notifications yet",
  admin_panel: "Admin panel",
  suggested: "Suggested for you",
  follow: "Follow",
  trending: "Trending",
};

const dicts: Record<Lang, Dict> = { ar, en };

type I18nCtx = {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  t: (key: keyof typeof ar) => string;
};

const Ctx = createContext<I18nCtx | null>(null);

const STORAGE_KEY = "xnova:lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "ar";
    return (localStorage.getItem(STORAGE_KEY) as Lang) || "ar";
  });

  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = dir;
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, dir]);

  const value = useMemo<I18nCtx>(
    () => ({
      lang,
      dir,
      setLang: setLangState,
      t: (key) => dicts[lang][key] ?? dicts.ar[key] ?? String(key),
    }),
    [lang, dir],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}
