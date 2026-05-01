export function timeAgo(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `منذ ${s} ث`;
  const m = Math.floor(s / 60);
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  const days = Math.floor(h / 24);
  if (days < 7) return `منذ ${days} ي`;
  if (days < 30) return `منذ ${Math.floor(days / 7)} أسبوع`;
  if (days < 365) return `منذ ${Math.floor(days / 30)} شهر`;
  return `منذ ${Math.floor(days / 365)} سنة`;
}

export function formatNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "") + "K";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}
