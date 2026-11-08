// Gloria timed screenshot series: node shots.mjs <query> <outPrefix> <w> <h> <t1,t2,...>
import { createRequire } from 'node:module';
const require = createRequire('/Users/jurek/Downloads/Claude/Projects/CivicForge/node_modules/');
const { chromium } = require('playwright-core');
const [query = '', prefix = 'shot', W = '1280', H = '800', times = '5'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type() + ':', m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto('http://localhost:8851/' + query);
await page.waitForFunction(() => window.__gl && window.__gl.ready, null, { timeout: 60000 }).catch(() => console.log('not ready'));
if (process.env.POS) await page.evaluate((p) => { const [x, z, yaw, pitch] = p.split(',').map(Number); const pl = __gl.player; pl.pos.x = x; pl.pos.z = z; pl.yaw = yaw; pl.pitch = pitch; }, process.env.POS);
const t0 = Date.now();
for (const t of times.split(',').map(Number)) {
  const wait = t * 1000 - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  await page.screenshot({ path: `${prefix}_${t}.png` });
  const st = await page.evaluate(() => { const G = __gl.G; return { part: document.getElementById('partName').textContent, sub: document.getElementById('sub').classList.contains('on') ? document.getElementById('sub').textContent.slice(0, 60) : '', R: +G.R.toFixed(2), cross: +G.cross.toFixed(2), fps: Math.round(__gl.fps || 0) }; });
  console.log(t, JSON.stringify(st));
}
await browser.close();
