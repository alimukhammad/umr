import { computeLayout, drawGrid, type Palette } from './grid';

// Phone wallpaper of the person's grid. Made on the device; carries no name, birth date or notes,
// only a quiet "Week N of age A" line.

export type WallpaperMode = 'lock' | 'home';

/** Room left free for what the phone draws on top. */
const SAFE: Record<WallpaperMode, { top: number; bottom: number }> = {
  lock: { top: 0.36, bottom: 0.12 }, // big clock and date at the top, torch/camera buttons at the bottom
  home: { top: 0.08, bottom: 0.17 }, // status bar at the top, the dock at the bottom
};

/** The screen's real pixel size; a tall phone size when opened on a computer. */
export function wallpaperSize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 4);
  let w = Math.round(window.screen.width * dpr);
  let h = Math.round(window.screen.height * dpr);
  if (w > h) [w, h] = [h, w];
  if (h / w < 1.6 || w < 640) return { width: 1179, height: 2556 }; // computer or odd screen: iPhone-sized
  return { width: Math.min(w, 1600), height: Math.min(h, 3600) };
}

export type WallpaperInput = {
  width: number;
  height: number;
  mode: WallpaperMode;
  palette: Palette;
  rows: number;
  current: number;
  milestones: Set<number>;
  pins: Map<number, CanvasImageSource>;
  line: string;
  fontFamily?: string;
};

export function drawWallpaper(ctx: CanvasRenderingContext2D, o: WallpaperInput) {
  const { width: W, height: H, palette: P } = o;
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, W, H);

  const safe = SAFE[o.mode];
  const top = H * safe.top;
  const bottom = H * (1 - safe.bottom);
  const textBox = H * 0.05;
  const availH = bottom - top - textBox;
  const marginX = W * 0.09;
  const decades = Math.floor((o.rows - 1) / 10);

  // Biggest pitch that fits both the width and the height, with the gap half a cell.
  let pitch = (W - 2 * marginX) / 52;
  const decadeGap = (p: number) => (p >= 10 ? Math.round(p * 0.5) : 4);
  while (pitch > 2 && o.rows * pitch + decades * decadeGap(pitch) + 4 > availH) pitch -= 0.25;

  const L0 = computeLayout(pitch * 52 + 2, o.rows, { gutter: 0, maxPitch: pitch, top: 0 });
  const L = { ...L0, decadeGap: decadeGap(pitch) };
  const gridH = o.rows * L.pitch + decades * L.decadeGap;
  const gx = (W - 52 * L.pitch + (L.pitch - L.cell)) / 2;
  const gy = top + (availH - gridH) / 2;

  ctx.save();
  ctx.translate(gx - L.x0, gy - L.y0);
  drawGrid(ctx, L, {
    current: o.current,
    milestones: o.milestones,
    palette: P,
    labels: false,
    pins: o.pins,
    pinSize: Math.max(10, L.pitch * 1.15),
  });
  // A bigger ring around this week, so the mark is easy to find on a small screen.
  if (o.current < o.rows * 52) {
    const r = Math.floor(o.current / 52);
    const cx = L.x0 + (o.current % 52) * L.pitch + L.cell / 2;
    const cy = L.y0 + r * L.pitch + Math.floor(r / 10) * L.decadeGap + L.cell / 2;
    ctx.strokeStyle = P.now;
    ctx.lineWidth = Math.max(2, L.pitch * 0.22);
    ctx.beginPath();
    ctx.arc(cx, cy, L.pitch * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = P.quiet;
  ctx.font = `${Math.round(H * 0.017)}px ${o.fontFamily ?? '"Noto Sans", system-ui, sans-serif'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(o.line, W / 2, gy + gridH + textBox * 0.6);
}
