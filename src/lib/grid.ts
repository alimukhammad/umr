// Canvas drawing of the woven grid, shared by the screen (S3, S4) and the share image (S10).
// Spacing follows Bryan Braun's ratio: the gap is half a cell.

export type Palette = {
  bg: string;
  text: string;
  quiet: string;
  lived: string;
  now: string;
  milestone: string;
  open: string;
};

export const PALETTES: Record<'light' | 'dark', Palette> = {
  light: { bg: '#F6F1E7', text: '#1E2530', quiet: '#5B6470', lived: '#1F4E8C', now: '#A62B3F', milestone: '#0F766E', open: '#8A7D69' },
  dark: { bg: '#12171F', text: '#F2ECDF', quiet: '#A9B1BC', lived: '#3FB8AF', now: '#F0B93A', milestone: '#E8707F', open: '#6B7482' },
};

export const AVERAGE_AGE = 75; // Uzbekistan's official life expectancy at birth, 2024 (75.1, rounded)

export type Layout = {
  x0: number; // left edge of week 0
  y0: number; // top edge of age 0
  pitch: number; // cell + gap
  cell: number;
  decadeGap: number;
  rows: number;
  gutter: number;
  width: number;
  height: number;
};

export function computeLayout(width: number, rows: number, opts: { gutter?: number; maxPitch?: number; top?: number } = {}): Layout {
  const desktop = width >= 600;
  const gutter = opts.gutter ?? (desktop ? 28 : 16);
  const maxPitch = opts.maxPitch ?? 12;
  const top = opts.top ?? (desktop ? 16 : 2);
  const pitch = Math.min(maxPitch, (width - gutter - 2) / 52);
  const cell = (pitch * 2) / 3;
  const decadeGap = pitch >= 10 ? 6 : pitch >= 5 ? 4 : 2;
  const gridW = pitch * 52;
  const x0 = gutter + Math.max(0, (width - gutter - gridW) / 2);
  const height = top + rows * pitch + Math.floor((rows - 1) / 10) * decadeGap + 4;
  return { x0, y0: top, pitch, cell, decadeGap, rows, gutter, width, height };
}

export const rowY = (L: Layout, age: number) => L.y0 + age * L.pitch + Math.floor(age / 10) * L.decadeGap;
export const colX = (L: Layout, week: number) => L.x0 + week * L.pitch;

/** Nearest row to a y coordinate (a tap opens the nearest year). */
export function rowAt(L: Layout, y: number) {
  let best = 0;
  let bestD = Infinity;
  for (let r = 0; r < L.rows; r++) {
    const d = Math.abs(rowY(L, r) + L.cell / 2 - y);
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

export type DrawOpts = {
  current: number; // life week index of this week
  milestones: Set<number>;
  palette: Palette;
  progress?: number; // rows woven so far (fractional), for the reveal
  ring?: number; // 0..1 extra ring radius for the single arrival pulse
  labels?: boolean;
  fontFamily?: string;
  showAverage?: boolean;
  labelSize?: number;
  /** Week → emoji image, drawn as a pin on a background-coloured disc. */
  pins?: Map<number, CanvasImageSource>;
  /** Pin size in CSS px. Design brief: 7 on phones, 11 on desktop, 40 on the share image. */
  pinSize?: number;
};

export const pinSizeFor = (L: Layout) => (L.pitch >= 10 ? 11 : 7);

export function drawGrid(ctx: CanvasRenderingContext2D, L: Layout, o: DrawOpts) {
  const { palette: P, current } = o;
  const progress = o.progress ?? L.rows;
  const lineW = Math.max(0.6, L.cell * 0.16);

  for (let r = 0; r < L.rows; r++) {
    if (r >= progress) break;
    const y = rowY(L, r);
    const cols = r + 1 <= progress ? 52 : Math.floor((progress - r) * 52);
    for (let w = 0; w < cols; w++) {
      const i = r * 52 + w;
      const x = colX(L, w);
      if (o.milestones.has(i)) {
        ctx.fillStyle = P.milestone;
        ctx.fillRect(x, y, L.cell, L.cell);
      } else if (i < current) {
        ctx.fillStyle = P.lived;
        ctx.fillRect(x, y, L.cell, L.cell);
      } else if (i === current) {
        ctx.fillStyle = P.now;
        ctx.fillRect(x, y, L.cell, L.cell);
      } else {
        ctx.strokeStyle = P.open;
        ctx.lineWidth = lineW;
        ctx.strokeRect(x + lineW / 2, y + lineW / 2, L.cell - lineW, L.cell - lineW);
      }
    }
  }

  // Line at the national average. A fact about the country, never highlighted or animated.
  if (o.showAverage !== false && AVERAGE_AGE < L.rows && progress >= L.rows) {
    const y = rowY(L, AVERAGE_AGE) - (L.pitch - L.cell) / 2;
    ctx.strokeStyle = P.quiet;
    ctx.lineWidth = Math.max(0.75, L.pitch * 0.08);
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(L.x0 - 2, y);
    ctx.lineTo(colX(L, 51) + L.cell + 2, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Emoji pins sit above the cells. Too big for a cell, so each sits on a small disc.
  if (o.pins && o.pins.size && progress >= L.rows) {
    const size = o.pinSize ?? pinSizeFor(L);
    for (const [i, img] of o.pins) {
      const r = Math.floor(i / 52);
      if (r >= L.rows) continue;
      const cx = colX(L, i % 52) + L.cell / 2;
      const cy = rowY(L, r) + L.cell / 2;
      ctx.fillStyle = P.bg;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    }
  }

  // Ring around this week: always drawn last, above everything (including emoji).
  if (current < L.rows * 52 && progress * 52 > current) {
    const cx = colX(L, current % 52) + L.cell / 2;
    const cy = rowY(L, Math.floor(current / 52)) + L.cell / 2;
    const base = L.cell / 2 + L.pitch * 0.45;
    ctx.strokeStyle = P.now;
    ctx.lineWidth = Math.max(1, L.pitch * 0.2);
    ctx.beginPath();
    ctx.arc(cx, cy, base, 0, Math.PI * 2);
    ctx.stroke();
    if (o.ring && o.ring > 0 && o.ring < 1) {
      ctx.globalAlpha = 1 - o.ring;
      ctx.beginPath();
      ctx.arc(cx, cy, base + o.ring * L.pitch * 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  if (o.labels !== false && progress >= L.rows) {
    const size = o.labelSize ?? Math.max(8, Math.min(12, L.pitch * 1.25));
    ctx.font = `${size}px ${o.fontFamily ?? 'sans-serif'}`;
    ctx.fillStyle = P.quiet;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let a = 10; a < L.rows; a += 10) {
      ctx.fillText(String(a), L.x0 - Math.max(3, L.pitch * 0.5), rowY(L, a) + L.cell / 2);
    }
    if (AVERAGE_AGE < L.rows && AVERAGE_AGE % 10 !== 0) {
      ctx.fillText(String(AVERAGE_AGE), L.x0 - Math.max(3, L.pitch * 0.5), rowY(L, AVERAGE_AGE) + L.cell / 2);
    }
    // Desktop: week marks at 25 and 50 along the top.
    if (L.y0 >= 14) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      for (const w of [1, 25, 50]) ctx.fillText(String(w), colX(L, w - 1) + L.cell / 2, L.y0 - 3);
    }
  }
}
