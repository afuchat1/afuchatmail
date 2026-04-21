// Gmail/Yahoo-style avatar helpers: deterministic background color + initials fallback.

const PALETTE = [
  "#0052ff", "#7c3aed", "#db2777", "#ea580c", "#16a34a",
  "#0891b2", "#9333ea", "#dc2626", "#ca8a04", "#0d9488",
  "#1d4ed8", "#be185d", "#c2410c", "#15803d", "#7e22ce",
];

/** Pick a stable color from a string seed (user id, email, etc.). */
export function avatarColor(seed: string | null | undefined): string {
  if (!seed) return PALETTE[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/** Two-letter initials from a name; falls back to first letter of the email. */
export function initials(name?: string | null, email?: string | null): string {
  const n = (name ?? "").trim();
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  const e = (email ?? "").trim();
  if (e) return e[0]?.toUpperCase() ?? "?";
  return "?";
}
