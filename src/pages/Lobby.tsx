import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BulbStrip, Bunting } from '../components/Chrome';
import { PixelArt, type SpriteName } from '../components/PixelArt';
import { useCoinStore } from '../store/useCoinStore';
import { FREE_COINS_REWARD } from '../config/balance';

const MACHINES: Array<{ id: string; name: string; sprite: SpriteName; to: string; desc: string; tilt: number }> = [
  { id: 'slots', name: 'Slot Jackpot', sprite: 'star', to: '/games/slots', desc: '5 reels, near-miss tension', tilt: -1.5 },
  { id: 'pusher', name: 'Coin Pusher', sprite: 'coin', to: '/games/pusher', desc: 'Hero game — physics tray', tilt: 1.2 },
  { id: 'scratch', name: 'Scratch Card', sprite: 'ticket', to: '/games/scratch', desc: 'Match 3 to win', tilt: -1 },
  { id: 'roulette', name: 'Roulette', sprite: 'wheel', to: '/games/roulette', desc: 'Red/black, numbers', tilt: 1.5 },
];

export function Lobby() {
  const biggestWin = useCoinStore((s) => s.biggestWin);
  return (
    <div>
      <div className="mx-auto max-w-3xl px-4 pt-8 text-center">
        <div className="pixel-panel px-6 py-6 sm:px-10">
          <div className="flex items-center justify-center gap-3">
            <PixelArt name="tent" size={56} label="Circus tent" />
            <h1 className="font-display bubbly floaty text-4xl sm:text-6xl font-extrabold">Lucky Jackpot88</h1>
            <PixelArt name="cat" size={56} label="Lucky cat" />
          </div>
          <p className="font-pixel mt-3 text-[11px] text-ink">PICK A MACHINE · VIRTUAL COINS ONLY</p>
          <p className="mt-2 inline-block -rotate-1 rounded-full border-[3px] border-ink bg-butter px-4 py-1 text-xs font-extrabold text-ink shadow-[0_3px_0_rgba(43,33,24,1)]">
            ⭐ Last big win: {biggestWin} coins
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <Bunting />
        <div className="mt-2"><BulbStrip /></div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MACHINES.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 17, delay: i * 0.08 }}
              whileHover={{ y: -8, scale: 1.03, rotate: i % 2 === 0 ? -1.2 : 1.2 }}
              whileTap={{ scale: 0.96, rotate: 0 }}
              className="pixel-panel-cream p-4 pt-5"
              style={{ rotate: `${m.tilt}deg` }}
            >
              <div className="floaty mx-auto w-fit" style={{ animationDelay: `${i * 0.35}s` }}>
                <PixelArt name={m.sprite} size={72} label={m.name} />
              </div>
              <h2 className="font-display text-xl font-extrabold text-center mt-2 text-ink">{m.name}</h2>
              <p className="text-center text-sm font-semibold text-ink/70">{m.desc}</p>
              <Link
                to={m.to}
                className="btn-chunky mt-3 block text-center font-display font-extrabold py-2 bg-amber-300 text-red-900"
              >Play!</Link>
            </motion.div>
          ))}
        </div>

        <BrokeBanner />
      </div>
    </div>
  );
}

function BrokeBanner() {
  const balance = useCoinStore((s) => s.balance);
  if (balance > 0) return null;
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="pixel-panel mx-auto mt-8 max-w-md p-5 text-center"
    >
      <PixelArt name="cat" size={48} label="Lucky cat" />
      <p className="font-display font-extrabold text-lg text-ink">Out of coins? Catch {FREE_COINS_REWARD} free coins!</p>
      <Link to="/games/freecoins" className="pixel-btn mt-3 inline-block bg-butter">
        PLAY COIN CATCH 🧺
      </Link>
    </motion.div>
  );
}
