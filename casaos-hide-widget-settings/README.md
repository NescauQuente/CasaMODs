# Hide Widget Settings for CasaOS

A [CasaMOD](https://github.com/Cp0204/CasaMOD) mod, CSS only. Hides the **Widget settings** card at the bottom of the dashboard's widget column and lets the widget list reach down to the end of the app list.

Widgets are still turned on and off as before from CasaOS: with the card hidden, remove this mod (or temporarily move it out of the `mod` folder) to reach those settings.

## How it works

- `.widget:has(> .wsettings)`: the widget that holds the settings card, hidden.
- `.side-bar:has(.wsettings) > .scroll-area`: `max-height: calc(100% - 3rem)`.

With **Hide Footer** installed too, its rule for the widget column (`max-height: 100%`) wins; both together look right. Needs a browser with `:has()` (any current one). CasaOS updates that rename these classes may need the selectors adjusted.

## Install

1. Install **CasaMOD** from the CasaOS app store (or from its repository).
2. Copy the `hide-widget-settings` folder into `/DATA/AppData/casamod/mod/` on the CasaOS machine.
3. Restart CasaMOD and reload the CasaOS page (Ctrl+F5).

To remove it, move `hide-widget-settings` out of `/DATA/AppData/casamod/mod/` and restart CasaMOD.
