import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SLOTS, type SlotSymbolId } from '../../config/balance';
import { evalSpin, spinReels, type Grid } from './logic';
import { useCoinStore } from '../../store/useCoinStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { BetSelector, BulbStrip, MachineScreen } from '../../components/Chrome';
import { BigWinOverlay, CoinRain, ConfettiBurst } from '../../components/Celebration';
import { playSound } from '../../audio/sound';

const IDLE_GRID: Grid = [
  ['seven', 'cherry', 'bell'],
  ['bell', 'star', 'cherry'],
  ['star', 'frog', 'seven'],
  ['frog', 'bear', 'star'],
  ['bear', 'seven', 'frog'],
];

const SYMBOLS = SLOTS.symbols as readonly SlotSymbolId[];

function randomSymbol(): SlotSymbolId {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function ReelColumn({ reel, spinning, stopped, cell, highlight, dim }: {
  reel: number; spinning: boolean; stopped: boolean; cell: SlotSymbolId[]; highlight: boolean[]; dim: boolean;
}) {
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const [flicker, setFlicker] = useState<SlotSymbolId[]>(cell);

  useEffect(() => {
    if (!spinning || stopped || reduceMotion) return;
    const t = setInterval(() => {
      playSoundTick();
      setFlicker([randomSymbol(), randomSymbol(), randomSymbol()]);
    }, 90 + reel * 15);
    return () => clearInterval(t);
  }, [spinning, stopped, reel, reduceMotion]);

  const shown = spinning && !stopped && !reduceMotion ? flicker : cell;

  return (
    <div className={`flex flex-col gap-1 rounded-xl bg-cream p-1.5 shadow-inner ${dim ? 'opacity-60' : ''}`}>
      {shown.map((sym, row) => {
        const hot = highlight[row];
        return (
          <motion.div
            key={`${reel}-${row}-${stopped ? sym : 'spin'}`}
            initial={false}
            animate={stopped && !reduceMotion ? { scale: [1.35, 1], rotate: [6, 0] } : {}}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            aria-label={`Reel ${reel + 1} row ${row + 1}: ${sym}`}
            className={`grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-lg text-4xl sm:text-5xl border-2 ${
              hot ? 'bg-green-200 border-green-500 shadow-[0_0_18px_rgba(57,255,136,0.9)]' : 'bg-white border-amber-900/20'
            } ${spinning && !stopped && !reduceMotion ? 'blur-[0.6px]' : ''}`}
          >
            <span aria-hidden>{SLOTS.meta[sym].emoji}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

let lastTick = 0;
function playSoundTick() {
  const now = Date.now();
  if (now - lastTick > 120) {
    lastTick = now;
    playSound('tick');
  }
}

export function SlotsGame() {
  const bet = useCoinStore((s) => s.bet);
  const balance = useCoinStore((s) => s.balance);
  const winStreak = useCoinStore((s) => s.winStreak);
  const placeBet = useCoinStore((s) => s.placeBet);
  const awardWin = useCoinStore((s) => s.awardWin);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);

  const [grid, setGrid] = useState<Grid>(IDLE_GRID);
  const [spinning, setSpinning] = useState(false);
  const [stoppedReels, setStoppedReels] = useState(5);
  const [screen, setScreen] = useState('Waiting for coin fall...');
  const [winCells, setWinCells] = useState<Set<string>>(new Set());
  const [lastResult, setLastResult] = useState<{ win: number; jackpot: boolean } | null>(null);
  const [auto, setAuto] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [showPaytable, setShowPaytable] = useState(false);
  const [shake, setShake] = useState(false);
  const [overlay, setOverlay] = useState<{ amount: number; jackpot: boolean } | null>(null);
  const timers = useRef<number[]>([]);
  // Predetermined win of the in-flight spin; credited on unmount if the
  // player leaves before the reels stop, so a paid spin never vanishes.
  const pendingWin = useRef<number | null>(null);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => () => {
    clearTimers();
    if (pendingWin.current) {
      useCoinStore.getState().awardWin(pendingWin.current);
      pendingWin.current = null;
    }
  }, []);

  const stopDelays = useMemo(() => {
    const div = turbo ? 3 : 1;
    return [0, 1, 2, 3, 4].map((i) => Math.max(120, (SLOTS.baseStopMs + i * SLOTS.stepMs) / div));
  }, [turbo]);

  const doSpin = useCallback(() => {
    if (spinning) return;
    if (!placeBet(bet)) {
      setScreen('Not enough coins — grab free coins!');
      playSound('lose');
      return;
    }
    playSound('coin');
    const { grid: result, isNearMiss } = (() => {
      const s = spinReels();
      return { grid: s.grid, isNearMiss: s.forcedNearMiss || evalSpin(s.grid, bet).isNearMiss };
    })();
    const evaluation = evalSpin(result, bet);
    pendingWin.current = evaluation.totalWin > 0 ? evaluation.totalWin : null;

    setSpinning(true);
    setStoppedReels(0);
    setWinCells(new Set());
    setLastResult(null);
    setScreen(turbo ? 'Turbo spin...' : 'Spinning...');

    if (reduceMotion) {
      finishSpin(result, evaluation, bet);
      return;
    }

    // Reveal reels sequentially; last reel slows on near-miss tension.
    const extra = isNearMiss && !turbo ? SLOTS.nearMissExtraMs : 0;
    if (isNearMiss && !turbo) setScreen('So close... last reel slowing!');
    result.forEach((_, reel) => {
      const delay = stopDelays[reel] + (reel === 4 ? extra : 0);
      const id = window.setTimeout(() => {
        setGrid((prev) => {
          const next = prev.map((col) => [...col]) as Grid;
          next[reel] = [...result[reel]];
          return next;
        });
        setStoppedReels(reel + 1);
        playSound('thunk');
        if (reel === 4) finishSpin(result, evaluation, bet);
      }, delay);
      timers.current.push(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, bet, turbo, reduceMotion, stopDelays]);

  function finishSpin(result: Grid, evaluation: ReturnType<typeof evalSpin>, currentBet: number) {
    pendingWin.current = null;
    setGrid(result);
    setStoppedReels(5);
    setSpinning(false);
    if (evaluation.totalWin > 0) {
      awardWin(evaluation.totalWin);
      setWinCells(evaluation.winningCells);
      setLastResult({ win: evaluation.totalWin, jackpot: evaluation.isJackpot });
      const big = evaluation.totalWin >= currentBet * 8;
      if (evaluation.isJackpot) {
        setScreen(`JACKPOT! +${evaluation.totalWin} coins!`);
        playSound('fanfare');
        setOverlay({ amount: evaluation.totalWin, jackpot: true });
        triggerShake();
      } else if (big) {
        setScreen(`Big win! +${evaluation.totalWin} coins`);
        playSound('fanfare');
        setOverlay({ amount: evaluation.totalWin, jackpot: false });
        triggerShake();
      } else {
        setScreen(`Won +${evaluation.totalWin}! Lines: ${evaluation.wins.map((w) => `#${w.lineIndex + 1} x${w.count}`).join(', ')}`);
        playSound('win');
      }
    } else {
      setScreen(evaluation.isNearMiss ? 'Oooh — almost! Two 7s, so close.' : 'No win — spin again!');
      if (evaluation.isNearMiss) playSound('lose');
      // Reset streak display on loss (store keeps streak via awardWin(0) semantics).
      useCoinStore.setState({ winStreak: 0 });
    }
  }

  function triggerShake() {
    if (reduceMotion) return;
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  // Auto-spin loop.
  useEffect(() => {
    if (!auto || spinning || overlay) return;
    if (balance < bet) {
      setAuto(false);
      setScreen('Auto stopped — not enough coins.');
      return;
    }
    const t = window.setTimeout(() => doSpin(), turbo ? 700 : 1800);
    return () => window.clearTimeout(t);
  }, [auto, spinning, overlay, balance, bet, turbo, doSpin]);

  // Keyboard: Space spin, A auto, T turbo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement)?.closest('input,select,textarea')) {
        e.preventDefault();
        doSpin();
      } else if (e.key.toLowerCase() === 'a') setAuto((v) => !v);
      else if (e.key.toLowerCase() === 't') setTurbo((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doSpin]);

  const bigWinActive = lastResult !== null && lastResult.win >= bet * 8;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link to="/" className="font-pixel text-[10px] text-ink/60 hover:text-ink">← LOBBY</Link>
      <div className={`mt-2 pixel-panel-cream p-4 sm:p-5 ${shake ? 'shake' : ''}`}>
        {null}
        <BulbStrip count={16} />
        <div className="mt-2"><MachineScreen text={`${screen}  •  Bet ${bet}  •  Last win ${lastResult?.win ?? 0}`} /></div>

        {winStreak >= 2 && (
          <p className="mt-1 text-center text-sm font-bold text-green-700" aria-live="polite">🔥 Win streak x{winStreak}</p>
        )}

        <div className="mt-4 flex justify-center gap-2" role="grid" aria-label="Slot reels">
          {grid.map((col, reel) => {
            const highlights = [0, 1, 2].map((row) => winCells.has(`${reel}:${row}`));
            return (
              <ReelColumn
                key={reel}
                reel={reel}
                spinning={spinning}
                stopped={reel < stoppedReels}
                cell={col}
                highlight={highlights}
                dim={winCells.size > 0 && !highlights.some(Boolean)}
              />
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <BetSelector />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={doSpin}
            disabled={spinning}
            aria-label="Spin (Space)"
            className="btn-chunky bg-amber-300 text-red-900 font-display font-extrabold text-xl px-10 py-3 disabled:opacity-50"
          >{spinning ? '...' : `SPIN ${bet} 🪙`}</button>
          <button
            onClick={() => { setAuto((v) => !v); playSound('click'); }}
            aria-pressed={auto}
            aria-label="Auto-spin toggle (A)"
            className={`btn-soft px-4 py-2 ${auto ? 'btn-soft-on-green' : ''}`}
          >Auto {auto ? 'ON' : 'OFF'}</button>
          <button
            onClick={() => { setTurbo((v) => !v); playSound('click'); }}
            aria-pressed={turbo}
            aria-label="Turbo toggle (T)"
            className={`btn-soft px-4 py-2 ${turbo ? 'btn-soft-on-teal' : ''}`}
          >Turbo {turbo ? 'ON' : 'OFF'}</button>
        </div>

        <button
          onClick={() => setShowPaytable((v) => !v)}
          className="mx-auto mt-3 block text-sm font-semibold text-ink/60 underline"
          aria-expanded={showPaytable}
        >{showPaytable ? 'Hide paytable' : 'Paytable (5 lines, 3+ from left)'}</button>
        {showPaytable && (
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            {(Object.entries(SLOTS.meta) as Array<[SlotSymbolId, { emoji: string; pay3: number; pay4: number; pay5: number }]>).map(([id, m]) => (
              <div key={id} className="rounded-lg bg-white/80 border-2 border-ink/15 px-2 py-1.5 text-center">
                <span className="text-xl">{m.emoji}</span>
                <div className="text-ink/80 font-semibold">x3 {m.pay3}x • x4 {m.pay4}x • x5 {m.pay5}x</div>
              </div>
            ))}
            <div className="col-span-full rounded-lg bg-butter border-2 border-ink/40 px-2 py-1.5 text-center font-bold text-ink">
              🎪 5× 7️⃣ on middle line = {SLOTS.jackpotMultiplier}x JACKPOT
            </div>
          </div>
        )}
      </div>

      <ConfettiBurst active={bigWinActive} jackpot={lastResult?.jackpot ?? false} />
      <CoinRain active={lastResult?.jackpot ?? false} />
      {overlay && (
        <BigWinOverlay amount={overlay.amount} jackpot={overlay.jackpot} onDone={() => setOverlay(null)} />
      )}
    </div>
  );
}
