import { useEffect, useRef, useState } from 'react';
import { motion, animate, AnimatePresence } from 'framer-motion';
import { useCoinStore } from '../store/useCoinStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { PixelArt } from './PixelArt';

export function CoinCounter() {
  const balance = useCoinStore((s) => s.balance);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const [display, setDisplay] = useState(balance);
  const [delta, setDelta] = useState<{ id: number; amount: number } | null>(null);
  const prev = useRef(balance);

  useEffect(() => {
    const controls = animate(display, balance, {
      duration: reduceMotion ? 0 : 0.5,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    const diff = balance - prev.current;
    prev.current = balance;
    if (diff !== 0) {
      const id = Date.now();
      setDelta({ id, amount: diff });
      const t = window.setTimeout(() => setDelta((d) => (d?.id === id ? null : d)), 1200);
      return () => { controls.stop(); window.clearTimeout(t); };
    }
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance]);

  return (
    <div className="relative" aria-live="polite" aria-label={`Coin balance ${display}`}>
      <div className="flex items-center gap-2 rounded-full border-[3px] border-ink bg-mint px-3 py-1 shadow-[0_3px_0_rgba(43,33,24,1)]">
        <motion.span
          key={balance}
          initial={reduceMotion ? false : { scale: 1.4, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="inline-flex"
          aria-hidden
        >
          <PixelArt name="coin" size={22} label="" shadow={false} />
        </motion.span>
        <span className="font-pixel text-xs text-ink tabular-nums">{display}</span>
      </div>
      <AnimatePresence>
        {delta && (
          <motion.span
            key={delta.id}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: delta.amount > 0 ? -28 : 28 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.9 }}
            aria-hidden
            className={`pointer-events-none absolute left-1/2 -translate-x-1/2 font-display text-sm font-extrabold whitespace-nowrap ${
              delta.amount > 0 ? 'text-green-600' : 'text-red-500'
            }`}
          >{delta.amount > 0 ? `+${delta.amount}` : `${delta.amount}`}</motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
