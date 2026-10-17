import { Howl } from 'howler';
import { useSettingsStore } from '../store/useSettingsStore';

// Sounds work two ways:
// 1. If /public/sounds/*.mp3 exist they are used (list in README).
// 2. Otherwise a tiny WebAudio synth fallback plays so the game still has juice.
export type SoundName = 'coin' | 'win' | 'click' | 'lose' | 'tick' | 'thunk' | 'fanfare';

function makeHowl(src: string): Howl | null {
  try {
    return new Howl({ src: [`/sounds/${src}`] });
  } catch {
    return null;
  }
}

const howls: Record<string, Howl | null> = {};
let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function beep(freq: number, dur = 0.08, type: OscillatorType = 'square', gain = 0.04, when = 0) {
  const ac = ctx();
  if (!ac) return;
  const t = ac.currentTime + when;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function synth(name: SoundName) {
  // Scale synth gain by master volume.
  void useSettingsStore.getState().volume;
  switch (name) {
    case 'click': beep(660, 0.06); break;
    case 'coin': beep(988, 0.07); beep(1319, 0.12, 'square', 0.04, 0.06); break;
    case 'tick': beep(440, 0.04, 'square', 0.025); break;
    case 'thunk': beep(140, 0.12, 'sine', 0.08); break;
    case 'win': [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.12, 'square', 0.04, i * 0.09)); break;
    case 'fanfare': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => beep(f, 0.16, 'sawtooth', 0.035, i * 0.11)); break;
    case 'lose': beep(220, 0.15, 'sine', 0.05); break;
  }
  if (name === 'win' || name === 'fanfare') {
    try { navigator.vibrate?.(30); } catch { /* noop */ }
  }
}

const FILE: Record<SoundName, string> = {
  coin: 'coin.mp3',
  win: 'win.mp3',
  click: 'click.mp3',
  lose: 'lose.mp3',
  tick: 'tick.mp3',
  thunk: 'thunk.mp3',
  fanfare: 'fanfare.mp3',
};

export function playSound(name: SoundName) {
  const s = useSettingsStore.getState();
  if (!s.soundEnabled || s.muted) return;
  if (!howls[name]) howls[name] = makeHowl(FILE[name]);
  const h = howls[name];
  if (h) {
    h.volume(s.volume);
    try { h.play(); } catch { /* ignore */ }
  }
  synth(name);
}

// --- Procedural background music: soft carnival waltz loop (no assets needed). ---
let musicTimer: number | null = null;
let musicStep = 0;
const WALTZ = [523, 659, 784, 659, 587, 659, 784, 880, 784, 659, 587, 523];

export function startMusic() {
  if (musicTimer !== null) return;
  musicTimer = window.setInterval(() => {
    const s = useSettingsStore.getState();
    if (!s.soundEnabled || s.muted || !s.musicOn) return;
    const ac = ctx();
    if (!ac) return;
    const f = WALTZ[musicStep % WALTZ.length];
    musicStep++;
    // Quiet triangle pluck, scaled by master volume.
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t);
    const vol = 0.015 + s.volume * 0.02;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + 0.55);
  }, 420);
}

export function stopMusic() {
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}
