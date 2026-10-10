# CasaMODs

Two independent CasaMOD mods for CasaOS, one folder each: `casaos-live-wallpapers` (animated wallpapers) and `casaos-music-player` (a music widget). Each has its own `CLAUDE.md` with the rules for working on it: read the one of the project you touch. Neither depends on the other.

- The user is Brazilian: reply in Portuguese (pt-BR). Code, comments and READMEs stay in English. The user tests on their own CasaOS and decides; keep replies short and say what changed.
- GitHub: `NescauQuente/CasaMODs` (private). Commits are authored as NescauQuente (set in this repository's git config).
- Starry Orbit, the Wallpaper Engine wallpaper the user runs through Live Wallpapers, is a separate project outside this repository (`../star-wallpaper` on the user's PC), worked on in another chat: don't change it from here.

## Where you run

- **On the user's PC (Windows):** it is low-end. Run the quick `tests/text-check.js` always, the browser suites once per change, not repeatedly. The user's CasaOS (`http://the-maquina`) is reachable there.
- **In a cloud session:** the user's CasaOS is not reachable (it is only on their network and Tailscale); everything is checked against the mock CasaOS of each project's tests. The browser suites don't load the user's PC there, so run them after each change. They need Python 3 and Chrome or Chromium (found in the usual places, or set `CHROME`); install Chromium if it is missing.

## At the end

Tell the user what to copy: the changed mod folder (`casaos-live-wallpapers/live-wallpapers` or `casaos-music-player/music-player-widget`) into `/DATA/AppData/casamod/mod/` on the CasaOS server, then restart CasaMOD and reload with Ctrl+F5. From a cloud session, the changes are pushed to GitHub first, so the user can pull or download them.
