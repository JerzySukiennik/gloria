// Gloria mobile check (iPhone XR profile) in WebKit or Chromium: title layout, tap start, tap pads, gameplay frame.
import { createRequire } from 'node:module';
const [engine, outDir, pwDir] = process.argv.slice(2);
const require = createRequire(pwDir + '/');
const pw = require('playwright-core');
const dev = pw.devices['iPhone XR'];
const browser = engine === 'webkit'
  ? await pw.webkit.launch({ headless: true })
  : await pw.chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ ...dev });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => errs.push('pageerror ' + e.message.slice(0, 200)));
await page.goto('http://localhost:8851/?skip&at=60', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => window.__gl && window.__gl.ready, null, { timeout: 90000 }).catch(() => errs.push('not ready'));
await page.waitForTimeout(800);
await page.screenshot({ path: `${outDir}/m-${engine}-1.png` });
const ready = await page.evaluate(() => !!(window.__gl && __gl.ready));
if (!ready) { console.log(engine, 'NOT READY', JSON.stringify({ errs, gl: await page.evaluate(() => ({ has: !!window.__gl, btn: document.getElementById('start').textContent })) })); await browser.close(); process.exit(0); }
await page.tap('#start');
await page.waitForTimeout(6000);
const stick = await page.$('#stick');
const b = await stick.boundingBox();
await page.touchscreen.tap(b.x + b.width / 2, b.y + 8);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}/m-${engine}-2.png` });
const st = await page.evaluate(() => ({ state: __gl.G.state, ctx: __gl.A.ctx && __gl.A.ctx.state, fps: Math.round(__gl.fps || 0), q: __gl.stage.quality, pr: __gl.stage.pixelRatio, part: __gl.G.part, R: __gl.G.R, touch: document.body.classList.contains('touch'), vw: innerWidth, vh: innerHeight }));
console.log(engine, JSON.stringify({ st, errs }));
await browser.close();
