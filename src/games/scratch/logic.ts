import { SCRATCH } from '../../config/balance';

export interface ScratchTier {
  id: string;
  price: number;
  topPrize: number;
  prizes: number[]; // match-3 prize ladder, ascending
}

export function getTiers(): ScratchTier[] {
  return SCRATCH.tiers.map((t) => ({
    id: t.id,
    price: t.price,
    topPrize: t.topPrize,
    prizes: t.match3Multiplier.map((m) => m * t.price),
  }));
}

export interface ScratchCard {
  tierId: string;
  price: number;
  cells: number[]; // 9 prize amounts
  winPrize: number | null; // matched prize or null
  winIndices: number[];
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistinct(pool: number[], n: number, rng: () => number): number[] {
  const uniq = [...new Set(pool)];
  const out: number[] = [];
  while (out.length < n && uniq.length > 0) {
    const idx = Math.floor(rng() * uniq.length);
    out.push(uniq.splice(idx, 1)[0] as number);
  }
  return out;
}

// Extra non-paying denominations, so losing cards always have enough
// distinct values to avoid an accidental (unpaid) triple.
function extendedPool(tier: ScratchTier): number[] {
  const extras = [3, 4, 6, 7].map((m) => m * tier.price);
  return [...new Set([...tier.prizes, tier.topPrize, ...extras])];
}

// 35% win rate, weighted toward low prizes.
// INVARIANT: a losing card never contains 3-of-a-kind of anything;
// a winning card contains exactly one triple (the prize).
export function generateCard(tier: ScratchTier, rng: () => number = Math.random): ScratchCard {
  const pool = extendedPool(tier);
  if (rng() < 0.35) {
    // Weighted prize pick: 55% lowest, 25% mid-low, 13% mid-high, 7% top.
    const r = rng();
    const prize = r < 0.55 ? tier.prizes[0]
      : r < 0.8 ? tier.prizes[1]
      : r < 0.93 ? (tier.prizes[2] ?? tier.prizes[1])
      : tier.topPrize;
    // 3 winners + 6 decoys built as 3 distinct non-prize values x2,
    // so no second (unpaid) triple can appear.
    const decoyVals = pickDistinct(
      pool.filter((p) => p !== prize),
      3,
      rng
    );
    while (decoyVals.length < 3) decoyVals.push(tier.prizes[0]);
    const decoys = decoyVals.flatMap((d) => [d, d]);
    const cells = shuffle([prize, prize, prize, ...decoys], rng);
    const winIndices = cells.map((c, i) => (c === prize ? i : -1)).filter((i) => i >= 0).slice(0, 3);
    return { tierId: tier.id, price: tier.price, cells, winPrize: prize, winIndices };
  }
  // Losing card: 4 pairs + 1 single from 5 distinct values.
  // Max count of any value is 2, so a triple is impossible by construction.
  const vals = pickDistinct(pool, 5, rng);
  while (vals.length < 5) vals.push(pool[vals.length % pool.length] as number);
  const v = vals as [number, number, number, number, number];
  const cells = shuffle([v[0], v[0], v[1], v[1], v[2], v[2], v[3], v[3], v[4]], rng);
  return { tierId: tier.id, price: tier.price, cells: cells.slice(0, 9), winPrize: null, winIndices: [] };
}
