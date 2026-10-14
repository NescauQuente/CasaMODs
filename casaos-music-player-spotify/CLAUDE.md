# Music Player + Spotify for CasaOS

A CasaMOD mod: the Music Player widget (`../casaos-music-player`, copied and extended) with a switch to the user's Spotify account (Spotify Web API, login with Authorization Code + PKCE and the user's own Client ID). See `README.md`.

- `music-player-spotify/` is the mod as installed (`mod.js`, `mod.css`): no build step, copied as is to `/DATA/AppData/casamod/mod/music-player-spotify/`.
- It is its own project and replaces the Music Player: it sets `window.__musicPlayerWidget` (it loads first, alphabetically) so the Music Player stands down if both are installed, keeps its `widget-id="music-player"`, and takes over its local settings once. `../casaos-music-player` stays as it is: a fix to the local player may be worth copying to both.
- The Spotify mode needs CasaOS over HTTPS (the user's: `tailscale serve`, `https://the-maquina.tail1ae8a1.ts.net/`) and a development-mode Spotify app (2026 rules: the owner needs Premium, up to 5 users, fewer endpoints for new apps, `product` gone from `GET /me`). A feature Spotify refuses is hidden (`auth.off`), never an error.

## Working here

- The user is Brazilian: reply in Portuguese (pt-BR). Code, comments and README stay in English.
- Texts live in the `TEXT` table of `mod.js`, in all 31 CasaOS languages (`pt-pt` only overrides `pt`; `tracks` holds Intl.PluralRules forms). A new or changed text needs every language — `node tests/text-check.js` fails otherwise.
- Tests: `node tests/text-check.js` (a second) and `node --check music-player-spotify/mod.js`. There is no browser suite: the user tests the Spotify mode on their CasaOS with their account and doesn't want long test runs from here.
- Write files with LF line endings (Python on Windows: `open(..., 'w', newline='\n')`). Don't create `.html` files with the editor tool here: the desktop app opens them in the user's browser pane.
- The user's PC is low-end: keep the widget light (no per-frame work; Spotify is read only in Spotify mode, with the tab visible).
- At the end, tell the user what to copy: `music-player-spotify/` to `/DATA/AppData/casamod/mod/` on the CasaOS server (and remove `music-player-widget`), then restart CasaMOD and reload with Ctrl+F5 at the HTTPS address.
