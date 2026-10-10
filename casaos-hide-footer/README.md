# Hide Footer for CasaOS

A [CasaMOD](https://github.com/Cp0204/CasaMOD) mod, CSS only. Hides the footer at the bottom of the CasaOS dashboard — the CasaOS logo, its text and the social buttons — and lets the app list and the widget column use the freed height, so both end on the same line.

## How it works

- `.base-bar`, `.brand-bar`, `.contact-bar`: hidden (`html body` in front beats the `display` of CasaOS's `.is-flex`).
- `.out-container .contents`: height `calc(100% - 4rem)`, the space the footer took.
- `.out-container .side-bar > .scroll-area` (the widget column): `max-height: 100%`.

CasaOS updates that rename these classes may need the selectors adjusted.

## Install

1. Install **CasaMOD** from the CasaOS app store (or from its repository).
2. Copy the `hide-footer` folder into `/DATA/AppData/casamod/mod/` on the CasaOS machine.
3. Restart CasaMOD and reload the CasaOS page (Ctrl+F5).

To remove it, move `hide-footer` out of `/DATA/AppData/casamod/mod/` and restart CasaMOD.
