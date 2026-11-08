// Gloria headless Chrome (Metal GPU) screenshots: node shot.mjs <query> <out.png> [w] [h] [waitMs] [evalJs]
import { createRequire } from 'node:module';
const require = createRequire('/Users/jurek/Downloads/Claude/Projects/CivicForge/node_modules/');
const { chromium } = require('playwright-core');
const [query = '', out = 'shot.png', W = '1280', H = '800', wait = '4000', js = ''] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || m.text().startsWith('[gl]')) console.log(m.type() + ':', m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto('http://localhost:8851/' + query);
await page.waitForFunction(() => window.__gl && window.__gl.ready, null, { timeout: 60000 }).catch(() => console.log('not ready'));
if (js) { const r = await page.evaluate(js); if (r !== undefined) console.log('eval:', JSON.stringify(r).slice(0, 2000)); }
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
await browser.close();
