import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FREE_COINS } from '../../config/balance';
import { useCoinStore } from '../../store/useCoinStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { BulbStrip, MachineScreen } from '../../components/Chrome';
import { ConfettiBurst } from '../../components/Celebration';
import { playSound } from '../../audio/sound';

interface Falling {
  id: number;
  x: number; // 0..100 %
  y: number; // 0..100 %
  vy: number; // %/sec
  gold: boolean;
}

let nextId = 1;
const CUP_Y = 88;
const CATCH_DIST = 9; // % x-distance for a catch

export function FreeCoinsGame() {
  const awardWin = useCoinStore((s) => s.awardWin);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [coins, setCoins] = useState<Falling[]>([]);
  const [cupX, setCupX] = useState(50);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(FREE_COINS.durationSec);
  const [payout, setPayout] = useState(0);
  const [burst, setBurst] = useState(0);
  const areaRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ cupX: 50, coins: [] as Falling[], score: 0 });
  stateRef.current.cupX = cupX;

  const start = useCallback(() => {
    nextId = 1;
    stateRef.current = { cupX: 50, coins: [], score: 0 };
    setCoins([]);
    setCupX(50);
    setScore(0);
    setTimeLeft(FREE_COINS.durationSec);
    setPayout(0);
    setPhase('playing');
    playSound('coin');
  }, []);

  // Game loop.
  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    let spawnAcc = 0;
    let elapsed = 0;
    const speedScale = reduceMotion ? 0.7 : 1;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;
      const remaining = Math.max(0, FREE_COINS.durationSec - elapsed);
      setTimeLeft(Math.ceil(remaining));

      // Spawn.
      spawnAcc += dt * 1000;
      const interval = Math.max(380, FREE_COINS.spawnMs - elapsed * 12);
      const s = stateRef.current;
      if (spawnAcc >= interval) {
        spawnAcc = 0;
        s.coins.push({
          id: nextId++,
          x: 5 + Math.random() * 90,
          y: -4,
          vy: (26 + Math.random() * 14 + elapsed * 0.8) * speedScale,
          gold: Math.random() < FREE_COINS.goldChance,
        });
      }

      // Move + catch.
      let gained = 0;
      s.coins.forEach((c) => { c.y += c.vy * dt; });
      const kept: Falling[] = [];
      for (const c of s.coins) {
        if (c.y >= CUP_Y - 4 && c.y <= CUP_Y + 6 && Math.abs(c.x - s.cupX) < CATCH_DIST) {
          gained += c.gold ? 5 : 1;
          continue;
        }
        if (c.y < 104) kept.push(c);
      }
      s.coins = kept;
      if (gained > 0) {
        s.score += gained;
        setScore(s.score);
        playSound('coin');
      }
      setCoins([...kept]);

      if (remaining <= 0) {
        const total = Math.min(FREE_COINS.maxPayout, Math.max(FREE_COINS.consolation, s.score));
        setPayout(total);
        setPhase('done');
        awardWin(total);
        setBurst((b) => b + 1);
        playSound('fanfare');
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, awardWin, reduceMotion]);

  // Pointer + keyboard cup control.
  const moveCupFromClient = (clientX: number) => {
    const el = areaRef.current;
    if (!el || phase !== 'playing') return;
    const r = el.getBoundingClientRect();
    setCupX(Math.min(96, Math.max(4, ((clientX - r.left) / r.width) * 100)));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'playing') {
        if (e.code === 'Space' || e.key.toLowerCase() === 'n') { e.preventDefault(); start(); }
        return;
      }
      if (e.key === 'ArrowLeft') setCupX((x) => Math.max(4, x - 5));
      else if (e.key === 'ArrowRight') setCupX((x) => Math.min(96, x + 5));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, start]);

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <Link to="/" className="font-pixel text-[10px] text-ink/60 hover:text-ink">← LOBBY</Link>
      <div className="mt-2 pixel-panel-cream p-4 sm:p-5">
        <BulbStrip count={12} />
        <div className="mt-2">
          <MachineScreen text={phase === 'playing' ? `Catch! ${timeLeft}s • ${score} 🪙` : phase === 'done' ? `Time! Won ${payout} 🪙` : 'Coin Catch — 30 seconds, free coins!'} />
        </div>

        <div
          ref={areaRef}
          className="relative mt-3 h-96 overflow-hidden rounded-2xl border-2 border-amber-200/40 bg-gradient-to-b from-[#1c2b3a] to-[#2a1215] select-none"
          style={{ touchAction: 'none' }}
          onPointerMove={(e) => moveCupFromClient(e.clientX)}
          onPointerDown={(e) => moveCupFromClient(e.clientX)}
          role="application"
          aria-label="Coin catch play area. Move pointer or use arrow keys to move the cup."
        >
          {/* falling coins */}
          {coins.map((c) => (
            <span
              key={c.id}
              aria-hidden
              className="absolute text-2xl"
              style={{ left: `${c.x}%`, top: `${c.y}%`, transform: 'translate(-50%,-50%)', filter: c.gold ? 'drop-shadow(0 0 6px gold)' : undefined }}
            >{c.gold ? '🌟' : '🪙'}</span>
          ))}
          {/* cup */}
          <span
            className="absolute text-5xl"
            style={{ left: `${cupX}%`, top: `${CUP_Y}%`, transform: 'translate(-50%,-50%)' }}
            aria-hidden
          >🧺</span>

          {phase === 'idle' && (
            <div className="absolute inset-0 grid place-items-center bg-black/50 p-6 text-center">
              <div>
                <p className="font-display text-2xl font-extrabold">Catch falling coins!</p>
                <p className="mt-1 text-sm text-cream/80">Move the basket with mouse, touch, or ← → keys. Gold stars = 5. {FREE_COINS.durationSec} seconds.</p>
                <button onClick={start} className="btn-chunky mt-3 bg-amber-300 text-red-900 font-display font-extrabold text-xl px-8 py-2.5" aria-label="Start Coin Catch (Space)">
                  Start (free)
                </button>
              </div>
            </div>
          )}
          {phase === 'done' && (
            <div className="absolute inset-0 grid place-items-center bg-black/60 p-6 text-center">
              <div>
                <p className="font-display text-3xl font-extrabold text-green-300">+{payout} 🪙</p>
                <p className="text-sm text-cream/80">Caught {score} coin value. Never stuck!</p>
                <div className="mt-3 flex justify-center gap-2">
                  <button onClick={start} className="btn-chunky bg-amber-300 text-red-900 font-bold px-6 py-2" aria-label="Play again (N)">Again</button>
                  <Link to="/" className="rounded-xl bg-white/15 px-6 py-2 font-bold hover:bg-white/25">Lobby</Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-sm" aria-live="polite">
          <span>⏱ {timeLeft}s</span>
          <span className="font-bold text-amber-700">Caught: {score} 🪙</span>
          {phase === 'playing' && <button onClick={() => setPhase('idle')} className="font-semibold text-ink/60 underline">Quit</button>}
        </div>
      </div>
      <ConfettiBurst key={burst} active={burst > 0 && phase === 'done'} jackpot={false} />
    </div>
  );
}
