# Hide Widget Settings for CasaOS

A [CasaMOD](https://github.com/Cp0204/CasaMOD) mod: CSS, plus a small script that fits the widget column. Hides the **Widget settings** card at the bottom of the dashboard's widget column and lets the widget list reach down to the end of the app list.

Widgets are still turned on and off as before from CasaOS: with the card hidden, remove this mod (or temporarily move it out of the `mod` folder) to reach those settings.

## How it works

- `.widget:has(> .wsettings)`: the widget that holds the settings card, hidden.
- **The widget column** (`.side-bar`) ends on the same line as the apps, and above the footer when the footer shows.
  - CasaOS sizes the column from the window height it measured once, when the page loaded (`--vh`, set in its `App.vue` and never updated). After going fullscreen or making the window bigger, the column ends early.
  - Where the apps end changes with the CasaOS version and with the footer.
  - So `mod.js` measures where the dashboard's scrolling area (the apps) ends and where the column starts, and `mod.css` sizes the column from that (`--casamods-widget-column`). It measures on load, on resize and when CasaOS renders a new column: two measurements, no per-frame work.
  - Until then, and on phone-sized windows where CasaOS slides the column in over the apps, the column follows the live window height (`100dvh`), keeping 3rem for the footer unless Hide Footer removes it (`--casamods-footer-space`).
  - The column is a flex column: the widgets fill it and scroll inside when they don't fit, and the widget settings card (when it shows) always stays inside it.
  - Hide Footer and Hide Widget Settings carry the same `mod.js` and the same column rules; whichever loads first runs the script.

Works alone or together with **Hide Footer** (they share the rules above). Needs a browser with `:has()` (any current one). CasaOS updates that rename these classes may need the selectors adjusted.

## Tests

```bash
node tests/layout-check.mjs   # the widget column, a few seconds
```

It loads a page with CasaOS-UI's own layout CSS (`App.vue`, `Home.vue`, `SideBar.vue`) in a headless Chrome or Chromium (or set `CHROME`).

It checks the column with this mod, with Hide Footer (`../casaos-hide-footer`) and with both:
- on both dashboard layouts (CasaOS-UI 0.4.18 and later, and 0.4.13–0.4.17), with two different spaces above the column;
- at 1280×720, 1366×768, 1440×900, 1920×1080 and 2560×1440, each also after going fullscreen (`--vh` measured 140 px shorter);
- after a resize, and on a phone-sized window.

The column must end on the apps' line, above the footer when it shows, with the widgets and the card inside it. It also checks that both mods carry the same script.

## Install

1. Install **CasaMOD** from the CasaOS app store (or from its repository).
2. Copy the `hide-widget-settings` folder into `/DATA/AppData/casamod/mod/` on the CasaOS machine.
3. Restart CasaMOD and reload the CasaOS page (Ctrl+F5).

To remove it, move `hide-widget-settings` out of `/DATA/AppData/casamod/mod/` and restart CasaMOD.
