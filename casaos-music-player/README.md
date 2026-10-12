# Music Player for CasaOS

A [CasaMOD](https://github.com/Cp0204/CasaMOD) mod that adds a music player widget to the CasaOS dashboard: it plays a folder of your CasaOS storage, right in the CasaOS tab. Anything else in the tab that listens to the page's audio (an animated wallpaper, for example) hears it too.

## Install

1. Install **CasaMOD** from the CasaOS app store (or from its repository).
2. Copy the `music-player-widget` folder into `/DATA/AppData/casamod/mod/` on the CasaOS machine.
3. Restart CasaMOD and reload the CasaOS page.

To remove it, move the folder out of `/DATA/AppData/casamod/mod/` and restart CasaMOD.

## Using it

- The widget sits first in the dashboard sidebar, in the look of the CasaOS widgets (frosted glass, white text). With the **widget-sortable** mod it can be dragged anywhere and stays there (its id is `music-player`).
- It plays `/DATA/Media/Music` by default. The folder button picks another folder (type a path or browse; subfolders can be included). The list button shows the playlist.
- Above the playlist, a search box filters it by track or folder name (case and accents ignored); Enter plays the first result. Clicking a track plays it now; the button beside it adds it to the queue (it then shows its place, and a second click takes it out). Queued tracks play after the current one, then the playlist goes on from where it was. The queue is remembered.
- Play/pause, previous/next, seek, shuffle, repeat (all / one / off), volume and mute. The last folder, track, position, shuffle, repeat, volume and queue are remembered.
- The track's title, artist, album and cover come from the file's tags: ID3v2 (MP3, AAC), FLAC and Ogg/Opus comments, MP4/M4A atoms. Without a cover in the file, an image named `cover`, `folder`, `front` or `album` (`.jpg`, `.jpeg`, `.png`, `.webp`) in the track's folder is used. The playlist keeps the file names; tags are read only for the track that plays and the next one.
- Media keys and the system media controls work (Media Session API), with the title, artist, album and cover. Animated wallpapers with media integration (synced lyrics, now playing) get them from there.
- Music keeps playing while you move around CasaOS, and the widget comes back if CasaOS re-renders its sidebar.
- It follows the CasaOS language (`localStorage.lang`) in all 31 CasaOS languages, with the right plural forms ("21 трек / 22 трека / 25 треков"); English otherwise.

## How it works

- Folders are listed with the CasaOS API, `GET /v1/folder?path=…` (with the session's token), breadth-first up to 3 levels, 3000 files and 400 folders; hidden files are skipped. Audio types: mp3, flac, ogg/oga, opus, wav, m4a, aac, webm/weba.
- Tracks stream from `GET /v1/file?path=…&token=…`, which supports seeking. Your files never leave the server.
- Tags are read from the same URL with HTTP ranges: the first 64 KB, then exactly the tag's size when it is bigger (up to 4 MB, for big covers); for MP4 the top-level atoms are walked with small reads to the `moov` one, wherever it is. The last 30 tracks' tags are kept in memory. `window.CasaMusicPlayer` also exposes `nowPlaying` and `readTags`.
- The widget is mounted in the CasaOS sidebar (`.ps-container`) and a cheap observer mounts it again when CasaOS re-renders. Playback lives outside the widget, so it survives that. widget-sortable sorts the sidebar only once, before this widget is added, so the widget places itself by the order that mod keeps (`localStorage['widget-sortable']`); first when there is none.
- `window.CasaMusicPlayer` exposes `audio`, `state`, `play`, `next`, `prev` and `rescan` (handy for other mods and for the tests).

## Tests

```bash
node tests/text-check.js       # languages, a second
node tests/player-runner.mjs   # end to end, a few minutes
```

`player-runner.mjs` drives a headless Chrome (found where it usually is on Windows, Linux or macOS, or set `CHROME`) through the DevTools protocol against a mock CasaOS (`tests/mock.html` served by `tests/server.py`, Python 3) that injects the mod the way CasaMOD's `run.sh` does and fakes `/v1/folder` and `/v1/file` (with Range) over three generated tracks (`tests/make_music.py`, into `tests/music/` on first run; one in a subfolder, plus a hidden file, a non-audio file, a folder cover and, in a hidden folder, a silent MP3 with ID3 tags and a cover). It checks the listing, playback, next, the playlist (and that it never scrolls the dashboard), shuffle and repeat, the folder picker, re-renders, resume after a reload, the widget-sortable order, search and the queue, tags and covers (ID3 from the server with ranges; FLAC, Ogg Opus and MP4 built in the page), the Media Session, and languages, and fails on any console error. Screenshots go to `tests/shots/`.

## Notes

- Built and tested against the mock and used on a real CasaOS 0.4.15. CasaOS updates that rename `.ps-container` or the widget markup may need small adjustments.
