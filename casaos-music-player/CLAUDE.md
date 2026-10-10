# Music Player for CasaOS

A CasaMOD mod: a music player widget for the CasaOS dashboard that plays a folder of the CasaOS storage in the CasaOS tab (CasaOS file API: `/v1/folder`, `/v1/file`). See `README.md`.

- `music-player-widget/` is the mod as installed (`mod.js`, `mod.css`): no build step, copied as is to `/DATA/AppData/casamod/mod/music-player-widget/`.
- It is its own project. Wallpapers that react to the tab's audio (`../casaos-live-wallpapers`) hear it simply because it plays in the tab; neither depends on the other.

## Working here

- The user is Brazilian: reply in Portuguese (pt-BR). Code, comments and README stay in English.
- Texts live in the `TEXT` table of `mod.js`, in all 31 CasaOS languages (`pt-pt` only overrides `pt`; `tracks` holds Intl.PluralRules forms). A new or changed text needs every language — `node tests/text-check.js` fails otherwise.
- Tests: the user's PC struggles with browser tests. Always run `node tests/text-check.js` (a second); run `node tests/player-runner.mjs` (a few minutes) once after changing the mod, not repeatedly.
- Write files with LF line endings (Python on Windows: `open(..., 'w', newline='\n')`). Don't create `.html` files with the editor tool here: the desktop app opens them in the user's browser pane.
- The user's PC is low-end: keep the widget light (no per-frame work while idle).
- At the end, tell the user what to copy: `music-player-widget/` to `/DATA/AppData/casamod/mod/` on the CasaOS server, then restart CasaMOD and reload with Ctrl+F5.
