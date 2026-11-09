import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { computeLayout, drawGrid, rowAt, type Palette } from '../lib/grid';

const FONT = '"Noto Sans", system-ui, sans-serif';

type Props = {
  rows: number;
  current: number;
  milestones: Set<number>;
  palette: Palette;
  reveal?: boolean; // S3: weave rows in from the top over about 2 seconds
  pulse?: boolean; // gentle single pulse on arrival
  onRevealDone?: () => void;
  onRow?: (age: number) => void;
  label: string; // text summary for screen readers
};

export function GridCanvas({ rows, current, milestones, palette, reveal, pulse, onRevealDone, onRow, label }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [progress, setProgress] = useState(reveal ? 0 : rows);
  const [ring, setRing] = useState(0);
  const doneRef = useRef(onRevealDone);
  doneRef.current = onRevealDone;

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.min(el.clientWidth, 720)));
    ro.observe(el);
    setWidth(Math.min(el.clientWidth, 720));
    return () => ro.disconnect();
  }, []);

  const L = useMemo(() => (width ? computeLayout(width, rows) : null), [width, rows]);

  // Reveal animation, then one pulse on the current week.
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const runPulse = () => {
      if (!pulse) return;
      const t0 = performance.now();
      const step = (now: number) => {
        if (cancelled) return;
        const p = Math.min(1, (now - t0) / 900);
        setRing(p);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    if (reveal) {
      const t0 = performance.now();
      const dur = 2000;
      const step = (now: number) => {
        if (cancelled) return;
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 2);
        setProgress(eased * rows);
        if (p < 1) raf = requestAnimationFrame(step);
        else {
          doneRef.current?.();
          runPulse();
        }
      };
      raf = requestAnimationFrame(step);
    } else {
      setProgress(rows);
      runPulse();
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal, pulse]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !L) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    c.width = Math.round(L.width * dpr);
    c.height = Math.round(L.height * dpr);
    c.style.width = `${L.width}px`;
    c.style.height = `${L.height}px`;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, L.width, L.height);
    drawGrid(ctx, L, { current, milestones, palette, progress, ring, fontFamily: FONT });
  }, [L, current, milestones, palette, progress, ring]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onRow || !L) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onRow(rowAt(L, e.clientY - rect.top));
  };

  return (
    <div className="grid-wrap" ref={wrap}>
      <canvas ref={canvas} role="img" aria-label={label} onClick={onClick} className={onRow ? 'tappable' : undefined} />
    </div>
  );
}
