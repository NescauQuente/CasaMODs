# Hide Footer for CasaOS

A CasaMOD mod, CSS plus a small script (`mod.js`) that fits the widget column: hides the dashboard footer (CasaOS logo, text and social buttons) and gives the space to apps and widgets. See `README.md`.

- `hide-footer/` is the mod as installed (`mod.css`, `mod.js`, `mod.json`, `preview.png`): no build step, copied as is to `/DATA/AppData/casamod/mod/hide-footer/`.
- It is its own project; it depends on no other mod.

## Working here

- The user is Brazilian: reply in Portuguese (pt-BR). Code, comments and README stay in English.
- It relies on CasaOS-UI class names (listed in the README); a CasaOS update that renames them needs the selectors adjusted. Keep the README list in sync with the selectors.
- The widget-column rules are shared with `../casaos-hide-widget-settings` (the same `mod.js`, byte for byte, and the same column rules): change both together, and run `node ../casaos-hide-widget-settings/tests/layout-check.mjs` after any change. For the rest, check the rules in a headless Chrome/Chromium against markup with the CasaOS classes (`getComputedStyle`), and say what could not be checked.
- Write files with LF line endings (Python on Windows: `open(..., 'w', newline='\n')`). Don't create `.html` files with the editor tool here: the desktop app opens them in the user's browser pane.
- At the end, tell the user what to copy: `hide-footer/` to `/DATA/AppData/casamod/mod/` on the CasaOS server, then restart CasaMOD and reload with Ctrl+F5.
