import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import Check from "lucide-react/dist/esm/icons/check";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Inside the Android app the WebView's origin is https://localhost, not the
// real site — shared links must always point at the public site instead.
const PUBLIC_SITE_ORIGIN = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, "");

export function ShareButton({ id, name, type = "clinic", className, variant = "default" }: { id: string; name: string; type?: "clinic" | "category"; className?: string, variant?: "default" | "icon" }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const origin = Capacitor.isNativePlatform() && PUBLIC_SITE_ORIGIN
      ? PUBLIC_SITE_ORIGIN
      : window.location.origin;
    const shareUrl = `${origin}/s/${type}/${id}`;

    if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: type === "clinic" ? `${name} — دليل العيادات` : `عيادات ${name} — دليل العيادات`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fallback to copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("تم نسخ الرابط بنجاح!");
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy", e);
      toast.error("فشل نسخ الرابط");
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleShare}
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/70 active:scale-95",
          className
        )}
        aria-label="شارك العيادة"
      >
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className={cn(
        "flex h-12 flex-row items-center justify-center gap-2 rounded-xl font-bold bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/70",
        className
      )}
      aria-label="شارك العيادة"
    >
      {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
      <span className="text-sm">{copied ? "اتنسخ!" : "شارك"}</span>
    </button>
  );
}
