import { BadgeCheck, Crown, ShieldCheck } from "lucide-react";

export type BadgeKind = "none" | "blue" | "yellow" | "gold" | null;

/** Visual badge next to a username. Falls back to legacy `verified` boolean. */
export default function UserBadge({
  badge,
  verified,
  className = "h-4 w-4",
}: {
  badge?: BadgeKind | string | null;
  verified?: boolean | null;
  className?: string;
}) {
  // Resolve effective kind
  let kind: BadgeKind = (badge as BadgeKind) || null;
  if (!kind && verified) kind = "blue";
  if (!kind || kind === "none") return null;

  if (kind === "yellow") {
    return (
      <BadgeCheck
        className={className}
        style={{ color: "hsl(var(--background))", fill: "hsl(45 95% 55%)" }}
        aria-label="verified-business"
      />
    );
  }
  if (kind === "gold") {
    return (
      <Crown
        className={className}
        style={{ color: "hsl(45 95% 55%)", fill: "hsl(45 95% 55%)" }}
        aria-label="vip"
      />
    );
  }
  if (kind === "blue") {
    return (
      <BadgeCheck
        className={className}
        style={{ color: "hsl(var(--background))", fill: "hsl(var(--primary))" }}
        aria-label="verified"
      />
    );
  }
  // unknown custom value -> generic shield
  return <ShieldCheck className={className} aria-label="badge" />;
}
