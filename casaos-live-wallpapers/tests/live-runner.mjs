// End-to-end tests for the Live Wallpapers mod against the mock CasaOS, with
// the wallpapers of tests/fixtures/wallpapers:
//   probe/         a Wallpaper Engine web wallpaper that reports what it gets
//   plain/         a folder with just an index.html
//   clip.webm      a loose video
//   scene-sample/, exe-sample/   Wallpaper Engine types that can't run here
// and a test track (tests/music, generated) playing in the tab for the audio.
//
//   node tests/live-runner.mjs
import { start, sleep } from './harness.mjs';

const T = await start({ port: 8771, cdp: 9334, fixtures: true });
const { ev, waitFor, click, clickSel, mouse, key, shot, check, info } = T;

async function open() {
  await T.send('Page.navigate', { url: T.site });
  const ok = await waitFor(`window.__liveWallpapersMod && document.getElementById('lw-layer')`, 20000);
  // What the test wallpapers report (they post to the page around them)
  await ev(`window.__probe = null; window.__plain = false; addEventListener('message', (e) => {
    if (e.data && e.data.probe) window.__probe = e.data.probe;
    if (e.data && e.data.plain) window.__plain = true; })`);
  return ok;
}

const LAYER = `(() => { const l = document.getElementById('lw-layer'), f = l.querySelector('iframe'), v = l.querySelector('video');
  return { on: document.documentElement.classList.contains('lw-on'), shown: getComputedStyle(l).display !== 'none',
    bg: getComputedStyle(document.getElementById('background')).visibility, frame: !!f, sandbox: f ? f.getAttribute('sandbox') : null,
    video: !!v, src: v ? v.src.slice(0, 5) : null, playing: v ? !v.paused : null, muted: v ? v.muted : null }; })()`;

// The settings dropdown toggles on its button: open it only if it isn't
async function openDropdown() {
  if (!(await ev(`document.getElementById('settings-dropdown').classList.contains('is-active')`))) await clickSel('#settings-btn');
}

async function openMenu() {
  await openDropdown();
  await waitFor(`document.getElementById('mock-change-wallpaper')`, 3000);
  await clickSel('#mock-change-wallpaper');
  return waitFor(`document.querySelectorAll('.lw-tile').length >= 5`, 8000);
}

async function clickTile(name) {
  const c = await ev(`(() => { const t = [...document.querySelectorAll('.lw-tile')].find(x => x.querySelector('.lw-name').textContent === ${JSON.stringify(name)});
    if (!t) return null; t.scrollIntoView({ block: 'nearest' }); const b = t.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
  if (!c) throw new Error('no tile ' + name + ' among ' + JSON.stringify(await ev(`[...document.querySelectorAll('.lw-name')].map(n => n.textContent)`)));
  await click(c[0], c[1]);
}

async function choose(name) {
  await openMenu();
  await clickTile(name);
  await clickSel('#mock-apply');
}

async function openPanel() {
  await openDropdown();
  await waitFor(`(() => { const b = document.getElementById('lw-customize'); return b && !b.hidden; })()`, 3000);
  await clickSel('#lw-customize button');
  // the panel, and the dropdown closed behind it (Buefy closes it a moment later)
  return waitFor(`document.getElementById('lw-panel') && !document.getElementById('settings-dropdown').classList.contains('is-active')`, 2000);
}

const ROWS = `[...document.querySelectorAll('#lw-panel .lw-row, #lw-panel .lw-text, #lw-panel .lw-group-head')].map(r => ({
  text: (r.querySelector('label') || r).textContent, hidden: r.hidden }))`;
// The panel's sections: title (null before the first header), open, and the rows in view
const GROUPS = `[...document.querySelectorAll('#lw-panel .lw-group')].filter(g => !g.hidden).map(g => {
  const hd = g.querySelector(':scope > .lw-group-head');
  return { title: hd ? hd.textContent : null, open: hd ? hd.getAttribute('aria-expanded') === 'true' : true,
    rows: [...g.querySelectorAll('.lw-row label, .lw-text, .lw-note')].filter(e => e.offsetParent).map(e => e.textContent) }; })`;
const groupOf = (gs, title) => gs.find((g) => g.title === title) || {};

async function clickHeader(title) {
  const c = await ev(`(() => { const hd = [...document.querySelectorAll('#lw-panel .lw-group-head')].find(x => x.textContent === ${JSON.stringify(title)});
    hd.scrollIntoView({ block: 'nearest' }); const b = hd.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
  await click(c[0], c[1]);
}

try {
  // ---------------------------------------------------------------- load
  check('the mod loads in the mock CasaOS', await open(), null);
  check('nothing loads until a live wallpaper is chosen', await ev(`(() => { const s = ${LAYER}; return !s.on && !s.shown && !s.frame && !s.video; })()`), await ev(LAYER));

  // ---------------------------------------------------------------- the wallpaper menu
  check('the wallpapers folder shows up in the CasaOS wallpaper menu', await openMenu(), await ev(`document.querySelectorAll('.lw-tile').length`));
  const TILES = `[...document.querySelectorAll('.lw-tile')].map(t => ({ name: t.querySelector('.lw-name').textContent,
    why: (t.querySelector('.lw-why') || {}).textContent || '', off: t.classList.contains('lw-disabled'), img: t.querySelector('img').src.slice(0, 22) }))`;
  const tiles = await ev(TILES);
  const by = (n) => tiles.find((t) => t.name === n) || {};
  check('a Wallpaper Engine web wallpaper, a plain HTML folder and a loose video are listed',
    tiles.length === 5 && by('Probe').off === false && by('plain').off === false && by('clip').off === false, tiles);
  check('scene and application wallpapers are greyed out with the reason, at the end',
    by('Mountain scene').off && by('Mountain scene').why === 'Scene: only runs in Wallpaper Engine'
    && by('Some app').off && by('Some app').why === 'Application: not supported'
    && tiles.slice(-2).every((t) => t.off) && tiles.slice(0, -2).every((t) => !t.off), tiles);
  check('previews come from the wallpapers (project.json preview)', /preview\.png$/.test(await ev(`[...document.querySelectorAll('.lw-tile')]
    .find(t => t.querySelector('.lw-name').textContent === 'Probe').querySelector('img').src`)), by('Probe'));
  check('a video without a preview gets a frame of itself', await waitFor(`[...document.querySelectorAll('.lw-tile')]
    .find(t => t.querySelector('.lw-name').textContent === 'clip').querySelector('img').src.startsWith('data:image/jpeg')`, 9000), by('clip'));
  const grid = await ev(`(() => { const c = document.querySelector('.lw-grid'), cols = [...c.children];
    return { wrap: getComputedStyle(c).flexWrap, widths: [...new Set(cols.map(x => Math.round(x.getBoundingClientRect().width)))], count: cols.length }; })()`);
  const rowsOf = await ev(`new Set([...document.querySelector('.lw-grid').children].map(c => Math.round(c.getBoundingClientRect().top))).size`);
  check('tiles wrap four to a row, all the same size', grid.wrap === 'wrap' && grid.widths.length === 1 && rowsOf === Math.ceil(grid.count / 4), { grid, rowsOf });
  await shot('live_menu', await ev(`(() => { const b = document.querySelector('.modal-card').getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; })()`));
  await clickSel('#mock-cancel');

  // ---------------------------------------------------------------- a web wallpaper, isolated
  await choose('Probe');
  check('choosing it takes over the background', await waitFor(`(() => { const s = ${LAYER}; return s.on && s.shown && s.frame && s.bg === 'hidden'; })()`, 4000), await ev(LAYER));
  check('it runs isolated by default (sandboxed iframe)', (await ev(LAYER)).sandbox === 'allow-scripts', await ev(LAYER));
  const layers = await ev(`(() => { const l = document.getElementById('lw-layer'), cs = getComputedStyle(l);
    const at = (x, y) => document.elementFromPoint(x, y);
    const w = document.querySelector('.ps-container .widget').getBoundingClientRect(), a = document.querySelector('.app-card').getBoundingClientRect();
    return { first: document.body.firstElementChild === l || document.body.firstElementChild.nextElementSibling === l, z: cs.zIndex, pe: cs.pointerEvents,
      widget: !!at(w.x + w.width / 2, w.y + w.height / 2).closest('.widget'), card: !!at(a.x + a.width / 2, a.y + a.height / 2).closest('.app-card') }; })()`);
  check('the layer sits first in <body>, z-index 0, under the whole CasaOS UI', layers.first && layers.z === '0' && layers.pe === 'none', layers);
  check('widgets and app cards stay on top and clickable', layers.widget && layers.card, layers);
  check('the wallpaper gets its properties (project.json defaults) and the general ones',
    await waitFor(`(() => { const p = window.__probe; return p && p.props.speed === 3 && p.props.glow === true && p.props.mode === 1
      && p.props.glowcolor === '1 0.5 0' && p.general.language === 'en-us' && p.paused === false && p.registered; })()`, 6000), await ev('window.__probe'));
  const iso = await ev('window.__probe');
  check('isolated: no access to the CasaOS page or its storage', iso && iso.sameOrigin === false && iso.storage === false, iso);

  // audio of the tab, in the Wallpaper Engine format: a track played by the page
  // itself, like any player would (after a click: browsers start audio on a gesture)
  await clickSel('.ps-container .widget');
  await ev(`window.__track = new Audio('/v1/file?path=' + encodeURIComponent('/DATA/Media/Music/01 Pulse.wav') + '&token=test-token');
    __track.loop = true; __track.play()`);
  check('any audio playing in the tab reaches it as Wallpaper Engine audio (128 values)', await waitFor(`(() => { const p = window.__probe;
    return p && p.audioCalls > 20 && p.audioLength === 128 && p.audioMax > 0.05; })()`, 10000), await ev('window.__probe && { calls: __probe.audioCalls, max: __probe.audioMax, len: __probe.audioLength }'));

  // ---------------------------------------------------------------- media integration
  const MEDIA = 'window.__probe && window.__probe.media';
  check('media integration: the wallpaper is told it is on, with the playback constants',
    await waitFor(`(() => { const m = ${MEDIA}; return m && m.status && m.status.enabled === true && m.constants && m.constants.PLAYBACK_PAUSED === 2; })()`, 4000), await ev(MEDIA));
  check('…without Media Session data the title is the file name, and it is playing (1)',
    await waitFor(`(() => { const m = ${MEDIA}; return m.properties && m.properties.title === '01 Pulse' && m.properties.contentType === 'music' && m.playback === 1; })()`, 4000), await ev(MEDIA));
  check('…the timeline flows (position and duration, several times a second)',
    await waitFor(`(() => { const m = ${MEDIA}; return m.timelines > 4 && m.timeline.position > 0.3 && Math.round(m.timeline.duration) === 45; })()`, 6000), await ev(MEDIA));
  // a player sets its Media Session (title, artist, cover): a cover mostly red, some blue
  await ev(`(() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#d02020'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#2040e0'; g.fillRect(0, 48, 64, 16);
    navigator.mediaSession.metadata = new MediaMetadata({ title: 'Song A', artist: 'Band A', album: 'Album A',
      artwork: [{ src: c.toDataURL('image/png'), sizes: '64x64', type: 'image/png' }] }); })()`);
  check('…title, artist and album come from the Media Session',
    await waitFor(`(() => { const p = (${MEDIA}).properties; return p.title === 'Song A' && p.artist === 'Band A' && p.albumTitle === 'Album A' && p.albumArtist === 'Band A'; })()`, 3000), await ev(MEDIA));
  check('…the cover arrives as a thumbnail with its colors (red first, then blue; white text)',
    await waitFor(`(() => { const t = (${MEDIA}).thumbnail; return t && t.has && /^#(c|d|e)[0-9a-f]{5}$/.test(t.primaryColor) && t.primaryColor.slice(3, 5) < '40'
      && parseInt(t.secondaryColor.slice(5, 7), 16) > 0xa0 && t.textColor === '#ffffff'; })()`, 3000), await ev(MEDIA));
  await ev('__track.pause()');
  check('…pausing sends paused (2)', await waitFor(`(${MEDIA}).playback === 2`, 2000), await ev(MEDIA));
  await ev('__track.currentTime = 30');
  check('…seeking moves the timeline', await waitFor(`(${MEDIA}).timeline.position >= 29.9`, 2000), await ev(MEDIA));
  await ev('__track.play()');
  check('…playing again sends playing (1)', await waitFor(`(${MEDIA}).playback === 1`, 2000), await ev(MEDIA));
  await ev(`navigator.mediaSession.metadata = new MediaMetadata({ title: 'Song B', artist: 'Band B' })`);
  check('…a new track without a cover: new properties, an empty thumbnail',
    await waitFor(`(() => { const m = ${MEDIA}; return m.properties.title === 'Song B' && m.thumbnail && !m.thumbnail.has; })()`, 3000), await ev(MEDIA));
  await ev('navigator.mediaSession.metadata = null');
  await ev('__track.pause()');

  // mouse
  await mouse('mouseMoved', 1200, 700);
  await sleep(300);
  await click(1300, 800);
  check('mouse moves and clicks on the empty background reach it, at the same spot',
    await waitFor(`(() => { const m = window.__probe.mouse.join(' '); return m.includes('mousemove@1200,700') && m.includes('mousedown@1300,800') && m.includes('click@1300,800'); })()`, 3000),
    await ev('window.__probe.mouse.slice(-8)'));
  const before = await ev(`window.__probe.mouse.filter(m => m.startsWith('mousedown')).length`);
  await clickSel('.app-card');
  await sleep(600);
  check('clicks on app cards do not', (await ev(`window.__probe.mouse.filter(m => m.startsWith('mousedown')).length`)) === before, null);
  await mouse('mouseMoved', 1250, 780);
  await mouse('mousePressed', 1250, 780);
  await sleep(400);
  await mouse('mouseMoved', 1000, 650);
  await sleep(400);
  await mouse('mouseReleased', 1000, 650);
  check('a drag on the background reaches it as press, moves and release', await waitFor(`(() => { const m = window.__probe.mouse.join(' ');
    return m.includes('pointerdown@1250,780') && m.includes('mousemove@1000,650') && m.includes('mouseup@1000,650'); })()`, 3000),
    await ev('window.__probe.mouse.slice(-10)'));
  check('…and selects nothing on the dashboard', await ev(`getSelection().isCollapsed && getSelection().toString() === ''`), await ev(`getSelection().toString()`));

  // ---------------------------------------------------------------- its settings, from project.json
  await openDropdown();
  check('"Customize" shows up in the CasaOS settings', await waitFor(`(() => { const b = document.getElementById('lw-customize'); return b && !b.hidden; })()`, 3000), null);
  const PLACE = `(() => { const wrap = document.getElementById('lw-customize');
    const vanilla = document.querySelector('.dropdown-content ._box .casa-wallpaper-outline').closest('._box');
    const power = document.getElementById('mock-power');
    return { inRow: wrap.parentNode === vanilla, beforeChange: !!(wrap.compareDocumentPosition(document.getElementById('mock-change-wallpaper')) & Node.DOCUMENT_POSITION_FOLLOWING),
             shown: !wrap.hidden && getComputedStyle(wrap).display !== 'none', oneLine: vanilla.getBoundingClientRect().height < 48,
             beforePower: !!(wrap.compareDocumentPosition(power) & Node.DOCUMENT_POSITION_FOLLOWING), count: document.querySelectorAll('#lw-customize').length,
             btn: wrap.textContent }; })()`;
  const place = await ev(PLACE);
  check('…in the CasaOS "Wallpaper" row (not the right-click menu), before "Change", above Restart/Shutdown',
    place.inRow && place.beforeChange && place.shown && place.beforePower && place.oneLine && place.count === 1 && place.btn === 'Customize', place);
  await shot('live_dropdown', { x: 0, y: 0, width: 520, height: 560 });
  const FIT = `(() => { const w = document.getElementById('lw-customize'), r = w.closest('._box');
    return { compact: w.classList.contains('lw-compact'), fits: r.scrollWidth <= r.clientWidth + 1 && r.scrollHeight <= r.clientHeight + 1, title: w.firstChild.title }; })()`;
  // a label of a fixed 160px: too long beside two text buttons in the 22.5rem menu, fine beside the sparkle
  await ev(`window.mockWallpaperLabel = '<span style="display:inline-block;width:160px">Long wallpaper label</span>'; Mock.rerenderSettings()`);
  check('it comes back after CasaOS re-renders the menu, and shrinks to the sparkle in a narrow row',
    await waitFor(`(() => { const f = ${FIT}; return f.compact && f.fits && f.title === 'Customize'; })()`, 2000), await ev(FIT));
  await ev(`window.mockWallpaperLabel = null; Mock.rerenderSettings()`);
  check('…and shows the text again when it fits', await waitFor(`(() => { const f = ${FIT}; return !f.compact && f.fits; })()`, 2000), await ev(FIT));
  await clickSel('#lw-customize button');
  check('"Customize" opens its settings and closes the dropdown', await waitFor(`document.getElementById('lw-panel')
    && !document.getElementById('settings-dropdown').classList.contains('is-active')`, 2000), null);
  const look = await ev(`(() => { const p = document.getElementById('lw-panel'), cs = getComputedStyle(p), b = p.getBoundingClientRect();
    const top = document.elementFromPoint(b.x + b.width / 2, b.y + 30), sw = getComputedStyle(p.querySelector('input[type="checkbox"]'));
    return { onTop: p.contains(top), bg: cs.backgroundColor, blur: cs.backdropFilter, radius: cs.borderRadius, font: cs.fontFamily,
      strong: getComputedStyle(p.querySelector('header strong')).color, switchW: sw.width, switchLook: sw.appearance }; })()`);
  check('the panel is above the CasaOS UI, in the CasaOS widget glass, font and switches (Bulma doesn\'t leak in)',
    look.onTop && look.bg === 'rgba(53, 54, 58, 0.4)' && /blur\(5px\)/.test(look.blur) && look.radius === '10px' && /BrittiSans/.test(look.font)
    && look.strong !== 'rgb(54, 54, 54)' && look.switchW === '32px' && look.switchLook === 'none', look);
  let rows = await ev(ROWS);
  const has = (t) => rows.some((r) => r.text === t && !r.hidden);
  check('labels come from its localization (and Wallpaper Engine built-ins), markup stripped',
    has('Probe settings') && has('Scheme color') && has('Speed') && has('Glow') && has('Glow color') && has('Mode'), rows);
  check('options it cannot offer here (folders) are left out', !rows.some((r) => r.text === 'Pictures'), rows);
  check('conditions hide options ("Wild level" needs mode Wild)', rows.some((r) => r.text === 'Wild level' && r.hidden), rows);
  let gs = await ev(GROUPS);
  check('the sections the wallpaper heads ("— Extra —") open and close, all closed at first, titles without the dashes',
    JSON.stringify(gs.map((g) => g.title)) === JSON.stringify(['Live Wallpapers', 'Probe settings', 'Extra'])
    && gs.every((g) => !g.open && !g.rows.length), gs);
  await clickHeader('Probe settings');
  gs = await ev(GROUPS);
  check('clicking a header opens its section, the others stay closed', groupOf(gs, 'Probe settings').open
    && groupOf(gs, 'Probe settings').rows.includes('Speed') && !groupOf(gs, 'Extra').open && !groupOf(gs, 'Live Wallpapers').open, gs);
  await clickHeader('Extra');
  gs = await ev(GROUPS);
  check('…a sentence stays a note inside its section, not a header',
    JSON.stringify(groupOf(gs, 'Extra').rows) === JSON.stringify(['This note is a sentence, not a header.', 'Sparkles']), gs);
  await clickHeader('Extra');
  check('…and clicking it again closes it', !groupOf(await ev(GROUPS), 'Extra').open, await ev(GROUPS));
  await shot('live_panel', await ev(`(() => { const b = document.getElementById('lw-panel').getBoundingClientRect(); return { x: b.x - 10, y: b.y - 10, width: b.width + 20, height: b.height + 20 }; })()`));

  const toggleOf = (text) => `[...document.querySelectorAll('#lw-panel .lw-row')].find(r => r.querySelector('label').textContent === ${JSON.stringify(text)}).querySelector('input,select')`;
  await ev(`(() => { const c = ${toggleOf('Glow')}; c.click(); })()`);
  rows = await ev(ROWS);
  check('switching "Glow" off hides "Glow color" and reaches the wallpaper',
    rows.some((r) => r.text === 'Glow color' && r.hidden) && await waitFor(`window.__probe.props.glow === false`, 2000), rows);
  await ev(`(() => { const s = ${toggleOf('Mode')}; s.value = '2'; s.dispatchEvent(new Event('change')); const c = ${toggleOf('Glow')}; c.click(); })()`);
  check('combo values keep their type (number 2) and conditions follow ("Wild level" shows)',
    await waitFor(`window.__probe.props.mode === 2 && window.__probe.props.glow === true`, 2000)
    && (await ev(ROWS)).some((r) => r.text === 'Wild level' && !r.hidden), await ev('window.__probe.props'));
  await ev(`(() => { const s = ${toggleOf('Speed')}; s.value = '7'; s.dispatchEvent(new Event('input')); })()`);
  check('sliders reach the wallpaper', await waitFor(`window.__probe.props.speed === 7`, 2000), await ev('window.__probe.props.speed'));

  // ---------------------------------------------------------------- color picker
  const swatchOf = (text) => `[...document.querySelectorAll('#lw-panel .lw-row')].find(r => r.querySelector('label').textContent === ${JSON.stringify(text)}).querySelector('.lw-swatch')`;
  const PICK = (text) => `(() => { const s = ${swatchOf(text)}, box = s.closest('.lw-row').querySelector('.lw-picker'), b = box.getBoundingClientRect(),
    p = document.getElementById('lw-panel').getBoundingClientRect();
    return { open: !box.hidden && !!box.offsetParent, expanded: s.getAttribute('aria-expanded'), swatch: s.title, field: box.querySelector('input').value,
      inView: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight, inPanel: b.left >= p.left && b.right <= p.right,
      bg: getComputedStyle(box).backgroundColor, dir: box.dir }; })()`;
  const rgbOf = (hex) => [1, 3, 5].map((i) => (parseInt(hex.substr(i, 2), 16) / 255).toFixed(3)).join(' ');
  check('a color option shows a swatch of its value, not the browser\'s color input',
    await ev(`(() => { const s = ${swatchOf('Scheme color')}; return s.title === '#3366e6' && !document.querySelector('#lw-panel input[type="color"]'); })()`),
    await ev(PICK('Scheme color')));
  await ev(`${swatchOf('Scheme color')}.scrollIntoView({ block: 'nearest' })`);
  let c = await ev(`(() => { const b = ${swatchOf('Scheme color')}.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
  await click(c[0], c[1]);
  let pk = await ev(PICK('Scheme color'));
  check('clicking it opens the picker inside the panel, under its row, on screen', pk.open && pk.expanded === 'true' && pk.inView && pk.inPanel && pk.dir === 'ltr', pk);
  await shot('live_color_picker', await ev(`(() => { const b = document.getElementById('lw-panel').getBoundingClientRect(); return { x: b.x - 10, y: b.y - 10, width: b.width + 20, height: b.height + 20 }; })()`));
  // drag across the square, to its top right corner (full saturation and brightness)
  const sq = await ev(`(() => { const b = ${swatchOf('Scheme color')}.closest('.lw-row').querySelector('.lw-sv').getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; })()`);
  await mouse('mouseMoved', sq[0] + sq[2] / 2, sq[1] + sq[3] / 2);
  await mouse('mousePressed', sq[0] + sq[2] / 2, sq[1] + sq[3] / 2);
  // moves with the button held, as a real drag
  for (let i = 1; i <= 5; i++) await T.send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', buttons: 1, x: sq[0] + sq[2] / 2 + (sq[2] / 2 + 20) * i / 5, y: sq[1] + sq[3] / 2 - (sq[3] / 2 + 20) * i / 5 });
  await mouse('mouseReleased', sq[0] + sq[2] + 20, sq[1] - 20);
  pk = await ev(PICK('Scheme color'));
  check('dragging on the square (past its edge) picks the color: swatch, hex field and wallpaper follow',
    pk.swatch === '#0049ff' && pk.field === '#0049ff' && await waitFor(`window.__probe.props.schemecolor === ${JSON.stringify(rgbOf('#0049ff'))}`, 2000),
    { pk, sent: await ev('window.__probe.props.schemecolor') });
  const field = `${swatchOf('Scheme color')}.closest('.lw-row').querySelector('.lw-picker input')`;
  const typeHex = async (text) => {
    await ev(`(() => { const f = ${field}; f.focus(); f.select(); })()`);
    await T.send('Input.insertText', { text });
    await key('Enter', 'Enter', 13);
  };
  await typeHex('#FF8000');
  check('typing a hex value applies it on Enter', await waitFor(`window.__probe.props.schemecolor === ${JSON.stringify(rgbOf('#ff8000'))}`, 2000)
    && (await ev(PICK('Scheme color'))).swatch === '#ff8000', await ev(PICK('Scheme color')));
  await typeHex('f0a');
  check('…short hex too (#f0a)', await waitFor(`window.__probe.props.schemecolor === ${JSON.stringify(rgbOf('#ff00aa'))}`, 2000), await ev('window.__probe.props.schemecolor'));
  await typeHex('nope');
  pk = await ev(PICK('Scheme color'));
  check('…an invalid one is undone', pk.field === '#ff00aa' && (await ev('window.__probe.props.schemecolor')) === rgbOf('#ff00aa'), pk);
  await key('Escape', 'Escape', 27);
  pk = await ev(PICK('Scheme color'));
  check('Esc closes the picker first, the panel stays', !pk.open && pk.expanded === 'false' && await ev(`!!document.getElementById('lw-panel')`), pk);
  await ev(`${swatchOf('Glow color')}.click()`);
  check('one picker at a time: "Glow color" opens its own', (await ev(PICK('Glow color'))).open, await ev(PICK('Glow color')));
  await ev(`(() => { const c = ${toggleOf('Glow')}; c.click(); })()`);
  check('…and a condition that hides the option hides its picker', !(await ev(PICK('Glow color'))).open, await ev(PICK('Glow color')));
  await ev(`(() => { const c = ${toggleOf('Glow')}; c.click(); })()`);
  await ev(`${swatchOf('Glow color')}.click()`);
  check('clicking the swatch again closes it', !(await ev(PICK('Glow color'))).open && await waitFor(`window.__probe.props.glow === true`, 2000), await ev(PICK('Glow color')));
  await key('Escape', 'Escape', 27);
  check('Esc closes the panel', await waitFor(`!document.getElementById('lw-panel')`, 1000), null);

  // ---------------------------------------------------------------- the CasaOS theme
  // A theme mod restyles the widgets (and has a primary button somewhere): the panel follows it
  await ev(`(() => { const s = document.createElement('style'); s.id = 'test-theme';
    s.textContent = '.widget .blur-background { background-color: rgba(240, 240, 245, 0.7) !important; border-radius: 18px !important; backdrop-filter: blur(12px) !important; }'
      + '.widget { color: rgb(20, 20, 30) !important; } .button.is-primary { background-color: rgb(230, 80, 20) !important; }';
    document.head.appendChild(s); const b = document.createElement('button'); b.id = 'test-primary'; b.className = 'button is-primary'; b.hidden = true;
    document.body.appendChild(b); })()`);
  await openPanel();
  const THEME = `(() => { const p = document.getElementById('lw-panel'), cs = getComputedStyle(p), on = [...p.querySelectorAll('input[type="checkbox"]')].find(x => x.checked);
    return { bg: cs.backgroundColor, radius: cs.borderRadius, blur: cs.backdropFilter, text: getComputedStyle(p.querySelector('header strong')).color,
      scheme: cs.colorScheme, accent: on ? getComputedStyle(on).backgroundColor : null }; })()`;
  let th = await ev(THEME);
  check('the panel takes the CasaOS theme from its widgets: glass, radius, blur, text, primary color',
    th.bg === 'rgba(240, 240, 245, 0.7)' && th.radius === '18px' && /blur\(12px\)/.test(th.blur) && th.text === 'rgb(20, 20, 30)'
    && th.scheme === 'light' && th.accent === 'rgb(230, 80, 20)', th);
  await ev(`${swatchOf('Scheme color')}.click()`);
  check('…the color picker too', (await ev(PICK('Scheme color'))).bg !== 'rgba(0, 0, 0, 0)' && (await ev(PICK('Scheme color'))).open, await ev(PICK('Scheme color')));
  await shot('live_color_picker_themed', await ev(`(() => { const b = document.getElementById('lw-panel').getBoundingClientRect(); return { x: b.x - 10, y: b.y - 10, width: b.width + 20, height: b.height + 20 }; })()`));
  await key('Escape', 'Escape', 27);
  await key('Escape', 'Escape', 27);
  await ev(`document.getElementById('test-theme').remove(); document.getElementById('test-primary').remove()`);
  await openPanel();
  th = await ev(THEME);
  check('…and goes back with it', th.bg === 'rgba(53, 54, 58, 0.4)' && th.radius === '10px' && th.scheme === 'dark', th);
  await key('Escape', 'Escape', 27);

  // ---------------------------------------------------------------- sections remembered, search
  await openPanel();
  gs = await ev(GROUPS);
  check('the panel remembers which sections were open', groupOf(gs, 'Probe settings').open && !groupOf(gs, 'Extra').open, gs);
  await clickSel('#lw-panel .lw-search input');
  await T.send('Input.insertText', { text: 'SPARK' });
  gs = await ev(GROUPS);
  check('the search shows only what matches (any case), its section open',
    gs.length === 1 && gs[0].title === 'Extra' && gs[0].open && JSON.stringify(gs[0].rows) === JSON.stringify(['Sparkles']), gs);
  await ev(`(() => { const s = document.querySelector('#lw-panel .lw-search input'); s.value = 'live'; s.dispatchEvent(new Event('input')); })()`);
  gs = await ev(GROUPS);
  check('…a section title matches its whole section', gs.length === 1 && gs[0].title === 'Live Wallpapers' && gs[0].rows.includes('Frame rate limit'), gs);
  await key('Escape', 'Escape', 27);
  gs = await ev(GROUPS);
  check('Esc clears the search first (the panel stays), sections as they were', await ev(`!!document.getElementById('lw-panel')`)
    && gs.length === 3 && groupOf(gs, 'Probe settings').open && !groupOf(gs, 'Extra').open, gs);

  // ---------------------------------------------------------------- trusting it
  await ev(`(() => { const c = ${toggleOf('Trust this wallpaper (full compatibility)')}; c.click(); })()`);
  check('trusting it reloads it with full access (no sandbox)', await waitFor(`(() => { const f = document.querySelector('#lw-layer iframe');
    return f && !f.hasAttribute('sandbox'); })()`, 4000), await ev(LAYER));
  await ev('window.__probe = null');
  check('…and it can reach the page and storage now, keeping its settings', await waitFor(`(() => { const p = window.__probe;
    return p && p.sameOrigin && p.storage && p.props.speed === 7 && p.props.mode === 2; })()`, 6000), await ev('window.__probe'));
  check('…the panel stays open', await waitFor(`document.getElementById('lw-panel')`, 2000), null);
  await key('Escape', 'Escape', 27);

  // ---------------------------------------------------------------- persistence and pause
  check('reload', await open(), null);
  // No flash: on and the CasaOS background hidden from the start; the iframe follows once index.html arrives
  check('the choice and its settings survive a reload (no flash)', await ev(`(() => { const s = ${LAYER}; return s.on && s.bg === 'hidden'; })()`)
    && await waitFor(`(() => { const s = ${LAYER}; return s.frame && s.sandbox === null; })()`, 6000)
    && await waitFor(`window.__probe && window.__probe.props.speed === 7`, 6000), await ev(LAYER));
  check('…the color picked too', await waitFor(`window.__probe.props.schemecolor === ${JSON.stringify(rgbOf('#ff00aa'))}`, 2000), await ev('window.__probe.props.schemecolor'));
  await ev('Mock.hideBackground()');
  check('pages without the CasaOS background hide it and pause it', await waitFor(`!document.documentElement.classList.contains('lw-on')
    && window.__probe && window.__probe.paused === true`, 3000), await ev('window.__probe && window.__probe.paused'));
  await ev('Mock.showBackground()');
  check('back on the dashboard it resumes', await waitFor(`document.documentElement.classList.contains('lw-on') && window.__probe.paused === false`, 3000), null);

  // ---------------------------------------------------------------- language
  await ev(`localStorage.setItem('lang', 'pt_br')`);
  check('reload in Portuguese', await open(), null);
  await openPanel();
  rows = await ev(ROWS);
  check('the panel and the wallpaper\'s own labels follow the CasaOS language',
    rows.some((r) => r.text === 'Velocidade') && rows.some((r) => r.text === 'Cor do esquema') && rows.some((r) => r.text === 'Ajustes da sonda')
    && rows.some((r) => r.text === 'Confiar neste wallpaper (compatibilidade total)'), rows);
  check('…and the wallpaper gets it as its language', await waitFor(`window.__probe && window.__probe.general.language === 'pt-br'`, 4000), null);
  await key('Escape', 'Escape', 27);
  await ev(`localStorage.setItem('lang', 'en_us')`);
  await open();

  // ---------------------------------------------------------------- plain HTML, video
  await choose('plain');
  check('a folder with just an index.html runs (isolated)', await waitFor(`window.__plain === true`, 6000)
    && (await ev(LAYER)).sandbox === 'allow-scripts', await ev(LAYER));
  await choose('clip');
  check('a loose video plays, muted, from memory (downloaded once)', await waitFor(`(() => { const s = ${LAYER};
    return s.on && s.video && s.src === 'blob:' && s.playing && s.muted; })()`, 6000), await ev(LAYER));
  const t0 = await ev(`document.querySelector('#lw-layer video').currentTime`);
  await sleep(1200);
  check('…and keeps playing (looped)', (await ev(`document.querySelector('#lw-layer video').currentTime`)) !== t0, null);
  await ev('Mock.hideBackground()');
  check('…paused off the dashboard', await waitFor(`document.querySelector('#lw-layer video').paused`, 2000), null);
  await ev('Mock.showBackground()');
  await waitFor(`!document.querySelector('#lw-layer video').paused`, 2000);
  await openPanel();
  rows = await ev(ROWS);
  check('a video\'s settings: sound and volume', rows.some((r) => r.text === 'Video sound') && rows.some((r) => r.text === 'Volume'), rows);
  await ev(`(() => { const c = ${toggleOf('Video sound')}; c.click(); })()`);
  check('turning the sound on unmutes it', await waitFor(`!document.querySelector('#lw-layer video').muted`, 2000), null);
  await key('Escape', 'Escape', 27);

  // ---------------------------------------------------------------- back to CasaOS
  await openMenu();
  await clickSel('.column:nth-child(2) > .image-list-item');
  await clickSel('#mock-apply');
  check('a CasaOS wallpaper turns it off and unloads it', await waitFor(`(() => { const s = ${LAYER}; return !s.on && !s.frame && !s.video && s.bg === 'visible'; })()`, 3000), await ev(LAYER));
  await openDropdown();
  check('…and hides "Customize"', await waitFor(`document.getElementById('lw-customize').hidden`, 2000), null);

  // ---------------------------------------------------------------- another device's choice
  await choose('Probe');
  await waitFor(`document.documentElement.classList.contains('lw-on')`, 4000);
  await ev(`localStorage.setItem(Mock.SERVER_KEY, JSON.stringify({ path: Mock.BUILT_IN[0], from: 'Built-in' }))`);
  check('reload after another device chose a CasaOS wallpaper', await open(), null);
  check('…the server choice wins (live wallpaper off)', await waitFor(`!document.documentElement.classList.contains('lw-on')
    && !document.querySelector('#lw-layer iframe')`, 4000), await ev(LAYER));
} catch (e) {
  check('runner exception: ' + e.message, false, e.stack);
}
await T.finish();
