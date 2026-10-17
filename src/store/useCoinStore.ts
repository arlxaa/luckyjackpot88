import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STARTING_BALANCE, MAX_BALANCE, BET_TIERS } from '../config/balance';

interface CoinState {
  balance: number;
  bet: number;
  lastWin: number;
  biggestWin: number;
  winStreak: number;
  setBet: (bet: number) => void;
  canAfford: (amount?: number) => boolean;
  placeBet: (amount?: number) => boolean;
  awardWin: (amount: number) => void;
  /** Credit a stake-included return (roulette): balance += return, stats from net profit. */
  settleReturn: (totalReturn: number, profit: number) => void;
  /** Last failed spend — drives the "not enough coins" modal. Not persisted. */
  shortfall: { need: number; have: number } | null;
  notifyShortfall: (need: number) => void;
  clearShortfall: () => void;
  reset: () => void;
  hydrateFromCloud: (balance: number, biggestWin: number) => void;
}

export const useCoinStore = create<CoinState>()(
  persist(
    (set, get) => ({
      balance: STARTING_BALANCE,
      bet: BET_TIERS[1],
      lastWin: 0,
      biggestWin: 0,
      winStreak: 0,
      setBet: (bet) => set({ bet }),
      canAfford: (amount) => get().balance >= (amount ?? get().bet),
      placeBet: (amount) => {
        const cost = amount ?? get().bet;
        if (get().balance < cost) {
          set({ shortfall: { need: cost, have: get().balance } });
          return false;
        }
        set((s) => ({ balance: Math.max(0, s.balance - cost), lastWin: 0 }));
        return true;
      },
      awardWin: (amount) =>
        set((s) => ({
          balance: Math.min(MAX_BALANCE, s.balance + amount),
          lastWin: amount,
          biggestWin: Math.max(s.biggestWin, amount),
          winStreak: amount > 0 ? s.winStreak + 1 : 0,
        })),
      settleReturn: (totalReturn, profit) =>
        set((s) => ({
          balance: Math.min(MAX_BALANCE, s.balance + totalReturn),
          lastWin: Math.max(0, profit),
          biggestWin: profit > 0 ? Math.max(s.biggestWin, profit) : s.biggestWin,
          winStreak: profit > 0 ? s.winStreak + 1 : 0,
        })),
      reset: () => set({ balance: STARTING_BALANCE, lastWin: 0, biggestWin: 0, winStreak: 0, shortfall: null }),
      notifyShortfall: (need) => set({ shortfall: { need, have: get().balance } }),
      clearShortfall: () => set({ shortfall: null }),
      hydrateFromCloud: (balance, biggestWin) =>
        set({ balance: Math.min(MAX_BALANCE, Math.max(0, balance)), biggestWin }),
      shortfall: null,
    }),
    {
      name: 'lucky-jackpot88-coins',
      // shortfall is session-only UI state — never persist it.
      partialize: (s) => ({
        balance: s.balance,
        bet: s.bet,
        lastWin: s.lastWin,
        biggestWin: s.biggestWin,
        winStreak: s.winStreak,
      }),
    }
  )
);
