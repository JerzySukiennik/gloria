// Gloria: a Mass that turns into a hardcore rave. Pick the song, walk the church, sit anywhere; the priest, the light and the crowd do the rest.
import * as THREE from 'three';
import { Stage, pickQuality, TO_SUN } from './stage.js';
import { Smoke, SunBeams, Glitter } from './fx.js';
import { Lasers, MovingHeads, Pyro, Thuribles, DiscoBall, Confetti, Blinders } from './rave.js';
import { AudioEngine } from './audio.js';
import { Player } from './player.js';
import { HALL, HPEWS, PEWS, PIT, HALTAR, STAGE, MIRROR_X } from './layout.js';
import { clamp, lerp, damp, rnd, canvasTex } from './util.js';

const SONGS = {
  techno: { name: 'Ameno', tv: 'AMENO' },
  psy: { name: 'Ameno', tv: 'AMENO' },
  yes: { name: 'YES!', tv: 'YES!' },
};
const TEXT = {
  p_intro: 'W imię Ojca i Syna, i Ducha Świętego.',
  c_amen1: 'Amen.',
  p_panzwami: 'Pan z wami.',
  c_izduchem: 'I z duchem twoim.',
  p_hype: 'Kochani! Mówią, że msza jest nudna. To dzisiaj sprawdzimy. Niech ten kościół zaświeci!',
  p_gloria: 'Chwała na wysokości Bogu! Wszyscy razem!',
  p_cisza: 'A teraz cisza. Najważniejsza chwila.',
  p_wstancie: 'On jest z nami. Wstańcie i chwalcie Pana!',
  p_idzcie: 'Idźcie w pokoju Chrystusa!',
  c_bogu: 'Bogu niech będą dzięki!',
  p_koniec: 'No i kto powiedział, że msza jest nudna?',
  p_alleluja: 'Alleluja!', p_glosniej: 'Głośniej!', p_pieknie: 'Pięknie!', p_brawo: 'Brawo, kochani!', p_jeszcze: 'Jeszcze raz!',
  c_amen3: 'AMEN!',
};
const SHOUTS = ['p_alleluja', 'p_glosniej', 'c_amen3', 'p_jeszcze', 'p_brawo', 'p_pieknie'];
const PALS = [
  ['#7a3cff', '#2f8cff', '#ff4fd8'],
  ['#ffb02e', '#ff4fd8', '#6b5cff'],
  ['#00c8ff', '#8a5cff', '#ffffff'],
  ['#ff8a2e', '#ffd36b', '#ff3fae'],
  ['#3f6bff', '#00e0c8', '#ffe38a'],
  ['#2bff6a', '#19d4ff', '#ffffff'],
];
const DEEP = ['#3a2cff', '#8a3cff', '#1f7bff'];

const params = new URLSearchParams(location.search);
const JSONS = {};
await Promise.all(Object.keys(SONGS).map(async (k) => { JSONS[k] = await fetch(`assets/song-${k}.json`).then((r) => r.json()); }));
let HM = null;
if (!params.has('old')) { try { HM = await import('./humans.js'); } catch (e) { HM = null; } }
const OLD = HM ? null : await import('./people.js');

const canvas = document.getElementById('gl');
const stage = new Stage(canvas, pickQuality());
const scene = stage.scene;
const church = stage.church;
const Q = stage.quality;

function places() {
  const r = rnd(4242);
  const out = [];
  const row = (xa, xb, z, kind = 'seat') => {
    const n = Math.floor((xb - xa) / 0.62);
    for (let k = 0; k < n; k++) out.push({ x: xa + 0.31 + k * ((xb - xa - 0.62) / Math.max(1, n - 1)), z, yaw: 0, kind });
  };
  for (let i = 0; i < HPEWS.rows; i++) for (const [xa, xb] of [HPEWS.left, HPEWS.right]) row(xa, xb, HPEWS.z0 + i * HPEWS.pitch + 0.02);
  const chapel = [];
  for (let i = 0; i < PEWS.rows; i++) for (const [xa, xb] of [PEWS.left, PEWS.right]) {
    const n = Math.floor((xb - xa) / 0.62);
    for (let k = 0; k < n; k++) {
      const x = xa + 0.31 + k * ((xb - xa - 0.62) / Math.max(1, n - 1));
      const z = PEWS.z0 + i * PEWS.pitch + 0.02;
      chapel.push({ x, z, yaw: 0, kind: 'seat' }, { x: MIRROR_X - x, z, yaw: 0, kind: 'seat' });
    }
  }
  for (const p of chapel) if (r() < 0.62) out.push(p);
  for (let z = PIT.z0 + 0.35; z < PIT.z1; z += 0.78) for (let x = PIT.x0; x < PIT.x1; x += 0.82) {
    if (Math.abs(x - HALL.xc) < 0.9 && z < PIT.z0 + 0.9) continue;
    if (r() < 0.72) out.push({ x: x + (r() - 0.5) * 0.3, z: z + (r() - 0.5) * 0.25, yaw: (r() - 0.5) * 0.6, kind: 'stand' });
  }
  return out;
}
const special = [
  { x: HPEWS.left[1] - 0.31 - 3 * 0.64, z: HPEWS.z0 + 2 * HPEWS.pitch + 0.02, yaw: 0, kind: 'seat', preset: 'redHatLady' },
  { x: HPEWS.left[1] - 0.31, z: HPEWS.z0 + 3 * HPEWS.pitch + 0.02, yaw: 0, kind: 'seat', preset: 'navyJacketMan' },
  { x: HPEWS.right[0] + 0.31, z: HPEWS.z0 + 3 * HPEWS.pitch + 0.02, yaw: 0, kind: 'seat', preset: 'beigeJacketLady' },
];
const allPlaces = places().filter((p) => !special.some((s) => Math.hypot(s.x - p.x, s.z - p.z) < 0.4));
const PRIEST_DJ = { x: HALTAR.x, y: STAGE.h, z: HALTAR.z - 0.78, yaw: Math.PI };
const PRIEST_BREAK = { x: HALTAR.x, y: STAGE.h, z: STAGE.z1 - 1.25, yaw: Math.PI };
const SERVER = { x: HALTAR.x + 2.7, y: STAGE.h, z: HALTAR.z + 0.6, yaw: Math.PI - 0.45 };
const crowd = HM ? new HM.Congregation(scene, { places: allPlaces, quality: Q, seed: 7, fill: 0.5, special }) : new OLD.Congregation(scene, Q);
const clergy = HM ? new HM.Clergy(scene, { priest: PRIEST_DJ, server: SERVER }) : new OLD.Clergy(scene);

const smoke = new Smoke(scene, Q === 'low' ? 420 : 700);
const hallSlots = church.hall.right.slots.filter((sl, i) => i % (Q === 'low' ? 3 : 2) === 0).map((sl) => ({ ...sl, xMin: HALL.x0 + 0.05, maxLen: 30 }));
const beams = new SunBeams(scene, [...church.lattice.slots.filter((sl) => (sl.col + sl.k) % 2 === 0), ...hallSlots], TO_SUN);
const lasers = new Lasers(scene, Q);
const heads = new MovingHeads(scene);
const pyro = new Pyro(scene, smoke, stage.pyroLight, Q);
const bota = new Thuribles(scene, smoke);
const disco = new DiscoBall(scene, Q === 'low' ? 160 : 280);
const glitter = new Glitter(scene, Q === 'low' ? 260 : 520);
const confetti = new Confetti(scene, Q === 'low' ? 600 : Q === 'mid' ? 1400 : 2000);
const blinders = new Blinders(scene);
const WORDS = {};
function wordTex(w) {
  if (WORDS[w]) return WORDS[w];
  const t = canvasTex(1024, 256, (c, W, Hh) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, Hh);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let fs = 250;
    c.font = `900 ${fs}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
    while (c.measureText(w).width > W * 0.86 && fs > 80) { fs -= 10; c.font = `900 ${fs}px -apple-system, "Helvetica Neue", Arial, sans-serif`; }
    c.fillText(w, W / 2, Hh / 2 + fs * 0.05);
  }, false);
  t.wrapS = THREE.RepeatWrapping;
  WORDS[w] = t;
  return t;
}
const A = new AudioEngine();
const player = new Player(stage.camera, canvas, crowd.slots);
player.bindStick(document.getElementById('stick'), document.querySelector('#stick i'));
const $ = (id) => document.getElementById(id);
const body = document.body;
const touchDevice = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 1;
body.classList.add(touchDevice ? 'touch' : 'desktop');
if (touchDevice) player.touch = true;

const tvCtx = church.tv.canvas.getContext('2d');
let tvText = null;
function tv(text, small = '') {
  const key = text + '|' + small;
  if (key === tvText) return;
  tvText = key;
  const c = tvCtx, w = church.tv.canvas.width, h = church.tv.canvas.height;
  c.fillStyle = '#05060a'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#f3ecdf'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '500 54px Georgia, serif';
  const lines = [];
  let cur = '';
  for (const wd of text.split(' ')) { const t = cur ? cur + ' ' + wd : wd; if (c.measureText(t).width > w - 90 && cur) { lines.push(cur); cur = wd; } else cur = t; }
  if (cur) lines.push(cur);
  const lh = 64, y0 = h / 2 - ((lines.length - 1) * lh) / 2 - (small ? 18 : 0);
  lines.slice(0, 4).forEach((l, i) => c.fillText(l, w / 2, y0 + i * lh));
  if (small) { c.font = '600 22px -apple-system, Helvetica, sans-serif'; c.fillStyle = '#e2b25a'; c.fillText(small.toUpperCase(), w / 2, h - 46); }
  church.tv.texture.needsUpdate = true;
}
tv('Gloria', 'Niedziela, 11:00');

const G = {
  state: 'title', t: 0, R: 0, E: 0, haze: 0.12, flash: 0, domeFlash: 0, madGlow: 0, cross: 0, ledMix: 0, shake: 0,
  songOn: false, songStart: 0, lastBeat: -1, lastBar: -1, waiters: [], bed: null, runId: 0, levels: new Array(8).fill(0),
  part: '', burst: 0, song: null, AM: null, br: null, drops: new Set(), firstHigh: -1, dark: 0, pump: 0, blind: 0, text: 0, word: '',
};
window.__gl = { stage, G, A, crowd, clergy, player, ready: false, THREE, lasers, pyro, bota, disco, confetti };

const VIEWS = {
  hall: [[HALL.xc, 1.75, 7.6], [HALL.xc, 3.2, -10]],
  hallSide: [[-6.0, 2.2, 6.5], [-22, 2.5, -8]],
  hallTop: [[HALL.xc, 7.5, 7.0], [HALL.xc, 0, -6]],
  stage: [[HALL.xc + 3, 2.0, -2.5], [HALL.xc - 1, 1.6, -9]],
  chapel: [[0.2, 1.75, 6.1], [0, 1.6, -5]],
  chapelL: [[MIRROR_X - 0.2, 1.75, 6.1], [MIRROR_X, 1.6, -5]],
};
const debugView = params.get('view');
if (debugView) body.classList.add('debug');

function setPart(num, name) { $('partNum').textContent = num; $('partName').textContent = name; G.part = name; }
function subtitle(text, who) {
  const el = $('sub');
  if (!text) { el.classList.remove('on'); return; }
  el.innerHTML = who ? `<em>${who}</em> ${text}` : text;
  el.classList.add('on');
}
function until(t, cond) { return new Promise((res) => G.waiters.push({ t, cond, res })); }
const wait = (s) => until(A.now + s);

async function say(name, mode, o = {}) {
  const crowdLine = name.startsWith('c_');
  if (mode) clergy.mode = mode;
  const d = A.voiceLine(name, A.now + 0.02, o);
  subtitle(TEXT[name], crowdLine ? 'Wierni:' : '');
  if (!o.noTv) tv(TEXT[name], crowdLine ? 'Wszyscy' : '');
  await until(A.now + d + (o.gap ?? 0.28));
  subtitle(null);
  if (mode && !G.songOn) clergy.mode = 'idle';
  return d;
}

function organ(midi, t, o) {
  const pick = (base) => Math.abs(midi - base - 12 * Math.round((midi - base) / 12));
  A.note(pick(60) <= pick(63) ? 'organq60' : 'organq63', midi, t, o);
}
function bedStart() { G.bed = { next: A.now + 0.05, i: 0 }; }
function bedStop() { G.bed = null; }
function bedTick() {
  const b = G.bed;
  if (!b || A.now < b.next - 0.3) return;
  const ch = [[55, 59, 62, 43], [50, 54, 57, 38], [48, 52, 55, 36], [55, 59, 62, 43]][b.i % 4];
  for (const n of ch.slice(0, 3)) organ(n, b.next, { bus: A.bed, gain: 0.2, dur: 4.2, attack: 0.9, release: 1.8 });
  organ(ch[3] + 12, b.next, { bus: A.bed, gain: 0.18, dur: 4.2, attack: 0.9, release: 1.8 });
  b.next += 4.2;
  b.i++;
}

function prepSong(k) {
  const AM = JSONS[k];
  G.AM = AM;
  G.song = k;
  const nb = AM.bars.length;
  G.drops = new Set();
  for (let b = 1; b < nb; b++) if (AM.bars[b] === 'high' && AM.bars[b - 1] !== 'high') G.drops.add(b);
  G.br = AM.breakdown ? { a: AM.breakdown[0], b: AM.breakdown[1], talk: true } : { a: Math.max(0, nb - 9), b: nb - 3, talk: false };
  G.firstHigh = AM.bars.indexOf('high');
}
const barT = (b) => G.songStart + G.AM.t0 + b * 4 * G.AM.T;

async function mass(skipIntro) {
  const id = ++G.runId;
  const alive = () => id === G.runId;
  $('end').classList.add('hidden');
  A.clear();
  A.stopSong(0.5);
  bedStop();
  G.songOn = false;
  A.loop('room', A.amb, 0.45, 3);
  if (!skipIntro) {
    A.loop('chatter', A.amb, 0.5, 2);
    setPart('', 'Przed mszą');
    tv('Za chwilę msza', 'Prosimy wyciszyć telefony');
    await wait(3);
    if (!alive()) return;
    A.play('bell', A.now, { bus: A.sfx, gain: 0.75 });
    await wait(3.5);
    if (!alive()) return;
    A.loopGain('chatter', 0.0001, 3);
    await wait(1.5);
    setPart('I', 'Wejście');
    bedStart();
    await say('p_intro', 'orans');
    await say('c_amen1');
    await say('p_panzwami', 'orans');
    await say('c_izduchem');
    await say('p_hype', 'hype', { gap: 0.15 });
    bedStop();
    if (!alive()) return;
  } else A.loopGain('chatter', 0.0001, 0.2);
  const AM = G.AM;
  const off = +(params.get('at') || 0);
  const start = A.now + 0.3;
  A.playSong(start, off);
  G.songStart = start - off;
  G.songOn = true;
  G.lastBeat = -1; G.lastBar = -1;
  setPart('II', SONGS[G.song].name);
  tv(SONGS[G.song].tv, 'Uwielbienie');
  clergy.mode = 'dj';
  const at = (t, fn) => { if (t > A.now + 0.05) A.at(t, fn); };
  if (G.firstHigh > 1) at(barT(G.firstHigh) - A.dur('p_gloria') - 0.35, () => say('p_gloria', null, { duck: 0.5 }));
  let si = 0, lastPlan = -99;
  for (const d of [...G.drops].sort((a, b) => a - b)) {
    if (d === G.firstHigh || (d >= G.br.a && d <= G.br.b + 1)) continue;
    const t = barT(d) - 0.55;
    if (t - lastPlan < 14) continue;
    lastPlan = t;
    const ln = SHOUTS[si++ % SHOUTS.length];
    at(t, () => {
      if (ln.startsWith('c_')) { A.voiceLine(ln, A.now, { gain: 1.1 }); subtitle(TEXT[ln], 'Wierni:'); setTimeout(() => subtitle(null), 1600); }
      else say(ln, null, { shout: true, duck: 0.7, noTv: true });
    });
  }
  const br = G.br;
  if (br.talk) {
    at(barT(br.a) + 0.3, () => { setPart('III', 'Cisza'); tv('Cisza', 'Przeistoczenie'); say('p_cisza', null, { duck: 0.35, noTv: true }); });
    at(barT(br.b + 1) - A.dur('p_wstancie') - 0.4, () => say('p_wstancie', null, { duck: 0.45, noTv: true }));
    at(barT(br.b + 1), () => { setPart('IV', 'Uwielbienie'); tv('ALLELUJA', 'Wszyscy'); });
  } else at(barT(br.a), () => { setPart('III', 'Chwała'); tv('Chwała', 'Wszyscy'); });
  for (const k of [1, 3, 5]) if (br.a + k <= br.b) at(barT(br.a + k), () => { for (const [r, d] of [[1, 0], [1.122, 0.07], [1.26, 0.13]]) A.play('sanctus', A.now + d, { bus: A.sfx, gain: 0.25, rate: r }); });
  await until(G.songStart + AM.end);
  if (!alive()) return;
  G.songOn = false;
  setPart('V', 'Rozesłanie');
  A.play('applause', A.now, { bus: A.crowd, gain: 0.75 });
  A.play('cheer', A.now + 0.3, { bus: A.crowd, gain: 0.5 });
  pyro.flames('all', 1.2);
  await wait(3);
  if (!alive()) return;
  await say('p_idzcie', 'orans', { gap: 0.1 });
  await say('c_bogu', null, { gap: 0.3 });
  A.play('bell', A.now, { bus: A.sfx, gain: 0.7 });
  await say('p_koniec', 'hype', { gap: 0.5 });
  if (!alive()) return;
  clergy.mode = 'idle';
  setPart('', 'Po mszy');
  tv('Idźcie w pokoju', 'Do zobaczenia w niedzielę');
  A.loop('chatter', A.amb, 0.4, 4);
  $('end').classList.remove('hidden');
}

function showPick() {
  G.state = 'pick';
  player.enabled = false;
  if (document.pointerLockElement) document.exitPointerLock();
  $('end').classList.add('hidden');
  $('pick').classList.remove('hidden');
  body.classList.remove('playing');
}
async function choose(k) {
  if (G.state !== 'pick') return;
  G.state = 'loading';
  const card = document.querySelector(`.song[data-key="${k}"]`);
  card.classList.add('loading');
  A.stopPreview(0.6);
  await A.loadSong(k);
  card.classList.remove('loading');
  document.querySelectorAll('.song').forEach((c) => c.classList.remove('on'));
  prepSong(k);
  $('pick').classList.add('hidden');
  body.classList.add('playing');
  G.state = 'play';
  player.enabled = true;
  if (!touchDevice && !params.has('autostart') && canvas.requestPointerLock) { try { canvas.requestPointerLock(); } catch (e) {} }
  mass(params.has('skip')).catch((e) => console.error(e));
}
document.querySelectorAll('.song').forEach((c) => {
  const k = c.dataset.key;
  c.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && G.state === 'pick') { document.querySelectorAll('.song').forEach((x) => x.classList.toggle('on', x === c)); A.preview(k); } });
  c.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && G.state === 'pick') { c.classList.remove('on'); A.stopPreview(); } });
  c.addEventListener('click', () => {
    if (G.state !== 'pick') return;
    if (touchDevice && !c.classList.contains('on')) {
      document.querySelectorAll('.song').forEach((x) => x.classList.toggle('on', x === c));
      A.preview(k);
      $('pickHint').textContent = 'Stuknij jeszcze raz, żeby zacząć mszę.';
      return;
    }
    choose(k);
  });
});
if (touchDevice) $('pickHint').textContent = 'Stuknij, żeby posłuchać. Stuknij drugi raz, żeby zacząć.';

async function enter() {
  if (G.state !== 'title') return;
  G.state = 'starting';
  $('start').disabled = true;
  $('start').textContent = 'Wchodzimy…';
  try { await A.start(); } catch (e) { console.error(e); $('start').textContent = 'Dźwięk nie ruszył, kliknij jeszcze raz'; $('start').disabled = false; G.state = 'title'; return; }
  $('title').classList.add('hidden');
  A.loop('room', A.amb, 0.4, 2);
  showPick();
  const auto = params.get('song');
  if (auto && SONGS[auto]) choose(auto);
}
$('start').addEventListener('click', enter);
window.addEventListener('keydown', (e) => { if (G.state === 'title' && (e.key === 'Enter' || e.key === ' ') && !$('start').disabled) enter(); });
$('mute').addEventListener('click', () => { A.setMuted(!A.muted); $('mute').classList.toggle('off', A.muted); });
$('again').addEventListener('click', () => { G.runId++; A.stopSong(0.4); showPick(); });
$('seatBtn').addEventListener('click', () => player.toggleSeat());
$('jumpBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); player.jump(); });

const loaded = { audio: false, gfx: false };
A.prefetch(Object.keys(SONGS), (p) => { $('loadbar').firstChild.style.width = Math.round(p * 80) + '%'; }).then(() => { loaded.audio = true; maybeReady(); });
function maybeReady() {
  if (!loaded.audio || !loaded.gfx) return;
  $('loadbar').firstChild.style.width = '100%';
  $('loadbar').classList.add('done');
  $('start').disabled = false;
  $('start').textContent = 'Wejdź do kościoła';
  window.__gl.ready = true;
  if (params.has('autostart')) enter();
}
THREE.DefaultLoadingManager.onLoad = () => { stage.bakeStatic(); loaded.gfx = true; maybeReady(); };

function program(now) {
  if (!G.songOn) return null;
  const AM = G.AM;
  const sp = now - G.songStart;
  if (sp < 0) return null;
  const bf = (sp - AM.t0) / AM.T;
  const intro = bf < 0;
  const bi = intro ? -1 : Math.min(AM.n - 1, Math.floor(bf));
  const bar = intro ? -1 : Math.min(AM.bars.length - 1, Math.floor(bi / 4));
  const kind = intro ? 'low' : AM.bars[bar] || 'low';
  const breakdown = !intro && bar >= G.br.a && bar <= G.br.b;
  const pre = G.firstHigh > 0 && bar < G.firstHigh;
  return {
    sp, bf, bi, bar, kind, breakdown, intro, pre,
    e: intro ? 0.25 : AM.e[bi] ?? 0.3, kick: intro ? 0 : AM.k[bi] ?? 0, on: intro ? 0 : AM.o[bi] ?? 0,
    phrase: intro ? 0 : Math.floor(bar / 8), beatPhase: ((bf % 1) + 1) % 1, inBar: intro ? 0 : bi % 4,
  };
}

function onBar(p) {
  const drop = G.drops.has(p.bar);
  if (drop && !p.breakdown) {
    pyro.flames('all', 1.3);
    pyro.blast();
    confetti.burst(Q === 'low' ? 500 : 1100);
    G.burst = 1.5;
    G.shake = 1.4;
    G.blind = 1;
    A.play('cheer', A.now, { bus: A.crowd, gain: 0.6 });
  } else if (p.kind === 'high') pyro.flames(p.bar % 2 ? 'odd' : 'even', p.bar % 8 === 0 ? 0.8 : 0.45);
  else if (p.kind === 'mid' && p.bar % 4 === 0) pyro.blast();
  if (p.bar === G.br.b + 1 && G.br.talk) { pyro.flames('all', 1.4); confetti.burst(Q === 'low' ? 500 : 1200); G.blind = 1; G.burst = 1.6; G.shake = 1.4; }
  if (p.bar % 8 === 0) G.madGlow = 1;
}

function onBeat(p) {
  const strong = p.kind === 'high' ? 1 : p.kind === 'mid' ? 0.75 : 0.35;
  G.flash = Math.max(G.flash, p.on * 0.6 * strong);
  if (p.kick > 0.45 && !p.breakdown) G.domeFlash = Math.max(G.domeFlash, p.kick * strong);
  if (p.kind !== 'low' && !p.breakdown) G.pump = Math.max(G.pump, (p.kind === 'high' ? 1 : 0.6) * (0.5 + 0.5 * Math.max(p.kick, p.on)));
  if (p.kind === 'high' && p.kick > 0.4) G.shake = Math.max(G.shake, 0.5);
  if (p.kind === 'high' && p.bar % 8 === 7) pyro.flames(p.inBar % 2 ? 'odd' : 'even', 0.25);
  if (p.inBar === 0 && p.kind !== 'low') {
    G.haze = Math.min(1, G.haze + 0.03);
    clergy.kick(0.35);
    for (const sx of [-2.4, 2.4]) smoke.emit(new THREE.Vector3(HALL.xc + sx, STAGE.h + 0.3, HALTAR.z + 0.4), Q === 'low' ? 4 : 7, { vel: { x: -sx * 0.06, y: 0.8, z: 0.5 }, jitter: 0.3, life: 6, size: 0.32, grow: 0.6, opacity: 0.14 });
  }
}

const tmpCol = new THREE.Color(), dayCol = new THREE.Color(0xe6eefc), goldCol = new THREE.Color(1, 0.85, 0.55), white = new THREE.Color(1, 1, 1);
const pipeCol = new THREE.Color();
function updateShow(dt, now) {
  const U = church.uniforms;
  const p = program(now);
  let beat = G.t / 0.6, R = 0;
  if (p) {
    beat = p.bf;
    if (!p.intro && p.bar !== G.lastBar) { G.lastBar = p.bar; onBar(p); }
    if (!p.intro && p.bi !== G.lastBeat) { G.lastBeat = p.bi; onBeat(p); }
    R = p.breakdown ? 0.55 : p.pre ? 0.6 : { low: 0.62, mid: 0.85, high: 1 }[p.kind];
    G.E = damp(G.E, clamp(p.e * 0.6 + (p.kind === 'high' ? 0.4 : p.kind === 'mid' ? 0.25 : 0), 0, 1), 3, dt);
  } else G.E = damp(G.E, 0, 1, dt);
  G.R = damp(G.R, R, p ? 1.6 : 0.5, dt);
  G.dark = damp(G.dark, G.songOn ? 1 : 0, G.songOn ? 0.55 : 0.4, dt);
  G.pump = damp(G.pump, 0, 9, dt);
  G.blind = damp(G.blind, 0, 2.8, dt);
  blinders.set(G.blind + (G.strobeOn ? 0.6 : 0));
  const beatPhase = p ? p.beatPhase : (G.t / 0.6) % 1;
  G.ledMix = damp(G.ledMix, p ? 0.95 * Math.min(1, G.R * 1.2) : 0, 2, dt);
  U.uTime.value = G.t;
  U.uBeat.value = beat;
  U.uLed.value = G.ledMix;
  let pal = DEEP;
  if (p) {
    let mode;
    if (p.breakdown) { mode = 5; pal = DEEP; }
    else if (p.kind === 'low') { mode = 5; pal = PALS[(p.phrase + 2) % PALS.length]; }
    else if (p.kind === 'mid') { mode = [2, 4][p.phrase % 2]; pal = PALS[p.phrase % PALS.length]; }
    else { mode = p.bar % 8 === 7 ? 3 : [3, 2, 4][p.phrase % 3]; pal = PALS[p.phrase % PALS.length]; }
    U.uMode.value = mode;
    const k = Math.max(0, Math.floor(p.bar / 2));
    U.uColA.value.set(pal[k % 3]); U.uColB.value.set(pal[(k + 1) % 3]); U.uColC.value.set(pal[(k + 2) % 3]);
  }
  A.levels(G.levels);
  for (let i = 0; i < 8; i++) U.uLevels.value[i] = G.levels[i];
  const strobe = !!(p && p.kind === 'high' && p.bar % 8 >= 6);
  const strobeOn = strobe && ((beat % 1) + 1) % 1 < 0.16;
  G.strobeOn = strobeOn;
  const textOn = !!(p && !p.breakdown && ((p.kind === 'high' && p.phrase % 2 === 1 && p.bar % 8 < 6) || G.drops.has(p.bar)));
  if (textOn) {
    const words = ['AMEN', 'ALLELUJA', 'GLORIA', SONGS[G.song].tv];
    const w = words[(p.phrase + (G.drops.has(p.bar) ? 0 : 1)) % words.length];
    if (w !== G.word) { G.word = w; U.uText.value = wordTex(w); }
    U.uTextOff.value = -((beat * 0.035) % 1);
  }
  G.text = damp(G.text, textOn ? 1 : 0, 8, dt);
  U.uTextOn.value = G.text;
  G.flash = damp(G.flash, 0, 8, dt);
  G.burst = damp(G.burst, 0, 1.4, dt);
  U.uFlash.value = G.flash * 0.18 + G.burst * 0.15 + G.pump * 0.1 + (strobeOn ? 0.7 : 0) + G.blind * 0.35;
  G.cross = damp(G.cross, p && p.breakdown ? 0.95 : 0, p && p.breakdown ? 0.5 : 1.5, dt);
  U.uCross.value = G.cross;
  const dayGain = lerp(1, 0.03, G.dark) * (1 - 0.3 * G.cross);
  U.uDayGain.value = dayGain;
  stage.sun.intensity = 11 * Math.max(0.0, 1 - G.dark * 1.05);
  tmpCol.copy(U.uColA.value).lerp(U.uColB.value, 0.5);
  stage.walls.forEach((l, i) => {
    l.color.copy(dayCol).lerp(tmpCol, G.ledMix * 0.9);
    l.intensity = stage.wallBase[i] * (dayGain * 0.9 + G.ledMix * 0.45 * (0.35 + 0.65 * G.levels[1]) + G.flash * 0.3 + G.pump * 0.45 + (strobeOn ? 1.8 : 0) + G.blind * 1.4);
  });
  stage.hemi.intensity = 0.55 * lerp(1, 0.08, G.dark) + (strobeOn ? 0.9 : 0) + G.blind * 0.7 + G.pump * 0.05;
  scene.environmentIntensity = 0.55 * lerp(1, 0.18, G.dark);
  G.domeFlash = damp(G.domeFlash, 0, 7, dt);
  const domeU = church.hall.dome.winMat.uniforms;
  domeU.uGlow.value = dayGain * 0.9 + G.domeFlash * 1.6 + G.cross * 1.6 + G.burst;
  domeU.uTint.value.copy(dayCol).lerp(tmpCol, G.ledMix * 0.7).lerp(goldCol, G.cross);
  church.dome.winMat.uniforms.uGlow.value = dayGain * 0.9 + G.domeFlash * 0.8 + G.cross;
  church.dome.winMat.uniforms.uTint.value.copy(domeU.uTint.value);
  stage.domeLight.intensity = 30 * (dayGain + G.domeFlash * 1.2 + G.cross * 1.5 + G.burst);
  stage.chapelDome.intensity = 6 * (dayGain + G.cross);
  const kindI = !p ? 0 : p.breakdown ? 0.25 : { low: 0.5, mid: 0.85, high: 1 }[p.kind];
  const showI = G.R * kindI * (1 + G.pump * 0.35);
  const prog = {
    pattern: !p ? 0 : p.breakdown ? 3 : p.kind === 'low' ? 0 : p.kind === 'mid' ? 1 : 2,
    intensity: showI, haze: G.haze, strobe, colors: [U.uColA.value.clone(), U.uColB.value.clone(), U.uColC.value.clone()],
  };
  heads.update(dt, G.t, beat, prog);
  stage.spots.forEach((sp, i) => {
    const h = heads.heads[i * 3];
    sp.position.copy(h.base);
    sp.target.position.copy(h.base).addScaledVector(h.dir, 8);
    sp.color.copy(h.color);
    sp.intensity = showI * 80 * (strobe && !strobeOn ? 0.2 : 1);
  });
  const lI = !p ? 0 : p.breakdown ? 0 : p.kind === 'high' ? 1 : p.kind === 'mid' ? 0.55 : 0.2;
  lasers.update(G.t, beat, { intensity: 0.7 * lI * G.R * (strobe && !strobeOn ? 0.25 : 1) * (1 + G.pump * 0.4), haze: G.haze, mode: !p ? 0 : p.kind === 'low' ? 3 : p.kind === 'mid' ? (p.phrase % 2 ? 4 : 0) : [0, 1, 2, 4][p.bar % 4] });
  pyro.curtain = damp(pyro.curtain, p && p.kind === 'high' && !p.breakdown && p.phrase % 2 === 1 ? 1 : 0, 3, dt);
  pyro.update(dt, p && p.kind === 'high' && !p.breakdown && (p.phrase % 2 === 0 || p.bar % 8 >= 6) ? 1 : 0);
  confetti.update(dt, G.t);
  bota.target = !G.songOn ? 0.12 : p && p.breakdown ? 1.15 : { low: 0.42, mid: 0.68, high: 0.95 }[p ? p.kind : 'low'];
  bota.update(dt, G.t);
  const discoI = !p ? 0 : p.breakdown ? 1 : p.kind === 'low' ? 0.8 : p.kind === 'mid' ? 0.45 : 0.2;
  disco.update(dt, discoI * G.R, p && p.breakdown ? goldCol : white);
  const org = church.hall.organ;
  org.info.forEach((pi, i) => {
    const lv = G.levels[pi.band] || 0;
    pipeCol.set(pal[i % 3]).multiplyScalar((0.15 + lv * 3) * G.ledMix + G.cross * 0.6);
    org.glow.setColorAt(i, pipeCol);
  });
  org.glow.instanceColor.needsUpdate = true;
  const dk = church.hall.decks;
  dk.group.visible = G.songOn;
  for (const pl of dk.platters) pl.rotation.y -= dt * 3.5;
  stage.altarSpot.intensity = G.cross * 110 + G.burst * 40;
  G.madGlow = damp(G.madGlow, 0, 2.5, dt);
  church.altar.madonna.material.emissiveIntensity = G.madGlow * 0.5 + G.cross * 0.5;
  church.mosaic.material.emissiveIntensity = G.cross * 0.4 + G.madGlow * 0.15;
  G.haze = damp(G.haze, 0.12 + G.R * 0.45, 0.3, dt);
  beams.uniforms.uHaze.value = (0.35 + G.haze * 1.6) * (stage.sun.intensity / 11);
  beams.uniforms.uTime.value = G.t;
  smoke.uniforms.uTint.value.setRGB(0.9, 0.88, 0.86).lerp(tmpCol, G.ledMix * 0.6);
  smoke.uniforms.uLight.value = 0.25 + 0.45 * dayGain + showI * 0.3 + (strobeOn ? 0.4 : 0);
  glitter.active = (p && !p.breakdown && ((p.kind === 'high' && p.phrase >= 2) || (p.bar > G.br.b && p.bar <= G.br.b + 8))) || G.burst > 0.5 ? 1 : 0;
  for (const f of church.flames) f.scale.set(1, 2.2 + Math.sin(G.t * 23 + f.id) * 0.3, 1);
  return { beat, beatPhase, p };
}

function updateMood(dt, s) {
  const M = crowd.mood;
  const p = s.p;
  const set = (o) => { for (const k of Object.keys(M)) M[k] = o[k] ?? 0; };
  if (p) {
    if (p.breakdown) set({ stand: 1, sway: 0.4, raise: 0.95, worship: 1 });
    else if (p.pre && p.bar < 2) set({ stand: 0, sway: 0.4, clap: 0.2 });
    else if (p.kind === 'low') set({ stand: 1, sway: 0.7, raise: 0.3, clap: 0.15, worship: 0.3 });
    else if (p.kind === 'mid') set({ stand: 1, sway: 1, clap: 0.85, jump: 0.3, headbang: 0.2, raise: 0.2 });
    else set({ stand: 1, sway: 1, jump: 1, mosh: 1, raise: 0.8 + G.burst * 0.2, headbang: 0.6, clap: 0.2 });
  } else {
    const after = G.part === 'Rozesłanie';
    set({ stand: after ? 1 : 0, clap: after ? 1 : 0, sleep: G.part === 'Przed mszą' ? 0.5 : 0 });
  }
  if (p) {
    let spot = 'dj', mode = 'dj';
    if (p.breakdown) mode = p.bar >= G.br.a + 1 ? 'elev' : 'orans';
    else if (p.kind === 'high' && !p.pre) { spot = 'break'; mode = 'breakdance'; }
    if (clergy.mode !== mode) clergy.mode = mode;
    G.priestSpot = spot;
  } else G.priestSpot = 'dj';
  const root = clergy.priestRoot;
  if (root) {
    const t = G.priestSpot === 'break' ? PRIEST_BREAK : PRIEST_DJ;
    const dx = t.x - root.position.x, dz = t.z - root.position.z, d = Math.hypot(dx, dz);
    const step = Math.min(d, dt * 2.2);
    if (d > 0.01) { root.position.x += (dx / d) * step; root.position.z += (dz / d) * step; }
    root.rotation.y = t.yaw;
  }
}

const titleCam = (t) => [new THREE.Vector3(HALL.xc + Math.sin(t * 0.07) * 1.6, 2.3 + Math.sin(t * 0.11) * 0.15, 7.4), new THREE.Vector3(HALL.xc + Math.sin(t * 0.05) * 1.5, 3.0, -10.5)];
let intro = 0;
const _from = new THREE.Vector3(), _dir = new THREE.Vector3();
function updateCamera(dt, s) {
  const cam = stage.camera;
  if (debugView) {
    const v = VIEWS[debugView] || VIEWS.hall;
    cam.position.set(...v[0]);
    cam.lookAt(new THREE.Vector3(...v[1]));
    return;
  }
  if (G.state !== 'play') {
    const [p, l] = titleCam(G.t);
    cam.position.copy(p);
    cam.lookAt(l);
    return;
  }
  player.update(dt, G.t, s.beatPhase, s.p ? G.R : 0);
  if (intro < 1) {
    intro = Math.min(1, intro + dt / 2.2);
    const k = intro * intro * (3 - 2 * intro);
    const [p, l] = titleCam(G.t);
    cam.getWorldDirection(_dir);
    const target = cam.position.clone().add(_dir);
    _from.copy(cam.position);
    cam.position.lerpVectors(p, _from, k);
    cam.lookAt(l.lerp(target, k));
  }
  G.shake = damp(G.shake, 0, 6, dt);
  if (!G.baseFov) G.baseFov = cam.fov;
  if (Math.abs(cam.aspect - (G.lastAspect || 0)) > 1e-3) { G.lastAspect = cam.aspect; G.baseFov = cam.fov; }
  cam.fov = G.baseFov - G.pump * 2.4 - G.burst * 1.5;
  cam.updateProjectionMatrix();
  stage.bloom.strength = 0.16 + G.pump * 0.07 + G.burst * 0.1 + G.blind * 0.12;
  if (G.shake > 0.01) {
    const a = G.shake * 0.045;
    cam.position.x += (Math.random() - 0.5) * a;
    cam.position.y += (Math.random() - 0.5) * a;
    cam.rotation.z += (Math.random() - 0.5) * a * 0.3;
  }
}

function updateHud() {
  let html = '';
  if (player.mode === 'sitting') html = touchDevice ? '' : '<kbd>E</kbd>Wstań';
  else if (player.mode === 'walk') {
    const seat = player.nearestSeat();
    G.canSit = !!seat;
    if (seat && !touchDevice) html = '<kbd>E</kbd>Usiądź';
  }
  if (html !== G.actHtml) { G.actHtml = html; $('act').innerHTML = html; $('act').classList.toggle('on', !!html); }
  const seatLbl = player.mode === 'sitting' ? 'Wstań' : 'Usiądź';
  const sb = $('seatBtn');
  if (sb.textContent !== seatLbl) sb.textContent = seatLbl;
  sb.classList.toggle('ready', player.mode === 'sitting' || !!G.canSit);
  body.classList.toggle('unlocked', !player.locked);
}

const clock = new THREE.Clock();
let fpsT = 0, fpsN = 0;
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  G.t += dt;
  if (G.pendingPR) { stage.setPixelRatio(G.pendingPR); G.pendingPR = 0; }
  const now = A.ctx ? A.now - A.latency : 0;
  if (A.ctx) {
    for (let i = G.waiters.length - 1; i >= 0; i--) {
      const w = G.waiters[i];
      if (A.now >= w.t || (w.cond && w.cond())) { G.waiters.splice(i, 1); w.res(); }
    }
    bedTick();
  }
  const s = updateShow(dt, now);
  updateMood(dt, s);
  crowd.update(dt, G.t, s.beat, s.beatPhase, G.E);
  clergy.voice = A.ctx ? A.voiceLevel() : 0;
  clergy.update(dt, G.t, s.beat, s.beatPhase, G.E);
  if (Math.random() < dt * 9) smoke.emit(clergy.censerPos, 1, { vel: { x: 0, y: 0.3, z: 0.05 }, jitter: 0.08, life: 6, size: 0.09, grow: 0.45, opacity: 0.22 });
  smoke.update(dt, G.t);
  glitter.update(dt, G.t);
  updateCamera(dt, s);
  if (G.state === 'play') updateHud();
  stage.render();
  fpsN++; fpsT += dt;
  if (fpsT > 1.5) {
    const fps = fpsN / fpsT;
    window.__gl.fps = fps;
    fpsN = 0; fpsT = 0;
    if (!debugView && G.state === 'play') {
      if (fps < 47 && stage.pixelRatio > 0.65) { G.pendingPR = Math.max(0.65, stage.pixelRatio - 0.1); G.goodN = 0; G.lastDrop = G.t; }
      else if (fps > 58 && stage.pixelRatio < stage.maxPR && G.t - (G.lastDrop || -99) > 12) { G.goodN = (G.goodN || 0) + 1; if (G.goodN > 3) { G.goodN = 0; G.pendingPR = Math.min(stage.maxPR, stage.pixelRatio + 0.05); } }
      else G.goodN = 0;
    }
  }
  requestAnimationFrame(frame);
}
frame();
