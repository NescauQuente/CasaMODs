# Hide Widget Settings for CasaOS

A CasaMOD mod, CSS only: hides the "Widget settings" card of the dashboard's widget column. See `README.md`.

- `hide-widget-settings/` is the mod as installed (`mod.css`): no build step, copied as is to `/DATA/AppData/casamod/mod/hide-widget-settings/`.
- It is its own project; it depends on no other mod.

## Working here

- The user is Brazilian: reply in Portuguese (pt-BR). Code, comments and README stay in English.
- It relies on CasaOS-UI class names (listed in the README); a CasaOS update that renames them needs the selectors adjusted. Keep the README list in sync with the selectors.
- The widget-column rules are shared with `../casaos-hide-footer` (same rules, `--casamods-footer-space`): change both together. `node tests/layout-check.mjs` checks the column with each mod and both, at several screen sizes and after going fullscreen; run it after any change to either.
- Write files with LF line endings (Python on Windows: `open(..., 'w', newline='\n')`). Don't create `.html` files with the editor tool here: the desktop app opens them in the user's browser pane.
- At the end, tell the user what to copy: `hide-widget-settings/` to `/DATA/AppData/casamod/mod/` on the CasaOS server, then restart CasaMOD and reload with Ctrl+F5.
