// Gloria humans: evaluate JS in the test page and print the result: node humans-eval.mjs <query> <js> [waitMs]
import { createRequire } from 'node:module';
const require = createRequire('/Users/jurek/Downloads/Claude/Projects/CivicForge/node_modules/');
const { chromium } = require('playwright-core');
const [query = '', js = '1', wait = '500', shot = ''] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('page error:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 300)); });
await page.goto('http://localhost:' + (process.env.HPORT || 8851) + '/humans.html' + query);
await page.waitForFunction(() => window.__h && window.__h.ready, null, { timeout: 30000 });
await page.waitForTimeout(+wait);
console.log(JSON.stringify(await page.evaluate(js)));
if (shot) await page.screenshot({ path: shot });
await browser.close();
