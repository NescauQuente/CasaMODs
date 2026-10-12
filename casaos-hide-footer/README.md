# Hide Footer for CasaOS

A [CasaMOD](https://github.com/Cp0204/CasaMOD) mod, CSS only. Hides the footer at the bottom of the CasaOS dashboard — the CasaOS logo, its text and the social buttons — and lets the app list and the widget column use the freed height, so both end on the same line.

## How it works

- `.base-bar`, `.brand-bar`, `.contact-bar`: hidden (`html body` in front beats the `display` of CasaOS's `.is-flex`).
- `.out-container .contents`: height `calc(100% - 4rem)`, the space the footer took.
- **The widget column** (`.side-bar`). CasaOS sizes it from the window height it measured once, when the page loaded (`--vh`, set in its `App.vue` and never updated). After going fullscreen or making the window bigger, the column ends early and leaves an empty band at the bottom, about the height of the browser's bars. These mods size it from the live window height instead (`100dvh`). They also make it a flex column, so the widgets fill it and scroll inside when they don't fit, and the widget settings card (when it shows) always stays inside it.
- **Where the column ends.** It ends above the footer. The footer's space is shared between the two mods through `--casamods-footer-space`: 3rem by default, 0 when Hide Footer is installed. The result is 4rem left at the bottom with only Hide Widget Settings, and 1rem with Hide Footer.

The widget column is tested together with Hide Widget Settings: `node ../casaos-hide-widget-settings/tests/layout-check.mjs`. CasaOS updates that rename these classes may need the selectors adjusted.

## Install

1. Install **CasaMOD** from the CasaOS app store (or from its repository).
2. Copy the `hide-footer` folder into `/DATA/AppData/casamod/mod/` on the CasaOS machine.
3. Restart CasaMOD and reload the CasaOS page (Ctrl+F5).

To remove it, move `hide-footer` out of `/DATA/AppData/casamod/mod/` and restart CasaMOD.
