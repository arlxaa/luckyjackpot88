import { Link } from 'react-router-dom';
import { CoinCounter } from './CoinCounter';
import { AuthButton } from './Auth';
import { PixelArt } from './PixelArt';
import { useSettingsStore } from '../store/useSettingsStore';

const iconBtn =
  'rounded-xl bg-parchment hover:bg-white hover:-rotate-6 px-3 py-1.5 text-sm border-[3px] border-ink shadow-[0_3px_0_rgba(43,33,24,1)] active:translate-y-[2px] active:shadow-none transition';

export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const muted = useSettingsStore((s) => s.muted);
  const set = useSettingsStore((s) => s.set);
  return (
    <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur border-b-4 border-ink">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 px-4 py-2">
        <Link
          to="/"
          aria-label="Back to lobby"
          className="flex items-center gap-2 -rotate-2 hover:rotate-0 transition"
        >
          <PixelArt name="tent" size={32} label="Lucky Jackpot88 tent" shadow={false} />
          <span className="font-pixel text-sm text-ink">LUCKY JACKPOT88</span>
        </Link>
        <div className="flex items-center gap-2">
          <CoinCounter />
          <button
            aria-label={muted ? 'Unmute' : 'Mute'}
            onClick={() => set({ muted: !muted })}
            className={iconBtn}
          >{muted ? '🔇' : '🔊'}</button>
          <button
            aria-label="Settings"
            onClick={onOpenSettings}
            className={iconBtn}
          >⚙</button>
          <Link to="/leaderboard" aria-label="Leaderboard" className={iconBtn}>🏆</Link>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-10 py-6 text-center">
      <p className="font-pixel text-[10px] text-ink/70">JUST FOR FUN · VIRTUAL COINS ONLY · NO REAL MONEY</p>
    </footer>
  );
}

export function SoundGate() {
  const enabled = useSettingsStore((s) => s.soundEnabled);
  const enableSound = useSettingsStore((s) => s.enableSound);
  if (enabled) return null;
  return (
    <button
      onClick={enableSound}
      className="btn-chunky floaty fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-300 text-red-900 font-display font-extrabold px-5 py-2"
    >🔊 Tap to enable sound</button>
  );
}
