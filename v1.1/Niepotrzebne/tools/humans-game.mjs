// Gloria humans: load the real game page, report humans.js status and console errors, screenshot: node humans-game.mjs <query> <out.png> [waitMs]
import { createRequire } from 'node:module';
const require = createRequire('/Users/jurek/Downloads/Claude/Projects/CivicForge/node_modules/');
const { chromium } = require('playwright-core');
const [query = '?autostart&skip', out = '', wait = '6000'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const seen = new Set();
page.on('console', (m) => { const k = m.type() + ': ' + m.text().slice(0, 300); if ((m.type() === 'error' || m.type() === 'warning') && !seen.has(k) && !k.includes('404')) { seen.add(k); console.log(k); } });
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto('http://localhost:' + (process.env.HPORT || 8851) + '/index.html' + query);
await page.waitForFunction(() => window.__gl && window.__gl.ready, null, { timeout: 45000 }).catch(() => console.log('not ready'));
await page.waitForTimeout(+wait);
console.log(JSON.stringify(await page.evaluate(() => { const g = window.__gl; return { newHumans: !!(g.crowd && g.crowd.drop && g.crowd.tshirts), people: g.crowd.people ? g.crowd.people.length : null, crowdMs: g.crowd.cpu, clergy: !!(g.clergy && g.clergy.shedChasuble), mode: g.clergy && g.clergy.mode, fps: g.fps }; })));
if (out) await page.screenshot({ path: out });
await browser.close();
