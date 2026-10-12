# Hide Widget Settings for CasaOS

A [CasaMOD](https://github.com/Cp0204/CasaMOD) mod, CSS only. Hides the **Widget settings** card at the bottom of the dashboard's widget column and lets the widget list reach down to the end of the app list.

Widgets are still turned on and off as before from CasaOS: with the card hidden, remove this mod (or temporarily move it out of the `mod` folder) to reach those settings.

## How it works

- `.widget:has(> .wsettings)`: the widget that holds the settings card, hidden.
- **The widget column** (`.side-bar`). CasaOS sizes it from the window height it measured once, when the page loaded (`--vh`, set in its `App.vue` and never updated). After going fullscreen or making the window bigger, the column ends early and leaves an empty band at the bottom, about the height of the browser's bars. These mods size it from the live window height instead (`100dvh`). They also make it a flex column, so the widgets fill it and scroll inside when they don't fit, and the widget settings card (when it shows) always stays inside it.
- **Where the column ends.** It ends above the footer. The footer's space is shared between the two mods through `--casamods-footer-space`: 3rem by default, 0 when Hide Footer is installed. The result is 4rem left at the bottom with only Hide Widget Settings, and 1rem with Hide Footer.

Works alone or together with **Hide Footer** (they share the rules above). Needs a browser with `:has()` (any current one). CasaOS updates that rename these classes may need the selectors adjusted.

## Tests

```bash
node tests/layout-check.mjs   # the widget column, a few seconds
```

It loads a page with CasaOS-UI's own layout CSS (`Home.vue`, `SideBar.vue`) in a headless Chrome or Chromium (or set `CHROME`). It checks the column with this mod, with Hide Footer (`../casaos-hide-footer`) and with both, at 1280×720, 1366×768, 1440×900, 1920×1080 and 2560×1440, each also after going fullscreen (`--vh` measured 140 px shorter). The widgets must fill the column down to the expected margin, with nothing cut by the screen or under the footer, and the card (when it shows) inside it.

## Install

1. Install **CasaMOD** from the CasaOS app store (or from its repository).
2. Copy the `hide-widget-settings` folder into `/DATA/AppData/casamod/mod/` on the CasaOS machine.
3. Restart CasaMOD and reload the CasaOS page (Ctrl+F5).

To remove it, move `hide-widget-settings` out of `/DATA/AppData/casamod/mod/` and restart CasaMOD.
