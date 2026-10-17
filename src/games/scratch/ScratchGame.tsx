import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCoinStore } from '../../store/useCoinStore';
import { MachineScreen, BulbStrip } from '../../components/Chrome';
import { ConfettiBurst, CoinRain } from '../../components/Celebration';
import { playSound } from '../../audio/sound';
import { generateCard, getTiers, type ScratchCard } from './logic';

export function ScratchGame() {
  const tiers = getTiers();
  const [tierId, setTierId] = useState(tiers[1]?.id ?? tiers[0].id);
  const tier = tiers.find((t) => t.id === tierId) ?? tiers[0];
  const balance = useCoinStore((s) => s.balance);
  const placeBet = useCoinStore((s) => s.placeBet);
  const awardWin = useCoinStore((s) => s.awardWin);

  const [card, setCard] = useState<ScratchCard | null>(null);
  const [cardId, setCardId] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [scratchedPct, setScratchedPct] = useState(0);
  const [screen, setScreen] = useState('Pick a card tier, then scratch!');
  const [burst, setBurst] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scratching = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const settled = useRef(false);

  const paintFoil = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);
    // Silver foil with diagonal stripes.
    const g = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    g.addColorStop(0, '#d9d9e0');
    g.addColorStop(0.5, '#b9b9c4');
    g.addColorStop(1, '#d9d9e0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 6;
    for (let x = -rect.height; x < rect.width; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + rect.height, rect.height);
      ctx.stroke();
    }
    ctx.fillStyle = '#6b6375';
    ctx.font = '800 22px "Baloo 2", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCRATCH HERE', rect.width / 2, rect.height / 2 - 4);
    ctx.font = '600 13px Nunito, sans-serif';
    ctx.fillText('match 3 to win', rect.width / 2, rect.height / 2 + 18);
    ctx.restore();
  }, []);

  const buyCard = useCallback((nextTierId?: string) => {
    const t = tiers.find((x) => x.id === (nextTierId ?? tierId)) ?? tiers[0];
    if (!placeBet(t.price)) {
      setScreen('Not enough coins — grab free coins!');
      playSound('lose');
      return;
    }
    const c = generateCard(t);
    settled.current = false;
    setCard(c);
    setCardId((id) => id + 1);
    setRevealed(false);
    setScratchedPct(0);
    setScreen(`Scratched a ${t.id} card (${t.price} 🪙) — reveal 3 alike!`);
    playSound('coin');
    requestAnimationFrame(paintFoil);
  }, [tiers, tierId, placeBet, paintFoil]);

  // Repaint foil after layout / tier change.
  useEffect(() => {
    if (card && !revealed) {
      paintFoil();
      const onResize = () => paintFoil();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
  }, [card, revealed, paintFoil]);

  const settleCard = useCallback(() => {
    if (!card || settled.current) return;
    settled.current = true;
    setRevealed(true);
    setScratchedPct(100);
    if (card.winPrize !== null && card.winPrize > 0) {
      awardWin(card.winPrize);
      setScreen(`Winner! Matched 3x ${card.winPrize} 🪙`);
      setBurst((b) => b + 1);
      if (card.winPrize >= card.price * 5) playSound('fanfare');
      else playSound('win');
    } else {
      setScreen('No match — try another card!');
      playSound('lose');
    }
  }, [card, awardWin]);

  const eraseAt = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || revealed) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = canvas.width / rect.width;
    const px = (x - rect.left) * dpr;
    const py = (y - rect.top) * dpr;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(px, py, 22 * dpr, 0, Math.PI * 2);
    ctx.fill();
    // Stroke from last pos for smooth lines.
    if (lastPos.current) {
      ctx.lineWidth = 40 * dpr;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x * dpr, lastPos.current.y * dpr);
      ctx.lineTo(px, py);
      ctx.stroke();
    }
    ctx.restore();
    lastPos.current = { x: x - rect.left, y: y - rect.top };
  };

  const samplePct = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;
    try {
      const step = 12;
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      let clear = 0, total = 0;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          total++;
          if (data[(y * w + x) * 4 + 3] < 40) clear++;
        }
      }
      return (clear / Math.max(1, total)) * 100;
    } catch {
      return 0;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (revealed || !card) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    scratching.current = true;
    lastPos.current = null;
    eraseAt(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!scratching.current || revealed || !card) return;
    eraseAt(e.clientX, e.clientY);
    playSoundThrottled();
    // Throttled % check.
    const now = Date.now();
    if (now - lastSample.current > 600) {
      lastSample.current = now;
      const pct = samplePct();
      setScratchedPct(Math.round(pct));
      if (pct > 45) settleCard();
    }
  };
  const lastSample = useRef(0);
  const endStroke = () => { scratching.current = false; lastPos.current = null; };

  // Keyboard: R reveal, N new card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,select,textarea')) return;
      if (e.key.toLowerCase() === 'r') settleCard();
      else if (e.key.toLowerCase() === 'n') buyCard();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settleCard, buyCard]);

  const big = (card?.winPrize ?? 0) >= tier.price * 5;

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <Link to="/" className="font-pixel text-[10px] text-ink/60 hover:text-ink">← LOBBY</Link>
      <div className="mt-2 pixel-panel-cream p-4 sm:p-5">
        <BulbStrip count={12} />
        <div className="mt-2"><MachineScreen text={`${screen}  •  Balance ${balance}`} /></div>

        <div className="mt-3 flex justify-center gap-2" role="group" aria-label="Card tier">
          {tiers.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTierId(t.id); playSound('click'); }}
              aria-pressed={tierId === t.id}
              disabled={!!card && !revealed}
              title={card && !revealed ? 'Finish or reveal your current card first' : `Buy a ${t.id} card`}
              className={`btn-soft px-4 py-2 disabled:opacity-40 ${tierId === t.id ? 'btn-soft-on-amber' : ''}`}
            >{t.id} ({t.price} 🪙)</button>
          ))}
        </div>
        <p className="mt-1 text-center text-xs font-semibold text-ink/60">
          Prizes: {tier.prizes.join(' • ')} 🪙 — top {tier.topPrize} 🪙. Match 3 to win.
        </p>
        {card && !revealed && (
          <p className="mt-1 text-center text-xs font-bold text-amber-700">Finish or reveal your current card to switch tiers.</p>
        )}

        {!card ? (
          <button
            onClick={() => buyCard()}
            className="btn-chunky mx-auto mt-4 block bg-amber-300 text-red-900 font-display font-extrabold text-xl px-10 py-3"
          >Buy {tier.id} card ({tier.price} 🪙)</button>
        ) : (
          <>
            <div
              key={cardId}
              ref={wrapRef}
              className="relative mx-auto mt-4 max-w-sm overflow-hidden rounded-2xl border-4 border-amber-200/60 bg-cream text-red-950 select-none"
              style={{ touchAction: 'none' }}
            >
              <div className="grid grid-cols-3 gap-2 p-4" aria-label={revealed ? `Revealed card, ${card.winPrize ? `won ${card.winPrize}` : 'no win'}` : 'Covered scratch card'}>
                {card.cells.map((prize, i) => {
                  const hot = revealed && card.winIndices.includes(i);
                  return (
                    <div
                      key={i}
                      className={`grid h-20 place-items-center rounded-xl border-2 font-display font-extrabold ${
                        hot ? 'bg-green-200 border-green-500 shadow-[0_0_14px_rgba(57,255,136,0.8)]' : 'bg-white border-amber-900/20'
                      }`}
                    >
                      <span>🪙{prize}</span>
                    </div>
                  );
                })}
              </div>
              {!revealed && (
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 h-full w-full cursor-crosshair"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endStroke}
                  onPointerCancel={endStroke}
                  onPointerLeave={endStroke}
                  role="img"
                  aria-label="Scratch-off cover. Drag to scratch, or press Reveal."
                />
              )}
            </div>

            {!revealed && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
                <div className="h-full bg-teal-300 transition-all" style={{ width: `${Math.min(100, scratchedPct)}%` }} />
              </div>
            )}

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {!revealed ? (
                <button
                  onClick={settleCard}
                  aria-label="Reveal all (R)"
                  className="btn-soft px-5 py-2"
                >Reveal all (R)</button>
              ) : (
                <button
                  onClick={() => buyCard()}
                  aria-label="New card (N)"
                  className="btn-chunky bg-amber-300 text-red-900 font-display font-extrabold px-8 py-2.5"
                >New {tier.id} card ({tier.price} 🪙) (N)</button>
              )}
            </div>
          </>
        )}
      </div>

      <ConfettiBurst key={burst} active={burst > 0 && revealed} jackpot={big && revealed} />
      <CoinRain active={big && revealed && burst > 0} />
    </div>
  );
}

let lastTick = 0;
function playSoundThrottled() {
  const now = Date.now();
  if (now - lastTick > 180) {
    lastTick = now;
    playSound('tick');
  }
}
