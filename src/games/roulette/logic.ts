// European single-zero roulette: 0-36.
import { ROULETTE } from '../../config/balance';

export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
  10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type BetId =
  | `num-${number}`
  | 'red' | 'black' | 'odd' | 'even' | 'low' | 'high'
  | 'dozen1' | 'dozen2' | 'dozen3';

export type Bets = Partial<Record<BetId, number>>;

export function spinNumber(rng: () => number = Math.random): number {
  return Math.floor(rng() * 37);
}

export function colorOf(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green';
  return REDS.has(n) ? 'red' : 'black';
}

/** Returns total returned (stake + winnings) per bet spot. Losing spots return 0. */
export function evalBets(bets: Bets, winNum: number): { totalReturn: number; winners: BetId[] } {
  const winners: BetId[] = [];
  let totalReturn = 0;
  const pay = (id: BetId, stake: number, won: boolean, mult: number) => {
    if (won && stake > 0) {
      winners.push(id);
      totalReturn += stake * (mult + 1);
    }
  };
  const isRed = REDS.has(winNum);
  const isBlack = winNum !== 0 && !isRed;
  const isOdd = winNum !== 0 && winNum % 2 === 1;
  const isEven = winNum !== 0 && winNum % 2 === 0;
  const isLow = winNum >= 1 && winNum <= 18;
  const isHigh = winNum >= 19 && winNum <= 36;

  for (const [id, stake] of Object.entries(bets) as Array<[BetId, number]>) {
    if (!stake) continue;
    if (id.startsWith('num-')) {
      const n = Number(id.slice(4));
      pay(id, stake, n === winNum, ROULETTE.payouts.single);
    } else if (id === 'red') pay(id, stake, isRed, ROULETTE.payouts.redBlack);
    else if (id === 'black') pay(id, stake, isBlack, ROULETTE.payouts.redBlack);
    else if (id === 'odd') pay(id, stake, isOdd, ROULETTE.payouts.oddEven);
    else if (id === 'even') pay(id, stake, isEven, ROULETTE.payouts.oddEven);
    else if (id === 'low') pay(id, stake, isLow, ROULETTE.payouts.lowHigh);
    else if (id === 'high') pay(id, stake, isHigh, ROULETTE.payouts.lowHigh);
    else if (id === 'dozen1') pay(id, stake, winNum >= 1 && winNum <= 12, ROULETTE.payouts.dozen);
    else if (id === 'dozen2') pay(id, stake, winNum >= 13 && winNum <= 24, ROULETTE.payouts.dozen);
    else if (id === 'dozen3') pay(id, stake, winNum >= 25 && winNum <= 36, ROULETTE.payouts.dozen);
  }
  return { totalReturn, winners };
}
