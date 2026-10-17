import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, firebaseConfigured } from '../lib/firebase';
import { LEADERBOARD_LIMIT } from '../config/balance';
import { useAuthStore } from '../store/useAuthStore';
import { BulbStrip, MachineScreen } from '../components/Chrome';

interface Row {
  id: string;
  displayName?: string;
  photoURL?: string;
  balance?: number;
  biggestWin?: number;
  updatedAt?: unknown;
}

type Tab = 'balance' | 'win';

const MEDAL = ['🥇', '🥈', '🥉'];

export function Leaderboard() {
  const myUid = useAuthStore((s) => s.user?.uid);
  const [tab, setTab] = useState<Tab>('balance');
  const [byBalance, setByBalance] = useState<Row[]>([]);
  const [byWin, setByWin] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    if (!firebaseConfigured || !db) return;
    setLoading(true);
    setError(null);
    try {
      const [b, w] = await Promise.all([
        getDocs(query(collection(db, 'users'), orderBy('balance', 'desc'), limit(LEADERBOARD_LIMIT))),
        getDocs(query(collection(db, 'users'), orderBy('biggestWin', 'desc'), limit(LEADERBOARD_LIMIT))),
      ]);
      setByBalance(b.docs.map((d) => ({ ...(d.data() as Row), id: d.id })));
      setByWin(w.docs.map((d) => ({ ...(d.data() as Row), id: d.id })));
      setFetchedAt(new Date());
    } catch {
      setError('Could not load the leaderboard. Check Firestore rules / network, then retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
    const t = window.setInterval(fetchAll, 30000);
    return () => window.clearInterval(t);
  }, [fetchAll]);

  if (!firebaseConfigured) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <h1 className="font-display text-3xl font-extrabold">Leaderboard</h1>
        <p className="mt-2 text-ink/70">Add Firebase .env to enable the global leaderboard. Guests can still play — sign in to appear here.</p>
        <Link to="/" className="mt-4 inline-block rounded-xl bg-amber-300 px-5 py-2 font-bold text-red-900">Back to lobby</Link>
      </div>
    );
  }

  const rows = tab === 'balance' ? byBalance : byWin;
  const field = tab === 'balance' ? 'balance' : 'biggestWin';

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/" className="font-pixel text-[10px] text-ink/60 hover:text-ink">← LOBBY</Link>
      <div className="mt-2 pixel-panel-cream p-4 sm:p-5">
        <BulbStrip count={12} />
        <div className="mt-2">
          <MachineScreen text={loading ? 'Fetching top players...' : error ?? `Top ${rows.length} players • updated ${fetchedAt?.toLocaleTimeString() ?? '—'}`} />
        </div>
        <h1 className="font-display mt-3 text-center text-3xl font-extrabold">🏆 Leaderboard</h1>

        <div className="mt-3 flex justify-center gap-2" role="tablist" aria-label="Leaderboard ranking">
          {(['balance', 'win'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`${tab === t ? 'btn-chunky bg-amber-300 text-red-900 font-display font-extrabold px-5 py-2' : 'btn-soft px-5 py-2'}`}
            >{t === 'balance' ? 'Top balance' : 'Biggest win'}</button>
          ))}
          <button onClick={fetchAll} aria-label="Refresh leaderboard" className="btn-soft px-4 py-2">↻</button>
        </div>

        {loading && rows.length === 0 ? (
          <div className="mt-4 space-y-2" aria-label="Loading">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-ink/10" />
            ))}
          </div>
        ) : error && rows.length === 0 ? (
          <div className="mt-4 rounded-xl bg-red-950/60 p-4 text-center">
            <p>{error}</p>
            <button onClick={fetchAll} className="mt-2 rounded-xl bg-amber-300 px-4 py-1.5 font-bold text-red-900">Retry</button>
          </div>
        ) : (
          <ol className="mt-4 space-y-2">
            {rows.map((r, i) => {
              const mine = myUid != null && r.id === myUid;
              return (
                <li
                  key={r.id}
                  className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 ${mine ? 'bg-mint border-ink shadow-[0_3px_0_rgba(43,33,24,1)]' : 'bg-white border-ink/20'} ${i === 0 ? 'ring-2 ring-ink' : ''}`}
                >
                  <span className="w-8 text-center font-display text-lg font-extrabold" aria-label={`Rank ${i + 1}`}>
                    {MEDAL[i] ?? `#${i + 1}`}
                  </span>
                  {r.photoURL
                    ? <img src={r.photoURL} alt="" className="h-8 w-8 rounded-full border border-white/30" loading="lazy" />
                    : <span className="grid h-8 w-8 place-items-center rounded-full bg-ink/10" aria-hidden>🎪</span>}
                  <span className="flex-1 truncate font-semibold">
                    {r.displayName ?? 'Anonymous'}{mine ? ' (you)' : ''}
                  </span>
                  <span className="font-display font-bold tabular-nums text-amber-700">{r[field] ?? 0} 🪙</span>
                </li>
              );
            })}
            {rows.length === 0 && <p className="text-center text-sm font-semibold text-ink/60">No players yet — be the first.</p>}
          </ol>
        )}
        <p className="mt-3 text-center text-xs font-semibold text-ink/60">
          Guests can play freely; only signed-in players appear here. Client coin logic is cheatable — writes are bounded by Firestore rules.
        </p>
      </div>
    </div>
  );
}
