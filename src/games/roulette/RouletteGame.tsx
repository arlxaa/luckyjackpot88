import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, animate } from 'framer-motion';
import { ROULETTE } from '../../config/balance';
import { useCoinStore } from '../../store/useCoinStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { BetSelector, BulbStrip, MachineScreen } from '../../components/Chrome';
import { ConfettiBurst } from '../../components/Celebration';
import { playSound } from '../../audio/sound';
import { WHEEL_ORDER, colorOf, evalBets, spinNumber, type BetId, type Bets } from './logic';

const SEG = 360 / 37;

function Wheel({ spinning, result, spinKey }: { spinning: boolean; result: number | null; spinKey: number }) {
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const [wheelRot, setWheelRot] = useState(0);
  const [ballRot, setBallRot] = useState(0);

  useEffect(() => {
    if (!spinning || result === null || reduceMotion) return;
    const idx = WHEEL_ORDER.indexOf(result);
    // Ball should land on winning pocket at top (angle 0 = top).
    const targetPocketAngle = idx * SEG;
    const wheelTurns = 2 * 360 + Math.random() * 120;
    const ballTurns = 5 * 360 + Math.random() * 120;
    const wFrom = wheelRot;
    const wTo = wheelRot + wheelTurns;
    // Ball ends at (top - pocket position after wheel spin).
    const wheelMod = ((wTo + targetPocketAngle) % 360 + 360) % 360;
    const ballMod = ((ballRot % 360) + 360) % 360;
    const bTo = ballRot + ballTurns + (((360 - wheelMod) % 360) - ballMod);
    const dur = ROULETTE.spinMs / 1000;
    const c1 = animate(wFrom, wTo, {
      duration: dur, ease: [0.15, 0.6, 0.25, 1],
      onUpdate: (v) => setWheelRot(v),
    });
    const c2 = animate(ballRot, bTo, {
      duration: dur, ease: [0.2, 0.55, 0.3, 1],
      onUpdate: (v) => setBallRot(v),
    });
    // Ball clatter ticks.
    const tick = window.setInterval(() => playSound('tick'), 160);
    window.setTimeout(() => window.clearInterval(tick), ROULETTE.spinMs - 600);
    return () => { c1.stop(); c2.stop(); window.clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  const pockets = useMemo(() => WHEEL_ORDER.map((n, i) => ({
    n, angle: i * SEG, color: colorOf(n),
  })), []);

  return (
    <div className="relative mx-auto h-64 w-64 sm:h-72 sm:w-72" role="img" aria-label={result === null ? 'Roulette wheel' : `Roulette result ${result}`}>
      {/* rim */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-amber-200 to-amber-600 shadow-2xl" />
      <motion.div className="absolute inset-2 rounded-full bg-[#3d2310]" style={{ rotate: wheelRot }}>
        <svg viewBox="0 0 200 200" className="h-full w-full">
          {pockets.map((p) => {
            const a0 = ((p.angle - SEG / 2) * Math.PI) / 180;
            const a1 = ((p.angle + SEG / 2) * Math.PI) / 180;
            const r0 = 34, r1 = 88;
            const x0 = 100 + r0 * Math.sin(a0), y0 = 100 - r0 * Math.cos(a0);
            const x1 = 100 + r1 * Math.sin(a0), y1 = 100 - r1 * Math.cos(a0);
            const x2 = 100 + r1 * Math.sin(a1), y2 = 100 - r1 * Math.cos(a1);
            const x3 = 100 + r0 * Math.sin(a1), y3 = 100 - r0 * Math.cos(a1);
            const fill = p.color === 'red' ? '#c1272d' : p.color === 'black' ? '#1d1d22' : '#0e9f6e';
            return (
              <g key={p.n}>
                <path d={`M${x0},${y0} L${x1},${y1} A${r1},${r1} 0 0 1 ${x2},${y2} L${x3},${y3} A${r0},${r0} 0 0 0 ${x0},${y0} Z`} fill={fill} stroke="#fff6e5" strokeWidth="0.6" />
                <text
                  x={100 + 62 * Math.sin((p.angle * Math.PI) / 180)}
                  y={100 - 62 * Math.cos((p.angle * Math.PI) / 180)}
                  fill="#fff" fontSize="9" textAnchor="middle" dominantBaseline="middle"
                  transform={`rotate(${p.angle}, ${100 + 62 * Math.sin((p.angle * Math.PI) / 180)}, ${100 - 62 * Math.cos((p.angle * Math.PI) / 180)})`}
                >{p.n}</text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="30" fill="#c1272d" stroke="#ffd166" strokeWidth="3" />
          <text x="100" y="104" textAnchor="middle" fontSize="16">🎪</text>
        </svg>
      </motion.div>
      {/* ball track */}
      <div className="absolute inset-0 rounded-full border-4 border-white/20" />
      <motion.div className="absolute inset-0" style={{ rotate: ballRot }}>
        <div className="absolute left-1/2 top-1 h-4 w-4 -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_white]" />
      </motion.div>
      {/* pointer */}
      <div className="absolute -top-1 left-1/2 h-5 w-2 -translate-x-1/2 rounded bg-amber-300" />
    </div>
  );
}

const OUTSIDE: Array<{ id: BetId; label: string }> = [
  { id: 'red', label: '🔴 Red' },
  { id: 'black', label: '⚫ Black' },
  { id: 'odd', label: 'Odd' },
  { id: 'even', label: 'Even' },
  { id: 'low', label: '1–18' },
  { id: 'high', label: '19–36' },
  { id: 'dozen1', label: '1st 12' },
  { id: 'dozen2', label: '2nd 12' },
  { id: 'dozen3', label: '3rd 12' },
];

export function RouletteGame() {
  const bet = useCoinStore((s) => s.bet); // chip size
  const balance = useCoinStore((s) => s.balance);
  const placeBet = useCoinStore((s) => s.placeBet);
  const settleReturn = useCoinStore((s) => s.settleReturn);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);

  const [bets, setBets] = useState<Bets>({});
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [spinKey, setSpinKey] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [screen, setScreen] = useState('Place your bets');
  const [winners, setWinners] = useState<BetId[]>([]);
  const [burst, setBurst] = useState(0);
  const timers = useRef<number[]>([]);
  const pendingRef = useRef<{ win: number; bets: Bets; stake: number } | null>(null);
  // Never let a paid spin vanish: leaving mid-spin still credits the result.
  useEffect(() => () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    const p = pendingRef.current;
    pendingRef.current = null;
    if (p) {
      const { totalReturn } = evalBets(p.bets, p.win);
      if (totalReturn > 0) useCoinStore.getState().settleReturn(totalReturn, totalReturn - p.stake);
    }
  }, []);

  const totalStake: number = (Object.values(bets) as Array<number | undefined>).reduce<number>((a, b) => a + (b ?? 0), 0);

  // Keep placed chips in sync with the selected chip size, so the
  // displayed chip always equals the actual stake (no stale 5s under a 50).
  useEffect(() => {
    setBets((prev) => {
      const ids = Object.keys(prev) as BetId[];
      if (ids.length === 0) return prev;
      const next: Bets = {};
      ids.forEach((id) => {
        next[id] = bet;
      });
      return next;
    });
  }, [bet]);

  const toggleBet = (id: BetId) => {
    if (spinning) return;
    playSound('click');
    setWinners([]);
    setBets((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = bet;
      return next;
    });
  };

  const settleSpin = () => {
    const p = pendingRef.current;
    pendingRef.current = null;
    if (!p) return;
    const { totalReturn, winners: w } = evalBets(p.bets, p.win);
    const profit = totalReturn - p.stake;
    setHistory((h) => [p.win, ...h].slice(0, 10));
    setSpinning(false);
    setWinners(w);
    settleReturn(totalReturn, profit);
    if (profit > 0) {
      setScreen(`${p.win} ${colorOf(p.win)} — won +${profit} 🪙!`);
      if (profit >= p.stake * 2) {
        setBurst((b) => b + 1);
        playSound('fanfare');
      } else playSound('win');
    } else if (totalReturn > 0) {
      // Money back, but less than staked — not a win: no fanfare, no streak.
      setScreen(`${p.win} ${colorOf(p.win)} — back ${totalReturn}, stake was ${p.stake} (net ${profit})`);
      playSound('coin');
    } else {
      setScreen(`${p.win} ${colorOf(p.win)} — no win. Try again!`);
      playSound('lose');
    }
    setBets({});
  };

  const doSpin = () => {
    if (spinning || totalStake === 0) return;
    if (!placeBet(totalStake)) {
      setScreen('Not enough coins — lower chips or grab free coins!');
      playSound('lose');
      return;
    }
    playSound('coin');
    const winNum = spinNumber();
    pendingRef.current = { win: winNum, bets: { ...bets }, stake: totalStake };
    setSpinning(true);
    setResult(winNum);
    setWinners([]);
    setScreen('No more bets — ball rolling...');
    setSpinKey((k) => k + 1);

    timers.current.push(window.setTimeout(settleSpin, reduceMotion ? 300 : ROULETTE.spinMs));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,select,textarea')) return;
      if (e.code === 'Space') { e.preventDefault(); doSpin(); }
      else if (e.key.toLowerCase() === 'c') setBets({});
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link to="/" className="font-pixel text-[10px] text-ink/60 hover:text-ink">← LOBBY</Link>
      <div className="mt-2 pixel-panel-cream p-4 sm:p-6">
        <BulbStrip count={16} />
        <div className="mt-2"><MachineScreen text={`${screen}  •  Stake ${totalStake}`} /></div>

        {history.length > 0 && (
          <div className="mt-2 flex justify-center gap-1" aria-label="Recent numbers">
            {history.map((n, i) => (
              <span key={`${n}-${i}`} className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white border-2 border-ink ${colorOf(n) === 'red' ? 'bg-red-700' : colorOf(n) === 'black' ? 'bg-zinc-900' : 'bg-green-600'}`}>{n}</span>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-[auto_1fr] md:items-start">
          <Wheel spinning={spinning} result={result} spinKey={spinKey} />
          <div>
            <p className="font-pixel text-[10px] text-ink/60">CHIP SIZE</p>
            <BetSelector />
            <div className="mt-2 grid grid-cols-6 sm:grid-cols-9 gap-1" role="group" aria-label="Number bets">
              {Array.from({ length: 37 }, (_, n) => n).map((n) => {
                const id = `num-${n}` as BetId;
                const active = bets[id] != null;
                const won = winners.includes(id);
                return (
                  <button
                    key={n}
                    onClick={() => toggleBet(id)}
                    aria-pressed={active}
                    aria-label={`Bet ${bet} on ${n}`}
                    className={`h-9 rounded-lg font-pixel text-[10px] border-2 border-ink shadow-[0_2px_0_rgba(43,33,24,1)] active:translate-y-[2px] active:shadow-none ${
                      won ? 'bg-green-400 text-green-950 shadow-[0_0_12px_rgba(57,255,136,0.9)]'
                      : active ? 'bg-amber-300 text-red-900'
                      : colorOf(n) === 'red' ? 'bg-[#d94f4f] text-white hover:brightness-110'
                      : colorOf(n) === 'black' ? 'bg-[#2b2b33] text-white hover:brightness-125'
                      : 'bg-[#0e9f6e] text-white hover:brightness-110'
                    }`}
                  >{n}{active ? `·${bets[id]}` : ''}</button>
                );
              })}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1" role="group" aria-label="Outside bets">
              {OUTSIDE.map((o) => {
                const active = bets[o.id] != null;
                const won = winners.includes(o.id);
                return (
                  <button
                    key={o.id}
                    onClick={() => toggleBet(o.id)}
                    aria-pressed={active}
                    className={`rounded-xl px-2 py-2.5 text-sm font-display font-extrabold border-[3px] shadow-[0_3px_0_rgba(43,33,24,1)] active:translate-y-[2px] active:shadow-none ${
                      won ? 'bg-green-400 text-green-950 border-ink'
                      : active ? 'bg-amber-300 text-red-900 border-ink'
                      : 'bg-parchment text-ink border-ink/40 hover:border-ink'
                    }`}
                  >{o.label}{active ? ` ·${bets[o.id]}` : ''}</button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={doSpin}
                disabled={spinning || totalStake === 0}
                aria-label="Spin (Space)"
                className="btn-chunky bg-amber-300 text-red-900 font-display font-extrabold text-xl px-10 py-3 disabled:opacity-50"
              >{spinning ? '...' : `SPIN ${totalStake} 🪙`}</button>
              <button onClick={() => setBets({})} aria-label="Clear bets (C)" className="rounded-xl bg-parchment text-ink border-[3px] border-ink px-4 py-2 font-display font-extrabold shadow-[0_3px_0_rgba(43,33,24,1)] active:translate-y-[2px] active:shadow-none">Clear</button>
            </div>
            <p className="mt-1 text-xs font-semibold text-ink/60">Single 35:1 • Dozen 2:1 • Red/black, odd/even, 1–18/19–36 pay 1:1. Balance: {balance}.</p>
          </div>
        </div>
      </div>
      <ConfettiBurst key={burst} active={burst > 0} jackpot={false} />
    </div>
  );
}
