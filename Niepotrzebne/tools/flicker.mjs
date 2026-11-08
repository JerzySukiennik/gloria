// Gloria flicker probe: samples the canvas right after every render and reports dark frames and resolution changes.
import { createRequire } from 'node:module';
const require = createRequire('/Users/jurek/Downloads/Claude/Projects/CivicForge/node_modules/');
const { chromium } = require('playwright-core');
const [query, secs = '20', W = '1280', H = '800'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto('http://localhost:8851/' + query);
await page.waitForFunction(() => window.__gl && window.__gl.ready && __gl.G.state === 'play', null, { timeout: 90000 });
const r = await page.evaluate(async (secs) => {
  const g = __gl, st = g.stage, gl = st.renderer.getContext();
  const log = [], prs = [];
  const origPR = st.setPixelRatio.bind(st);
  st.setPixelRatio = (pr) => { prs.push([+performance.now().toFixed(0), +pr.toFixed(2), Math.round(g.fps || 0)]); origPR(pr); };
  const orig = st.render.bind(st);
  const px = new Uint8Array(4);
  st.render = () => {
    orig();
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    let s = 0;
    for (const [fx, fy] of [[0.5, 0.5], [0.25, 0.4], [0.75, 0.4], [0.5, 0.8], [0.2, 0.75], [0.8, 0.75]]) { gl.readPixels(Math.floor(w * fx), Math.floor(h * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); s += px[0] + px[1] + px[2]; }
    const c = st.camera;
    const bad = [c.position.x, c.position.y, c.position.z, c.fov, c.quaternion.x].some((v) => !Number.isFinite(v));
    log.push([+performance.now().toFixed(0), s / 18, +(g.G.strobeOn ? 1 : 0), +g.G.pump.toFixed(2), bad ? 1 : 0, +c.fov.toFixed(1), +g.G.burst.toFixed(2), +g.pyro.flash.toFixed(2), g.lasers.mesh.count, +(st.bloom.strength).toFixed(2), g.G.lastBar]);
  };
  await new Promise((r) => setTimeout(r, secs * 1000));
  const dark = log.filter((l) => l[1] < 6);
  const prev = log.map((l, i) => (i ? l[1] - log[i - 1][1] : 0));
  const drops = log.filter((l, i) => i > 0 && log[i - 1][1] > 25 && l[1] < 0.25 * log[i - 1][1]);
  const near = []; log.forEach((l, i) => { if (l[1] < 6) near.push(log.slice(Math.max(0, i - 2), i + 3)); });
  return { near: near.slice(0, 4), frames: log.length, dark: dark.length, darkStrobe: dark.filter((d) => d[2]).length, drops: drops.length, dropsNoStrobe: drops.filter((d) => !d[2]).slice(0, 12), prs, avg: +(log.reduce((a, l) => a + l[1], 0) / log.length).toFixed(1) };
}, +secs);
console.log(JSON.stringify(r));
await browser.close();
