// Gloria humans perf: node humans-perf.mjs <query> -> fps and crowd CPU ms over a few seconds, uncapped frame rate
import { createRequire } from 'node:module';
const require = createRequire('/Users/jurek/Downloads/Claude/Projects/CivicForge/node_modules/');
const { chromium } = require('playwright-core');
const [query = '?n=220', W = '1280', H = '800'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync'] });
const page = await browser.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto('http://localhost:8851/humans.html' + query);
await page.waitForFunction(() => window.__h && window.__h.ready, null, { timeout: 30000 });
await page.waitForTimeout(2500);
const r = await page.evaluate(async () => {
  const h = window.__h, c = h.crowd, k = h.clergy;
  const t0 = performance.now(); let f0 = 0; const samples = [];
  const origC = c.update.bind(c), origK = k.update.bind(k);
  let cc = 0, kc = 0, n = 0;
  c.update = (...a) => { const s = performance.now(); origC(...a); cc += performance.now() - s; n++; };
  k.update = (...a) => { const s = performance.now(); origK(...a); kc += performance.now() - s; };
  await new Promise((res) => { let frames = 0; const tick = () => { frames++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else { f0 = frames; res(); } }; requestAnimationFrame(tick); });
  const dtt = performance.now() - t0;
  return { fps: +(f0 * 1000 / dtt).toFixed(1), crowdMs: +(cc / n).toFixed(3), clergyMs: +(kc / n).toFixed(3), people: c.people.length, visibleNow: c.people.filter((p) => p.vis).length, tris: c.tris, calls: h.renderer.info.render.calls, drawTris: h.renderer.info.render.triangles };
});
console.log(JSON.stringify(r));
await browser.close();
