import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type * as THREE from 'three';
import { MAX_BALANCE, PUSHER } from '../../config/balance';
import { useCoinStore } from '../../store/useCoinStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { BetSelector, BulbStrip, MachineScreen } from '../../components/Chrome';
import { BigWinOverlay, CoinRain, ConfettiBurst } from '../../components/Celebration';
import { PixelArt } from '../../components/PixelArt';
import { playSound } from '../../audio/sound';
import { PusherScene, type CoinData, type CoinKind } from './PusherScene';

let nextId = 1;

function rollBatchKinds(n: number): CoinKind[] {
  const kinds: CoinKind[] = Array.from({ length: n }, () => 'normal' as CoinKind);
  // ~35% of batches hide exactly one special coin (bounded, never floods the tray).
  if (n > 0 && Math.random() < PUSHER.dropBatchSpecialRate) {
    const idx = Math.floor(Math.random() * n);
    const r = Math.random();
    kinds[idx] = r < 0.06 ? 'jackpot' : r < 0.3 ? 'rain' : 'bonus';
  }
  return kinds;
}

function winFor(kind: CoinKind): number {
  switch (kind) {
    case 'normal': return 1;
    case 'bonus': return PUSHER.bonusMultiplier;
    case 'rain': return PUSHER.rainBonusCoins;
    case 'jackpot': return PUSHER.jackpotPrize;
  }
}

export function PusherGame() {
  const bet = useCoinStore((s) => s.bet);
  const balance = useCoinStore((s) => s.balance);
  const placeBet = useCoinStore((s) => s.placeBet);
  const awardWin = useCoinStore((s) => s.awardWin);
  const quality = useSettingsStore((s) => s.quality);

  const maxCoins = PUSHER.maxLiveCoins[quality] ?? 50;
  const [coins, setCoins] = useState<CoinData[]>(() =>
    Array.from({ length: 18 }, () => ({ id: nextId++, x: 0, kind: 'normal' as CoinKind, free: true }))
  );
  const [dropX, setDropX] = useState(0);
  const [screen, setScreen] = useState('Waiting for coin fall...');
  const [auto, setAuto] = useState(false);
  const [overlay, setOverlay] = useState<{ amount: number; jackpot: boolean } | null>(null);
  const [burst, setBurst] = useState(0);
  const [webglOK, setWebglOK] = useState(true);
  const coinsRef = useRef(coins);
  coinsRef.current = coins;

  const dpr = quality === 'low' ? 1 : quality === 'medium' ? 1.5 : 2;

  const queueRef = useRef<Array<{ x: number; kind: CoinKind }>>([]);
  const droppingRef = useRef(false);

  const dropCoin = useCallback(() => {
    if (queueRef.current.length >= PUSHER.maxQueue) {
      setScreen('Chute jammed — wait for coins to fall!');
      return;
    }
    if (!placeBet(bet)) {
      setScreen('Not enough coins — grab free coins!');
      playSound('lose');
      return;
    }
    // 1 paid coin = 1 coin mesh, with slight spread so they don't stack.
    const kinds = rollBatchKinds(bet);
    const hasSpecial = kinds.some((k) => k !== 'normal');
    kinds.forEach((kind) => {
      queueRef.current.push({
        x: Math.max(-1.4, Math.min(1.4, dropX + (Math.random() - 0.5) * 0.9)),
        kind,
      });
    });
    droppingRef.current = true;
    setScreen(hasSpecial ? `Lucky batch! ${bet} coins + special token!` : `Dropping ${bet} coin${bet > 1 ? 's' : ''}...`);
    playSound('coin');
  }, [bet, dropX, placeBet]);

  // Staggered spawner: one mesh per paid coin, tray cap respected.
  useEffect(() => {
    const t = window.setInterval(() => {
      const q = queueRef.current;
      if (q.length === 0) {
        if (droppingRef.current) {
          droppingRef.current = false;
          setScreen('Waiting for coin fall...');
        }
        return;
      }
      if (coinsRef.current.length >= maxCoins) {
        setScreen('Tray full — waiting for space...');
        return;
      }
      const next = q.shift();
      if (!next) return;
      setCoins((prev) => [...prev, { id: nextId++, x: next.x, kind: next.kind }]);
      playSound('tick');
    }, PUSHER.spawnMs);
    return () => window.clearInterval(t);
  }, [maxCoins]);

  const handleCollect = useCallback((id: number, pos: THREE.Vector3, kind: CoinKind) => {
    setCoins((prev) => prev.filter((c) => c.id !== id));
    const front = pos.z > PUSHER.frontZ;
    if (!front) return; // side/back losses pay nothing
    const win = winFor(kind);
    awardWin(win);
    if (kind === 'jackpot') {
      setScreen(`JACKPOT token! +${win} coins!`);
      setOverlay({ amount: win, jackpot: true });
      setBurst((b) => b + 1);
      playSound('fanfare');
    } else if (kind !== 'normal') {
      setScreen(`Special ${kind}! +${win} coins!`);
      setBurst((b) => b + 1);
      playSound('win');
    } else {
      setScreen(`Coin fall! +${win} coins`);
      playSound('coin');
    }
  }, [awardWin]);

  // Auto-drop loop.
  useEffect(() => {
    if (!auto) return;
    const t = window.setInterval(() => {
      if (useCoinStore.getState().balance < useCoinStore.getState().bet) {
        setAuto(false);
        setScreen('Auto stopped — not enough coins.');
        return;
      }
      dropCoin();
    }, PUSHER.autoDropMs);
    return () => window.clearInterval(t);
  }, [auto, dropCoin]);

  // Keyboard: arrows move drop, Space drops.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,select,textarea')) return;
      if (e.key === 'ArrowLeft') setDropX((x) => Math.max(-1.4, +(x - 0.2).toFixed(2)));
      else if (e.key === 'ArrowRight') setDropX((x) => Math.min(1.4, +(x + 0.2).toFixed(2)));
      else if (e.code === 'Space') { e.preventDefault(); dropCoin(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dropCoin]);

  // Refund live player coins if the player leaves with coins still on the
  // tray (1 coin each). Stats untouched — a refund is not a win.
  useEffect(() => () => {
    const refund = coinsRef.current.filter((c) => !c.free).length;
    if (refund > 0) {
      useCoinStore.setState((s) => ({ balance: Math.min(MAX_BALANCE, s.balance + refund) }));
    }
  }, []);

  const canvas = useMemo(() => {
    if (!webglOK) return null;
    return (
      <Canvas
        shadows={quality === 'high'}
        dpr={dpr}
        camera={{ position: [0, 6.2, 7.2], fov: 42 }}
        onCreated={({ gl }) => {
          if (!gl.getContext()) setWebglOK(false);
        }}
        aria-label="3D coin pusher machine"
      >
        <color attach="background" args={['#f3e2c2']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 8, 4]} intensity={1.2} castShadow={quality === 'high'} />
        <pointLight position={[-3, 4, 2]} intensity={12} color="#ffd166" />
        <pointLight position={[3, 3, -1]} intensity={8} color="#2ec4b6" />
        <Suspense fallback={null}>
          <PusherScene coins={coins} onCollect={handleCollect} paused={false} />
          {/* Drop chute marker */}
          <mesh position={[dropX, 3.6, -1.2]}>
            <boxGeometry args={[0.5, 0.3, 0.5]} />
            <meshStandardMaterial color="#ffd166" emissive="#ffd166" emissiveIntensity={0.4} />
          </mesh>
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={quality !== 'low'}
          minDistance={5}
          maxDistance={12}
          maxPolarAngle={Math.PI / 2.6}
          target={[0, 0, 0.4]}
        />
      </Canvas>
    );
  }, [coins, dropX, dpr, quality, handleCollect, webglOK]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link to="/" className="font-pixel text-[10px] text-ink/60 hover:text-ink">← LOBBY</Link>
      <div className="mx-auto mt-2 max-w-2xl text-center">
        <div className="pixel-panel px-6 py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="floaty"><PixelArt name="coin" size={44} label="Coin" /></div>
            <h1 className="font-display bubbly text-3xl sm:text-4xl font-extrabold">Coin Pusher</h1>
            <div className="floaty" style={{ animationDelay: '0.4s' }}><PixelArt name="star" size={44} label="Star" /></div>
          </div>
          <p className="font-pixel mt-2 text-[10px] text-ink">DROP · PUSH · WIN</p>
        </div>
      </div>
      <div className="relative mt-8">
        <div aria-hidden className="pointer-events-none absolute -top-7 left-3 z-10 floaty">
          <PixelArt name="cat" size={52} label="" />
        </div>
        <div aria-hidden className="pointer-events-none absolute -top-7 right-3 z-10 floaty" style={{ animationDelay: '0.6s' }}>
          <PixelArt name="ticket" size={52} label="" />
        </div>
      <div className="pixel-panel-cream p-4 sm:p-5">
        <BulbStrip count={16} />
        <div className="mt-2"><MachineScreen text={`${screen}  •  Bet ${bet}  •  Tray ${coins.length}/${maxCoins}`} /></div>

        <div className="relative mt-3 overflow-hidden rounded-2xl border-4 border-ink bg-[#f3e2c2]" style={{ height: 420 }}>
          <div aria-hidden className="pointer-events-none absolute left-0 right-0 top-2 z-10">
            <div
              className="mx-auto w-fit rounded-full border-[3px] border-ink bg-butter px-3 py-0.5 font-pixel text-[9px] text-ink shadow-[0_3px_0_rgba(43,33,24,1)] transition-all"
              style={{ marginLeft: `${dropX * 18}%` }}
            >▼ DROP</div>
          </div>
          <div aria-hidden className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border-[3px] border-ink bg-butter px-3 py-0.5 font-pixel text-[9px] text-ink shadow-[0_3px_0_rgba(43,33,24,1)]">
            ★ WIN ZONE ★
          </div>
          {webglOK ? canvas : (
            <p className="grid h-full place-items-center text-sm text-cream/80">
              3D unavailable on this device — try the Slot or Scratch machines.
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          <BetSelector />
        </div>

        <div className="mt-3 flex flex-col items-center gap-2">
          <p className="font-pixel text-[9px] text-ink/60" aria-hidden>← SLIDE TO AIM →</p>
          <label className="flex w-full items-center gap-2 text-sm" aria-label="Drop position">
            <span aria-hidden>◀</span>
            <input
              type="range" min={-1.4} max={1.4} step={0.1} value={dropX}
              onChange={(e) => setDropX(Number(e.target.value))}
              className="drop-slider w-full" aria-label="Drop position (Arrow keys)"
            />
            <span aria-hidden>▶</span>
          </label>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={dropCoin}
              aria-label="Drop coin (Space)"
              className="btn-chunky bg-amber-300 text-red-900 font-display font-extrabold text-xl px-10 py-3"
            >DROP {bet} 🪙</button>
            <button
              onClick={() => { setAuto((v) => !v); playSound('click'); }}
              aria-pressed={auto}
              className={`rounded-xl px-4 py-2 font-display font-extrabold border-[3px] border-ink shadow-[0_3px_0_rgba(43,33,24,1)] active:translate-y-[2px] active:shadow-none ${auto ? 'bg-green-400 text-green-950' : 'bg-white text-ink'}`}
            >Auto {auto ? 'ON' : 'OFF'}</button>
          </div>
          <p className="text-xs font-semibold text-ink/70">
            Each DROP sends {bet} coin{bet > 1 ? 's' : ''} down the chute (1 coin = 1 coin mesh).
            Coins pushed off the front pay 1 🪙 back. Green x{PUSHER.bonusMultiplier} • Teal x{PUSHER.rainBonusCoins} • Gold jackpot {PUSHER.jackpotPrize}! Balance: {balance}.
          </p>
        </div>
      </div>
      </div>

      <ConfettiBurst key={burst} active={burst > 0} jackpot={overlay?.jackpot ?? false} />
      <CoinRain active={overlay?.jackpot ?? false} />
      {overlay && <BigWinOverlay amount={overlay.amount} jackpot={overlay.jackpot} onDone={() => setOverlay(null)} />}
    </div>
  );
}
