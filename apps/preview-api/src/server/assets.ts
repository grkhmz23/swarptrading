import { createHash } from "node:crypto";

/** Round token icon with the ticker's initials; colour derived from the ticker. */
export function tokenSvg(ticker: string): string {
  const label = ticker.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "?";
  const hue = createHash("sha256").update(label).digest().readUInt16LE(0) % 360;
  const fontSize = label.length > 2 ? 22 : 28;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue},70%,55%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},65%,35%)"/>
</linearGradient></defs>
<circle cx="48" cy="48" r="48" fill="url(#g)"/>
<text x="48" y="48" dy="0.35em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#fff">${label}</text>
</svg>`;
}
