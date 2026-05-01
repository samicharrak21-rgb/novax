import { forwardRef, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Trash2, Repeat2, BarChart2, Quote } from "lucide-react";
import RichText from "@/components/RichText";
import UserBadge from "@/components/UserBadge";
import QuoteDialog from "@/components/QuoteDialog";
import { timeAgo, formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { repost as doRepost, recordView } from "@/lib/repost";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import type { FeedPost } from "@/lib/feed";

type Props = {
  post: FeedPost;
  isOwn: boolean;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
  onDelete: () => void;
  autoPlay?: boolean;
};

const PostCard = forwardRef<HTMLElement, Props>(function PostCard(
  { post, isOwn, onLike, onSave, onComment, onDelete, autoPlay = false },
  ref,
) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [burst, setBurst] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const lastTap = useRef(0);
  const viewedRef = useRef(false);
  const articleRef = useRef<HTMLElement | null>(null);

  // record a view once when the card scrolls into view
  useEffect(() => {
    if (!user || viewedRef.current) return;
    const el = articleRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !viewedRef.current) {
          viewedRef.current = true;
          recordView(post.id, user.id).catch(() => {});
          io.disconnect();
        }
      });
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [post.id, user]);

  function setRefs(el: HTMLElement | null) {
    articleRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as any).current = el;
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/p/${post.id}`)
      .then(() => toast.success("تم نسخ رابط المنشور"))
      .catch(() => toast.error("تعذّر النسخ"));
  }

  function handleDoubleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!post.liked) onLike();
      setBurst(true);
      setTimeout(() => setBurst(false), 1000);
    }
    lastTap.current = now;
  }

  async function onRepost() {
    if (!user) return;
    try {
      await doRepost(post.id, user.id, post.user_id);
      toast.success("تمت إعادة النشر");
      qc.invalidateQueries({ queryKey: ["feed"] });
    } catch (e: any) {
      toast.error(e?.message || "تعذّر إعادة النشر");
    }
  }

  const author = post.author;
  // For pure reposts, show parent media; for quotes, show own caption + parent card
  const isRepost = post.post_type === "repost" && post.parent_post;
  const isQuote = post.post_type === "quote" && post.parent_post;
  const display = isRepost ? post.parent_post! : post;
  const mediaUrl = display.image_url || display.video_url || undefined;

  return (
    <article ref={setRefs} className="border-b border-border animate-fade-in-up">
      {isRepost && (
        <div className="px-4 pt-2 text-xs text-muted-foreground flex items-center gap-1.5">
          <Repeat2 className="h-3.5 w-3.5" />
          <span>أعاد @{author?.username} النشر</span>
        </div>
      )}

      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          onClick={() => {
            const target = isRepost ? post.parent_post!.author : author;
            if (target) navigate(`/u/${target.username}`);
          }}
          aria-label="ملف الناشر"
        >
          <div className="story-ring">
            <div className="bg-background rounded-full p-0.5">
              <Avatar className="h-9 w-9">
                <AvatarImage src={(isRepost ? post.parent_post!.author?.avatar_url : author?.avatar_url) ?? undefined} />
                <AvatarFallback className="text-xs gradient-brand text-primary-foreground">
                  {((isRepost ? post.parent_post!.author?.username : author?.username) || "؟")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </button>
        <button
          onClick={() => {
            const target = isRepost ? post.parent_post!.author : author;
            if (target) navigate(`/u/${target.username}`);
          }}
          className="flex-1 text-start min-w-0"
        >
          <div className="text-sm font-bold leading-tight flex items-center gap-1 truncate">
            {(isRepost ? post.parent_post!.author?.display_name : author?.display_name) ||
              (isRepost ? post.parent_post!.author?.username : author?.username)}
            <UserBadge
              badge={(isRepost ? post.parent_post!.author?.badge : author?.badge) as any}
              verified={isRepost ? post.parent_post!.author?.verified : author?.verified}
              className="h-3.5 w-3.5"
            />
          </div>
          <div className="text-xs text-muted-foreground truncate">
            @{isRepost ? post.parent_post!.author?.username : author?.username} · {timeAgo(display.created_at)}
          </div>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1" aria-label="المزيد"><MoreHorizontal className="h-5 w-5" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-right">
            <DropdownMenuItem onClick={copyLink}>نسخ الرابط</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/p/${post.id}`)}>فتح المنشور</DropdownMenuItem>
            {isOwn && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 ml-2" /> حذف
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Quote: show own caption above the parent card */}
      {isQuote && post.caption && (
        <div className="px-3 pb-2">
          <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
            <RichText text={post.caption} />
          </p>
        </div>
      )}

      {mediaUrl && (
        <div className="relative bg-secondary cursor-pointer select-none" onClick={handleDoubleTap}>
          {(isRepost ? false : post.is_reel) || display.video_url ? (
            <video
              src={mediaUrl}
              className="w-full max-h-[70vh] object-contain bg-black"
              playsInline
              loop
              controls
              preload="metadata"
              autoPlay={autoPlay}
              muted={autoPlay}
            />
          ) : (
            <img src={mediaUrl} className="w-full max-h-[80vh] object-cover" alt={display.caption || "منشور"} loading="lazy" />
          )}
          {burst && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart className="h-24 w-24 text-white fill-white heart-burst drop-shadow-lg" />
            </div>
          )}
        </div>
      )}

      {/* Quote: link card to parent without media duplication when parent has no media */}
      {isQuote && !mediaUrl && (
        <button
          onClick={() => navigate(`/p/${post.parent_post!.id}`)}
          className="mx-3 mb-2 block w-[calc(100%-1.5rem)] text-start rounded-2xl border border-border p-3 hover:bg-secondary/40 transition"
        >
          <div className="text-xs text-muted-foreground mb-1">
            @{post.parent_post!.author?.username}
          </div>
          <div className="text-sm line-clamp-3">{post.parent_post!.caption || "(منشور بدون نص)"}</div>
        </button>
      )}

      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-4">
            <button onClick={onLike} aria-label="إعجاب" className="flex items-center gap-1.5 group">
              <Heart className={`h-6 w-6 transition-transform group-active:scale-125 ${post.liked ? "fill-ig-red text-ig-red" : "text-foreground"}`} strokeWidth={1.8} />
              {post.like_count > 0 && <span className="text-sm">{formatNumber(post.like_count)}</span>}
            </button>
            <button onClick={onComment} aria-label="تعليقات" className="flex items-center gap-1.5">
              <MessageCircle className="h-6 w-6 -scale-x-100" strokeWidth={1.8} />
              {post.comment_count > 0 && <span className="text-sm">{formatNumber(post.comment_count)}</span>}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="إعادة النشر" className="flex items-center gap-1.5">
                  <Repeat2 className={`h-6 w-6 ${post.reposted ? "text-emerald-500" : ""}`} strokeWidth={1.8} />
                  {post.repost_count > 0 && <span className="text-sm">{formatNumber(post.repost_count)}</span>}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={onRepost}>
                  <Repeat2 className="h-4 w-4 ml-2" /> إعادة نشر
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setQuoteOpen(true)}>
                  <Quote className="h-4 w-4 ml-2" /> اقتباس
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button onClick={copyLink} aria-label="مشاركة"><Send className="h-6 w-6" strokeWidth={1.8} /></button>
            {post.views_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <BarChart2 className="h-4 w-4" />
                {formatNumber(post.views_count)}
              </span>
            )}
          </div>
          <button onClick={onSave} aria-label="حفظ">
            <Bookmark className={`h-6 w-6 ${post.saved ? "fill-foreground" : ""}`} strokeWidth={1.8} />
          </button>
        </div>
        {!isQuote && !isRepost && post.caption && (
          <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
            <RichText text={post.caption} />
          </p>
        )}
        {isRepost && post.parent_post?.caption && (
          <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
            <RichText text={post.parent_post.caption} />
          </p>
        )}
      </div>

      {user && (
        <QuoteDialog post={post} currentUserId={user.id} open={quoteOpen} onOpenChange={setQuoteOpen} />
      )}
    </article>
  );
});

export default PostCard;
