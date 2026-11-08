// Gloria live smoke test: load the deployed game, start a song, report errors, people and fps.
import { createRequire } from 'node:module';
const require = createRequire('/Users/jurek/Downloads/Claude/Projects/CivicForge/node_modules/');
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'https://gloria.gzowo.fun/';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
await page.goto(url + '?autostart&skip&song=techno&at=60');
await page.waitForFunction(() => window.__gl && window.__gl.ready, null, { timeout: 90000 });
await page.waitForTimeout(9000);
const st = await page.evaluate(() => ({ fps: window.__gl.fps, part: window.__gl.G.part, R: window.__gl.G.R, people: window.__gl.crowd.people?.length ?? window.__gl.crowd.slots?.length, mode: window.__gl.clergy.mode }));
console.log(JSON.stringify({ ...st, errs }));
await browser.close();
