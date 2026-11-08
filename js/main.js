// Gloria: a Mass that turns into a rave. Walk the chapel, sit anywhere; the priest, the light and Ameno do the rest.
import * as THREE from 'three';
import { Stage, pickQuality, TO_SUN } from './stage.js';
import { Congregation, Clergy } from './people.js';
import { Smoke, SunBeams, ShowLights, Glitter } from './fx.js';
import { AudioEngine } from './audio.js';
import { Player } from './player.js';
import { clamp, lerp, damp } from './util.js';

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
const PALS = [
  ['#7a3cff', '#2f8cff', '#ff4fd8'],
  ['#ffb02e', '#ff4fd8', '#6b5cff'],
  ['#00c8ff', '#8a5cff', '#ffffff'],
  ['#ff8a2e', '#ffd36b', '#ff3fae'],
  ['#3f6bff', '#00e0c8', '#ffe38a'],
];
const DEEP = ['#3a2cff', '#8a3cff', '#1f7bff'];

const params = new URLSearchParams(location.search);
const AM = await fetch('assets/ameno.json').then((r) => r.json());
let bLow = 0, bEnd = 0;
{
  let best = 0;
  for (let i = 50; i < AM.bars.length; i++) {
    if (AM.bars[i] !== 'low') continue;
    let j = i;
    while (j + 1 < AM.bars.length && AM.bars[j + 1] === 'low') j++;
    if (j - i > best) { best = j - i; bLow = i; bEnd = j; }
    i = j;
  }
}

const canvas = document.getElementById('gl');
const stage = new Stage(canvas, pickQuality());
const scene = stage.scene;
const church = stage.church;
const crowd = new Congregation(scene, stage.quality);
const clergy = new Clergy(scene);
const smoke = new Smoke(scene, stage.quality === 'low' ? 320 : 520);
const beams = new SunBeams(scene, church.lattice.slots.filter((sl) => stage.quality === 'high' || (sl.col + sl.k) % 2 === 0), TO_SUN);
const show = new ShowLights(scene);
const glitter = new Glitter(scene, stage.quality === 'low' ? 220 : 420);
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
  state: 'title', t: 0, R: 0, E: 0, haze: 0.12, flash: 0, domeFlash: 0, madGlow: 0, cross: 0, ledMix: 0,
  songOn: false, songStart: 0, lastBeat: -1, waiters: [], bed: null, runId: 0, levels: new Array(8).fill(0),
  part: '', burst: 0,
};
window.__gl = { stage, G, A, crowd, clergy, player, AM, ready: false, THREE };

const VIEWS = {
  photo1: [[-1.55, 1.04, 1.25], [-4.0, 2.0, 0.0]],
  photo13: [[-0.75, 1.04, 1.25], [0.35, 2.1, -5.6]],
  back: [[0.2, 1.75, 6.1], [0, 1.6, -5]],
  altar: [[0.5, 1.6, -2.0], [0, 1.8, -5.5]],
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
  if (mode && !o.keepMode) clergy.mode = G.songOn ? 'dance' : 'idle';
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

const barT = (b) => G.songStart + AM.t0 + b * 4 * AM.T;

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
    await wait(4);
    if (!alive()) return;
    A.play('bell', A.now, { bus: A.sfx, gain: 0.75 });
    await wait(4);
    if (!alive()) return;
    A.loopGain('chatter', 0.0001, 3.5);
    await wait(2);
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
  const off = +(params.get('at') || 0);
  const start = A.now + 0.35;
  A.playSong(start, off);
  G.songStart = start - off;
  G.songOn = true;
  G.lastBeat = -1;
  setPart('II', 'Ameno');
  tv('AMENO', 'Uwielbienie');
  clergy.mode = 'dance';
  const s0 = G.songStart;
  const at = (t, fn) => { if (t > A.now + 0.05) A.at(t, fn); };
  at(s0 + AM.t0 - 4.6, () => say('p_gloria', 'hype', { duck: 0.55 }));
  at(barT(0), () => { A.play('cheer', A.now, { bus: A.crowd, gain: 0.45 }); G.burst = 1; });
  at(barT(16) - 0.5, () => say('p_alleluja', 'hype', { shout: true, duck: 0.7 }));
  at(barT(36), () => { A.voiceLine('c_amen3', A.now, { gain: 1.1 }); subtitle(TEXT.c_amen3, 'Wierni:'); setTimeout(() => subtitle(null), 1800); });
  at(barT(44) - 0.5, () => say('p_glosniej', 'hype', { shout: true, duck: 0.7 }));
  at(barT(56) - 0.5, () => say('p_jeszcze', 'hype', { shout: true, duck: 0.7 }));
  at(barT(bLow) + 0.4, () => { setPart('III', 'Cisza'); tv('Cisza', 'Przeistoczenie'); say('p_cisza', 'orans', { duck: 0.35 }); });
  at(barT(bLow) + 5, () => { clergy.mode = 'elev'; });
  for (const k of [1, 3, 5]) at(barT(bLow + k), () => { for (const [r, d] of [[1, 0], [1.122, 0.07], [1.26, 0.13]]) A.play('sanctus', A.now + d, { bus: A.sfx, gain: 0.22, rate: r }); });
  at(barT(bEnd + 1) - A.dur('p_wstancie') - 0.3, () => { clergy.mode = 'orans'; say('p_wstancie', 'orans', { duck: 0.45 }); });
  at(barT(bEnd + 1), () => { setPart('IV', 'Uwielbienie'); tv('ALLELUJA', 'Wszyscy'); A.play('cheer', A.now, { bus: A.crowd, gain: 0.6 }); G.burst = 1.5; clergy.mode = 'dance'; });
  at(barT(bEnd + 5) - 0.5, () => say('p_alleluja', 'hype', { shout: true, duck: 0.7 }));
  await until(G.songStart + AM.end);
  if (!alive()) return;
  G.songOn = false;
  setPart('V', 'Rozesłanie');
  A.play('applause', A.now, { bus: A.crowd, gain: 0.7 });
  A.play('cheer', A.now + 0.3, { bus: A.crowd, gain: 0.45 });
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

async function enter() {
  if (G.state !== 'title') return;
  G.state = 'starting';
  $('start').disabled = true;
  $('start').textContent = 'Wchodzimy…';
  try { await A.start(); } catch (e) { console.error(e); $('start').textContent = 'Dźwięk nie ruszył, kliknij jeszcze raz'; $('start').disabled = false; G.state = 'title'; return; }
  $('title').classList.add('hidden');
  body.classList.add('playing');
  G.state = 'play';
  player.enabled = true;
  if (!touchDevice && !params.has('autostart') && canvas.requestPointerLock) { try { canvas.requestPointerLock(); } catch (e) {} }
  mass(params.has('skip')).catch((e) => console.error(e));
}
$('start').addEventListener('click', enter);
window.addEventListener('keydown', (e) => { if (G.state === 'title' && (e.key === 'Enter' || e.key === ' ') && !$('start').disabled) enter(); });
$('mute').addEventListener('click', () => { A.setMuted(!A.muted); $('mute').classList.toggle('off', A.muted); });
$('again').addEventListener('click', () => { mass(false); });
$('seatBtn').addEventListener('click', () => player.toggleSeat());
$('jumpBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); player.jump(); });

const loaded = { audio: false, gfx: false };
A.prefetch((p) => { $('loadbar').firstChild.style.width = Math.round(p * 80) + '%'; }).then(() => { loaded.audio = true; maybeReady(); });
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
  const sp = now - G.songStart;
  if (sp < 0) return null;
  const bf = (sp - AM.t0) / AM.T;
  const intro = bf < 0;
  const bi = intro ? -1 : Math.min(AM.n - 1, Math.floor(bf));
  const bar = intro ? -1 : Math.floor(bi / 4);
  const kind = intro ? 'intro' : AM.bars[Math.min(bar, AM.bars.length - 1)] || 'low';
  const breakdown = !intro && bar >= bLow && bar <= bEnd;
  return {
    sp, bf, bi, bar, kind, breakdown, intro,
    e: intro ? 0.25 : AM.e[bi], kick: intro ? 0 : AM.k[bi], on: intro ? 0 : AM.o[bi],
    phrase: intro ? -1 : Math.floor(bar / 8), beatPhase: intro ? (sp / 2.4) % 1 : ((bf % 1) + 1) % 1, introT: intro ? sp / AM.t0 : 1,
  };
}

function onBeat(p) {
  const strong = p.kind === 'high' ? 1 : p.kind === 'mid' ? 0.75 : 0.35;
  G.flash = Math.max(G.flash, p.on * 0.55 * strong);
  if (p.kick > 0.45 && !p.breakdown) G.domeFlash = Math.max(G.domeFlash, p.kick * strong);
  if (p.bi % 4 === 0 && p.kind !== 'low') {
    G.haze = Math.min(1, G.haze + 0.03);
    clergy.kick(0.3);
    for (const sx of [-1.3, 1.3]) smoke.emit(new THREE.Vector3(sx, 0.4, -4.45), stage.quality === 'low' ? 4 : 6, { vel: { x: -sx * 0.1, y: 0.75, z: 0.3 }, jitter: 0.25, life: 6, size: 0.26, grow: 0.5, opacity: 0.14 });
  }
  if (p.bi % 32 === 0) G.madGlow = 1;
}

const tmpCol = new THREE.Color(), dayCol = new THREE.Color(0xe6eefc), goldCol = new THREE.Color(1, 0.85, 0.55);
function updateShow(dt, now) {
  const U = church.uniforms;
  const p = program(now);
  let beat = G.t / 0.6, R = 0;
  if (p) {
    beat = p.intro ? p.sp / 0.6 : p.bf;
    if (!p.intro && p.bi !== G.lastBeat) { G.lastBeat = p.bi; onBeat(p); }
    R = p.intro ? 0.15 + 0.45 * p.introT : p.breakdown ? 0.5 : { low: 0.55, mid: 0.85, high: 1 }[p.kind];
    G.E = damp(G.E, p.intro ? 0.3 : clamp(p.e * 0.6 + (p.kind === 'high' ? 0.4 : p.kind === 'mid' ? 0.25 : 0), 0, 1), 3, dt);
  } else G.E = damp(G.E, 0, 1, dt);
  G.R = damp(G.R, R, p ? 1.6 : 0.5, dt);
  const beatPhase = p ? p.beatPhase : (G.t / 0.6) % 1;
  const ledT = p ? (p.intro ? 0.35 + 0.35 * p.introT : 0.95) * Math.min(1, G.R * 1.2) : 0;
  G.ledMix = damp(G.ledMix, ledT, 2, dt);
  U.uTime.value = G.t;
  U.uBeat.value = beat;
  U.uLed.value = G.ledMix;
  if (p) {
    let mode, pal;
    if (p.intro) { mode = 1; pal = DEEP; }
    else if (p.breakdown) { mode = 5; pal = DEEP; }
    else if (p.kind === 'low') { mode = 5; pal = PALS[(p.phrase + 2) % PALS.length]; }
    else if (p.kind === 'mid') { mode = [2, 4][p.phrase % 2]; pal = PALS[p.phrase % PALS.length]; }
    else { mode = p.bar % 8 === 7 ? 3 : [3, 2, 4][p.phrase % 3]; pal = PALS[p.phrase % PALS.length]; }
    U.uMode.value = mode;
    const k = Math.max(0, Math.floor(p.bar / 2));
    U.uColA.value.set(pal[k % 3]); U.uColB.value.set(pal[(k + 1) % 3]); U.uColC.value.set(pal[(k + 2) % 3]);
  }
  A.levels(G.levels);
  for (let i = 0; i < 8; i++) U.uLevels.value[i] = G.levels[i];
  G.flash = damp(G.flash, 0, 8, dt);
  G.burst = damp(G.burst, 0, 1.5, dt);
  U.uFlash.value = G.flash * 0.3 + G.burst * 0.25;
  G.cross = damp(G.cross, p && p.breakdown ? 0.9 : 0, p && p.breakdown ? 0.5 : 1.5, dt);
  U.uCross.value = G.cross;
  const dayGain = lerp(1, 0.07, G.R) * (1 - 0.3 * G.cross);
  U.uDayGain.value = dayGain;
  stage.sun.intensity = 11 * Math.max(0.03, 1 - G.R * 1.15);
  tmpCol.copy(U.uColA.value).lerp(U.uColB.value, 0.5);
  stage.walls.forEach((l, i) => {
    l.color.copy(dayCol).lerp(tmpCol, G.ledMix * 0.9);
    l.intensity = stage.wallBase[i] * (dayGain * 0.9 + G.ledMix * 0.75 * (0.6 + 0.4 * G.levels[1]) + G.flash * 0.7);
  });
  stage.hemi.intensity = 0.55 * lerp(1, 0.25, G.R);
  stage.scene.environmentIntensity = 0.55 * lerp(1, 0.35, G.R);
  G.domeFlash = damp(G.domeFlash, 0, 7, dt);
  church.dome.winMat.uniforms.uGlow.value = dayGain * 0.9 + G.domeFlash * 1.6 + G.cross * 1.4 + G.burst;
  church.dome.winMat.uniforms.uTint.value.copy(dayCol).lerp(tmpCol, G.ledMix * 0.7).lerp(goldCol, G.cross);
  stage.domeLight.intensity = 6 * (dayGain + G.domeFlash * 1.4 + G.cross * 1.5 + G.burst);
  const showI = p ? G.R * (p.intro ? 0.35 : p.breakdown ? 0.25 : { low: 0.5, mid: 0.85, high: 1 }[p.kind]) : 0;
  const prog = {
    pattern: !p || p.intro || p.kind === 'low' ? 0 : p.kind === 'mid' ? 1 : 2,
    intensity: showI, haze: G.haze, strobe: !!(p && p.kind === 'high' && p.bar % 8 === 7), flash: G.domeFlash > 0.5,
    colors: [U.uColA.value.clone(), U.uColB.value.clone(), U.uColC.value.clone()], ray: G.cross * 1.5 + G.burst * 0.5,
  };
  if (p && p.breakdown) prog.pattern = 3;
  show.update(dt, G.t, beat, prog);
  stage.spots.forEach((sp, i) => {
    const h = show.heads[i * 3];
    sp.position.copy(h.base);
    if (h.dir) sp.target.position.copy(h.base).addScaledVector(h.dir, 6);
    sp.color.copy(h.color);
    sp.intensity = showI * 55;
  });
  stage.altarSpot.intensity = G.cross * 60 + G.burst * 20;
  G.madGlow = damp(G.madGlow, 0, 2.5, dt);
  church.altar.madonna.material.emissiveIntensity = G.madGlow * 0.5 + G.cross * 0.5;
  church.mosaic.material.emissiveIntensity = G.cross * 0.4 + G.madGlow * 0.15;
  G.haze = damp(G.haze, 0.12 + G.R * 0.5, 0.3, dt);
  beams.uniforms.uHaze.value = (0.35 + G.haze * 1.6) * (stage.sun.intensity / 11);
  beams.uniforms.uTime.value = G.t;
  smoke.uniforms.uTint.value.setRGB(0.9, 0.88, 0.86).lerp(tmpCol, G.ledMix * 0.6);
  smoke.uniforms.uLight.value = 0.3 + 0.45 * dayGain + showI * 0.45;
  glitter.active = p && !p.intro && ((p.kind === 'high' && p.bar >= 40) || (p.bar > bEnd && p.bar <= bEnd + 10)) ? 1 : 0;
  for (const f of church.flames) f.scale.set(1, 2.2 + Math.sin(G.t * 23 + f.id) * 0.3, 1);
  return { beat, beatPhase, p };
}

function updateMood(dt, s) {
  const M = crowd.mood;
  const p = s.p;
  if (p) {
    const k = p.intro ? 'intro' : p.breakdown ? 'cross' : p.kind;
    M.stand = p.intro && p.introT < 0.3 ? 0 : 1;
    M.kneel = 0;
    M.sleep = 0;
    M.sway = { intro: 0.35, cross: 0.4, low: 0.7, mid: 1, high: 1 }[k];
    M.clap = { intro: 0, cross: 0, low: 0.2, mid: 0.85, high: 0.35 }[k];
    M.raise = { intro: 0.1, cross: 0.95, low: 0.35, mid: 0.25, high: 0.85 }[k] + G.burst * 0.5;
    M.jump = k === 'high' ? 1 : 0;
    M.peace = 0;
  } else {
    const after = G.part === 'Rozesłanie';
    M.stand = after ? 1 : 0;
    M.kneel = 0;
    M.sleep = G.part === 'Przed mszą' ? 0.6 : 0;
    M.sway = 0; M.clap = after ? 1 : 0; M.raise = 0; M.jump = 0; M.peace = 0;
  }
}

const titleCam = (t) => [new THREE.Vector3(0.9 + Math.sin(t * 0.07) * 0.5, 1.8 + Math.sin(t * 0.11) * 0.1, 5.6), new THREE.Vector3(-0.4 + Math.sin(t * 0.05) * 0.6, 1.9, -5.5)];
let intro = 0;
const _from = new THREE.Vector3(), _dir = new THREE.Vector3();
function updateCamera(dt, s) {
  const cam = stage.camera;
  if (debugView) {
    const v = VIEWS[debugView] || VIEWS.back;
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
  crowd.update(dt, G.t, s.beat, s.beatPhase);
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
      if (fps < 50 && stage.pixelRatio > 0.7) stage.setPixelRatio(Math.max(0.7, stage.pixelRatio - 0.1));
      else if (fps > 58.5 && stage.pixelRatio < stage.maxPR) { G.goodN = (G.goodN || 0) + 1; if (G.goodN > 3) { G.goodN = 0; stage.setPixelRatio(Math.min(stage.maxPR, stage.pixelRatio + 0.05)); } }
    }
  }
  requestAnimationFrame(frame);
}
frame();
