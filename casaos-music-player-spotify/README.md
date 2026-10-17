# Music Player + Spotify for CasaOS

A [CasaMOD](https://github.com/Cp0204/CasaMOD) mod: the [Music Player](../casaos-music-player) widget with a switch at its top between **Local** (a folder of your CasaOS storage, played in the CasaOS tab) and **Spotify** (your Spotify account: what plays in the Spotify app on any of your devices, with its controls, your playlists, the queue, search and devices).

It replaces the Music Player mod: install one or the other. If both are installed, the Music Player stands down and only this widget shows.

## Install

1. Install **CasaMOD** from the CasaOS app store (or from its repository).
2. Copy the `music-player-spotify` folder into `/DATA/AppData/casamod/mod/` on the CasaOS machine. If `music-player-widget` (the Music Player) is there, remove it.
3. Restart CasaMOD and reload the CasaOS page.

The local player's settings (folder, queue, volume, shuffle, repeat, last track) are taken over from the Music Player the first time. Local mode works like the Music Player (see [its README](../casaos-music-player/README.md)), plus the **Up next** button described below.

## Spotify

The Spotify mode controls the Spotify app playing on any of your devices (PC, phone, TV, speaker). The music doesn't play in the CasaOS tab.

### What you need

- **Spotify Premium** to control playback (play, pause, skip, seek, shuffle, repeat, volume, queue, devices). Spotify's API allows control only for Premium accounts. A free account still sees what plays and its playlists, with a small (i) explaining why there are no controls. Creating the Spotify app (step 2) also needs a Premium account.
- **CasaOS over HTTPS.** Spotify only sends you back to an `https://` address after you log in (`http://` works only as `http://127.0.0.1`, on the server itself). If you use Tailscale, step 1 does it in two minutes.

### 1. CasaOS over HTTPS with Tailscale

1. In the Tailscale admin console → **DNS**, turn on **MagicDNS** and **HTTPS Certificates**.
2. On the CasaOS server:
   ```bash
   sudo tailscale serve --bg 80
   ```
   (use CasaOS's port if it is not 80). It prints your address, like `https://my-server.tail1234.ts.net/`. It keeps running after a reboot; `sudo tailscale serve --https=443 off` turns it off.
3. Open CasaOS at that address and use it from now on. Your browser treats it as a different site from `http://…`: log in to CasaOS again there; the Spotify login is also kept only at that address.

Only devices in your tailnet can open it; nothing is exposed to the internet (no Funnel needed: Spotify never connects to your server). Any other HTTPS reverse proxy (Caddy, Nginx Proxy Manager…) works too.

### 2. Create your Spotify app

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard), log in and click **Create app** (accept the developer terms if asked).
2. **App name** and **App description**: anything (e.g. "CasaOS Music").
3. **Redirect URI**: your CasaOS HTTPS address with the trailing slash, exactly, e.g. `https://my-server.tail1234.ts.net/`. The widget's Spotify settings show the address to copy.
4. **Which API/SDKs are you planning to use?** Tick **Web API**. Accept the terms and **Save**.
5. In the app → **Settings** → **User Management**, add the Spotify account(s) that will use it (name and the account's e-mail), up to 5. Spotify only lets the accounts listed there log in.
6. Copy the **Client ID**. The Client Secret is not used: never paste it anywhere.

### 3. Connect the widget

1. On the dashboard, switch the widget to **Spotify** (the round icon at its top) and open its settings (the gear).
2. Paste the Client ID and click **Connect**. Spotify asks you to allow access, then sends you back to CasaOS, connected.
3. Play something in Spotify on any device. The widget follows it; the "Playing on…" line moves the music to another device.

**Disconnect** in the settings forgets the login in this browser. You can also remove the app's access at [spotify.com/account](https://www.spotify.com/account/) → **Manage apps**.

### Using it

- **Now playing:** the cover, title, artist and album, a ❤ to save it to (or remove it from) Liked Songs, the progress (drag it to seek), shuffle, previous, play/pause, next, repeat (all / one / off) and the volume (when the device lets it be set), and the device it plays on.
- **Library** (the list button): Liked Songs and your playlists, with the same search box as the local playlist; typing also searches Spotify's catalog (its 10 best tracks, under "On Spotify"). Clicking a playlist opens its tracks (more load as you scroll; a search goes through all of them). Clicking a track plays it there, in the playlist; the button beside it adds it to the Spotify queue (✓ once added: only Spotify itself can take it out of the queue, the API has no way to).
- **Up next** (the button beside the list button, in both modes): what plays now and what comes after it. In Spotify mode, Spotify's queue and then the rest of the playlist or album (up to 20); clicking one skips ahead to it. In local mode, the tracks you queued (✕ takes one out), then the next 20 in play order; clicking one plays it.
- **Devices** (the "Playing on…" line): the devices where Spotify is open; one click moves the music there. With nothing playing, a command opens this list.
- **Free account**: what plays, the library and the ❤; no controls, and an (i) beside the title that says why. The widget finds out by itself (Spotify no longer says it to apps like this one): a command that changes nothing is sent when a device is playing, and a free account's answer is `PREMIUM_REQUIRED`. It asks again after 6 hours and on another device, so an upgrade shows up by itself.
- Media keys that reach the CasaOS tab control Spotify in Spotify mode.

### Troubleshooting

- **"INVALID_CLIENT: Invalid redirect URI"** (on Spotify's page): the Redirect URI registered in step 2.3 is not exactly the address you opened CasaOS with (the trailing slash, `http` instead of `https`, another hostname).
- **"This account isn't in your Spotify app"**: add the account in step 2.5.
- **No controls, an (i) instead**: the account is not Premium.
- **"No device is playing"**: open Spotify on a device and play something, or pick one in the devices list.
- **Asked to connect again on another address**: the login is kept per address; use the HTTPS one.
- **A feature disappeared** (the library, search, the ❤): Spotify refused it to this app (it gives new apps fewer features). The browser console says which (`[Music Player + Spotify] Spotify refuses …`). Disconnecting and connecting again tries everything again.

## How it works

- **Login:** Authorization Code with PKCE, right from the CasaOS page (`crypto.subtle` for the challenge): no server and no secret, only your app's Client ID. The redirect is the page's own address (`location.origin + '/'`); back from Spotify, the mod exchanges the code and cleans the address. The access token is renewed a minute before it ends, with the refresh token Spotify replaces each time (shared between tabs through `localStorage`). Scopes: `user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative user-library-read user-library-modify`.
- **Storage:** the local player's settings in `localStorage['casamod-music-player-spotify']`; the Spotify login, the account and what Spotify refused in `localStorage['casamod-music-player-spotify-auth']`, in this browser and at this address only. Disconnect clears the login.
- **What plays:** `GET /me/player` every 3 seconds while playing and every 10 while paused, right after each command and when the song ends; nothing in local mode or while the tab is hidden. In between, the progress moves on its own (a 500 ms timer, only while playing and visible). A command shows at once and is then read back from Spotify. After a 429, nothing is asked until Spotify's `Retry-After` has passed.
- **Endpoints:** the player (`/me/player`, `play`, `pause`, `next`, `previous`, `seek`, `shuffle`, `repeat`, `volume`, `queue` to read and add, `devices`, transfer; skipping ahead in Up next is that many `next` calls, 20 at most), `/me/playlists`, `/playlists/{id}/items` (2026's name for a playlist's tracks; `items[].item` or `items[].track`), `/me/tracks` (Liked Songs), `/me/library` and `/me/library/contains` (saving, with the older `/me/tracks?ids=` as a fallback), `/search?type=track&limit=10`. Liked Songs play as your collection (`spotify:user:{id}:collection`), else as up to 100 tracks from the one clicked.
- **For other mods:** in Spotify mode, the widget fires a `casamods:nowplaying` event on `window` with `{ source: 'spotify', title, artist, album, cover, playing, position, duration, at }` (seconds; `at` is `Date.now()`), and `{ playing: false }` when it stops or leaves Spotify mode. `window.CasaMusicPlayer` has the Music Player's API, plus `source('local' | 'spotify')` and `spotify` (`playback`, `connected`, `premium`, `connect`, `disconnect`, `refresh`).

## Tests

```bash
node tests/text-check.js     # languages, a second
```

All 31 CasaOS languages, every text in each. There is no browser suite for the Spotify mode: its login can only be tested with a real Spotify account, on your CasaOS.
