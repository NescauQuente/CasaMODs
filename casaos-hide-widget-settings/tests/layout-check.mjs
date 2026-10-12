// Layout check for the widget column, with this mod and Hide Footer in every
// combination: the column must end on the same line as the apps (and above the
// footer when it shows), on both CasaOS-UI dashboard layouts, at common screen
// sizes, also after the window grew since CasaOS loaded (fullscreen: CasaOS
// measures the window height once, as --vh) and after a resize. The page copies
// CasaOS-UI's own layout CSS (App.vue, Home.vue, SideBar.vue).
//
//   node tests/layout-check.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOD = path.join(HERE, '..', 'hide-widget-settings'), HF = path.join(HERE, '..', '..', 'casaos-hide-footer', 'hide-footer');
const CSS = { hws: fs.readFileSync(path.join(MOD, 'mod.css'), 'utf8'), hf: fs.readFileSync(path.join(HF, 'mod.css'), 'utf8') };
const JS = { hws: fs.readFileSync(path.join(MOD, 'mod.js'), 'utf8'), hf: fs.readFileSync(path.join(HF, 'mod.js'), 'utf8') };
const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].find((p) => fs.existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The two dashboards: CasaOS-UI 0.4.18 and later (Home root .out-container, the
// apps area sized with calc(100% - 7rem)) and 0.4.13–0.4.17 (a Tailwind flex
// column, the apps area filling it). pad: the space above the column, which
// differs between versions and settings.
const LAYOUT = {
  new: (pad) => `
    .home { position: relative; height: 100%; }
    .contents { overflow-y: auto; overflow-x: hidden; height: calc(100% - 7rem); padding-top: ${pad}px; }`,
  old: (pad) => `
    .home { position: relative; height: 100%; display: flex; flex-direction: column; }
    .contents { overflow-y: auto; overflow-x: hidden; flex: 1; padding-top: ${pad}px; }`
};
const page = (layout, pad, mods) => `<!DOCTYPE html><html><head><style>
  html, body { margin: 0; height: 100%; font: 16px sans-serif; }
  * { box-sizing: border-box; }
  #app { width: 100vw; height: 100dvh; overflow-y: hidden; display: flex; flex-direction: column; background: #123; }
  .top-bar { height: 2.75rem; min-height: 2.75rem; background: #fff; }
  ${LAYOUT[layout](pad)}
  .columns { display: flex; }
  .slider-content { min-width: 18rem; width: 18rem; position: relative; }
  .main-content { flex: 1; }
  .app-list { height: 3000px; }
  /* SideBar.vue */
  .side-bar { z-index: 10; height: calc(var(--vh, 1vh) * 100 - 6rem); overflow: inherit !important; position: fixed; width: 18rem; }
  .scroll-area { position: relative; padding: 0 16px 0 0; margin-right: -16px; max-height: calc(100% - 7.5rem); overflow-x: inherit !important; overflow-y: hidden !important; }
  .widget { position: relative; height: 150px; margin-bottom: 1rem; border-radius: 10px; background: rgba(255, 255, 255, .2); }
  .widget.mt-4 { margin-top: 1rem; height: 3.5rem; }
  /* the footer (App.vue, BrandBar.vue) */
  .base-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 10; display: flex; }
  .brand-bar { position: fixed; left: 2rem; bottom: 0; height: 2.75rem; width: 20rem; background: rgba(255, 200, 0, .4); }
</style>${mods.hws ? `<style>${CSS.hws}</style>` : ''}${mods.hf ? `<style>${CSS.hf}</style>` : ''}</head><body>
<div id="app" style="--vh: 9px">
  <div class="base-bar"><div class="brand-bar"></div></div>
  <div class="home${layout === 'new' ? ' out-container' : ''}"><div class="top-bar"></div>
    <div class="contents"><div class="columns"><div class="slider-content"><div class="side-bar">
      <div class="scroll-area" id="scroll">${'<div><div class="widget"></div></div>'.repeat(9)}</div>
      <div class="widget mt-4"><div class="wsettings"></div></div>
    </div></div><div class="main-content"><div class="app-list"></div></div></div></div>
  </div>
</div>
<script>/* CasaOS's --vh, measured once (stale: the window was shorter, 140px of browser bars, then fullscreen) */
  document.getElementById('app').style.setProperty('--vh', (innerHeight - (window.__stale ? 140 : 0)) / 100 + 'px');</script>
${mods.hws ? `<script>${JS.hws}</script>` : ''}${mods.hf ? `<script>${JS.hf}</script>` : ''}
</body></html>`;

const results = [];
function check(name, ok, info) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  → ' + JSON.stringify(info))); }

if (!CHROME) throw new Error('Chrome not found: set CHROME to its path');
const cdpPort = 9341;
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${cdpPort}`,
  `--user-data-dir=${path.join(os.tmpdir(), 'casamod-layout-' + Date.now())}`, '--no-first-run']
  .concat(process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : [], ['about:blank']), { stdio: 'ignore' });
let target = null;
for (let i = 0; i < 100 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json()).find((t) => t.type === 'page'); } catch { await sleep(150); }
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const send = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.result.value;
async function load(html, stale) {
  // a fresh window each time (the column script runs once per page)
  await send('Page.navigate', { url: 'about:blank' });
  await sleep(30);
  const { result: tree } = await send('Page.getFrameTree');
  await send('Page.setDocumentContent', { frameId: tree.frameTree.frame.id, html: html.replace('<script>/* CasaOS', `<script>window.__stale = ${stale};/* CasaOS`) });
  await sleep(60);
}
const MEASURE = `(() => {
  const bar = document.querySelector('.side-bar').getBoundingClientRect(), s = document.getElementById('scroll'), sb = s.getBoundingClientRect();
  const card = document.querySelector('.widget.mt-4'), cardShown = getComputedStyle(card).display !== 'none';
  const apps = document.querySelector('.contents').getBoundingClientRect(), foot = document.querySelector('.brand-bar');
  const footShown = getComputedStyle(foot).display !== 'none';
  return { colEnd: Math.round(bar.bottom), appsEnd: Math.round(apps.bottom), footTop: footShown ? Math.round(foot.getBoundingClientRect().top) : null,
    scrollEnd: Math.round(sb.bottom), cardEnd: cardShown ? Math.round(card.getBoundingClientRect().bottom) : null, h: innerHeight }; })()`;
// the column ends with the apps (above a visible footer), everything inside it and on screen
function good(r) {
  const want = r.footTop === null ? r.appsEnd : Math.min(r.appsEnd, r.footTop - 12);
  return Math.abs(r.colEnd - want) <= 2 && r.colEnd <= r.h && r.scrollEnd <= r.colEnd + 1 && (r.cardEnd === null || r.cardEnd <= r.colEnd + 1);
}

try {
  check('both mods carry the same column script', JS.hws === JS.hf, null);
  await send('Page.enable');
  const combos = { hws: { hws: true }, hf: { hf: true }, both: { hws: true, hf: true } };
  const names = { hws: 'Hide Widget Settings', hf: 'Hide Footer', both: 'both mods' };
  for (const layout of ['new', 'old']) {
    for (const pad of [35, 55]) {
      for (const [w, h] of [[1280, 720], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440]]) {
        await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
        for (const stale of [false, true]) {
          for (const combo of Object.keys(combos)) {
            await load(page(layout, pad, combos[combo]), stale);
            const r = await ev(MEASURE);
            check(`${layout === 'new' ? 'CasaOS-UI 0.4.18+' : 'CasaOS-UI 0.4.13–0.4.17'}, ${pad}px above, ${w}×${h}${stale ? ' after going fullscreen' : ''}, ${names[combo]}: the column ends with the apps${r.footTop === null ? '' : ' (above the footer)'}`, good(r), r);
          }
        }
      }
    }
  }
  // resizing the window: measured again
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await load(page('new', 35, combos.both), false);
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await sleep(400);
  const r = await ev(MEASURE);
  check('after the window is resized, the column follows', good(r) && r.h === 1080, r);
  // phones: CasaOS slides the column in over the apps; left alone
  await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 800, deviceScaleFactor: 1, mobile: false });
  await sleep(400);
  check('on a phone-sized window the measured height is dropped (CasaOS\'s own mobile column)', (await ev(`document.documentElement.style.getPropertyValue('--casamods-widget-column')`)) === '', null);
} catch (e) {
  check('runner exception: ' + e.message, false, e.stack);
}
console.log(results.join('\n'));
console.log(results.filter((r) => r.startsWith('PASS')).length + ' PASS / ' + results.filter((r) => r.startsWith('FAIL')).length + ' FAIL');
ws.close();
chrome.kill();
process.exit(0);
