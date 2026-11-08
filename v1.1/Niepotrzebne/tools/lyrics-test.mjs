// Gloria lyrics check: loads a song, confirms the LRCLIB text matched the timing map, toggles with T, reports errors and fps.
import { createRequire } from 'node:module';
const require = createRequire('/Users/jurek/Downloads/Claude/Projects/CivicForge/node_modules/');
const { chromium } = require('playwright-core');
const port = process.env.HPORT || 8851;
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const out = {};
for (const song of ['yes', 'techno', 'psy']) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await page.goto(`http://localhost:${port}/?autostart&skip&song=${song}&at=30`);
  await page.waitForFunction(() => window.__gl && window.__gl.ready, null, { timeout: 90000 });
  await page.waitForTimeout(6000);
  const a = await page.evaluate(() => ({ ok: window.__gl.G.lyricsOk, sentences: window.__gl.lyrics.sentences ? window.__gl.lyrics.sentences.length : 0, words: window.__gl.lyrics.items.length, visible: window.__gl.lyrics.group.visible, fps: Math.round(window.__gl.fps) }));
  await page.keyboard.press('t');
  await page.waitForTimeout(400);
  const b = await page.evaluate(() => ({ on: window.__gl.lyrics.on, visible: window.__gl.lyrics.group.visible, btn: document.getElementById('lyr').className }));
  await page.keyboard.press('t');
  out[song] = { ...a, afterT: b, errs };
  await page.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
