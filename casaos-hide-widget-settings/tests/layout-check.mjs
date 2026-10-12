// Layout check for the widget column, with this mod and Hide Footer in every
// combination, at common screen sizes, also after the window grew since CasaOS
// loaded (fullscreen: CasaOS measures the window height once, as --vh, and
// sizes the column from it). The page copies CasaOS-UI's own CSS for the
// dashboard layout (Home.vue, SideBar.vue, Settings.vue).
//
//   node tests/layout-check.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CSS = {
  hws: fs.readFileSync(path.join(HERE, '..', 'hide-widget-settings', 'mod.css'), 'utf8'),
  hf: fs.readFileSync(path.join(HERE, '..', '..', 'casaos-hide-footer', 'hide-footer', 'mod.css'), 'utf8')
};
const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].find((p) => fs.existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGE = `<!DOCTYPE html><html><head><style>
  html, body { margin: 0; height: 100%; font: 16px sans-serif; }
  * { box-sizing: border-box; }
  #app { width: 100vw; height: 100dvh; overflow-y: hidden; display: flex; flex-direction: column; background: #123; }
  .out-container { position: relative; height: 100%; display: flex; flex-direction: column; }
  .top-bar { height: 2.75rem; min-height: 2.75rem; background: #fff; }
  .contents { flex: 1; overflow-y: auto; overflow-x: hidden; height: calc(100% - 7rem); padding-top: 55px; }
  .columns { display: flex; margin-top: -0.75rem; }
  .column { padding: 0.75rem; }
  .slider-content { min-width: 18rem; width: 18rem; position: relative; }
  /* SideBar.vue */
  .side-bar { z-index: 10; height: calc(var(--vh, 1vh) * 100 - 6rem); overflow: inherit !important; position: fixed; width: 18rem; }
  .scroll-area { position: relative; padding: 0 16px 0 0; margin-right: -16px; max-height: calc(100% - 7.5rem); overflow-x: inherit !important; overflow-y: hidden !important; }
  .widget { position: relative; height: 150px; margin-bottom: 1rem; border-radius: 10px; background: rgba(255, 255, 255, .2); }
  .widget.mt-4 { margin-top: 1rem; height: 3.5rem; }
  .wsettings { width: 100%; }
  /* the footer (App.vue, BrandBar.vue) */
  .base-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 10; display: flex; }
  .brand-bar { position: fixed; left: 2rem; bottom: 0; height: 2.75rem; width: 20rem; background: rgba(255, 200, 0, .4); }
</style><style id="hws" disabled></style><style id="hf" disabled></style></head><body>
<div id="app" style="--vh: 9px">
  <div class="base-bar"><div class="brand-bar"></div></div>
  <div class="out-container"><div class="top-bar"></div>
    <div class="contents"><div class="columns"><div class="column slider-content"><div class="side-bar">
      <div class="scroll-area" id="scroll">${'<div><div class="widget"></div></div>'.repeat(9)}</div>
      <div class="widget mt-4" id="card"><div class="wsettings"></div></div>
    </div></div></div></div>
  </div>
</div></body></html>`;

// What stays free below the column (rem), by the mods installed: the footer's
// space (3rem) unless Hide Footer removes it, and 1rem
const FREE = { hws: 4, hf: 1, both: 1 };

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

try {
  await send('Page.enable');
  const { result: tree } = await send('Page.getFrameTree');
  await send('Page.setDocumentContent', { frameId: tree.frameTree.frame.id, html: PAGE });
  await ev(`document.getElementById('hws').textContent = ${JSON.stringify(CSS.hws)}; document.getElementById('hf').textContent = ${JSON.stringify(CSS.hf)}`);
  for (const [w, h] of [[1280, 720], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    for (const stale of [false, true]) {
      for (const combo of ['hws', 'hf', 'both']) {
        const r = await ev(`(() => {
          document.getElementById('hws').disabled = !${combo !== 'hf'};
          document.getElementById('hf').disabled = !${combo !== 'hws'};
          // CasaOS's --vh: measured at load; "stale" = loaded 140 px shorter (the browser's bars), then fullscreen
          document.getElementById('app').style.setProperty('--vh', (innerHeight - ${stale ? 140 : 0}) / 100 + 'px');
          const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
          const s = document.getElementById('scroll'), sb = s.getBoundingClientRect(), card = document.getElementById('card');
          const foot = document.querySelector('.brand-bar'), footShown = getComputedStyle(foot).display !== 'none';
          // a full column ends where the side bar ends (the card, when it shows, sits inside it)
          const col = document.querySelector('.side-bar').getBoundingClientRect().bottom;
          const end = s.scrollHeight > s.clientHeight ? col : sb.bottom;
          return { bottom: Math.round(sb.bottom), free: Math.round(innerHeight - end), want: Math.round(${FREE[combo]} * rem - 3),
            full: s.scrollHeight > s.clientHeight, card: getComputedStyle(card).display !== 'none' ? Math.round(card.getBoundingClientRect().bottom) : null,
            footTop: footShown ? Math.round(foot.getBoundingClientRect().top) : null, h: innerHeight };
        })()`);
        const name = `${w}×${h}${stale ? ' after going fullscreen' : ''}, ${combo === 'hws' ? 'Hide Widget Settings' : combo === 'hf' ? 'Hide Footer' : 'both mods'}`;
        // a full column reaches its end; a short one (few widgets, a tall screen) just ends earlier
        const ok = r.bottom <= r.h && (r.full ? Math.abs(r.free - r.want) <= 8 : r.free >= r.want - 8) && (r.footTop === null || r.bottom <= r.footTop)
          && (r.card === null || (r.card <= r.h - r.want + 8 && r.card > r.bottom));
        check(`${name}: the widgets ${r.full ? 'fill the column' : 'fit'} (${(r.want / 16).toFixed(1)}rem left at the bottom), nothing cut by the screen or under the footer`, ok, r);
      }
    }
  }
} catch (e) {
  check('runner exception: ' + e.message, false, e.stack);
}
console.log(results.join('\n'));
console.log(results.filter((r) => r.startsWith('PASS')).length + ' PASS / ' + results.filter((r) => r.startsWith('FAIL')).length + ' FAIL');
ws.close();
chrome.kill();
process.exit(0);
