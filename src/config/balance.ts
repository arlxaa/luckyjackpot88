// Single source of truth for economy tuning.
// All payout numbers live here so balancing is easy.

export const BET_TIERS = [1, 5, 10, 25, 50] as const;
export const STARTING_BALANCE = 100;
export const MAX_BALANCE = 999_999;
export const MIN_BET = 1;

export const FREE_COINS_REWARD = 30;
export const FREE_COINS_COOLDOWN_MS = 0; // allow replay while broke
export const FREE_COINS = {
  durationSec: 30,
  consolation: 5, // min payout even with 0 catches so nobody gets stuck
  maxPayout: 60,
  goldChance: 0.12, // gold coins worth 5
  spawnMs: 700, // new coin interval (speeds up slightly over time)
};

export type SlotSymbolId = 'cherry' | 'bell' | 'star' | 'frog' | 'bear' | 'seven';

export const SLOTS = {
  rtpTarget: 0.96,
  // 5 paylines over a 5x3 grid. Each entry is the row index per reel.
  paylines: [
    [1, 1, 1, 1, 1], // middle
    [0, 0, 0, 0, 0], // top
    [2, 2, 2, 2, 2], // bottom
    [0, 1, 2, 1, 0], // V
    [2, 1, 0, 1, 2], // inverted V
  ] as number[][],
  symbols: ['cherry', 'bell', 'star', 'frog', 'bear', 'seven'] as const,
  meta: {
    cherry: { emoji: '🍒', weight: 30, pay3: 0.5, pay4: 1, pay5: 3 },
    bell: { emoji: '🔔', weight: 25, pay3: 1, pay4: 2, pay5: 5 },
    star: { emoji: '⭐', weight: 20, pay3: 1.5, pay4: 3, pay5: 8 },
    frog: { emoji: '🐸', weight: 14, pay3: 2, pay4: 4, pay5: 10 },
    bear: { emoji: '🐻', weight: 8, pay3: 3, pay4: 6, pay5: 15 },
    seven: { emoji: '7️⃣', weight: 3, pay3: 5, pay4: 15, pay5: 50 },
  } as Record<SlotSymbolId, { emoji: string; weight: number; pay3: number; pay4: number; pay5: number }>,
  // 5 sevens on the middle line pays this x bet (jackpot celebration).
  jackpotMultiplier: 250,
  // Fun-tuning: injected drama rates (on top of natural weights).
  nearMissRate: 0.08,
  jackpotInjectRate: 0.005,
  // Reel stop timing (ms). Turbo divides by 3.
  baseStopMs: 600,
  stepMs: 350,
  nearMissExtraMs: 1200,
};

export const SCRATCH = {
  tiers: [
    { id: 'fun', price: 1, topPrize: 10, match3Multiplier: [1, 2, 5] },
    { id: 'lucky', price: 5, topPrize: 50, match3Multiplier: [1, 2, 10] },
    { id: 'jackpot', price: 25, topPrize: 250, match3Multiplier: [1, 5, 10] },
  ],
};

export const ROULETTE = {
  payouts: {
    single: 35,
    redBlack: 1,
    oddEven: 1,
    lowHigh: 1,
    dozen: 2,
  },
  spinMs: 4200,
};

export const PUSHER = {
  // One DROP costs the current bet and rains that many coin meshes (1 coin = 1 mesh).
  // Each normal coin pushed off the front pays 1 coin back.
  maxLiveCoins: { low: 30, medium: 50, high: 80 } as Record<string, number>,
  dropBatchSpecialRate: 0.35, // chance a drop batch hides one special coin
  bonusMultiplier: 3, // green token pays 3
  rainBonusCoins: 5, // teal token pays 5
  jackpotPrize: 25, // gold token pays flat 25
  autoDropMs: 1500,
  spawnMs: 140, // interval between coin spawns within a batch
  maxQueue: 200, // chute jams beyond this many waiting coins
  // 3D layout
  frontZ: 2.55, // z beyond which a coin counts as pushed off the front
  sideX: 2.3, // |x| beyond which a coin is lost off the side
  killY: -2, // y below which a coin is collected/removed
};

export const LEADERBOARD_LIMIT = 20;
