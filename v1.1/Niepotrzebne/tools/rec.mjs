// Gloria: record the live mix from headless Chrome. node rec.mjs <query> <seconds> <out.webm>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/Users/jurek/Downloads/Claude/Projects/CivicForge/node_modules/');
const { chromium } = require('playwright-core');
const [query, secs = '20', out = 'mix.webm'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto('http://localhost:8851/' + query);
await page.waitForFunction(() => window.__gl && window.__gl.ready && __gl.A.ctx, null, { timeout: 60000 });
const b64 = await page.evaluate(async (secs) => {
  const A = __gl.A;
  const dest = A.ctx.createMediaStreamDestination();
  A.master.connect(dest);
  const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 160000 });
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.start();
  await new Promise((r) => setTimeout(r, secs * 1000));
  rec.stop();
  await new Promise((r) => (rec.onstop = r));
  const buf = new Uint8Array(await new Blob(chunks).arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode(...buf.subarray(i, i + 32768));
  return btoa(s);
}, +secs);
writeFileSync(out, Buffer.from(b64, 'base64'));
await browser.close();
