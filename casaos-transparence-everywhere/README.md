# Transparence Everywhere for CasaOS

A [CasaMOD](https://github.com/Cp0204/CasaMOD) mod, CSS only. Gives the rest of CasaOS the frosted glass of the dashboard widgets: the top bar, its Account and Settings menus and the dialogs (App Store, Terminal, Logs, app settings…) become translucent and blurred, with light text. Goes well with an animated wallpaper.

## How it works

- **Top bar** (`.navbar.top-bar`): transparent, with the glass on a `::before` so its blur doesn't cut the blur of the menus that open from it.
- **Menus and dialogs** (`.top-bar .dropdown-menu .dropdown-content`, `.modal .modal-card`): translucent dark background with `backdrop-filter: blur(20px) saturate(1.8)`, transparent headers and footers, light text (buttons and texts with a `has-text-*` color keep theirs; the terminal is untouched), darker fields and inner cards.
- **App Store:** neutral buttons, the "Install"/"Start and open" buttons, card hover, the app description (no white box), a dark loading veil.
- A dialog **inside** a dialog (an app's details in the store) gets a solid background, because glass over glass doesn't blur and what's behind shows through. Dropdowns inside dialogs are solid too, for readability.
- The **file manager** (`.file-panel`) is left as CasaOS draws it.

CasaOS updates that rename these classes may need the selectors adjusted.

## Install

1. Install **CasaMOD** from the CasaOS app store (or from its repository).
2. Copy the `transparence-everywhere` folder into `/DATA/AppData/casamod/mod/` on the CasaOS machine.
3. Restart CasaMOD and reload the CasaOS page (Ctrl+F5).

To remove it, move `transparence-everywhere` out of `/DATA/AppData/casamod/mod/` and restart CasaMOD.
