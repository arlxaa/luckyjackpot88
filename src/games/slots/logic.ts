import { SLOTS, type SlotSymbolId } from '../../config/balance';

export type Grid = SlotSymbolId[][]; // [reel][row], 5x3

export interface LineWin {
  lineIndex: number;
  symbol: SlotSymbolId;
  count: number;
  win: number;
  cells: Array<{ reel: number; row: number }>;
}

export interface EvalResult {
  totalWin: number;
  wins: LineWin[];
  isJackpot: boolean;
  isNearMiss: boolean;
  winningCells: Set<string>;
}

function weightedPick(rng: () => number): SlotSymbolId {
  const entries = Object.entries(SLOTS.meta) as Array<[SlotSymbolId, { weight: number }]>;
  const total = entries.reduce((a, [, m]) => a + m.weight, 0);
  let r = rng() * total;
  for (const [id, m] of entries) {
    r -= m.weight;
    if (r <= 0) return id;
  }
  return 'cherry';
}

function nonSeven(rng: () => number): SlotSymbolId {
  let s = weightedPick(rng);
  if (s === 'seven') s = rng() < 0.5 ? 'bear' : 'cherry';
  return s;
}

export function spinReels(rng: () => number = Math.random): { grid: Grid; forcedNearMiss: boolean; forcedJackpot: boolean } {
  const grid: Grid = Array.from({ length: 5 }, () =>
    Array.from({ length: 3 }, () => weightedPick(rng))
  );

  let forcedNearMiss = false;
  let forcedJackpot = false;

  // Jackpot injection: 5 sevens on middle line.
  if (rng() < SLOTS.jackpotInjectRate) {
    for (let r = 0; r < 5; r++) grid[r][1] = 'seven';
    forcedJackpot = true;
    return { grid, forcedNearMiss, forcedJackpot };
  }

  // Near-miss injection: two sevens up front on middle line, third different.
  if (rng() < SLOTS.nearMissRate) {
    grid[0][1] = 'seven';
    grid[1][1] = 'seven';
    grid[2][1] = nonSeven(rng);
    forcedNearMiss = true;
  }

  return { grid, forcedNearMiss, forcedJackpot };
}

export function evalSpin(grid: Grid, bet: number): EvalResult {
  const wins: LineWin[] = [];
  const winningCells = new Set<string>();

  SLOTS.paylines.forEach((line, lineIndex) => {
    const sym = grid[0][line[0]];
    let count = 1;
    for (let r = 1; r < 5; r++) {
      if (grid[r][line[r]] === sym) count++;
      else break;
    }
    if (count >= 3) {
      const meta = SLOTS.meta[sym];
      const mult = count === 3 ? meta.pay3 : count === 4 ? meta.pay4 : meta.pay5;
      let win = Math.floor(bet * mult);
      // Jackpot override: 5 sevens on middle line.
      let isJackpotLine = false;
      if (sym === 'seven' && count === 5 && lineIndex === 0) {
        win = bet * SLOTS.jackpotMultiplier;
        isJackpotLine = true;
      }
      const cells = Array.from({ length: count }, (_, r) => ({ reel: r, row: line[r] }));
      cells.forEach((c) => winningCells.add(`${c.reel}:${c.row}`));
      wins.push({ lineIndex, symbol: sym, count, win, cells });
      void isJackpotLine;
    }
  });

  const totalWin = wins.reduce((a, w) => a + w.win, 0);
  const isJackpot = wins.some((w) => w.symbol === 'seven' && w.count === 5 && w.lineIndex === 0);
  // Natural near-miss: first two middle-line sevens without a 3+ seven win.
  const middle = grid[0][1] === 'seven' && grid[1][1] === 'seven' && grid[2][1] !== 'seven';
  const hasSevenWin = wins.some((w) => w.symbol === 'seven');
  const isNearMiss = middle && !hasSevenWin;

  return { totalWin, wins, isJackpot, isNearMiss, winningCells };
}
