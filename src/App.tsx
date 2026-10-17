import { Suspense, lazy, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header, Footer, SoundGate } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { LoadingScreen } from './components/LoadingScreen';
import { Lobby } from './pages/Lobby';
import { Leaderboard } from './pages/Leaderboard';
import { SlotsGame } from './games/slots/SlotsGame';
import { ScratchGame } from './games/scratch/ScratchGame';
import { RouletteGame } from './games/roulette/RouletteGame';
import { FreeCoinsGame } from './games/freecoins/FreeCoinsGame';
import { BrokeGate, FundsModal } from './components/BrokeGate';
import { PixelCursor } from './components/Cursor';
import { useAuthInit, useCloudSave } from './components/Auth';
import { useSettingsStore } from './store/useSettingsStore';
import { startMusic } from './audio/sound';

const PusherGame = lazy(() => import('./games/pusher/PusherGame').then((m) => ({ default: m.PusherGame })));

// HashRouter works from any static host and file:// — no server rewrites needed.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function useMusicLoop() {
  const musicOn = useSettingsStore((s) => s.musicOn);
  useEffect(() => {
    if (musicOn) startMusic();
  }, [musicOn]);
}

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  useAuthInit();
  useCloudSave();
  useMusicLoop();
  return (
    <HashRouter>
      <ScrollToTop />
      <div className="min-h-screen">
        <Header onOpenSettings={() => setSettingsOpen(true)} />
        <main>
          <Routes>
            <Route path="/" element={<Lobby />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/games/slots" element={<SlotsGame />} />
            <Route
              path="/games/pusher"
              element={
                <Suspense fallback={<LoadingScreen label="Loading 3D pusher..." />}>
                  <PusherGame />
                </Suspense>
              }
            />
            <Route path="/games/scratch" element={<ScratchGame />} />
            <Route path="/games/roulette" element={<RouletteGame />} />
            <Route path="/games/freecoins" element={<FreeCoinsGame />} />
            <Route path="*" element={<Lobby />} />
          </Routes>
        </main>
        <Footer />
        <BrokeGate />
        <FundsModal />
        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <SoundGate />
        <PixelCursor />
      </div>
    </HashRouter>
  );
}
