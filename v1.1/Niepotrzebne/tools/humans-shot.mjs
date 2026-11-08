// Gloria humans headless screenshots: node humans-shot.mjs <query> <out.png> [w] [h] [waitMs] [sheetJson]
import { createRequire } from 'node:module';
const require = createRequire('/Users/jurek/Downloads/Claude/Projects/CivicForge/node_modules/');
const { chromium } = require('playwright-core');
const [query = '', out = 'shot.png', W = '1280', H = '800', wait = '600', sheet = ''] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
const seen = new Set();
page.on('console', (m) => { const k = m.type() + ':' + m.text().slice(0, 300); if ((m.type() === 'error' || m.type() === 'warning') && !seen.has(k) && !k.includes('404')) { seen.add(k); console.log(k); } });
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto('http://localhost:' + (process.env.HPORT || 8851) + '/humans.html' + query);
await page.waitForFunction(() => window.__h && window.__h.ready, null, { timeout: 30000 }).catch(() => console.log('not ready'));
await page.waitForTimeout(+wait);
if (sheet) {
  const s = JSON.parse(sheet);
  const [sw, sh] = await page.evaluate((s) => window.__h.sheet(s.times, s.cols, s.w, s.h, s.cam || null, s.modes || null), s);
  await page.setViewportSize({ width: Math.min(sw, 2400), height: Math.min(sh, 2400) });
  await page.waitForTimeout(200);
  await page.locator('#sheet').screenshot({ path: out });
} else {
  const info = await page.evaluate(() => ({ fps: window.__h.fps, cpu: window.__h.crowd.cpu, n: window.__h.crowd.people.length, tris: window.__h.crowd.tris, calls: window.__h.renderer.info.render.calls }));
  console.log(JSON.stringify(info));
  await page.screenshot({ path: out });
}
await browser.close();
