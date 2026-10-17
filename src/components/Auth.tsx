import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { auth, firebaseConfigured, googleProvider } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useCoinStore } from '../store/useCoinStore';
import { loadProgress, saveProgress } from '../lib/firestore';
import { playSound } from '../audio/sound';

export function useAuthInit() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async (u) => {
      setUser(u ? { uid: u.uid, displayName: u.displayName, photoURL: u.photoURL } : null);
      setLoading(false);
      if (u) {
        const cloud = await loadProgress(u.uid).catch(() => null);
        if (cloud?.balance !== undefined) {
          // Keep whichever is higher so guest progress is never wiped by an old cloud save.
          const local = useCoinStore.getState();
          useCoinStore.getState().hydrateFromCloud(
            Math.max(local.balance, cloud.balance ?? 0),
            Math.max(local.biggestWin, cloud.biggestWin ?? 0)
          );
        }
      }
    });
  }, [setUser, setLoading]);
}

// Auto-save balance for logged in users (debounced by interval).
export function useCloudSave() {
  const user = useAuthStore((s) => s.user);
  const balance = useCoinStore((s) => s.balance);
  const biggestWin = useCoinStore((s) => s.biggestWin);
  useEffect(() => {
    if (!user || !firebaseConfigured) return;
    const t = setTimeout(() => {
      saveProgress(user.uid, {
        displayName: user.displayName,
        photoURL: user.photoURL,
        balance,
        biggestWin,
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [user, balance, biggestWin]);
}

export function AuthButton() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  if (!firebaseConfigured) {
    return <span className="text-xs text-ink/60">Guest mode (add Firebase .env to enable login)</span>;
  }
  if (loading) return <span className="text-xs">…</span>;
  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.photoURL && <img src={user.photoURL} alt="" className="h-7 w-7 rounded-full" />}
        <span className="hidden sm:inline text-sm max-w-28 truncate">{user.displayName}</span>
        <button
          onClick={() => auth && signOut(auth)}
          className="rounded-full bg-white/15 hover:bg-white/25 hover:-rotate-3 px-3 py-1 text-sm border-2 border-white/20 shadow-[0_3px_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-none transition"
        >Sign out</button>
      </div>
    );
  }
  return (
    <button
      onClick={async () => {
        if (!auth) return;
        playSound('click');
        await signInWithPopup(auth, googleProvider).catch(() => {});
      }}
      className="btn-chunky bg-cream text-circus-red font-display font-extrabold px-4 py-1 text-sm"
    >Sign in with Google</button>
  );
}
