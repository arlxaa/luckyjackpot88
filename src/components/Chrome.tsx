import { BET_TIERS } from '../config/balance';
import { useCoinStore } from '../store/useCoinStore';
import { playSound } from '../audio/sound';

export function BetSelector() {
  const bet = useCoinStore((s) => s.bet);
  const setBet = useCoinStore((s) => s.setBet);
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Bet amount">
      <span className="font-pixel text-[9px] mr-1 -rotate-2 rounded-md bg-ink px-2 py-1 text-butter">BET</span>
      {BET_TIERS.map((b) => (
        <button
          key={b}
          onClick={() => {
            setBet(b);
            if (b > useCoinStore.getState().balance) useCoinStore.getState().notifyShortfall(b);
            playSound('click');
          }}
          aria-pressed={bet === b}
          className={`rounded-full px-3 py-1 text-sm font-display font-bold border-2 transition active:translate-y-[2px] active:shadow-none ${
            bet === b
              ? 'bg-amber-300 text-red-900 border-ink shadow-[0_3px_0_rgba(43,33,24,0.9)] -rotate-2'
              : 'bg-white text-ink border-ink/50 shadow-[0_3px_0_rgba(43,33,24,0.5)] hover:-translate-y-0.5 hover:-rotate-3'
          }`}
        >{b}</button>
      ))}
    </div>
  );
}

export function BulbStrip({ count = 12 }: { count?: number }) {
  return (
    <div className="flex justify-between px-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="bulb bulb-chase" style={{ animationDelay: `${(i % 4) * 0.2}s` }} />
      ))}
    </div>
  );
}

const FLAG_COLORS = ['#c1272d', '#fff6e5', '#2ec4b6', '#ffd166', '#ef476f'];

export function Bunting({ count = 14 }: { count?: number }) {
  return (
    <div className="flex justify-center gap-1 px-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="inline-block h-5 w-6"
          style={{
            background: FLAG_COLORS[i % FLAG_COLORS.length],
            clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
            transform: `rotate(${i % 2 === 0 ? 5 : -5}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function MachineScreen({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-[#101820] border-4 border-ink px-4 py-1.5 text-center shadow-[inset_0_3px_8px_rgba(0,0,0,0.6)]">
      <p className="font-term text-2xl leading-none text-green-300 tracking-wider">{text}</p>
    </div>
  );
}
