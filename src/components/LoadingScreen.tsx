import { useEffect, useState } from 'react';

export function LoadingScreen({ label = 'Loading the circus...' }: { label?: string }) {
  const [pct, setPct] = useState(8);
  useEffect(() => {
    const t = window.setInterval(() => {
      setPct((p) => Math.min(92, p + Math.random() * 18));
    }, 300);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center" role="status" aria-label={label}>
      <p className="font-display text-4xl" aria-hidden>🎪</p>
      <p className="font-display mt-2 text-xl font-extrabold">{label}</p>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/40" aria-hidden>
        <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
