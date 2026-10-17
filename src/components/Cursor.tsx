import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { PixelArt } from './PixelArt';
import { useSettingsStore } from '../store/useSettingsStore';

interface Particle {
  dx: number;
  dy: number;
  c: string;
  ch: string;
}
interface Burst {
  id: number;
  x: number;
  y: number;
  parts: Particle[];
}

const BURST_COLORS = ['#ffd166', '#2b2118', '#2ec4b6', '#ef476f'];
const SELECTOR = 'button, a, input, select, textarea, canvas, [role="button"]';

// Pixel coin cursor follower (desktop pointers only). Native cursor is
// hidden via body.cursor-fun; clicks still land 1:1 under the coin.
export function PixelCursor() {
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const [fine, setFine] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const cursorRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const downRef = useRef(false);
  const posRef = useRef({ x: -100, y: -100 });

  useEffect(() => {
    if (!window.matchMedia?.('(pointer: fine)').matches) return;
    setFine(true);
    document.body.classList.add('cursor-fun');

    const onMove = (e: PointerEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      const t = e.target as HTMLElement | null;
      hoverRef.current = !!t?.closest?.(SELECTOR);
    };
    const onDown = (e: PointerEvent) => {
      downRef.current = true;
      if (reduceMotion) return;
      const id = Date.now() + Math.random();
      const parts: Particle[] = Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
        const d = 22 + Math.random() * 26;
        return {
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d,
          c: BURST_COLORS[i % BURST_COLORS.length],
          ch: i % 2 ? '✦' : '＋',
        };
      });
      setBursts((b) => [...b.slice(-6), { id, x: e.clientX, y: e.clientY, parts }]);
      window.setTimeout(() => setBursts((b) => b.filter((p) => p.id !== id)), 550);
    };
    const onUp = () => {
      downRef.current = false;
    };

    let raf = 0;
    const loop = () => {
      const el = cursorRef.current;
      if (el) {
        const s = downRef.current ? 0.8 : hoverRef.current ? 1.5 : 1;
        el.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px) translate(-50%, -50%) scale(${s})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    return () => {
      cancelAnimationFrame(raf);
      document.body.classList.remove('cursor-fun');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, [reduceMotion]);

  if (!fine) return null;
  return (
    <>
      <div ref={cursorRef} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[9999] will-change-transform">
        <PixelArt name="coin" size={30} label="" />
      </div>
      {bursts.map((b) => (
        <div key={b.id} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[9999]">
          {b.parts.map((p, i) => (
            <span
              key={i}
              className="cursor-burst"
              style={{ left: b.x, top: b.y, color: p.c, '--dx': `${p.dx}px`, '--dy': `${p.dy}px` } as CSSProperties}
            >
              {p.ch}
            </span>
          ))}
        </div>
      ))}
    </>
  );
}
