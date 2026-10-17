import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MIN_BET } from '../config/balance';
import { useCoinStore } from '../store/useCoinStore';

// Pops when the player can't cover the minimum bet (and isn't already there).
export function BrokeGate() {  const balance = useCoinStore((s) => s.balance);
  const [dismissed, setDismissed] = useState(false);
  const loc = useLocation();
  const broke = balance < MIN_BET;
  // Re-arm after recovery so the next broke episode still offers rescue.
  useEffect(() => {
    if (!broke) setDismissed(false);
  }, [broke]);
  const onCatchPage = loc.pathname === '/games/freecoins';
  if (!broke || onCatchPage || dismissed) return null;
  return (
    <div role="alertdialog" aria-label="Out of coins" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-cream p-5 text-center text-red-950">
        <p className="font-display text-2xl font-extrabold">Out of coins!</p>
        <p className="mt-1 text-sm">Catch free coins for 30 seconds — no bet needed, never stuck.</p>
        <Link to="/games/freecoins" className="mt-3 block rounded-xl bg-teal-500 px-4 py-2 font-bold text-white hover:scale-[1.02]">
          Play Coin Catch
        </Link>
        <button onClick={() => setDismissed(true)} className="mt-2 text-sm underline text-red-900/70">Keep looking</button>
      </div>
    </div>
  );
}

// Pops the moment a spend fails (bet chip, spin, drop, card buy):
// shows what was needed vs owned, with a direct rescue link.
export function FundsModal() {
  const shortfall = useCoinStore((s) => s.shortfall);
  const clear = useCoinStore((s) => s.clearShortfall);
  if (!shortfall) return null;
  return (
    <div role="alertdialog" aria-label="Not enough coins" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border-4 border-ink bg-cream p-5 text-center text-ink">
        <p className="font-display text-2xl font-extrabold">Not enough coins! 🪙</p>
        <p className="mt-1 text-sm font-semibold">
          You need <b>{shortfall.need}</b> but have <b>{shortfall.have}</b>.
        </p>
        <Link to="/games/freecoins" onClick={clear} className="pixel-btn mt-3 inline-block bg-mint">
          PLAY COIN CATCH 🧺
        </Link>
        <div>
          <button onClick={clear} className="mt-2 text-sm font-bold text-ink/70 underline">Keep looking</button>
        </div>
      </div>
    </div>
  );
}
