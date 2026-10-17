import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../store/useSettingsStore';

// Lightweight confetti + coin rain (no extra deps). Respects reduceMotion.
export function ConfettiBurst({ active, jackpot }: { active: boolean; jackpot: boolean }) {
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  if (!active || reduceMotion) return null;
  const pieces = Array.from({ length: jackpot ? 80 : 40 });
  const colors = ['#ffd166', '#ef476f', '#06d6a0', '#fff6e5', '#2ec4b6', '#c1272d'];
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((_, i) => (
        <motion.span
          key={i}
          initial={{ x: window.innerWidth / 2, y: window.innerHeight / 3, scale: 1, opacity: 1 }}
          animate={{
            x: window.innerWidth / 2 + (Math.random() - 0.5) * window.innerWidth,
            y: window.innerHeight * (0.4 + Math.random() * 0.7),
            rotate: Math.random() * 720,
            opacity: 0,
          }}
          transition={{ duration: 1.4 + Math.random(), ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: jackpot ? 10 : 8,
            height: jackpot ? 14 : 10,
            background: colors[i % colors.length],
            borderRadius: i % 3 === 0 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

export function CoinRain({ active }: { active: boolean }) {
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  if (!active || reduceMotion) return null;
  const coins = Array.from({ length: 24 });
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {coins.map((_, i) => (
        <motion.span
          key={i}
          initial={{ x: Math.random() * window.innerWidth, y: -40 }}
          animate={{ y: window.innerHeight + 60, rotate: 360 }}
          transition={{ duration: 1.6 + Math.random() * 1.2, delay: Math.random() * 0.6, ease: 'easeIn' }}
          style={{ position: 'absolute', fontSize: 28 }}
        >🪙</motion.span>
      ))}
    </div>
  );
}

export function BigWinOverlay({ amount, jackpot, onDone }: { amount: number; jackpot: boolean; onDone: () => void }) {
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (reduceMotion) {
      setCount(amount);
      const t = setTimeout(onDone, 1800);
      return () => clearTimeout(t);
    }
    const start = performance.now();
    const dur = jackpot ? 2200 : 1400;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setCount(Math.round(amount * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
      else setTimeout(onDone, jackpot ? 1200 : 500);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [amount, jackpot, onDone, reduceMotion]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 grid place-items-center bg-black/60"
        role="alert"
        aria-live="assertive"
      >
        <div className="text-center">
          <motion.div
            animate={reduceMotion ? undefined : { scale: [1, 1.15, 1], rotate: jackpot ? [0, -2, 2, 0] : 0 }}
            transition={{ repeat: Infinity, duration: 0.7 }}
            className={`font-display font-extrabold ${jackpot ? 'text-6xl text-amber-300' : 'text-5xl text-green-300'}`}
            style={{ textShadow: '0 0 30px rgba(57,255,136,0.8)' }}
          >
            {jackpot ? '🎪 JACKPOT! 🎪' : 'BIG WIN!'}
          </motion.div>
          <div className="font-display text-4xl font-bold text-cream mt-2 tabular-nums">+{count} 🪙</div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
