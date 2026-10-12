# Hide Footer for CasaOS

A [CasaMOD](https://github.com/Cp0204/CasaMOD) mod: CSS, plus a small script that fits the widget column. Hides the footer at the bottom of the CasaOS dashboard — the CasaOS logo, its text and the social buttons — and lets the app list and the widget column use the freed height, so both end on the same line.

## How it works

- `.base-bar`, `.brand-bar`, `.contact-bar`: hidden (`html body` in front beats the `display` of CasaOS's `.is-flex`).
- `.out-container .contents`: height `calc(100% - 4rem)`, the space the footer took.
- **The widget column** (`.side-bar`) ends on the same line as the apps, and above the footer when the footer shows.
  - CasaOS sizes the column from the window height it measured once, when the page loaded (`--vh`, set in its `App.vue` and never updated). After going fullscreen or making the window bigger, the column ends early.
  - Where the apps end changes with the CasaOS version and with the footer.
  - So `mod.js` measures where the dashboard's scrolling area (the apps) ends and where the column starts, and `mod.css` sizes the column from that (`--casamods-widget-column`). It measures on load, on resize and when CasaOS renders a new column: two measurements, no per-frame work.
  - Until then, and on phone-sized windows where CasaOS slides the column in over the apps, the column follows the live window height (`100dvh`), keeping 3rem for the footer unless Hide Footer removes it (`--casamods-footer-space`).
  - The column is a flex column: the widgets fill it and scroll inside when they don't fit, and the widget settings card (when it shows) always stays inside it.
  - Hide Footer and Hide Widget Settings carry the same `mod.js` and the same column rules; whichever loads first runs the script.

The widget column is tested together with Hide Widget Settings: `node ../casaos-hide-widget-settings/tests/layout-check.mjs`. CasaOS updates that rename these classes may need the selectors adjusted.

## Install

1. Install **CasaMOD** from the CasaOS app store (or from its repository).
2. Copy the `hide-footer` folder into `/DATA/AppData/casamod/mod/` on the CasaOS machine.
3. Restart CasaMOD and reload the CasaOS page (Ctrl+F5).

To remove it, move `hide-footer` out of `/DATA/AppData/casamod/mod/` and restart CasaMOD.
