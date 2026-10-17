# Lucky Jackpot88 — virtual arcade (no real money)

A single-player circus arcade with **virtual coins only**. 4 games + Coin Catch rescue, Google login, global leaderboard.

## Quick start
1. `npm install`
2. Copy `.env.example` to `.env` and fill Firebase web config:
   - Firebase Console → Authentication → enable **Google** sign-in
   - Firestore → Create database (production mode)
   - Project Settings → Your apps → Web app → copy keys
3. `npm run dev` → http://localhost:5173
4. `npm run build` to verify.

Guests play with localStorage (100 starting coins). Signed-in users sync `users/{uid}` to Firestore.

## Economy (all in `src/config/balance.ts`)
- Bets 1/5/10/25/50, start 100, max 999999
- Slots: 5 paylines, weighted symbols, 250x middle-line 7s jackpot, 8% near-miss injection
- Pusher: DROP costs bet and rains bet coin meshes (1:1); front-fall pays 1, bonus x3 / rain x5 / jackpot 25 flat
- Scratch: fun 1 → 1/2/5/10, lucky 5 → 5/10/25/50, jackpot 25 → 25/50/125/250 (35% win)
- Roulette: single 35:1, dozen 2:1, even-money 1:1
- Free Coins: 30s catch, payout = caught (min 5, max 60), gold ★ = 5

## Firestore rules
See `firestore.rules` — users write only their own doc, `balance`/`biggestWin` bounded ints 0..999999.
Client coin logic is cheatable; for production validate with a Cloud Function.

Deploy:
- **Vercel:** import repo, set env vars, build `npm run build` → `dist`
- **Firebase Hosting:** `firebase init hosting`, `npm run build`, `firebase deploy`

## Sounds & assets to replace
Optional (synth fallback included, works with zero files):
- `/public/sounds/coin.mp3`, `win.mp3`, `click.mp3`, `lose.mp3`, `tick.mp3`, `thunk.mp3`, `fanfare.mp3`
- Fonts: Google Fonts Baloo 2 + Nunito (CDN in `index.html`)
- i18n: strings in `src/i18n/en.json` (structure ready for `id.json`)
- 3D: all procedural (boxes/cylinders); replace with GLTF models later if desired

## Juice / a11y notes
- Confetti, coin rain, count-up Big Win overlays, cabinet shake (`.shake`), coin delta fly on header counter
- Procedural WebAudio SFX + waltz music loop (mute/volume/sound-gate honored)
- Everything respects `reduce motion` + master mute; keyboard: Space spin/drop, A auto, T turbo, C clear, R reveal, N new card, ←/→ move
- Focus-visible neon outline, aria-live screens, labeled controls

## Milestones
- (a) setup + lobby + coin store + auth ✅
- (b) Slot Jackpot ✅
- (c) Coin Pusher (R3F + Rapier, lazy chunk, capped/sleeping bodies) ✅
- (d) Scratch Card ✅
- (e) Roulette ✅
- (f) Free Coins + BrokeGate ✅
- (g) leaderboard polish ✅ (tabs, medals, self-highlight, refresh, skeletons)
- (h) sound/juice polish ✅ (synth SFX, music loop, delta fly, loading screen, focus styles)
