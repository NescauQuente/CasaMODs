# CasaMODs

Mods for the [CasaOS](https://casaos.io) dashboard, installed with [CasaMOD](https://github.com/Cp0204/CasaMOD). Each folder is its own project, with its own README and tests:

- [`casaos-live-wallpapers`](casaos-live-wallpapers) — **Live Wallpapers**: animated wallpapers for the dashboard. Wallpaper Engine web and video wallpapers, HTML folders and loose videos, picked from the CasaOS wallpaper menu, with a settings panel built from their `project.json`.
- [`casaos-music-player`](casaos-music-player) — **Music Player**: a dashboard widget that plays a folder of the CasaOS storage in the CasaOS tab.
- [`casaos-hide-footer`](casaos-hide-footer) — **Hide Footer**: hides the dashboard footer (CasaOS logo, text and social buttons) and gives the space to apps and widgets. CSS only.
- [`casaos-hide-widget-settings`](casaos-hide-widget-settings) — **Hide Widget Settings**: hides the "Widget settings" card of the widget column. CSS only.
- [`casaos-transparence-everywhere`](casaos-transparence-everywhere) — **Transparence Everywhere**: the widgets' frosted glass on the top bar, its menus and the CasaOS dialogs. CSS only.

## Install

1. Install **CasaMOD** from the CasaOS app store (or from its repository).
2. Copy the mod folder (the folder inside each project, e.g. `casaos-music-player/music-player-widget` or `casaos-hide-footer/hide-footer`) into `/DATA/AppData/casamod/mod/` on the CasaOS machine.
3. Restart CasaMOD and reload the CasaOS page (Ctrl+F5).

## Tests

The two JavaScript mods each have a quick language check and an end-to-end suite against a mock CasaOS (Node.js 18+, Python 3 and Chrome or Chromium):

```bash
node casaos-live-wallpapers/tests/text-check.js
node casaos-live-wallpapers/tests/live-runner.mjs
node casaos-music-player/tests/text-check.js
node casaos-music-player/tests/player-runner.mjs
```
