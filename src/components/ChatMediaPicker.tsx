import { useEffect, useState } from "react";
import { Smile, Sticker, ImagePlay, X } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Input } from "@/components/ui/input";

/* ------- Static emoji set (curated, no extra deps) ------- */
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "😀",
    emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥳 🤩 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕".split(" "),
  },
  {
    label: "❤️",
    emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️".split(" "),
  },
  {
    label: "👍",
    emojis: "👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👋 🤚 🖐️ ✋ 🖖 👏 🙌 👐 🤲 🙏 🤝 💪 🦵 🦶 👂 👃 🧠 🦷 🦴 👀 👁️ 👅 👄".split(" "),
  },
  {
    label: "🐶",
    emojis: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🦟 🦗 🕷️ 🕸️ 🦂".split(" "),
  },
  {
    label: "🍕",
    emojis: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🦴 🌭 🍔 🍟 🍕 🥪 🥙 🧆 🌮 🌯 🥗 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜".split(" "),
  },
  {
    label: "⚽",
    emojis: "⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🪕 🎻 🎲 ♟️ 🎯 🎳 🎮 🎰".split(" "),
  },
  {
    label: "🚗",
    emojis: "🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🦯 🦽 🦼 🛴 🚲 🛵 🏍️ 🛺 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ ⛽ 🚧 🚦 🚥 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠".split(" "),
  },
  {
    label: "🎉",
    emojis: "🎉 🎊 🎈 🎁 🎀 🪅 🪄 🎂 🎃 🎄 🎆 🎇 ✨ 🪔 🧨 🎐 🎑 🎏 🎎 🎍 🎌 🏮 ⭐ 🌟 💫 ⚡ 🔥 💥 ☄️ ☀️ 🌤️ ⛅ 🌥️ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ ☃️ ⛄ 🌬️ 💨 🌪️ 🌫️ 🌈 ☔ 💧 💦 🌊".split(" "),
  },
];

/* ------- Sticker packs from Telegram-style PNG sets (free CDN) -------
   Using public emoji image sets from twemoji and noto via jsdelivr as scalable stickers.
   These are large transparent PNGs that look like stickers at chat scale. */
const STICKER_PACKS: { name: string; stickers: string[] }[] = [
  {
    name: "Animals",
    stickers: [
      "1f436", "1f431", "1f981", "1f42f", "1f43c", "1f428", "1f43b", "1f438",
      "1f435", "1f648", "1f649", "1f64a", "1f437", "1f42e", "1f414", "1f427",
    ].map((c) => `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/${c}.png`),
  },
  {
    name: "Hearts",
    stickers: [
      "2764", "1f9e1", "1f49b", "1f49a", "1f499", "1f49c", "1f5a4", "1f90d",
      "1f90e", "1f494", "2763", "1f495", "1f49e", "1f493", "1f497", "1f496",
    ].map((c) => `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/${c}.png`),
  },
  {
    name: "Faces",
    stickers: [
      "1f600", "1f602", "1f60d", "1f618", "1f923", "1f929", "1f60e", "1f60a",
      "1f973", "1f917", "1f914", "1f644", "1f60f", "1f624", "1f621", "1f62d",
    ].map((c) => `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/${c}.png`),
  },
  {
    name: "Party",
    stickers: [
      "1f389", "1f38a", "1f388", "1f381", "1f380", "1f382", "1f386", "1f387",
      "2728", "1f31f", "1f4ab", "26a1", "1f525", "1f4a5", "2604", "2600",
    ].map((c) => `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/${c}.png`),
  },
];

/* ------- GIF picker via Tenor public API (no-key fallback to placeholder) ------- */
type GifResult = { id: string; url: string; preview: string };

async function searchGifs(q: string): Promise<GifResult[]> {
  // Use Tenor's free non-keyed v1 endpoint via giphy proxy fallback if needed.
  // Tenor v1 still works without a key for limited use, but we use the public mirror at https://g.tenor.com/v1/search
  const query = encodeURIComponent(q.trim() || "trending");
  const endpoint = q.trim()
    ? `https://g.tenor.com/v1/search?q=${query}&limit=24&media_filter=minimal&contentfilter=high`
    : `https://g.tenor.com/v1/trending?limit=24&media_filter=minimal&contentfilter=high`;
  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error("gif");
    const json = await res.json();
    return (json.results || []).map((r: any) => {
      const media = r.media?.[0] || r.media_formats || {};
      const tinygif = media.tinygif || media.nanogif || media.gif;
      const gif = media.gif || media.tinygif;
      return {
        id: r.id,
        url: gif?.url || tinygif?.url,
        preview: tinygif?.url || gif?.url,
      };
    }).filter((g: GifResult) => g.url);
  } catch {
    return [];
  }
}

type Tab = "emoji" | "stickers" | "gif";

export default function ChatMediaPicker({
  onClose,
  onPickEmoji,
  onPickSticker,
  onPickGif,
}: {
  onClose: () => void;
  onPickEmoji: (e: string) => void;
  onPickSticker: (url: string) => void;
  onPickGif: (url: string) => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("emoji");
  const [gifQ, setGifQ] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);

  useEffect(() => {
    if (tab !== "gif") return;
    let alive = true;
    setGifLoading(true);
    const id = setTimeout(() => {
      searchGifs(gifQ).then((r) => alive && setGifs(r)).finally(() => alive && setGifLoading(false));
    }, 250);
    return () => { alive = false; clearTimeout(id); };
  }, [tab, gifQ]);

  return (
    <div className="border-t border-border bg-popover h-72 flex flex-col animate-fade-in-up">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
        <div className="flex">
          {([
            { k: "emoji" as Tab, icon: Smile, label: t("emoji") },
            { k: "stickers" as Tab, icon: Sticker, label: t("stickers") },
            { k: "gif" as Tab, icon: ImagePlay, label: t("gifs") },
          ]).map(({ k, icon: Icon, label }) => {
            const active = tab === k;
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            );
          })}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary" aria-label="close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {tab === "emoji" && (
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {EMOJI_GROUPS.map((g, i) => (
            <div key={i}>
              <div className="text-xs text-muted-foreground mb-1 px-1">{g.label}</div>
              <div className="grid grid-cols-8 gap-1">
                {g.emojis.map((e) => (
                  <button
                    key={e + i}
                    onClick={() => onPickEmoji(e)}
                    className="text-2xl leading-none p-1.5 rounded-lg hover:bg-secondary"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "stickers" && (
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {STICKER_PACKS.map((p) => (
            <div key={p.name}>
              <div className="text-xs text-muted-foreground mb-1 px-1">{p.name}</div>
              <div className="grid grid-cols-4 gap-2">
                {p.stickers.map((url) => (
                  <button
                    key={url}
                    onClick={() => onPickSticker(url)}
                    className="aspect-square p-2 rounded-xl hover:bg-secondary flex items-center justify-center"
                  >
                    <img src={url} alt="" className="w-full h-full object-contain" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "gif" && (
        <div className="flex-1 flex flex-col">
          <div className="p-2">
            <Input
              value={gifQ}
              onChange={(e) => setGifQ(e.target.value)}
              placeholder={t("search_gifs")}
              className="rounded-full h-9"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {gifLoading && <p className="text-center text-xs text-muted-foreground py-4">…</p>}
            <div className="grid grid-cols-2 gap-2">
              {gifs.map((g) => (
                <button
                  key={g.id}
                  onClick={() => onPickGif(g.url)}
                  className="rounded-xl overflow-hidden bg-secondary"
                >
                  <img src={g.preview} alt="" className="w-full h-24 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
            {!gifLoading && gifs.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">{t("no_results")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
