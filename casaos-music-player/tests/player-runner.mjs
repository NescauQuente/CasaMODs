// End-to-end tests for the music player widget against the mock CasaOS
// (three generated tracks in /DATA/Media/Music, one in a subfolder).
//
//   node tests/player-runner.mjs
import { start, sleep } from './harness.mjs';

const T = await start({ port: 8770, cdp: 9333 });
const { ev, waitFor, clickSel, check, info, key } = T;

async function open() {
  await T.send('Page.navigate', { url: T.site });
  return waitFor(`window.CasaMusicPlayer && document.querySelector('.ps-container .smp-widget') && !CasaMusicPlayer.state.loading`, 20000);
}

try {
  // ---------------------------------------------------------------- load
  const loaded = await open();
  check('the player loads in the mock CasaOS', loaded, loaded ? null : await ev(`({ player: !!window.CasaMusicPlayer,
    widget: !!document.querySelector('.ps-container .smp-widget'), loading: window.CasaMusicPlayer && CasaMusicPlayer.state.loading })`));
  const injected = await ev(`[...document.scripts].map(s => s.getAttribute('src')).filter(Boolean)`);
  check('CasaMOD-style injection (mod.js of each mod)', injected.includes('mod/music-player-widget/mod.js'), injected);
  check('the widget is first in the CasaOS sidebar, with the widget look', await ev(`(() => {
    const w = document.querySelector('.ps-container').firstElementChild;
    return w.classList.contains('smp-widget') && !!w.querySelector('.widget > .blur-background'); })()`), null);
  const titles = await ev(`CasaMusicPlayer.state.tracks.map(t => t.title)`);
  check('it lists the folder (subfolders on; hidden and non-audio files skipped)', JSON.stringify(titles) === JSON.stringify(['01 Pulse', '02 Drift', '03 Echo']), titles);
  check('…and says how many tracks there are', /^3 tracks/.test(await ev(`document.querySelector('.smp-sub').textContent`)), await ev(`document.querySelector('.smp-sub').textContent`));

  // ---------------------------------------------------------------- playing
  await clickSel('.smp-widget [data-act="play"]');
  check('the play button starts the first track', await waitFor(`!CasaMusicPlayer.audio.paused && CasaMusicPlayer.audio.currentTime > 0.4`, 10000),
    await ev(`({ paused: CasaMusicPlayer.audio.paused, t: CasaMusicPlayer.audio.currentTime, err: CasaMusicPlayer.audio.error && CasaMusicPlayer.audio.error.code })`));
  check('the widget shows the track', (await ev(`document.querySelector('.smp-title').textContent`)) === '01 Pulse', await ev(`document.querySelector('.smp-title').textContent`));
  check('it streams from the CasaOS file API', /^\/v1\/file\?path=/.test(await ev(`new URL(CasaMusicPlayer.audio.src).pathname + new URL(CasaMusicPlayer.audio.src).search`)), null);

  // rewind first, so the track can't end by itself right as "next" is clicked
  await ev(`CasaMusicPlayer.audio.currentTime = 0`);
  await clickSel('.smp-widget [data-act="next"]');
  check('next track', await waitFor(`document.querySelector('.smp-title').textContent === '02 Drift'`, 6000),
    await ev(`({ i: CasaMusicPlayer.state.index, title: document.querySelector('.smp-title').textContent })`));
  await clickSel('.smp-widget [data-act="list"]');
  check('the playlist opens with 3 tracks', await waitFor(`document.querySelectorAll('.smp-list .smp-track').length === 3`, 2000), null);
  await clickSel('.smp-list .smp-track:nth-child(3) .smp-track-play');
  check('pick a track from the playlist (subfolder)', await waitFor(`document.querySelector('.smp-title').textContent === '03 Echo'
    && document.querySelector('.smp-sub').textContent === 'Album'`, 5000),
    await ev(`({ title: document.querySelector('.smp-title').textContent, sub: document.querySelector('.smp-sub').textContent })`));
  check('…without tags, it shows the cover image of its folder (Album/cover.png)', await waitFor(`(() => { const a = document.querySelector('.smp-art');
    return a.classList.contains('smp-cover') && /cover\.png/.test(decodeURIComponent(a.style.backgroundImage)); })()`, 4000),
    await ev(`document.querySelector('.smp-art').style.backgroundImage`));
  const scrolled = await ev(`({ contents: document.querySelector('.contents').scrollTop, page: document.scrollingElement.scrollTop })`);
  check('the playlist never scrolls the CasaOS dashboard', scrolled.contents === 0 && scrolled.page === 0, scrolled);
  await clickSel('.smp-widget [data-act="shuffle"]');
  await clickSel('.smp-widget [data-act="repeat"]');
  const modes = await ev(`({ shuffle: CasaMusicPlayer.state.shuffle, repeat: CasaMusicPlayer.state.repeat,
    on: document.querySelector('[data-act="shuffle"]').classList.contains('smp-on') })`);
  check('shuffle and repeat toggle', modes.shuffle && modes.repeat === 'one' && modes.on, modes);
  await T.shot('player_widget', await ev(`(() => { const b = document.querySelector('.smp-widget').getBoundingClientRect();
    return { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: b.height + 16 }; })()`));
  await clickSel('.smp-widget [data-act="list"]');

  // ---------------------------------------------------------------- the folder picker
  await clickSel('.smp-widget [data-act="folder"]');
  check('the folder picker shows the current folder and its subfolders', await waitFor(`(() => { const f = document.querySelector('.smp-folder');
    return f && !f.hidden && document.querySelector('.smp-path').value === '/DATA/Media/Music'
      && [...document.querySelectorAll('.smp-dir span')].some(s => s.textContent === 'Album'); })()`, 4000), null);
  await clickSel('.smp-widget [data-act="folder"]');

  // ---------------------------------------------------------------- Vue re-render
  const tBefore = await ev('CasaMusicPlayer.audio.currentTime');
  await ev('Mock.rerenderSidebar()');
  check('the widget comes back after CasaOS re-renders the sidebar', await waitFor(`document.querySelector('.ps-container .smp-widget')`, 2000), null);
  await sleep(400);
  check('the music keeps playing through it', await ev(`!CasaMusicPlayer.audio.paused && CasaMusicPlayer.audio.currentTime > ${tBefore}`), null);

  // ---------------------------------------------------------------- persistence
  await ev(`CasaMusicPlayer.audio.currentTime = 5`);
  await ev(`window.dispatchEvent(new Event('pagehide'))`);
  check('reload', await open(), null);
  const kept = await ev(`({ track: CasaMusicPlayer.state.current, shuffle: CasaMusicPlayer.state.shuffle, repeat: CasaMusicPlayer.state.repeat,
    title: document.querySelector('.smp-title').textContent })`);
  check('it remembers the track, shuffle and repeat', kept.track === '/DATA/Media/Music/Album/03 Echo.wav' && kept.shuffle && kept.repeat === 'one' && kept.title === '03 Echo', kept);
  check('…and resumes near where it stopped', await waitFor(`CasaMusicPlayer.audio.currentTime >= 4`, 4000), await ev('CasaMusicPlayer.audio.currentTime'));

  // ---------------------------------------------------------------- widget order
  // The widget-sortable mod keeps the order in localStorage and sorts only once, before this widget is added
  await ev(`CasaMusicPlayer.audio.pause(); localStorage.setItem('widget-sortable', 'clock|music-player|cpu')`);
  check('reload with a widget order saved by widget-sortable', await open(), null);
  const ids = `[...document.querySelector('.ps-container').children].map(c => c.getAttribute('widget-id'))`;
  check('the widget takes its place in that order (not always first)', JSON.stringify(await ev(ids)) === JSON.stringify(['clock', 'music-player', 'cpu']), await ev(ids));
  await ev('Mock.rerenderSidebar()');
  await waitFor(`document.querySelector('.ps-container .smp-widget')`, 2000);
  check('…and the same position after CasaOS re-renders the sidebar', (await ev(`[...document.querySelector('.ps-container').children].indexOf(document.querySelector('.smp-widget'))`)) === 1, await ev(ids));
  await ev(`localStorage.removeItem('widget-sortable')`);

  // ---------------------------------------------------------------- search and queue
  // Plain order from here: shuffle off, repeat all (one → off → all)
  await clickSel('.smp-widget [data-act="shuffle"]');
  await clickSel('.smp-widget [data-act="repeat"]');
  await clickSel('.smp-widget [data-act="repeat"]');
  await clickSel('.smp-widget [data-act="list"]');
  await waitFor(`document.querySelectorAll('.smp-list .smp-track').length === 3`, 2000);
  const shown = `[...document.querySelectorAll('.smp-list .smp-track-t')].map(e => e.textContent).join()`;
  const search = (text) => ev(`(() => { const s = document.querySelector('.smp-search'); s.value = ${JSON.stringify(text)};
    s.dispatchEvent(new Event('input')); })()`);
  await clickSel('.smp-search');
  await T.send('Input.insertText', { text: 'DRI' });
  check('the search above the playlist filters it (any case)', await waitFor(`${shown} === '02 Drift'`, 2000), await ev(shown));
  await search('album');
  check('…also by folder name', await waitFor(`${shown} === '03 Echo'`, 2000), await ev(shown));
  await search('nothing like this');
  check('…and says when nothing matches', await waitFor(`(document.querySelector('.smp-none') || {}).textContent === 'No matching tracks.'`, 2000), await ev(shown));
  await search('pulse');
  await key('Enter', 'Enter', 13);
  check('Enter plays the first result', await waitFor(`document.querySelector('.smp-title').textContent === '01 Pulse' && !CasaMusicPlayer.audio.paused`, 5000),
    await ev(`document.querySelector('.smp-title').textContent`));
  await search('');
  await waitFor(`document.querySelectorAll('.smp-list .smp-track').length === 3`, 2000);

  const queueBtn = (n) => `.smp-list .smp-track:nth-child(${n}) .smp-queue`;
  const badges = `[...document.querySelectorAll('.smp-list .smp-queue')].map(b => b.textContent.trim()).join('|')`;
  await clickSel(queueBtn(3));
  await clickSel(queueBtn(2));
  check('the button beside a track queues it, showing its place in the queue', (await ev(badges)) === '|2|1', await ev(badges));
  await clickSel(queueBtn(2));
  check('…a second click takes it out', (await ev(badges)) === '||1' && (await ev(`CasaMusicPlayer.state.queue.join()`)) === '2', await ev(badges));
  check('…and the current track keeps playing', (await ev(`document.querySelector('.smp-title').textContent`)) === '01 Pulse', null);
  await waitFor(`isFinite(CasaMusicPlayer.audio.duration)`, 5000);   // loaded, so it can jump near the end
  await ev(`CasaMusicPlayer.audio.currentTime = CasaMusicPlayer.audio.duration - 0.4`);
  check('when the track ends, the queued one plays', await waitFor(`document.querySelector('.smp-title').textContent === '03 Echo'
    && CasaMusicPlayer.state.queue.length === 0`, 6000), await ev(`document.querySelector('.smp-title').textContent`));
  await ev(`CasaMusicPlayer.audio.currentTime = 0`);
  await clickSel('.smp-widget [data-act="next"]');
  check('…then the playlist goes on from where it was (02 Drift, after 01 Pulse)', await waitFor(`document.querySelector('.smp-title').textContent === '02 Drift'`, 5000),
    await ev(`document.querySelector('.smp-title').textContent`));
  await clickSel(queueBtn(1));
  check('reload', await open(), null);
  check('the queue is kept after a reload', await waitFor(`CasaMusicPlayer.state.queue.join() === '0'`, 3000), await ev(`CasaMusicPlayer.state.queue`));
  await clickSel('.smp-widget [data-act="list"]');
  await waitFor(`document.querySelectorAll('.smp-list .smp-track').length === 3`, 2000);
  await T.shot('player_queue', await ev(`(() => { const b = document.querySelector('.smp-widget').getBoundingClientRect();
    return { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: b.height + 16 }; })()`));

  // ---------------------------------------------------------------- languages
  await ev(`CasaMusicPlayer.audio.pause(); localStorage.setItem('lang', 'pt_br')`);
  // ---------------------------------------------------------------- tags and covers
  // the tag reader, on files built here: FLAC, Ogg Opus and MP4
  const TAGS = await ev(`(() => {
    const enc = new TextEncoder(), le = n => [n & 255, n >> 8 & 255, n >> 16 & 255, n >>> 24 & 255], be = n => [n >>> 24 & 255, n >> 16 & 255, n >> 8 & 255, n & 255];
    const b24 = n => [n >> 16 & 255, n >> 8 & 255, n & 255], str = s => [...enc.encode(s)];
    const comments = (list) => { const o = [...le(6), ...str('vendor'), ...le(list.length)]; list.forEach(c => { const b = str(c); o.push(...le(b.length), ...b); }); return o; };
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a];
    const picture = [...be(3), ...be(9), ...str('image/png'), ...be(0), ...be(1), ...be(1), ...be(24), ...be(0), ...be(png.length), ...png];
    // FLAC: STREAMINFO, VORBIS_COMMENT, PICTURE (last)
    const vc = comments(['TITLE=Flac Song', 'ARTIST=Flac Band', 'ALBUM=Flac Album']);
    const flac = new Uint8Array([...str('fLaC'), 0, ...b24(34), ...new Array(34).fill(0), 4, ...b24(vc.length), ...vc, 0x86, ...b24(picture.length), ...picture]);
    // Ogg Opus: OpusHead page, then OpusTags (with a base64 picture)
    const page = (seq, data) => [...str('OggS'), 0, seq ? 0 : 2, 0, 0, 0, 0, 0, 0, 0, 0, ...le(77), ...le(seq), 0, 0, 0, 0, 1, data.length, ...data];
    const tagsPkt = [...str('OpusTags'), ...comments(['title=Opus Song', 'artist=Opus Band', 'METADATA_BLOCK_PICTURE=' + btoa(String.fromCharCode(...picture))])];
    const ogg = new Uint8Array([...page(0, [...str('OpusHead'), 1, 2, 0, 0, 0x80, 0xbb, 0, 0, 0, 0, 0]), ...page(1, tagsPkt)]);
    // MP4: ftyp, then moov > udta > meta > ilst
    const atom = (type, body) => [...be(8 + type.length - 4 + body.length), ...type, ...body].slice(0) && [...be(8 + body.length), ...type, ...body];
    const data = (kind, body) => atom(str('data'), [...be(kind), ...be(0), ...body]);
    const ilst = atom(str('ilst'), [...atom([0xa9, ...str('nam')], data(1, str('M4A Song'))), ...atom([0xa9, ...str('ART')], data(1, str('M4A Band'))),
      ...atom([0xa9, ...str('alb')], data(1, str('M4A Album'))), ...atom(str('covr'), data(14, png))]);
    const mp4 = new Uint8Array([...atom(str('ftyp'), str('M4A isom')), ...atom(str('moov'), atom(str('udta'), atom(str('meta'), [0, 0, 0, 0, ...ilst])))]);
    const sum = t => ({ title: t.title, artist: t.artist, album: t.album || '', pic: t.picture ? t.picture.mime + ':' + t.picture.data.length : null });
    return { flac: sum(CasaMusicPlayer.readTags(flac)), ogg: sum(CasaMusicPlayer.readTags(ogg)), mp4: sum(CasaMusicPlayer.readTags(mp4)) };
  })()`);
  check('the tag reader reads FLAC (Vorbis comments, picture)', JSON.stringify(TAGS.flac) === JSON.stringify({ title: 'Flac Song', artist: 'Flac Band', album: 'Flac Album', pic: 'image/png:6' }), TAGS);
  check('…Ogg Opus (comments, base64 picture)', JSON.stringify(TAGS.ogg) === JSON.stringify({ title: 'Opus Song', artist: 'Opus Band', album: '', pic: 'image/png:6' }), TAGS);
  check('…and MP4/M4A (iTunes atoms, cover)', JSON.stringify(TAGS.mp4) === JSON.stringify({ title: 'M4A Song', artist: 'M4A Band', album: 'M4A Album', pic: 'image/png:6' }), TAGS);

  // a real MP3 with an ID3v2.3 tag (UTF-16 title) and a front cover, read from the server with ranges
  await ev(`CasaMusicPlayer.state.folder = '/DATA/Media/Music/.tagged'; CasaMusicPlayer.rescan()`);
  await waitFor(`!CasaMusicPlayer.state.loading && CasaMusicPlayer.state.tracks.length === 1`, 5000);
  if (!(await ev(`!document.querySelector('.smp-listbox').hidden`))) await clickSel('.smp-widget [data-act="list"]');
  await clickSel('.smp-list .smp-track:nth-child(1) .smp-track-play');
  const NOW = `(() => { const a = document.querySelector('.smp-art'), m = navigator.mediaSession.metadata;
    return { title: document.querySelector('.smp-title').textContent, sub: document.querySelector('.smp-sub').textContent,
      cover: a.classList.contains('smp-cover') && /blob:/.test(a.style.backgroundImage),
      session: m && { title: m.title, artist: m.artist, album: m.album, art: m.artwork.length ? m.artwork[0].src.slice(0, 5) : '' },
      now: CasaMusicPlayer.nowPlaying, playing: !CasaMusicPlayer.audio.paused }; })()`;
  check('an MP3\'s tags show in the widget: title (UTF-16), artist — album, its own cover', await waitFor(`(() => { const n = ${NOW};
    return n.title === 'Canção de Teste' && n.sub === 'The Testers — Test Album' && n.cover; })()`, 6000), await ev(NOW));
  check('…and go to the browser\'s media controls (Media Session, with the cover)', await waitFor(`(() => { const s = (${NOW}).session;
    return s && s.title === 'Canção de Teste' && s.artist === 'The Testers' && s.album === 'Test Album' && s.art === 'blob:'; })()`, 2000), await ev(NOW));
  check('…the MP3 plays', await waitFor(`!CasaMusicPlayer.audio.paused && CasaMusicPlayer.audio.currentTime > 0.3`, 6000), await ev(NOW));
  const coverPx = await ev(`new Promise(r => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); g.drawImage(i, 0, 0); r([...g.getImageData(40, 40, 1, 1).data.slice(0, 3), ...g.getImageData(4, 4, 1, 1).data.slice(0, 3)]); };
    i.onerror = () => r('error'); i.src = CasaMusicPlayer.nowPlaying.cover; })`);
  check('…the cover is the picture inside the file', JSON.stringify(coverPx) === JSON.stringify([30, 170, 70, 220, 40, 40]), coverPx);
  check('…and the file was read in small ranges, not downloaded for it', await ev(`performance.getEntriesByType('resource')
    .filter(e => /04%20Tagged|04 Tagged/.test(decodeURIComponent(e.name))).length >= 1`), null);
  await T.shot('player_cover', await ev(`(() => { const b = document.querySelector('.smp-widget').getBoundingClientRect();
    return { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: Math.min(b.height + 16, 220) }; })()`));
  await ev(`CasaMusicPlayer.audio.pause(); CasaMusicPlayer.state.folder = '/DATA/Media/Music'; CasaMusicPlayer.rescan()`);
  await waitFor(`!CasaMusicPlayer.state.loading && CasaMusicPlayer.state.tracks.length === 3`, 5000);

  check('reload in Portuguese', await open(), null);
  check('it follows the CasaOS language (pt)', (await ev(`document.querySelector('.smp-heading').textContent`)) === 'Música', null);
  await ev(`localStorage.setItem('lang', 'ru_ru')`);
  check('reload in Russian', await open(), null);
  check('…in any CasaOS language (ru)', (await ev(`document.querySelector('.smp-heading').textContent`)) === 'Музыка', null);
  await ev(`localStorage.setItem('lang', 'ar_sa')`);
  check('reload in Arabic', await open(), null);
  await clickSel('.smp-widget [data-act="list"]');
  await waitFor(`document.querySelectorAll('.smp-list .smp-track').length === 3`, 2000);
  const ar = await ev(`(() => { const w = document.querySelector('.smp-widget'), r = (s) => w.querySelector(s).getBoundingClientRect();
    return { dir: getComputedStyle(w).direction, heading: w.querySelector('.smp-heading').textContent,
      headingRight: r('.smp-heading').left > r('.smp-head-btns').left,
      controls: getComputedStyle(w.querySelector('.smp-controls')).direction, nextRight: r('[data-act="next"]').left > r('[data-act="prev"]').left,
      seek: getComputedStyle(w.querySelector('.smp-seek')).direction,
      numberRight: r('.smp-track .smp-track-n').left > r('.smp-track .smp-track-t').left }; })()`);
  check('Arabic: the widget reads right to left (heading and playlist numbers on the right)',
    ar.dir === 'rtl' && ar.heading === 'الموسيقى' && ar.headingRight && ar.numberRight, ar);
  check('…while playback stays left to right (seek bar, previous/next)', ar.controls === 'ltr' && ar.nextRight && ar.seek === 'ltr', ar);
  await T.shot('player_widget_ar', await ev(`(() => { const b = document.querySelector('.smp-widget').getBoundingClientRect();
    return { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: b.height + 16 }; })()`));
  await ev(`localStorage.setItem('lang', 'en_us')`);
} catch (e) {
  check('runner exception: ' + e.message, false, e.stack);
}
await T.finish();
