import { useSettingsStore } from '../store/useSettingsStore';

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettingsStore();
  if (!open) return null;
  return (
    <div role="dialog" aria-label="Settings" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-cream text-red-950 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-extrabold mb-3">Settings</h2>
        <label className="flex items-center justify-between py-2">
          Volume
          <input type="range" min={0} max={1} step={0.05} value={s.volume}
            onChange={(e) => s.set({ volume: Number(e.target.value) })} aria-label="Volume" />
        </label>
        <label className="flex items-center justify-between py-2">
          Music
          <input type="checkbox" checked={s.musicOn} onChange={(e) => s.set({ musicOn: e.target.checked })} />
        </label>
        <label className="flex items-center justify-between py-2">
          Reduce motion
          <input type="checkbox" checked={s.reduceMotion} onChange={(e) => s.set({ reduceMotion: e.target.checked })} />
        </label>
        <label className="flex items-center justify-between py-2">
          Graphics quality
          <select value={s.quality} onChange={(e) => s.set({ quality: e.target.value as never })}
            className="rounded border px-2 py-1" aria-label="Graphics quality">
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
        <button onClick={onClose} className="mt-3 w-full rounded-xl bg-circus-red text-cream font-bold py-2">Close</button>
      </div>
    </div>
  );
}
