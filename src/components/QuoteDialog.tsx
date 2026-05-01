import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { quotePost } from "@/lib/repost";
import { toast } from "sonner";
import type { FeedPost } from "@/lib/feed";

type Props = {
  post: FeedPost;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
};

export default function QuoteDialog({ post, currentUserId, open, onOpenChange, onDone }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await quotePost(post.id, currentUserId, post.user_id, text.trim());
      toast.success("تم نشر الاقتباس");
      setText("");
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر النشر");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>اقتباس منشور</DialogTitle></DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="أضف تعليقك..."
          rows={4}
          className="resize-none"
          maxLength={500}
        />
        <div className="rounded-2xl border border-border p-3 text-sm">
          <div className="font-semibold mb-1">@{post.author?.username}</div>
          <div className="text-muted-foreground line-clamp-3">{post.caption || "(بدون نص)"}</div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={busy || !text.trim()}>نشر الاقتباس</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
