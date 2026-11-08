// Gloria humans: GPU-skinned instanced parishioners with beat-driven dancing, plus the priest and the altar server.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const PI = Math.PI;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
const fract = (v) => v - Math.floor(v);
const hash = (n) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const hash2 = (a, b) => fract(Math.sin(a * 127.1 + b * 311.7 + 74.7) * 43758.5453);
const pulse = (ph, k) => Math.exp(-k * ph);
const bump = (ph, a, b) => (ph <= a || ph >= b ? 0 : Math.sin(PI * (ph - a) / (b - a)));
function rng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
function wpick(r, pairs) { let s = 0; for (const p of pairs) s += p[1]; let x = r() * s; for (const p of pairs) { x -= p[1]; if (x <= 0) return p[0]; } return pairs[pairs.length - 1][0]; }

const P = 0, SP = 1, CH = 2, NK = 3, HD = 4, JW = 5;
const CLL = 6, ARL = 7, FOL = 8, HAL = 9, FIL = 10;
const CLR = 11, ARR = 12, FOR = 13, HAR = 14, FIR = 15;
const THL = 16, SHL = 17, FTL = 18, THR = 19, SHR = 20, FTR = 21;
const CFU = 22, CFL = 23, CBU = 24, CBL = 25;
const NB_CROWD = 22, NB_CLERGY = 26;
const PARENT = [-1, 0, 1, 2, 3, 4, 2, 6, 7, 8, 9, 2, 11, 12, 13, 14, 0, 16, 17, 0, 19, 20, 2, 22, 2, 24];
const LIMB = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const BIND = [
  [0, 0.94, 0], [0, 1.04, 0.005], [0, 1.22, 0.01], [0, 1.425, 0.012], [0, 1.52, 0.008], [0, 1.585, 0.0],
  [-0.025, 1.385, 0.0], [-0.18, 1.39, 0.02], [-0.195, 1.1, 0.03], [-0.205, 0.845, 0.012], [-0.207, 0.757, 0.006],
  [0.025, 1.385, 0.0], [0.18, 1.39, 0.02], [0.195, 1.1, 0.03], [0.205, 0.845, 0.012], [0.207, 0.757, 0.006],
  [-0.088, 0.925, 0.0], [-0.092, 0.5, -0.005], [-0.095, 0.085, 0.02],
  [0.088, 0.925, 0.0], [0.092, 0.5, -0.005], [0.095, 0.085, 0.02],
  [0, 1.4, -0.12], [0, 0.98, -0.16], [0, 1.4, 0.13], [0, 0.98, 0.17],
];
const HC = [0, 1.605, -0.008];
const HR = [0.078, 0.109, 0.098];

const S_SKIN = 0, S_HAIR = 1, S_COAT = 2, S_TRIM = 3, S_PANTS = 4, S_LEGS = 5, S_SHOE = 6, S_SOLE = 7, S_INNER = 8, S_HAT = 9, S_SCARF = 10, S_GLASS = 11, S_IRIS = 12, S_LIP = 13, S_HAND = 14, S_EXTRA = 15;
const NSLOT = 16;
const PT = { plain: 0, quilt: 1, knit: 2, skin: 3, hair: 4, curly: 5, leather: 6, cord: 7, chasuble: 8, lace: 9, fur: 10, metal: 11, print: 12, wool: 13, satin: 14, gold: 15 };

class Geo {
  constructor() { this.p = []; this.n = []; this.bi = []; this.bw = []; this.sl = []; this.fc = []; this.ao = []; this.idx = []; }
  get count() { return this.p.length / 3; }
  add(pos, idx, skin, slot, o = {}) {
    const n = pos.length / 3, nr = new Float32Array(n * 3);
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const k of [a, b, c]) { nr[k] += nx; nr[k + 1] += ny; nr[k + 2] += nz; }
    }
    const base = this.count;
    for (let i = 0; i < n; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      let nx = nr[i * 3], ny = nr[i * 3 + 1], nz = nr[i * 3 + 2];
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      if (o.flip) { nx = -nx; ny = -ny; nz = -nz; }
      const sk = typeof skin === 'function' ? skin(x, y, z, i) : skin;
      this.p.push(x, y, z); this.n.push(nx, ny, nz);
      this.bi.push(sk[0], sk.length > 1 ? sk[1] : sk[0]); this.bw.push(sk.length > 2 ? sk[2] : 1);
      this.sl.push(typeof slot === 'function' ? slot(x, y, z, i) : slot);
      this.fc.push(o.face ? 1 : 0);
      this.ao.push(o.ao ? clamp(o.ao(x, y, z, nx, ny, nz), 0.25, 1) : 1);
    }
    if (o.flip) for (let i = 0; i < idx.length; i += 3) this.idx.push(base + idx[i], base + idx[i + 2], base + idx[i + 1]);
    else for (let i = 0; i < idx.length; i++) this.idx.push(base + idx[i]);
  }
  build() {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('aBone', new THREE.Float32BufferAttribute(this.bi, 2));
    g.setAttribute('aW', new THREE.Float32BufferAttribute(this.bw, 1));
    g.setAttribute('aSlot', new THREE.Float32BufferAttribute(this.sl, 1));
    g.setAttribute('aFace', new THREE.Float32BufferAttribute(this.fc, 1));
    g.setAttribute('aAO', new THREE.Float32BufferAttribute(this.ao, 1));
    g.setIndex(this.idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    return g;
  }
}

const se = (v, n) => Math.sign(v) * Math.pow(Math.abs(v), 2 / n);

function loft(rings, seg, axis = 'y', capA = true, capB = true) {
  const pos = [], idx = [];
  const R = rings.length;
  for (let r = 0; r < R; r++) {
    const g = rings[r];
    const n = g.n || 2;
    for (let s = 0; s < seg; s++) {
      const th = (s / seg) * TAU;
      const sn = Math.sin(th), cs = Math.cos(th);
      let m = g.f ? g.f(th, sn, cs) : 1;
      let a = g.rx * se(sn, n) * m, b = g.rz * se(cs, n) * m;
      if (g.fz) b += g.fz(th, sn, cs);
      if (g.fx) a += g.fx(th, sn, cs);
      if (axis === 'y') pos.push(g.c[0] + a, g.c[1], g.c[2] - b);
      else if (axis === 'z') pos.push(g.c[0] + a, g.c[1] + b, g.c[2]);
      else pos.push(g.c[0], g.c[1] + b, g.c[2] - a);
    }
  }
  for (let r = 0; r < R - 1; r++) {
    for (let s = 0; s < seg; s++) {
      const a = r * seg + s, b = r * seg + ((s + 1) % seg), c = (r + 1) * seg + s, d = (r + 1) * seg + ((s + 1) % seg);
      idx.push(a, c, b, b, c, d);
    }
  }
  const cap = (r, dir) => {
    const g = rings[r];
    const ci = pos.length / 3;
    const off = (g.cap || 0) * dir;
    if (axis === 'y') pos.push(g.c[0], g.c[1] + off, g.c[2]);
    else if (axis === 'z') pos.push(g.c[0], g.c[1], g.c[2] + off);
    else pos.push(g.c[0] + off, g.c[1], g.c[2]);
    for (let s = 0; s < seg; s++) {
      const a = r * seg + s, b = r * seg + ((s + 1) % seg);
      if (dir < 0) idx.push(ci, a, b); else idx.push(ci, b, a);
    }
  };
  if (capA) cap(0, -1);
  if (capB) cap(R - 1, 1);
  return [pos, idx];
}

function sphere(nu, nv, fn) {
  const pos = [], idx = [];
  pos.push(...fn(0, 1, 0, 0, PI / 2));
  for (let v = 1; v < nv; v++) {
    const el = PI / 2 - (v / nv) * PI;
    for (let u = 0; u < nu; u++) {
      const az = (u / nu) * TAU;
      const ce = Math.cos(el);
      pos.push(...fn(Math.sin(az) * ce, Math.sin(el), -Math.cos(az) * ce, az, el));
    }
  }
  pos.push(...fn(0, -1, 0, 0, -PI / 2));
  const last = pos.length / 3 - 1;
  for (let u = 0; u < nu; u++) idx.push(0, 1 + ((u + 1) % nu), 1 + u);
  for (let v = 0; v < nv - 2; v++) {
    for (let u = 0; u < nu; u++) {
      const a = 1 + v * nu + u, b = 1 + v * nu + ((u + 1) % nu), c = a + nu, d = b + nu;
      idx.push(a, b, c, b, d, c);
    }
  }
  const lr = 1 + (nv - 2) * nu;
  for (let u = 0; u < nu; u++) idx.push(lr + u, lr + ((u + 1) % nu), last);
  return [pos, idx];
}

function ellipsoid(c, r, nu = 12, nv = 8, warp) {
  return sphere(nu, nv, (x, y, z, az, el) => {
    let p = [c[0] + x * r[0], c[1] + y * r[1], c[2] + z * r[2]];
    if (warp) p = warp(p, x, y, z, az, el);
    return p;
  });
}

function tube(pts, rad, seg = 6, closed = false) {
  const pos = [], idx = [];
  const N = pts.length;
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  let prevN = null;
  for (let i = 0; i < N; i++) {
    const p = V(pts[i]);
    const a = V(pts[closed ? (i - 1 + N) % N : Math.max(0, i - 1)]), b = V(pts[closed ? (i + 1) % N : Math.min(N - 1, i + 1)]);
    const t = b.sub(a).normalize();
    let nn = prevN ? prevN.clone().sub(t.clone().multiplyScalar(prevN.dot(t))) : (Math.abs(t.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).cross(t);
    nn.normalize();
    prevN = nn;
    const bn = t.clone().cross(nn).normalize();
    const r = typeof rad === 'function' ? rad(i / (N - 1)) : rad;
    for (let s = 0; s < seg; s++) {
      const th = (s / seg) * TAU;
      pos.push(p.x + (nn.x * Math.cos(th) + bn.x * Math.sin(th)) * r, p.y + (nn.y * Math.cos(th) + bn.y * Math.sin(th)) * r, p.z + (nn.z * Math.cos(th) + bn.z * Math.sin(th)) * r);
    }
  }
  const rows = closed ? N : N - 1;
  for (let i = 0; i < rows; i++) {
    for (let s = 0; s < seg; s++) {
      const a = i * seg + s, b = i * seg + ((s + 1) % seg), c = ((i + 1) % N) * seg + s, d = ((i + 1) % N) * seg + ((s + 1) % seg);
      idx.push(a, b, c, b, d, c);
    }
  }
  return [pos, idx];
}

function xform(pd, fn) {
  const p = pd[0];
  for (let i = 0; i < p.length; i += 3) { const q = fn(p[i], p[i + 1], p[i + 2]); p[i] = q[0]; p[i + 1] = q[1]; p[i + 2] = q[2]; }
  return pd;
}

function mirrorX(pd) {
  const p = pd[0].slice(), idx = pd[1].slice();
  for (let i = 0; i < p.length; i += 3) p[i] = -p[i];
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  return [p, idx];
}

let LQ = 0;
const sg = (hi, lo) => (LQ ? lo : hi);

function torsoSkin(x, y, z) {
  const ax = Math.abs(x);
  const cl = x < 0 ? CLL : CLR;
  const wc = smooth(0.1, 0.17, ax) * smooth(1.3, 1.38, y) * 0.75;
  if (wc > 0.02) return [cl, CH, wc];
  if (y > 1.415) return [NK, CH, smooth(1.415, 1.47, y)];
  if (y > 1.13) return [CH, SP, smooth(1.13, 1.23, y)];
  if (y > 0.97) return [SP, P, smooth(0.97, 1.07, y)];
  const th = x < 0 ? THL : THR;
  const wt = smooth(0.95, 0.8, y) * smooth(0.015, 0.07, ax) * (z < 0 ? 0.75 : 0.3);
  return [th, P, wt];
}

function torsoAO(x, y, z, nx, ny, nz) {
  const ax = Math.abs(x);
  let a = 1 - 0.28 * smooth(0.11, 0.165, ax) * smooth(1.36, 1.2, y) * smooth(1.0, 1.12, y) * smooth(0.2, 0.9, Math.abs(nx));
  a *= 1 - 0.18 * smooth(0.86, 0.8, y);
  a *= 1 - 0.15 * smooth(1.38, 1.44, y) * smooth(0.1, 0.05, ax);
  return a;
}

const TORSO_RINGS = [
  [0.86, 0.168, 0.112, 0.008, 2.4], [0.92, 0.174, 0.117, 0.007, 2.4], [1.01, 0.161, 0.107, 0.002, 2.4],
  [1.08, 0.159, 0.108, 0, 2.5], [1.16, 0.166, 0.115, -0.002, 2.5], [1.27, 0.176, 0.122, -0.004, 2.65],
  [1.36, 0.18, 0.111, 0.004, 3.0], [1.395, 0.17, 0.095, 0.008, 3.2], [1.418, 0.138, 0.08, 0.01, 2.7], [1.44, 0.088, 0.068, 0.012, 2.2],
];

function torsoPart(G, o = {}) {
  const pad = o.pad || 0;
  const rings = [];
  const y0 = o.y0 ?? 0.86;
  if (o.hem) rings.push({ c: [0, y0 - 0.008, 0.008], rx: 0.168 + pad + 0.016, rz: 0.112 + pad + 0.016, n: 2.4 });
  for (const [y, rx, rz, cz, n] of TORSO_RINGS) {
    if (y < y0 - 1e-4) continue;
    const pp = pad * smooth(1.44, 1.38, y);
    const bust = (o.bust || 0) * Math.exp(-(((y - 1.25) / 0.06) ** 2));
    const belly = (o.belly || 0) * Math.exp(-(((y - 1.08) / 0.09) ** 2));
    rings.push({ c: [0, y, cz], rx: rx + pp, rz: rz + pp, n, fz: (th, sn, cs) => (cs > 0 ? (bust * Math.pow(cs, 3) * Math.pow(1 - sn * sn, 1.5) + belly * cs * cs) : 0) });
  }
  rings[rings.length - 1].cap = 0.012;
  const [pos, idx] = loft(rings, sg(16, 10), 'y', false, true);
  G.add(pos, idx, torsoSkin, o.slot ?? S_COAT, { ao: torsoAO });
}

function pelvisPart(G, o = {}) {
  const rings = [
    { c: [0, 0.79, 0.004], rx: 0.1, rz: 0.075, n: 2.2, cap: 0.012 },
    { c: [0, 0.82, 0.006], rx: 0.145, rz: 0.1, n: 2.3 },
    { c: [0, 0.86, 0.008], rx: 0.158, rz: 0.106, n: 2.4 },
    { c: [0, 0.91, 0.008], rx: 0.162, rz: 0.108, n: 2.4 },
    { c: [0, 0.97, 0.004], rx: 0.163, rz: 0.108, n: 2.4 },
    { c: [0, o.top || 1.03, 0.002], rx: 0.155, rz: 0.102, n: 2.4 },
  ];
  const [pos, idx] = loft(rings, sg(16, 8), 'y', true, false);
  G.add(pos, idx, torsoSkin, o.slot ?? S_PANTS, { ao: torsoAO });
}

function skirtSkin(x, y, z) {
  const th = x < 0 ? THL : THR;
  const t = smooth(0.96, 0.62, y);
  const fr = clamp(-z / 0.11 + 0.35);
  const mid = 0.35 + 0.65 * smooth(0.0, 0.08, Math.abs(x));
  return [th, P, clamp(t * (0.25 + 0.75 * fr) * mid)];
}

function skirtPart(G, o) {
  const yb = o.hem, yt = o.top;
  const rings = [];
  const N = 7;
  for (let i = 0; i <= N; i++) {
    const y = lerp(yb, yt, i / N);
    const k = (y - yb) / (yt - yb);
    const rx = lerp(o.rxB, o.rxT, Math.pow(k, 1.3)), rz = lerp(o.rzB, o.rzT, Math.pow(k, 1.3));
    rings.push({ c: [0, y, lerp(o.czB || 0.01, 0.006, k)], rx, rz, n: 2.3, f: (th, sn, cs) => 1 + (o.fold || 0) * Math.sin(th * 7) * (1 - k) });
  }
  const [pos, idx] = loft(rings, sg(16, 10), 'y', false, false);
  G.add(pos, idx, skirtSkin, o.slot ?? S_COAT, { ao: (x, y) => 1 - 0.15 * smooth(yb + 0.08, yb, y) });
}

function legPart(G, side, o = {}) {
  const sx = side;
  const tr = o.trousers !== false;
  const R = tr
    ? [[0.07, 0.052], [0.2, 0.055], [0.36, 0.059], [0.46, 0.06], [0.52, 0.06], [0.6, 0.065], [0.75, 0.077], [0.9, 0.088], [0.98, 0.09]]
    : [[0.075, 0.037], [0.14, 0.04], [0.26, 0.05], [0.36, 0.056], [0.45, 0.053], [0.52, 0.05], [0.6, 0.057], [0.75, 0.071], [0.9, 0.085], [0.98, 0.088]];
  const rings = R.map(([y, r]) => {
    const boot = o.boot && y < o.boot ? 0.009 : 0;
    const x = sx * lerp(0.097, 0.088, smooth(0.08, 0.93, y));
    const z = y < 0.5 ? lerp(0.012, -0.004, smooth(0.08, 0.5, y)) : -0.004 * smooth(0.98, 0.5, y);
    const calf = y > 0.25 && y < 0.48 && !tr ? 0.006 : 0;
    return { c: [x, y, z], rx: r + boot, rz: r + boot, n: 2.1, fz: (th, sn, cs) => (cs < 0 ? -calf * cs * cs : 0) };
  });
  const th = side < 0 ? THL : THR, sh = side < 0 ? SHL : SHR;
  const [pos, idx] = loft(rings, sg(10, 6), 'y', false, false);
  G.add(pos, idx, (x, y) => (y > 0.56 ? [th, th, 1] : y < 0.45 ? [sh, sh, 1] : [th, sh, smooth(0.45, 0.56, y)]),
    (x, y) => (o.boot && y < o.boot ? S_SHOE : S_LEGS), { ao: (x, y, z, nx) => 1 - 0.25 * smooth(0.6, 0.95, y) * smooth(0.1, 0.8, -nx * side) });
}

function shoePart(G, side, o = {}) {
  const sx = side * 0.096;
  const big = o.big || 1;
  const R = [
    [0.074, 0.05, 0.031, 0.034, 2.2], [0.06, 0.05, 0.04, 0.045, 2.4], [0.022, 0.053, 0.043, 0.05, 2.6], [-0.03, 0.042, 0.046, 0.04, 2.8],
    [-0.085, 0.034, 0.047 * big, 0.033, 3.0], [-0.13, 0.03, 0.044 * big, 0.029, 2.8], [-0.162, 0.028, 0.036 * big, 0.025, 2.4], [-0.18, 0.026, 0.02, 0.016, 2.2],
  ];
  const rings = R.map(([z, cy, rx, ry, n]) => ({ c: [sx, cy, z], rx, rz: ry, n, cap: 0.006 }));
  const [pos, idx] = loft(rings.reverse(), sg(8, 5), 'z', true, true);
  for (let i = 1; i < pos.length; i += 3) if (pos[i] < 0.006) pos[i] = 0.006;
  const ft = side < 0 ? FTL : FTR;
  G.add(pos, idx, [ft, ft, 1], (x, y) => (y < 0.019 ? S_SOLE : S_SHOE), { ao: (x, y) => 1 - 0.2 * smooth(0.03, 0.006, y) });
}

function armPart(G, side, o = {}) {
  const s = side;
  const cuffR = o.cuff || 0.047;
  const sl = o.sleeve || 1;
  const J = [BIND[s < 0 ? ARL : ARR], BIND[s < 0 ? FOL : FOR], BIND[s < 0 ? HAL : HAR]];
  const at = (y) => {
    if (y > J[1][1]) { const k = (y - J[1][1]) / (J[0][1] - J[1][1]); return [lerp(J[1][0], J[0][0], k), lerp(J[1][2], J[0][2], k)]; }
    const k = (y - J[2][1]) / (J[1][1] - J[2][1]); return [lerp(J[2][0], J[1][0], k), lerp(J[2][2], J[1][2], k)];
  };
  const wrist = o.bell ? [] : [[0.842, 0.029, S_SKIN], [0.862, 0.032, S_SKIN]];
  const cuffY = o.cuffY || 0.868;
  const R = [
    ...wrist,
    [cuffY - 0.002, cuffR - 0.01, o.cuffSlot ?? S_COAT], [cuffY, cuffR, o.cuffSlot ?? S_COAT], [cuffY + 0.03, cuffR + 0.001, S_COAT], [1.06, 0.048 * sl, S_COAT], [1.1, 0.048 * sl, S_COAT],
    [1.23, 0.055 * sl, S_COAT], [1.36, 0.056 * sl, S_COAT], [1.4, 0.053 * sl, S_COAT], [1.422, 0.042 * sl, S_COAT], [1.436, 0.02 * sl, S_COAT],
  ];
  const rings = R.map(([y, r, slot]) => { const [x, z] = at(Math.min(y, J[0][1])); return { c: [x, y, z], rx: r, rz: r * 1.04, n: 2.1, slot }; });
  const seg = sg(9, 6);
  const [pos, idx] = loft(rings, seg, 'y', false, true);
  const slots = [];
  for (const g of rings) for (let i = 0; i < seg; i++) slots.push(g.slot);
  slots.push(S_COAT);
  const ar = s < 0 ? ARL : ARR, fo = s < 0 ? FOL : FOR, ha = s < 0 ? HAL : HAR, cl = s < 0 ? CLL : CLR;
  G.add(pos, idx, (x, y) => {
    if (y > 1.36) return [ar, cl, 1 - 0.35 * smooth(1.36, 1.45, y)];
    if (y > 1.13) return [ar, ar, 1];
    if (y > 1.07) return [ar, fo, smooth(1.07, 1.13, y)];
    if (y > 0.868) return [fo, fo, 1];
    return [fo, ha, smooth(0.84, 0.868, y)];
  }, (x, y, z, i) => slots[i], { ao: (x, y, z, nx) => 1 - 0.22 * smooth(0.0, 0.9, -nx * s) * smooth(1.0, 1.3, y) });
}

function handPart(G, side, o = {}) {
  const s = side;
  const hx = BIND[s < 0 ? HAL : HAR][0], fx = BIND[s < 0 ? FIL : FIR][0];
  const ha = s < 0 ? HAL : HAR, fi = s < 0 ? FIL : FIR;
  const slot = o.slot ?? S_HAND;
  const palm = loft([
    { c: [fx, 0.752, 0.006], rx: 0.0115, rz: 0.036, n: 2.6 },
    { c: [fx + s * 0.001, 0.775, 0.007], rx: 0.0145, rz: 0.039, n: 3 },
    { c: [hx, 0.81, 0.01], rx: 0.0155, rz: 0.038, n: 3 },
    { c: [hx, 0.842, 0.012], rx: 0.0145, rz: 0.03, n: 2.6, cap: 0.004 },
  ], sg(6, 4), 'y', false, true);
  G.add(palm[0], palm[1], (x, y) => (y < 0.762 ? [fi, ha, 0.5] : [ha, ha, 1]), slot, { ao: (x, y, z, nx) => 1 - 0.12 * smooth(0, 1, nx * s) });
  const fing = loft([
    { c: [fx + s * 0.002, 0.672, 0.004], rx: 0.007, rz: 0.022, n: 2.3, cap: 0.006 },
    { c: [fx + s * 0.002, 0.684, 0.005], rx: 0.0095, rz: 0.03, n: 2.8 },
    { c: [fx + s * 0.001, 0.72, 0.006], rx: 0.0105, rz: 0.033, n: 3 },
    { c: [fx, 0.765, 0.006], rx: 0.0115, rz: 0.034, n: 3 },
  ], sg(6, 4), 'y', true, false);
  G.add(fing[0], fing[1], (x, y) => (y > 0.757 ? [fi, ha, 0.6] : [fi, fi, 1]), slot, { ao: (x, y, z, nx) => 1 - 0.1 * smooth(0, 1, nx * s) });
  const th = tube([[hx + s * 0.006, 0.83, -0.02], [hx + s * 0.008, 0.805, -0.036], [hx + s * 0.011, 0.78, -0.043], [hx + s * 0.013, 0.758, -0.043]], (k) => 0.0115 - 0.003 * k, sg(5, 3));
  G.add(th[0], th[1], [ha, ha, 1], slot);
  const tip = ellipsoid([hx + s * 0.013, 0.757, -0.043], [0.009, 0.007, 0.009], sg(5, 3), sg(4, 3));
  G.add(tip[0], tip[1], [ha, ha, 1], slot);
}

function headPoint(x, y, z) {
  const fr = clamp(-z * 1.6), bk = clamp(z * 1.4);
  const lower = smooth(0.15, -0.95, y);
  let px = x * HR[0] * (1 - 0.22 * lower * (0.6 + 0.4 * fr) - 0.04 * smooth(0.3, 0.9, y) * fr);
  let py = y * HR[1];
  let pz = z * HR[2];
  pz *= 1 - 0.1 * fr * (1 - Math.abs(y)) + 0.07 * bk * smooth(-0.3, 0.4, y) - 0.3 * bk * smooth(-0.1, -0.85, y);
  py *= 1 + 0.03 * bk * smooth(0.2, 0.9, y);
  const ax = Math.abs(x);
  const g = (a, s) => Math.exp(-(a * a) / (s * s));
  pz -= 0.0105 * g(y + 0.8, 0.13) * g(x, 0.32) * fr;
  pz -= 0.005 * g(y - 0.2, 0.09) * g(x, 0.55) * fr;
  pz += 0.0055 * g(ax - 0.4, 0.17) * g(y - 0.02, 0.11) * fr;
  pz -= 0.004 * g(y + 0.58, 0.09) * g(x, 0.28) * fr;
  pz -= 0.003 * g(y + 0.47, 0.08) * g(x, 0.2) * fr;
  px += Math.sign(x) * 0.004 * g(ax - 0.62, 0.15) * g(y + 0.12, 0.15) * fr;
  py -= 0.012 * g(y + 0.85, 0.15) * fr * g(x, 0.6);
  pz -= 0.004 * g(y + 0.98, 0.2) * fr;
  return [HC[0] + px, HC[1] + py, HC[2] + pz];
}

function headAO(x, y, z, nx, ny, nz) {
  const dx = x - HC[0], dy = y - HC[1], dz = z - HC[2];
  let a = 1;
  a -= 0.35 * smooth(-0.07, -0.11, dy) * smooth(0.3, -0.5, ny);
  a -= 0.12 * Math.exp(-(((Math.abs(dx) - 0.031) / 0.015) ** 2) - ((dy - 0.0) / 0.012) ** 2) * smooth(-0.07, -0.09, dz);
  return a;
}

function headPart(G, o = {}) {
  const [pos, idx] = sphere(o.nu || sg(18, 11), o.nv || sg(14, 8), (x, y, z) => headPoint(x, y, z));
  G.add(pos, idx, (x, y, z) => {
    const ux = (x - HC[0]) / HR[0], uy = (y - HC[1]) / HR[1], uz = (z - HC[2]) / HR[2];
    const w = smooth(-0.5, -0.66, uy) * smooth(0.55, -0.15, uz) * smooth(1.0, 0.6, Math.abs(ux));
    return w > 0.01 ? [JW, HD, w] : [HD, HD, 1];
  }, S_SKIN, { face: true, ao: headAO });
  const ny = HC[1], nz = HC[2];
  const nose = loft([
    { c: [0, ny - 0.047, nz - 0.084], rx: 0.011, rz: 0.009, n: 2.2, cap: 0.002 },
    { c: [0, ny - 0.043, nz - 0.093], rx: 0.0165, rz: 0.014, n: 2.3 },
    { c: [0, ny - 0.034, nz - 0.097], rx: 0.0145, rz: 0.0155, n: 2.2 },
    { c: [0, ny - 0.021, nz - 0.092], rx: 0.0105, rz: 0.0125, n: 2.2 },
    { c: [0, ny - 0.006, nz - 0.087], rx: 0.0085, rz: 0.01, n: 2.2 },
    { c: [0, ny + 0.009, nz - 0.082], rx: 0.008, rz: 0.0065, n: 2.2, cap: 0.002 },
  ], sg(8, 4), 'y', true, true);
  G.add(nose[0], nose[1], [HD, HD, 1], S_SKIN, { face: true, ao: (x, y) => 1 - 0.2 * smooth(ny - 0.036, ny - 0.047, y) });
  for (const s of [-1, 1]) {
    const ear = ellipsoid([s * 0.0775, ny - 0.012, nz + 0.014], [0.0085, 0.029, 0.017], sg(7, 4), sg(5, 3), (p, ux, uy, uz) => {
      const dy = p[1] - (ny - 0.012), dz = p[2] - (nz + 0.014);
      p[2] += dy * 0.22;
      if (ux * s < 0) p[0] = s * 0.07 + (p[0] - s * 0.07) * 0.5;
      p[0] += s * 0.006 * (dz / 0.017 + 1) * 0.5;
      return p;
    });
    G.add(ear[0], ear[1], [HD, HD, 1], S_SKIN, { ao: (x, y, z, nx) => 0.75 + 0.25 * smooth(-0.2, 0.8, nx * s) });
  }
}

function neckPart(G, o = {}) {
  const r = o.r || 0.054;
  const rings = [
    { c: [0, 1.4, 0.012], rx: r + 0.004, rz: r, n: 2 },
    { c: [0, 1.45, 0.014], rx: r, rz: r - 0.003, n: 2 },
    { c: [0, 1.5, 0.016], rx: r - 0.004, rz: r - 0.006, n: 2 },
    { c: [0, 1.56, 0.012], rx: r - 0.006, rz: r - 0.008, n: 2 },
  ];
  const [pos, idx] = loft(rings, sg(12, 6), 'y', false, false);
  G.add(pos, idx, (x, y) => (y < 1.44 ? [NK, CH, smooth(1.4, 1.44, y)] : y > 1.53 ? [HD, NK, smooth(1.53, 1.56, y)] : [NK, NK, 1]), S_SKIN,
    { ao: (x, y, z) => 1 - 0.3 * smooth(1.49, 1.54, y) * smooth(0.0, -0.04, z - 0.012) - 0.2 * smooth(1.44, 1.4, y) });
}

function collarPart(G, o = {}) {
  const k = o.kind || 'stand';
  let rings;
  if (k === 'stand') rings = [
    { c: [0, 1.43, 0.016], rx: 0.064, rz: 0.06, n: 2 }, { c: [0, 1.468, 0.018], rx: 0.067, rz: 0.063, n: 2 },
    { c: [0, 1.474, 0.018], rx: 0.075, rz: 0.071, n: 2 }, { c: [0, 1.44, 0.016], rx: 0.081, rz: 0.077, n: 2.1 }, { c: [0, 1.405, 0.014], rx: 0.088, rz: 0.08, n: 2.2 },
  ];
  else if (k === 'fold') rings = [
    { c: [0, 1.43, 0.016], rx: 0.064, rz: 0.06, n: 2 }, { c: [0, 1.462, 0.02], rx: 0.069, rz: 0.066, n: 2 },
    { c: [0, 1.468, 0.022], rx: 0.08, rz: 0.077, n: 2.2 }, { c: [0, 1.43, 0.018], rx: 0.105, rz: 0.092, n: 2.5, fz: (th, sn, cs) => (cs > 0.3 ? -0.012 * (cs - 0.3) : 0) }, { c: [0, 1.395, 0.012], rx: 0.13, rz: 0.1, n: 2.6 },
  ];
  else rings = [
    { c: [0, 1.425, 0.016], rx: 0.064, rz: 0.06, n: 2 }, { c: [0, 1.47, 0.018], rx: 0.072, rz: 0.068, n: 2 },
    { c: [0, 1.48, 0.02], rx: 0.09, rz: 0.086, n: 2.1 }, { c: [0, 1.445, 0.018], rx: 0.115, rz: 0.1, n: 2.4 }, { c: [0, 1.4, 0.012], rx: 0.15, rz: 0.11, n: 2.8 },
  ];
  const [pos, idx] = loft(rings.reverse(), sg(12, 8), 'y', false, false);
  G.add(pos, idx, (x, y) => [NK, CH, 0.25 + 0.4 * smooth(1.42, 1.47, y)], o.slot ?? S_TRIM, { ao: (x, y) => 0.85 + 0.15 * smooth(1.44, 1.47, y) });
}

function bodyGeo(variant, lod = 0) {
  LQ = lod;
  const G = new Geo();
  headPart(G);
  neckPart(G);
  for (const s of [-1, 1]) { armPart(G, s, { cuff: variant === 1 ? 0.05 : 0.046 }); handPart(G, s); shoePart(G, s, { big: variant === 2 ? 0.92 : 1 }); }
  if (variant === 0) {
    pelvisPart(G, { top: 1.02 });
    torsoPart(G, { y0: 0.86, hem: true, pad: 0.004 });
    for (const s of [-1, 1]) legPart(G, s, { trousers: true });
    collarPart(G, { kind: 'stand' });
  } else if (variant === 1) {
    pelvisPart(G, { top: 1.0 });
    torsoPart(G, { y0: 1.01, pad: 0.008 });
    skirtPart(G, { hem: 0.47, top: 1.01, rxB: 0.205, rzB: 0.142, rxT: 0.168, rzT: 0.115, czB: 0.016, slot: S_COAT, fold: 0.012 });
    for (const s of [-1, 1]) legPart(G, s, { trousers: true });
    collarPart(G, { kind: 'fold' });
  } else {
    pelvisPart(G, { top: 1.0, slot: S_PANTS });
    skirtPart(G, { hem: 0.4, top: 1.0, rxB: 0.19, rzB: 0.135, rxT: 0.163, rzT: 0.108, czB: 0.014, slot: S_PANTS, fold: 0.02 });
    torsoPart(G, { y0: 0.86, hem: true, pad: 0.006, bust: 0.012 });
    for (const s of [-1, 1]) legPart(G, s, { trousers: false, boot: 0.34 });
    collarPart(G, { kind: 'stand' });
  }
  LQ = 0;
  return G;
}

function table(t, a) {
  if (a <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (a <= t[i][0]) { const k = (a - t[i - 1][0]) / (t[i][0] - t[i - 1][0]); const s = k * k * (3 - 2 * k); return lerp(t[i - 1][1], t[i][1], s); }
  return t[t.length - 1][1];
}

function scalp(az, el) {
  const ce = Math.cos(el);
  return headPoint(Math.sin(az) * ce, Math.sin(el), -Math.cos(az) * ce);
}

function shell(G, st, slot, skin = [HD, HD, 1]) {
  const NC = st.cols || 24, M = st.rows || 9;
  const cols = [];
  for (let j = 0; j < NC; j++) {
    const az = (j / NC) * TAU;
    const a = Math.abs(fract(az / TAU + 0.5) * TAU - PI);
    const lo = st.lo(a, az), hi = st.hi ? st.hi(a, az) : PI / 2;
    cols.push(hi - lo > 0.03 ? { az, a, lo, hi } : null);
  }
  const pos = [], idx = [], inner = [];
  const elC = st.curtain ?? -9;
  const point = (c, el, inward) => {
    const { az, a } = c;
    const t = st.thick(a, el, c);
    const ee = Math.max(el, elC);
    const s = scalp(az, ee);
    const dx = s[0] - HC[0], dy = s[1] - HC[1], dz = s[2] - HC[2];
    const l = Math.hypot(dx, dy, dz);
    const tt = inward ? Math.max(0.0015, t - (st.inThick || 0.012)) : t;
    let x = s[0] + (dx / l) * tt, y = s[1] + (dy / l) * tt, z = s[2] + (dz / l) * tt;
    if (el < elC) {
      const d = elC - el;
      const hx = x - HC[0], hz = z - HC[2], hl = Math.hypot(hx, hz) || 1;
      const fl = (st.flare || 0) * d * d + (inward ? 0 : 0);
      x += (hx / hl) * fl; z += (hz / hl) * fl;
      y -= d * HR[1] * (st.drop || 1.15);
    }
    if (st.warp) { const w = st.warp(x, y, z, az, el, inward); x = w[0]; y = w[1]; z = w[2]; }
    return [x, y, z];
  };
  const base = [];
  for (const c of cols) {
    if (!c) { base.push(-1); continue; }
    base.push(pos.length / 3);
    for (let i = 0; i <= M; i++) pos.push(...point(c, c.hi - (c.hi - c.lo) * (i / M), false));
  }
  for (let j = 0; j < NC; j++) {
    const k = (j + 1) % NC;
    if (base[j] < 0 || base[k] < 0) continue;
    for (let i = 0; i < M; i++) { const a = base[j] + i, b = base[k] + i, c = a + 1, d = b + 1; idx.push(a, b, c, b, d, c); }
  }
  G.add(pos, idx, skin, slot, { ao: st.ao || ((x, y) => 0.8 + 0.2 * smooth(HC[1] - 0.05, HC[1] + 0.09, y)) });
  if (st.curtain !== undefined) {
    const p2 = [], i2 = [], b2 = [];
    const rowsIn = [];
    for (const c of cols) {
      if (!c || c.lo > elC + 0.25) { b2.push(-1); continue; }
      b2.push(p2.length / 3);
      const top = Math.min(c.hi, elC + 0.25);
      const R = [];
      for (let i = 0; i <= 6; i++) { const el = top - (top - c.lo) * (i / 6); R.push(el); p2.push(...point(c, el, true)); }
      for (let i = 0; i <= 1; i++) p2.push(...point(c, c.lo, i === 0 ? true : false));
      rowsIn.push(R);
    }
    for (let j = 0; j < NC; j++) {
      const k = (j + 1) % NC;
      if (b2[j] < 0 || b2[k] < 0) continue;
      for (let i = 0; i < 6; i++) { const a = b2[j] + i, b = b2[k] + i, c = a + 1, d = b + 1; i2.push(a, c, b, b, c, d); }
      const a = b2[j] + 7, b = b2[k] + 7, c = a + 1, d = b + 1;
      i2.push(a, c, b, b, c, d);
    }
    G.add(p2, i2, skin, slot, { ao: () => 0.55 });
  }
}

const HAIRLINE_M = [[0, 0.62], [0.45, 0.5], [0.9, 0.42], [1.2, 0.28], [1.3, -0.05], [1.36, 0.2], [1.55, 0.2], [1.85, 0.05], [2.2, -0.3], [2.6, -0.45], [3.15, -0.5]];
const HAIRLINE_W = [[0, 0.55], [0.5, 0.47], [0.9, 0.35], [1.25, 0.1], [1.55, 0.0], [1.85, -0.1], [2.3, -0.35], [3.15, -0.42]];

function hairGeo(kind) {
  const G = new Geo();
  const nz = (x, y, z, f) => Math.sin(x * f + 1.3) * Math.sin(y * f * 1.1 + 0.7) * Math.sin(z * f * 0.9 + 2.1);
  if (kind === 'short') {
    shell(G, {
      lo: (a) => table(HAIRLINE_M, a),
      thick: (a, el, c) => 0.0035 + 0.011 * smooth(c.lo, c.lo + 0.45, el) * (0.55 + 0.45 * Math.sin(Math.max(0, el))) + 0.003 * smooth(0.8, 0, a) * smooth(0.4, 0.9, el),
    }, S_HAIR);
  } else if (kind === 'bald') {
    shell(G, {
      lo: (a) => table(HAIRLINE_M, a),
      hi: (a) => (a < 1.2 ? -1 : 0.28 + 0.5 * smooth(1.3, 3.1, a)),
      thick: (a, el, c) => 0.003 + 0.006 * smooth(c.lo, c.lo + 0.25, el) * smooth(c.hi, c.hi - 0.2, el),
      rows: 6,
    }, S_HAIR);
  } else if (kind === 'bob') {
    shell(G, {
      lo: (a) => table([[0, 0.5], [0.55, 0.42], [0.85, 0.05], [1.1, -0.78], [1.6, -0.82], [3.15, -0.86]], a),
      thick: (a, el, c) => 0.004 + 0.013 * smooth(c.lo, c.lo + 0.3, el) * smooth(-1.2, 0.2, Math.min(el, 1)) + 0.006 * smooth(0.3, 1.2, el),
      curtain: -0.05, flare: 0.02, drop: 1.0, inThick: 0.012, rows: 11,
      warp: (x, y, z, az, el) => { const hz = z - HC[2]; return [x, y, el < -0.3 ? z + 0.006 * smooth(0, 0.08, hz) : z]; },
    }, S_HAIR);
  } else if (kind === 'long') {
    shell(G, {
      lo: (a) => table([[0, 0.48], [0.5, 0.4], [0.8, 0.0], [1.05, -1.0], [1.6, -1.25], [2.4, -1.5], [3.15, -1.55]], a),
      thick: (a, el, c) => 0.004 + 0.012 * smooth(c.lo, c.lo + 0.3, el) + 0.005 * smooth(0.3, 1.2, el),
      curtain: -0.1, flare: 0.012, drop: 1.05, inThick: 0.011, rows: 12,
      warp: (x, y, z, az, el) => { const hz = z - HC[2]; const back = smooth(0.0, 0.07, hz); return [x, y, z + back * 0.03 * smooth(-0.4, -1.4, el)]; },
    }, S_HAIR);
  } else if (kind === 'bun') {
    shell(G, {
      lo: (a) => table(HAIRLINE_W, a),
      thick: (a, el, c) => 0.003 + 0.006 * smooth(c.lo, c.lo + 0.3, el) + 0.003 * smooth(0.5, 1.4, el),
    }, S_HAIR);
    const b = ellipsoid([HC[0], HC[1] + 0.055, HC[2] + 0.1], [0.04, 0.036, 0.036], 12, 9, (p, x, y, z) => { const k = 1 + 0.06 * Math.sin(Math.atan2(x, y) * 6); return [HC[0] + (p[0] - HC[0]) * k, HC[1] + 0.055 + (p[1] - HC[1] - 0.055) * k, p[2]]; });
    G.add(b[0], b[1], [HD, HD, 1], S_HAIR, { ao: (x, y, z) => 0.7 + 0.3 * smooth(HC[2] + 0.1, HC[2] + 0.14, z) });
  } else if (kind === 'perm') {
    shell(G, {
      lo: (a) => table([[0, 0.45], [0.6, 0.35], [1.0, 0.1], [1.5, -0.02], [2.0, -0.2], [3.15, -0.4]], a),
      thick: (a, el, c) => 0.006 + 0.022 * smooth(c.lo, c.lo + 0.35, el) + 0.006 * smooth(0.4, 1.3, el),
      rows: 10, cols: 28,
      warp: (x, y, z, az, el) => {
        const dx = x - HC[0], dy = y - HC[1], dz = z - HC[2], l = Math.hypot(dx, dy, dz);
        const b = 0.007 * (nz(dx, dy, dz, 140) * 0.6 + nz(dx, dy, dz, 230) * 0.4);
        return [x + (dx / l) * b, y + (dy / l) * b, z + (dz / l) * b];
      },
    }, S_HAIR);
  }
  return G;
}

function hatGeo(kind) {
  const G = new Geo();
  if (kind === 'beanie') {
    shell(G, {
      lo: (a) => table([[0, 0.34], [0.8, 0.22], [1.55, -0.02], [2.4, -0.2], [3.15, -0.26]], a),
      thick: (a, el, c) => 0.021 + 0.008 * smooth(c.lo + 0.2, c.lo + 0.16, el) + 0.005 * smooth(0.9, 1.5, el),
      rows: 9, cols: 24,
    }, S_HAT);
  } else if (kind === 'cap') {
    shell(G, {
      lo: (a) => table([[0, 0.42], [1.0, 0.36], [1.6, 0.2], [3.15, 0.05]], a),
      thick: (a, el) => 0.017 + 0.01 * smooth(0.4, 1.2, el),
      warp: (x, y, z, az, el) => { const top = HC[1] + 0.095; const yy = y > top ? top + (y - top) * 0.3 : y; return [x, yy, z - 0.008 * smooth(0.8, 1.5, el) * Math.cos(az)]; },
      rows: 7, cols: 22,
    }, S_HAT);
    const pos = [], idx = [];
    const N = 12;
    for (let i = 0; i <= N; i++) {
      const az = -1.05 + 2.1 * (i / N);
      const s = scalp(az, 0.42);
      const dx = s[0] - HC[0], dz = s[2] - HC[2], l = Math.hypot(dx, dz);
      const inner = [s[0] + (dx / l) * 0.016, s[1] + 0.004, s[2] + (dz / l) * 0.016];
      const out = 0.058 * Math.pow(Math.cos(az * 1.45), 0.6);
      const outer = [inner[0] + (dx / l) * out * 0.7, inner[1] - 0.012 - out * 0.05, inner[2] + (dz / l) * out];
      pos.push(...inner, ...outer, inner[0], inner[1] - 0.006, inner[2], outer[0], outer[1] - 0.005, outer[2]);
    }
    for (let i = 0; i < N; i++) {
      const a = i * 4, b = (i + 1) * 4;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
      idx.push(a + 2, a + 3, b + 2, b + 2, a + 3, b + 3);
      idx.push(a + 1, b + 1, a + 3, b + 1, b + 3, a + 3);
    }
    G.add(pos, idx, [HD, HD, 1], S_HAT, { ao: (x, y) => 0.85 });
  } else if (kind === 'beret') {
    const c = [HC[0] + 0.008, HC[1] + 0.078, HC[2] + 0.004];
    const b = ellipsoid(c, [0.102, 0.034, 0.108], 18, 9, (p, x, y, z) => {
      const r = Math.hypot(x, z);
      let py = p[1] - c[1];
      if (y < 0) py *= 0.55;
      const tilt = (p[0] - c[0]) * 0.18;
      return [p[0], c[1] + py - tilt + 0.004 * Math.cos(r * 9), p[2]];
    });
    G.add(b[0], b[1], [HD, HD, 1], S_HAT, { ao: (x, y) => 0.75 + 0.25 * smooth(c[1] - 0.02, c[1] + 0.02, y) });
    const st = ellipsoid([c[0], c[1] + 0.034, c[2]], [0.006, 0.01, 0.006], 6, 4);
    G.add(st[0], st[1], [HD, HD, 1], S_HAT);
  } else if (kind === 'kerchief') {
    shell(G, {
      lo: (a) => table([[0, 0.36], [0.55, 0.3], [0.85, -0.2], [1.1, -0.62], [2.0, -0.72], [3.15, -0.8]], a),
      thick: (a, el, c) => 0.018 + 0.004 * smooth(0.5, 1.5, el) + 0.006 * smooth(c.lo + 0.08, c.lo, el),
      curtain: -0.25, flare: 0.012, drop: 0.85, inThick: 0.01, rows: 10, cols: 24,
      warp: (x, y, z, az, el) => { const front = Math.cos(az); return [x * (1 - 0.12 * smooth(-0.3, -0.8, el) * Math.max(0, front)), y, z]; },
    }, S_HAT);
    const k = ellipsoid([HC[0], HC[1] - 0.09, HC[2] + 0.11], [0.03, 0.035, 0.016], 8, 6);
    G.add(k[0], k[1], [HD, HD, 1], S_HAT, { ao: () => 0.8 });
  }
  return G;
}

function glassesGeo() {
  const G = new Geo();
  const y = HC[1] + 0.002, z = HC[2] - 0.099;
  for (const s of [-1, 1]) {
    const pts = [];
    const cx = s * 0.032;
    for (let i = 0; i < 14; i++) {
      const t = (i / 14) * TAU;
      const c = Math.cos(t), sn = Math.sin(t);
      const px = cx + 0.0215 * Math.sign(c) * Math.pow(Math.abs(c), 0.7);
      const py = y + 0.0155 * Math.sign(sn) * Math.pow(Math.abs(sn), 0.75) - (sn < 0 ? 0.002 : 0);
      pts.push([px, py, z + 0.004 * Math.abs(px - cx) / 0.02 * Math.abs(px) / 0.05]);
    }
    const f = tube(pts, 0.0026, 4, true);
    G.add(f[0], f[1], [HD, HD, 1], S_GLASS);
    const tp = tube([[s * 0.054, y + 0.006, z + 0.006], [s * 0.074, y + 0.008, z + 0.03], [s * 0.081, y + 0.006, HC[2] + 0.0], [s * 0.08, y - 0.006, HC[2] + 0.02], [s * 0.075, y - 0.02, HC[2] + 0.028]], 0.002, 3);
    G.add(tp[0], tp[1], [HD, HD, 1], S_GLASS);
  }
  const br = tube([[-0.0105, y + 0.004, z - 0.001], [0, y + 0.007, z - 0.003], [0.0105, y + 0.004, z - 0.001]], 0.002, 4);
  G.add(br[0], br[1], [HD, HD, 1], S_GLASS);
  return G;
}

function scarfGeo() {
  const G = new Geo();
  const ring = [];
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * TAU;
    ring.push([Math.sin(t) * 0.079, 1.452 - 0.012 * Math.cos(t) + 0.004 * Math.sin(t * 3), 0.016 - Math.cos(t) * 0.075]);
  }
  const r = tube(ring, 0.024, 6, true);
  G.add(r[0], r[1], (x, y) => [NK, CH, 0.5], S_SCARF, { ao: (x, y) => 0.75 + 0.25 * smooth(1.43, 1.47, y) });
  const tail = loft([
    { c: [-0.04, 1.06, -0.142], rx: 0.036, rz: 0.008, n: 3, cap: 0.002 },
    { c: [-0.042, 1.18, -0.142], rx: 0.036, rz: 0.009, n: 3 },
    { c: [-0.044, 1.3, -0.132], rx: 0.035, rz: 0.01, n: 3 },
    { c: [-0.04, 1.4, -0.098], rx: 0.034, rz: 0.012, n: 3 },
    { c: [-0.03, 1.44, -0.07], rx: 0.03, rz: 0.014, n: 3, cap: 0.004 },
  ], 8, 'y', true, true);
  G.add(tail[0], tail[1], (x, y) => (y > 1.38 ? [NK, CH, 0.4] : [CH, CH, 1]), S_SCARF, { ao: () => 0.9 });
  return G;
}

const FACES = [
  { age: 2, male: 1, brow: 0.0055, wr: 1.0, lip: [0.9, 0.76, 0.73] },
  { age: 2, male: 1, brow: 0.005, wr: 0.85, lip: [0.9, 0.76, 0.73], mous: 1 },
  { age: 2, male: 0, brow: 0.0028, wr: 0.9, lip: [0.87, 0.66, 0.66] },
  { age: 2, male: 0, brow: 0.0032, wr: 0.7, lip: [0.84, 0.6, 0.62], blush: 1 },
  { age: 1, male: 1, brow: 0.0048, wr: 0.35, lip: [0.9, 0.75, 0.72], stub: 1 },
  { age: 1, male: 0, brow: 0.0032, wr: 0.25, lip: [0.82, 0.56, 0.58], blush: 1, liner: 1 },
  { age: 0, male: 0, brow: 0.003, wr: 0, lip: [0.9, 0.7, 0.7], blush: 1 },
  { age: 2, male: 1, brow: 0.006, wr: 1.0, lip: [0.9, 0.76, 0.73], beard: 1 },
];

function faceAtlas() {
  const W = 1024, H = 512;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const cv = mk(), mv = mk();
  const c = cv.getContext('2d'), m = mv.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
  m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
  const rgb = (a, k = 1) => `rgba(${Math.round(a[0] * 255)},${Math.round(a[1] * 255)},${Math.round(a[2] * 255)},${k})`;
  FACES.forEach((F, k) => {
    const cx0 = (k % 4) * 256, cy0 = Math.floor(k / 4) * 256;
    for (const g of [c, m]) { g.setTransform(1600, 0, 0, -1280, cx0 + 128, cy0 + 102.4); g.lineCap = 'round'; g.lineJoin = 'round'; }
    const soft = (x, y, r, col, a) => {
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, rgb(col, a)); gr.addColorStop(1, rgb(col, 0));
      c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    };
    const line = (g, pts, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); };
    const curve = (g, a, b, cc, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(cc[0], cc[1], b[0], b[1]); g.stroke(); };
    const wr = F.wr;
    for (const s of [-1, 1]) {
      soft(s * 0.031, 0.002, 0.024, [0.62, 0.5, 0.46], 0.32 + 0.12 * wr);
      soft(s * 0.031, -0.012, 0.014, [0.7, 0.55, 0.52], 0.12 + 0.25 * wr);
      curve(c, [s * 0.019, 0.006], [s * 0.044, 0.006], [s * 0.031, 0.0135 - 0.002 * wr], 0.0011 + 0.0006 * wr, rgb([0.55, 0.4, 0.36], 0.55 + 0.25 * wr));
      if (F.liner) curve(c, [s * 0.018, 0.0035], [s * 0.046, 0.0055], [s * 0.031, 0.0085], 0.0014, 'rgba(60,40,40,0.55)');
      if (wr > 0.5) {
        curve(c, [s * 0.021, -0.009], [s * 0.042, -0.008], [s * 0.031, -0.0135], 0.001, rgb([0.6, 0.45, 0.42], 0.45 * wr));
        for (let i = -1; i <= 1; i++) line(c, [[s * 0.047, 0.001 + i * 0.004], [s * 0.056, 0.003 + i * 0.006]], 0.0008, rgb([0.6, 0.46, 0.42], 0.4 * wr));
      }
      soft(s * 0.016, -0.03, 0.01, [0.75, 0.6, 0.56], 0.35);
      const nl = 0.0012 + 0.0008 * wr;
      curve(c, [s * 0.016, -0.04], [s * 0.028, -0.074], [s * 0.029, -0.052], nl, rgb([0.62, 0.46, 0.43], 0.25 + 0.5 * wr));
      if (wr > 0.6) curve(c, [s * 0.024, -0.074], [s * 0.03, -0.094], [s * 0.029, -0.083], 0.0011, rgb([0.65, 0.5, 0.46], 0.4 * wr));
      if (F.blush) soft(s * 0.045, -0.03, 0.022, [1.0, 0.72, 0.7], 0.35);
      else soft(s * 0.047, -0.032, 0.02, [0.95, 0.75, 0.72], 0.18);
      c.fillStyle = 'rgba(70,40,36,0.85)';
      c.beginPath(); c.ellipse(s * 0.0085, -0.0445, 0.0042, 0.0022, s * 0.3, 0, TAU); c.fill();
      const bw = F.brow;
      const b0 = [s * 0.011, 0.0155], b1 = [s * 0.05, 0.0125], bc = [s * 0.033, 0.0255 - (F.male ? 0.002 : 0)];
      c.strokeStyle = 'rgba(120,100,95,0.35)'; c.lineWidth = bw * 1.1; c.beginPath(); c.moveTo(...b0); c.quadraticCurveTo(...bc, ...b1); c.stroke();
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const ww = bw * (1 - 0.65 * t * t) * (F.male ? 1 : 0.9);
        m.strokeStyle = `rgba(255,255,255,${0.95})`; m.lineWidth = ww;
        m.beginPath();
        const p = (u) => [lerp(lerp(b0[0], bc[0], u), lerp(bc[0], b1[0], u), u), lerp(lerp(b0[1], bc[1], u), lerp(bc[1], b1[1], u), u)];
        const a = p(Math.max(0, t - 0.2)), b = p(Math.min(1, t + 0.05));
        m.moveTo(a[0], a[1]); m.lineTo(b[0], b[1]); m.stroke();
      }
    }
    if (wr > 0.3) for (let i = 0; i < 3; i++) curve(c, [-0.03, 0.038 + i * 0.009], [0.03, 0.038 + i * 0.009], [0, 0.042 + i * 0.009], 0.0008, rgb([0.65, 0.52, 0.48], 0.35 * wr));
    soft(0, -0.082, 0.014, [0.8, 0.66, 0.62], 0.3);
    c.fillStyle = rgb(F.lip, 1);
    c.beginPath();
    c.moveTo(-0.0225, -0.066);
    c.quadraticCurveTo(-0.013, -0.0605, -0.0055, -0.0585);
    c.quadraticCurveTo(0, -0.061, 0.0055, -0.0585);
    c.quadraticCurveTo(0.013, -0.0605, 0.0225, -0.066);
    c.quadraticCurveTo(0.012, -0.077, 0, -0.0765);
    c.quadraticCurveTo(-0.012, -0.077, -0.0225, -0.066);
    c.fill();
    c.fillStyle = rgb([F.lip[0] * 0.92, F.lip[1] * 0.85, F.lip[2] * 0.85], 1);
    c.beginPath(); c.ellipse(0, -0.0705, 0.012, 0.003, 0, 0, TAU); c.fill();
    const droop = 0.0015 * wr;
    line(c, [[-0.0225, -0.0665 - droop], [-0.012, -0.0655], [0, -0.0662], [0.012, -0.0655], [0.0225, -0.0665 - droop]], 0.0013, 'rgba(95,55,52,0.85)');
    curve(c, [-0.003, -0.048], [-0.003, -0.058], [-0.004, -0.053], 0.0012, 'rgba(160,120,112,0.3)');
    curve(c, [0.003, -0.048], [0.003, -0.058], [0.004, -0.053], 0.0012, 'rgba(160,120,112,0.3)');
    if (F.mous) {
      m.fillStyle = 'rgba(255,255,255,0.95)';
      m.beginPath(); m.moveTo(-0.027, -0.066); m.quadraticCurveTo(-0.02, -0.049, 0, -0.051); m.quadraticCurveTo(0.02, -0.049, 0.027, -0.066); m.quadraticCurveTo(0.012, -0.059, 0, -0.06); m.quadraticCurveTo(-0.012, -0.059, -0.027, -0.066); m.fill();
    }
    if (F.beard) {
      m.fillStyle = 'rgba(255,255,255,0.9)';
      m.beginPath(); m.moveTo(-0.075, -0.02); m.quadraticCurveTo(-0.07, -0.1, 0, -0.118); m.quadraticCurveTo(0.07, -0.1, 0.075, -0.02);
      m.lineTo(0.06, -0.025); m.quadraticCurveTo(0.04, -0.06, 0.02, -0.074); m.quadraticCurveTo(0, -0.08, -0.02, -0.074); m.quadraticCurveTo(-0.04, -0.06, -0.06, -0.025); m.fill();
      m.beginPath(); m.moveTo(-0.026, -0.067); m.quadraticCurveTo(0, -0.048, 0.026, -0.067); m.quadraticCurveTo(0, -0.059, -0.026, -0.067); m.fill();
    }
    if (F.stub) {
      m.fillStyle = 'rgba(255,255,255,0.22)';
      m.beginPath(); m.moveTo(-0.072, -0.02); m.quadraticCurveTo(-0.07, -0.1, 0, -0.115); m.quadraticCurveTo(0.07, -0.1, 0.072, -0.02); m.lineTo(0.05, -0.04); m.quadraticCurveTo(0, -0.04, -0.05, -0.04); m.fill();
    }
  });
  const out = document.createElement('canvas');
  out.width = W * 2; out.height = H;
  const og = out.getContext('2d');
  og.drawImage(cv, 0, 0); og.drawImage(mv, W, 0);
  const t = new THREE.CanvasTexture(out);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const GLSL_COMMON = `
uniform highp sampler2D uBones;
uniform highp sampler2D uPal;
`;

const VPARS = GLSL_COMMON + `
attribute vec2 aBone;
attribute float aW;
attribute float aSlot;
attribute float aFace;
attribute float aAO;
attribute float aPid;
varying vec3 vB;
varying vec3 vCol;
varying vec4 vMat;
varying vec2 vAF;
flat varying float vPid;
`;

const VNORM = `
int pid = int(aPid + 0.5);
int bA = int(aBone.x + 0.5) * 3;
int bB = int(aBone.y + 0.5) * 3;
float wA = aW, wB = 1.0 - aW;
vec4 r0 = texelFetch(uBones, ivec2(bA, pid), 0) * wA + texelFetch(uBones, ivec2(bB, pid), 0) * wB;
vec4 r1 = texelFetch(uBones, ivec2(bA + 1, pid), 0) * wA + texelFetch(uBones, ivec2(bB + 1, pid), 0) * wB;
vec4 r2 = texelFetch(uBones, ivec2(bA + 2, pid), 0) * wA + texelFetch(uBones, ivec2(bB + 2, pid), 0) * wB;
vec3 objectNormal = vec3(dot(r0.xyz, normal), dot(r1.xyz, normal), dot(r2.xyz, normal));
#ifdef USE_TANGENT
vec3 objectTangent = vec3(tangent.xyz);
#endif
`;

const VBEGIN = `
vec3 transformed = vec3(dot(r0.xyz, position) + r0.w, dot(r1.xyz, position) + r1.w, dot(r2.xyz, position) + r2.w);
#ifdef USE_ALPHAHASH
vPosition = vec3(position);
#endif
vB = position;
int sl = int(aSlot + 0.5) * 2;
vec4 pc = texelFetch(uPal, ivec2(sl, pid), 0);
vec4 pm = texelFetch(uPal, ivec2(sl + 1, pid), 0);
vCol = pc.rgb;
vMat = vec4(pm.x, pm.y, pc.a, pm.z);
vAF = vec2(aAO, aFace);
vPid = float(pid);
`;

const FPARS = GLSL_COMMON + `
uniform sampler2D uFace;
varying vec3 vB;
varying vec3 vCol;
varying vec4 vMat;
varying vec2 vAF;
flat varying float vPid;
const vec3 HCV = vec3(${HC[0].toFixed(4)}, ${HC[1].toFixed(4)}, ${HC[2].toFixed(4)});
float hsh(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnz(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hsh(i), hsh(i + vec3(1, 0, 0)), f.x), mix(hsh(i + vec3(0, 1, 0)), hsh(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hsh(i + vec3(0, 0, 1)), hsh(i + vec3(1, 0, 1)), f.x), mix(hsh(i + vec3(0, 1, 1)), hsh(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
vec3 bumpN(vec3 n, float h) {
  vec3 sp = -vViewPosition;
  vec3 dx = dFdx(sp), dy = dFdy(sp);
  vec3 r1 = cross(dy, n), r2 = cross(n, dx);
  float det = dot(dx, r1);
  vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  return normalize(abs(det) * n - g);
}
`;

const FCOLOR = `
vec3 col = vCol;
float rough = vMat.x, metal = vMat.y;
int pat = int(vMat.z + 0.5);
float hB = 0.0;
vec3 B = vB;
vec3 hp = B - HCV;
float aaE = max(fwidth(B.y), 1e-5);
vec2 fuv = vec2(0.5 + hp.x / 0.16, (hp.y + 0.12) / 0.2);
vec2 fdx = dFdx(fuv) / vec2(8.0, 2.0), fdy = dFdy(fuv) / vec2(8.0, 2.0);
float ang = atan(hp.x, hp.z);
float fine = 1.0 - smoothstep(0.0007, 0.0025, aaE);
float mid = 1.0 - smoothstep(0.004, 0.012, aaE);
if (pat == 1) {
  float q = fract(B.y / 0.068 + 0.3);
  float puff = sqrt(max(0.0, sin(q * 3.14159)));
  hB = puff * 0.0035 * mid;
  col *= mix(0.85, 0.7 + 0.3 * puff, mid);
} else if (pat == 2) {
  float rib = mix(0.5, sin(ang * 70.0) * 0.5 + 0.5, 1.0 - smoothstep(0.07, 0.12, hp.y));
  float row = sin(B.y * 1400.0) * 0.5 + 0.5;
  hB = (rib * 0.8 + row * 0.2) * 0.0012 * fine;
  col *= mix(0.93, 0.86 + 0.14 * rib, fine);
} else if (pat == 4) {
  float s = sin(ang * 70.0 + vnz(vec3(B.x, B.y * 3.0, B.z) * 40.0) * 7.0);
  hB = s * 0.0004 * fine;
  col *= 0.97 + 0.06 * s * fine + 0.1 * (vnz(B * 45.0) - 0.5);
} else if (pat == 5) {
  float n = vnz(B * 230.0);
  hB = n * 0.0025 * mid;
  col *= mix(0.95, 0.85 + 0.22 * n, mid);
} else if (pat == 6) {
  col *= 0.95 + 0.1 * vnz(B * 300.0);
} else if (pat == 7) {
  float r = sin((B.x * 0.7 + B.z) * 1300.0);
  hB = r * 0.0004 * fine;
  col *= 0.93 + 0.07 * r * fine;
} else if (pat == 8) {
  float band = max(step(abs(B.x), 0.062), step(abs(B.x), 0.29) * step(1.19, B.y) * step(B.y, 1.27));
  band = max(band, step(B.y, vMat.w + 0.03));
  float edge = band * (1.0 - max(step(abs(B.x), 0.052), step(abs(B.x), 0.28) * step(1.2, B.y) * step(B.y, 1.26)) * step(vMat.w + 0.03, B.y) * (1.0 - step(B.y, vMat.w + 0.022)));
  vec2 g = fract(vec2(B.x * 70.0, B.y * 70.0)) - 0.5;
  float motif = smoothstep(0.32, 0.18, abs(g.x) + abs(g.y));
  float dam = 0.5 + 0.5 * sin(B.x * 160.0) * sin(B.y * 160.0);
  vec3 cream = col * (0.94 + 0.06 * dam);
  vec3 gold = vec3(0.72, 0.5, 0.18) * (0.75 + 0.45 * motif);
  gold = mix(gold, vec3(0.35, 0.22, 0.08), edge);
  col = mix(cream, gold, band);
  metal = mix(metal, 0.75, band);
  rough = mix(rough, 0.32, band);
  hB = (band * motif * 0.0008 + (1.0 - band) * dam * 0.0003) * fine;
} else if (pat == 9) {
  float inB = step(B.y, vMat.w + 0.07);
  float holes = smoothstep(0.35, 0.65, sin(B.x * 520.0) * sin(B.y * 520.0 + B.z * 200.0));
  float scal = step(B.y, vMat.w + 0.07) * step(vMat.w + 0.063, B.y);
  col = mix(col, vec3(0.04), inB * holes * 0.85);
  col *= 1.0 - scal * 0.2;
  hB = inB * holes * 0.0008;
} else if (pat == 10) {
  float n = vnz(B * 480.0) * 0.6 * fine + vnz(B * 160.0) * 0.4 + 0.3 * (1.0 - fine);
  hB = n * 0.004 * mid;
  col *= 0.7 + 0.5 * n;
} else if (pat == 12) {
  vec3 q = B * 110.0;
  float d = smoothstep(0.62, 0.7, vnz(q));
  float d2 = smoothstep(0.66, 0.74, vnz(q + 17.0));
  col = mix(col, vec3(0.92, 0.86, 0.7), d * 0.85);
  col = mix(col, col.bgr * 0.8 + 0.1, d2 * 0.7);
} else if (pat == 13) {
  col *= 0.9 + 0.12 * vnz(B * 260.0) + 0.06 * (vnz(B * 900.0) - 0.5);
} else if (pat == 3 && vAF.y > 0.5) {
  float front = smoothstep(0.0, -0.035, hp.z);
  if (front > 0.0) {
    int pid = int(vPid + 0.5);
    vec4 fx = texelFetch(uBones, ivec2(PARAM_X, pid), 0);
    vec4 sp = texelFetch(uPal, ivec2(1, pid), 0);
    vec3 hairC = texelFetch(uPal, ivec2(2, pid), 0).rgb;
    vec3 irisC = texelFetch(uPal, ivec2(24, pid), 0).rgb;
    float eyeK = texelFetch(uPal, ivec2(25, pid), 0).x;
    float cell = sp.z;
    vec2 cuv = (vec2(mod(cell, 4.0), 1.0 - floor(cell / 4.0)) + clamp(fuv, 0.004, 0.996)) / vec2(8.0, 2.0);
    vec3 ft = textureGrad(uFace, cuv, fdx, fdy).rgb;
    float fm = textureGrad(uFace, cuv + vec2(0.5, 0.0), fdx, fdy).r;
    vec3 fcol = col * ft;
    fcol = mix(fcol, hairC * 0.72 + col * 0.05, fm * 0.92);
    float side = hp.x < 0.0 ? -1.0 : 1.0;
    vec2 e = vec2(abs(hp.x) - 0.031, hp.y - 0.0015);
    float open = eyeK * (1.0 - fx.x);
    float Wd = 0.0126;
    float t = clamp(e.x / Wd, -1.0, 1.0);
    float k = max(1.0 - t * t, 0.0);
    float up = 0.0056 * pow(k, 0.6) * open + 0.0009 * t - 0.0004;
    float lo = -0.0041 * pow(k, 0.8) - 0.0004;
    float inEye = smoothstep(-aaE, aaE, up - e.y) * smoothstep(-aaE, aaE, e.y - lo) * smoothstep(Wd, Wd - aaE, abs(e.x));
    vec2 ic = vec2(fx.z * side * 0.0035, fx.w * 0.002 - 0.0003);
    float ri = length(e - ic);
    vec3 sclera = vec3(0.8, 0.77, 0.72);
    vec3 irs = irisC * (0.6 + 0.6 * smoothstep(0.0055, 0.0015, ri));
    vec3 ecol = mix(sclera, irs, smoothstep(0.0057 + aaE, 0.0057 - aaE, ri));
    ecol = mix(ecol, vec3(0.015), smoothstep(0.0023 + aaE, 0.0023 - aaE, ri));
    ecol = mix(ecol, vec3(1.0), smoothstep(0.0012, 0.0005, length(e - ic - vec2(0.0015, 0.0017))) * 0.85);
    ecol *= 0.62 + 0.38 * smoothstep(up, up - 0.003, e.y);
    fcol = mix(fcol, ecol, inEye);
    float lash = smoothstep(0.0009 + aaE, 0.0003, abs(e.y - up - 0.0002)) * smoothstep(Wd * 1.12, Wd * 0.95, abs(e.x + 0.0008));
    fcol = mix(fcol, vec3(0.06, 0.04, 0.035), lash * 0.9);
    float mo = fx.y;
    if (mo > 0.02) {
      vec2 mq = vec2(hp.x, hp.y + 0.0665 + 0.002 * mo);
      float hh = 0.0012 + 0.0105 * mo;
      float d = length(mq / vec2(0.0175 + 0.002 * mo, hh));
      float inM = smoothstep(1.08, 0.92, d);
      vec3 mc = mix(vec3(0.13, 0.03, 0.03), vec3(0.3, 0.08, 0.08), smoothstep(0.0, -hh, mq.y));
      mc = mix(mc, vec3(0.78, 0.74, 0.66), step(hh * 0.5, mq.y) * step(0.3, mo));
      fcol = mix(fcol, mc, inM);
    }
    col = mix(col, fcol, front);
  }
}
diffuseColor.rgb = col * vAF.x;
`;

function humanMaterial(boneTex, palTex, faceTex, nb, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0, side: opts.side ?? THREE.FrontSide });
  m.defines = { PARAM_X: nb * 3 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBones = { value: boneTex };
    sh.uniforms.uPal = { value: palTex };
    sh.uniforms.uFace = { value: faceTex };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + VPARS)
      .replace('#include <beginnormal_vertex>', VNORM)
      .replace('#include <begin_vertex>', VBEGIN);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FPARS)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + FCOLOR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = rough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = metal;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = bumpN(normal, hB);');
  };
  m.customProgramCacheKey = () => 'gloria-human-' + nb + '-' + (opts.side ?? 0);
  return m;
}

class RigPool {
  constructor(nb, max) {
    this.nb = nb; this.max = max; this.w = nb * 3 + 1;
    this.data = new Float32Array(this.w * 4 * max);
    this.tex = new THREE.DataTexture(this.data, this.w, max, THREE.RGBAFormat, THREE.FloatType);
    this.pal = new Float32Array(NSLOT * 2 * 4 * max);
    this.palTex = new THREE.DataTexture(this.pal, NSLOT * 2, max, THREE.RGBAFormat, THREE.FloatType);
    for (const t of [this.tex, this.palTex]) { t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; }
    this.count = 0;
  }
  setSlot(row, slot, color, pattern, rough = 0.85, metal = 0, extra = 0, extra2 = 0) {
    const o = (row * NSLOT * 2 + slot * 2) * 4;
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    this.pal[o] = c.r; this.pal[o + 1] = c.g; this.pal[o + 2] = c.b; this.pal[o + 3] = pattern;
    this.pal[o + 4] = rough; this.pal[o + 5] = metal; this.pal[o + 6] = extra; this.pal[o + 7] = extra2;
  }
}

const _wt = new Float32Array(3), _ik = new Float32Array(4);

function solve2(out, ax, ay, az, tx, ty, tz, px, py, pz, l1, l2, leg) {
  let dx = tx - ax, dy = ty - ay, dz = tz - az;
  let d = Math.hypot(dx, dy, dz);
  if (d < 1e-6) { dx = 0; dy = -1; dz = 0; d = 1e-6; }
  const dc = clamp(d, Math.abs(l1 - l2) + 0.02, (l1 + l2) * 0.9995);
  dx /= d; dy /= d; dz /= d;
  const pd = px * dx + py * dy + pz * dz;
  let qx = px - pd * dx, qy = py - pd * dy, qz = pz - pd * dz;
  let ql = Math.hypot(qx, qy, qz);
  if (ql < 1e-5) { qx = 0; qy = 0; qz = leg ? -1 : 1; ql = 1; }
  qx /= ql; qy /= ql; qz /= ql;
  const cA = clamp((l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc), -1, 1), sA = Math.sqrt(1 - cA * cA);
  const ux = cA * dx + sA * qx, uy = cA * dy + sA * qy, uz = cA * dz + sA * qz;
  let fx = dx * dc - ux * l1, fy = dy * dc - uy * l1, fz = dz * dc - uz * l1;
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl; fy /= fl; fz /= fl;
  const z = Math.asin(clamp(ux, -1, 1));
  const x = Math.atan2(-uz, -uy);
  const cx = Math.cos(x), sx = Math.sin(x), cz = Math.cos(z), sz = Math.sin(z);
  const f0x = cz * fx + cx * sz * fy + sx * sz * fz;
  const f0z = -sx * fy + cx * fz;
  const tw = leg ? Math.atan2(f0x, f0z) : Math.atan2(-f0x, -f0z);
  const bend = Math.acos(clamp(ux * fx + uy * fy + uz * fz, -1, 1));
  out[0] = x; out[1] = tw; out[2] = z; out[3] = leg ? -bend : bend;
}

function eulerMat(R, o, x, y, z, limb) {
  const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
  if (!limb) {
    R[o] = cy * cz + sy * sx * sz; R[o + 1] = -cy * sz + sy * sx * cz; R[o + 2] = sy * cx;
    R[o + 3] = cx * sz; R[o + 4] = cx * cz; R[o + 5] = -sx;
    R[o + 6] = -sy * cz + cy * sx * sz; R[o + 7] = sy * sz + cy * sx * cz; R[o + 8] = cy * cx;
  } else {
    R[o] = cz * cy; R[o + 1] = -sz; R[o + 2] = cz * sy;
    R[o + 3] = cx * sz * cy + sx * sy; R[o + 4] = cx * cz; R[o + 5] = cx * sz * sy - sx * cy;
    R[o + 6] = sx * sz * cy - cx * sy; R[o + 7] = sx * cz; R[o + 8] = sx * sz * sy + cx * cy;
  }
}

const _R = new Float32Array(9), _M = new Float32Array(9);

class Rig {
  constructor(pool, row) {
    const nb = pool.nb;
    this.pool = pool; this.row = row; this.nb = nb;
    this.eul = new Float32Array(nb * 3);
    this.W = new Float32Array(nb * 12);
    this.off = new Float32Array(nb * 3);
    this.sc = new Float32Array(nb * 3).fill(1);
    this.wrot = new Float32Array(nb * 9);
    this.wOn = new Uint8Array(nb);
    this.root = new Float32Array(3);
    this.yaw = 0;
    this.H = 1;
    this.armT = new Float32Array(6); this.armP = new Float32Array(6); this.armF = new Float32Array(2); this.armOn = new Uint8Array(2);
    this.armW = new Uint8Array(2);
    this.legT = new Float32Array(6); this.legP = new Float32Array(6); this.legOn = new Uint8Array(2);
    this.fx = new Float32Array(4);
    this.len = new Float32Array(4);
    this.hw = new Float32Array(2); this.hwP = new Float32Array(2);
    this.setProportions({});
  }
  setProportions(o) {
    const H = o.h ?? 1, g = o.girth ?? 1, sh = o.shoulder ?? 1, hip = o.hip ?? 1, hs = o.head ?? 1, leg = o.leg ?? 1, arm = o.arm ?? 1, belly = o.belly ?? 1, lg = o.limb ?? 1;
    this.H = H;
    const S = this.sc;
    const set = (b, x, y, z) => { if (b < this.nb) { S[b * 3] = x; S[b * 3 + 1] = y; S[b * 3 + 2] = z; } };
    set(P, H * hip * g, H, H * g); set(SP, H * g * (0.5 + 0.5 * belly), H, H * g * belly); set(CH, H * g * sh, H, H * g * (0.6 + 0.4 * belly));
    set(NK, H * (o.neck ?? 1), H, H * (o.neck ?? 1)); set(HD, hs, hs, hs); set(JW, hs, hs, hs);
    for (const [c, a, f, h, fi] of [[CLL, ARL, FOL, HAL, FIL], [CLR, ARR, FOR, HAR, FIR]]) {
      set(c, H * g * sh, H, H * g); set(a, H * lg, H * arm, H * lg); set(f, H * lg, H * arm, H * lg); set(h, H * (o.hand ?? 1), H, H * (o.hand ?? 1)); set(fi, H, H, H);
    }
    for (const [t, s, f] of [[THL, SHL, FTL], [THR, SHR, FTR]]) { set(t, H * lg * (o.thigh ?? 1), H * leg, H * lg * (o.thigh ?? 1)); set(s, H * lg, H * leg, H * lg); set(f, H, H, H * (o.foot ?? 1)); }
    for (let b = CFU; b < this.nb; b++) set(b, H, H, H);
    for (let b = 1; b < this.nb; b++) {
      const p = PARENT[b];
      for (let k = 0; k < 3; k++) this.off[b * 3 + k] = (BIND[b][k] - BIND[p][k]) * S[p * 3 + k];
    }
    const L = (b) => Math.hypot(this.off[b * 3], this.off[b * 3 + 1], this.off[b * 3 + 2]);
    this.len[0] = L(FOL); this.len[1] = L(HAL); this.len[2] = L(SHL); this.len[3] = L(FTL);
    this.hipY = (BIND[THL][1] - BIND[FTL][1]) * H * leg + BIND[FTL][1] * H;
  }
  set(b, x, y, z) { const e = this.eul; e[b * 3] = x; e[b * 3 + 1] = y; e[b * 3 + 2] = z; }
  point(b, lx, ly, lz, out) {
    const W = this.W, o = b * 12;
    out[0] = W[o] * lx + W[o + 1] * ly + W[o + 2] * lz + W[o + 9];
    out[1] = W[o + 3] * lx + W[o + 4] * ly + W[o + 5] * lz + W[o + 10];
    out[2] = W[o + 6] * lx + W[o + 7] * ly + W[o + 8] * lz + W[o + 11];
    return out;
  }
  bone(b, i) {
    const W = this.W, R = _R, e = this.eul, nb = this.nb;
    const o = b * 12;
    if (b === P && this.wOn[P]) {
      const w = this.wrot;
      for (let k = 0; k < 9; k++) W[o + k] = w[k];
      W[o + 9] = this.root[0]; W[o + 10] = this.root[1]; W[o + 11] = this.root[2];
    } else if (b === P) {
      eulerMat(_M, 0, e[0], e[1], e[2], 0);
      const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
      for (let c = 0; c < 3; c++) {
        W[o + c] = cy * _M[c] + sy * _M[6 + c];
        W[o + 3 + c] = _M[3 + c];
        W[o + 6 + c] = -sy * _M[c] + cy * _M[6 + c];
      }
      W[o + 9] = this.root[0]; W[o + 10] = this.root[1]; W[o + 11] = this.root[2];
    } else {
      const p = PARENT[b] * 12;
      if (this.wOn[b]) {
        const w = this.wrot, q = b * 9;
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) W[o + r * 3 + c] = w[q + r * 3 + c];
      } else {
        eulerMat(R, 0, e[b * 3], e[b * 3 + 1], e[b * 3 + 2], LIMB[b]);
        for (let r = 0; r < 3; r++) {
          const a0 = W[p + r * 3], a1 = W[p + r * 3 + 1], a2 = W[p + r * 3 + 2];
          W[o + r * 3] = a0 * R[0] + a1 * R[3] + a2 * R[6];
          W[o + r * 3 + 1] = a0 * R[1] + a1 * R[4] + a2 * R[7];
          W[o + r * 3 + 2] = a0 * R[2] + a1 * R[5] + a2 * R[8];
        }
      }
      const ox = this.off[b * 3], oy = this.off[b * 3 + 1], oz = this.off[b * 3 + 2];
      W[o + 9] = W[p] * ox + W[p + 1] * oy + W[p + 2] * oz + W[p + 9];
      W[o + 10] = W[p + 3] * ox + W[p + 4] * oy + W[p + 5] * oz + W[p + 10];
      W[o + 11] = W[p + 6] * ox + W[p + 7] * oy + W[p + 8] * oz + W[p + 11];
    }
  }
  armIK(si) {
    const W = this.W, H = this.H;
    const cl = si ? CLR : CLL, ar = si ? ARR : ARL, fo = si ? FOR : FOL;
    const t = this.armT, k = si * 3, fw = this.armF[si];
    const c = CH * 12, pp = P * 12;
    let tx = t[k] * H, ty = t[k + 1] * H, tz = t[k + 2] * H;
    let wx, wy, wz;
    if (this.armW[si]) { wx = t[k]; wy = t[k + 1]; wz = t[k + 2]; }
    else {
      const ax = W[c] * tx + W[c + 1] * ty + W[c + 2] * tz + W[c + 9], ay = W[c + 3] * tx + W[c + 4] * ty + W[c + 5] * tz + W[c + 10], az = W[c + 6] * tx + W[c + 7] * ty + W[c + 8] * tz + W[c + 11];
      if (fw > 0.001) {
        const qx = tx, qy = ty + (BIND[CH][1] - BIND[P][1]) * H, qz = tz + (BIND[CH][2] - BIND[P][2]) * H;
        const bx = W[pp] * qx + W[pp + 1] * qy + W[pp + 2] * qz + W[pp + 9], by = W[pp + 3] * qx + W[pp + 4] * qy + W[pp + 5] * qz + W[pp + 10], bz = W[pp + 6] * qx + W[pp + 7] * qy + W[pp + 8] * qz + W[pp + 11];
        wx = lerp(ax, bx, fw); wy = lerp(ay, by, fw); wz = lerp(az, bz, fw);
      } else { wx = ax; wy = ay; wz = az; }
    }
    const P0 = this.armP;
    const fr = fw > 0.5 && !this.armW[si] ? pp : c;
    const pwx = W[fr] * P0[k] + W[fr + 1] * P0[k + 1] + W[fr + 2] * P0[k + 2], pwy = W[fr + 3] * P0[k] + W[fr + 4] * P0[k + 1] + W[fr + 5] * P0[k + 2], pwz = W[fr + 6] * P0[k] + W[fr + 7] * P0[k + 1] + W[fr + 8] * P0[k + 2];
    const q = cl * 12;
    const rx = wx - W[q + 9], ry = wy - W[q + 10], rz = wz - W[q + 11];
    const lx = W[q] * rx + W[q + 3] * ry + W[q + 6] * rz, ly = W[q + 1] * rx + W[q + 4] * ry + W[q + 7] * rz, lz = W[q + 2] * rx + W[q + 5] * ry + W[q + 8] * rz;
    const plx = W[q] * pwx + W[q + 3] * pwy + W[q + 6] * pwz, ply = W[q + 1] * pwx + W[q + 4] * pwy + W[q + 7] * pwz, plz = W[q + 2] * pwx + W[q + 5] * pwy + W[q + 8] * pwz;
    solve2(_ik, this.off[ar * 3], this.off[ar * 3 + 1], this.off[ar * 3 + 2], lx, ly, lz, plx, ply, plz, this.len[0], this.len[1], false);
    const e = this.eul;
    e[ar * 3] = _ik[0]; e[ar * 3 + 1] = _ik[1]; e[ar * 3 + 2] = _ik[2]; e[fo * 3] = _ik[3];
  }
  legIK(si) {
    const W = this.W;
    const th = si ? THR : THL, sh = si ? SHR : SHL;
    const t = this.legT, pl = this.legP, k = si * 3, q = P * 12;
    const rx = t[k] - W[q + 9], ry = t[k + 1] - W[q + 10], rz = t[k + 2] - W[q + 11];
    const lx = W[q] * rx + W[q + 3] * ry + W[q + 6] * rz, ly = W[q + 1] * rx + W[q + 4] * ry + W[q + 7] * rz, lz = W[q + 2] * rx + W[q + 5] * ry + W[q + 8] * rz;
    const plx = W[q] * pl[k] + W[q + 3] * pl[k + 1] + W[q + 6] * pl[k + 2], ply = W[q + 1] * pl[k] + W[q + 4] * pl[k + 1] + W[q + 7] * pl[k + 2], plz = W[q + 2] * pl[k] + W[q + 5] * pl[k + 1] + W[q + 8] * pl[k + 2];
    solve2(_ik, this.off[th * 3], this.off[th * 3 + 1], this.off[th * 3 + 2], lx, ly, lz, plx, ply, plz, this.len[2], this.len[3], true);
    const e = this.eul;
    e[th * 3] = _ik[0]; e[th * 3 + 1] = _ik[1]; e[th * 3 + 2] = _ik[2]; e[sh * 3] = _ik[3];
  }
  handWorld(si) {
    const ha = si ? HAR : HAL, fo = si ? FOR : FOL, W = this.W, p = fo * 12, w = this.hw[si];
    eulerMat(_M, 0, this.hwP[si], this.yaw, 0, 0);
    const L = _R;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) L[r * 3 + c] = W[p + r] * _M[c] + W[p + 3 + r] * _M[3 + c] + W[p + 6 + r] * _M[6 + c];
    const z = Math.asin(clamp(-L[1], -1, 1)), y = Math.atan2(L[2], L[0]), x = Math.atan2(L[7], L[4]);
    const e = this.eul, o = ha * 3;
    const al = (a, b) => { let d = b - a; d -= Math.round(d / TAU) * TAU; return a + d * w; };
    e[o] = al(e[o], x); e[o + 1] = al(e[o + 1], y); e[o + 2] = al(e[o + 2], z);
  }
  footFlat(b, yaw, pitch, roll = 0) {
    eulerMat(this.wrot, b * 9, pitch, yaw, roll, 0);
    this.wOn[b] = 1;
  }
  fk(write = true) {
    const nb = this.nb;
    for (let b = 0; b < nb; b++) {
      if (b === ARL && this.armOn[0]) this.armIK(0);
      else if (b === ARR && this.armOn[1]) this.armIK(1);
      else if (b === THL && this.legOn[0]) this.legIK(0);
      else if (b === THR && this.legOn[1]) this.legIK(1);
      else if (b === HAL && this.hw[0] > 0.001) this.handWorld(0);
      else if (b === HAR && this.hw[1] > 0.001) this.handWorld(1);
      this.bone(b);
    }
    if (write) this.write();
  }
  write() {
    const nb = this.nb, W = this.W, S = this.sc, D = this.pool.data;
    let o = this.row * this.pool.w * 4;
    for (let b = 0; b < nb; b++) {
      const w = b * 12, sx = S[b * 3], sy = S[b * 3 + 1], sz = S[b * 3 + 2];
      const bx = BIND[b][0], by = BIND[b][1], bz = BIND[b][2];
      for (let r = 0; r < 3; r++) {
        const m0 = W[w + r * 3] * sx, m1 = W[w + r * 3 + 1] * sy, m2 = W[w + r * 3 + 2] * sz;
        D[o++] = m0; D[o++] = m1; D[o++] = m2; D[o++] = W[w + 9 + r] - (m0 * bx + m1 * by + m2 * bz);
      }
    }
    D[o] = this.fx[0]; D[o + 1] = this.fx[1]; D[o + 2] = this.fx[2]; D[o + 3] = this.fx[3];
  }
}

const U_REST = 0, U_CLAP = 1, U_UP = 2, U_PUMP = 3, U_BANG = 4, U_WORSHIP = 5, U_HUG = 6, U_MOSH = 7, U_SWAY = 8, U_RUN = 9, U_CLAPHI = 10;
const NU = 11;
const L_STILL = 0, L_SWAY = 1, L_BOUNCE = 2, L_JUMP = 3, L_SHUFFLE = 4, L_MOSH = 5;
const NL = 6;
const UCN = 46, LCN = 17;
const ua = (si) => 14 + si * 14;

function arm(U, si, tx, ty, tz, px, py, pz, fr, tw, flex, dev, htw, curl, cy = 0, cz = 0) {
  const o = ua(si);
  U[o] = tx; U[o + 1] = ty; U[o + 2] = tz; U[o + 3] = px; U[o + 4] = py; U[o + 5] = pz; U[o + 6] = fr; U[o + 7] = tw;
  U[o + 8] = flex; U[o + 9] = dev; U[o + 10] = htw; U[o + 11] = curl; U[o + 12] = cy; U[o + 13] = cz;
}

function upRest(p, U, c) {
  const t = c.t, ph = p.ph;
  U[3] = 0.012 * Math.sin(t * 1.6 + ph);
  for (let si = 0; si < 2; si++) {
    const s = si ? 1 : -1;
    if (c.kneel > 0.5) {
      if (p.restKind % 2 === 0) arm(U, si, s * 0.035, -0.06, -0.24, s * 1, -0.6, 0.3, 0, s * 0.4, 0.15, -0.2, 0, 0.15);
      else arm(U, si, s * 0.07, 0.02, -0.42, s * 1, -0.5, 0.2, 0, s * 0.2, 0.5, 0.1, 0, 0.5);
    } else if (c.seat > 0.5) {
      const k = p.restKind;
      if (k === 0) arm(U, si, s * 0.15, -0.28, -0.25, s * 0.6, 0.0, 1, 1, s * 0.6, -0.2, -0.3, 0, 0.35);
      else if (k === 1) arm(U, si, s * 0.04, -0.3, -0.24, s * 0.7, -0.2, 0.8, 1, s * 0.9, 0.2, -0.2, 0, 0.4);
      else if (k === 2) arm(U, si, -s * 0.1, -0.13, -0.17, s * 1, -0.7, 0.2, 0, s * 0.6, 0.1, 0, 0, 0.5);
      else arm(U, si, s * 0.17, -0.29, -0.23, s * 0.5, 0.0, 1, 1, s * 0.5, -0.3, -0.3, 0, 0.3);
    } else {
      const k = p.restKind;
      if (k === 0) arm(U, si, s * 0.205, -0.36, 0.0, s * 0.3, 0, 1, 0.6, 0, 0.1, 0, 0, 0.35);
      else if (k === 1) arm(U, si, s * 0.04, -0.3, -0.19, s * 1, -0.4, 0.6, 0.5, s * 0.8, 0.2, -0.2, 0, 0.35);
      else if (k === 2) arm(U, si, s * 0.06, -0.36, 0.16, s * 1, 0, -0.4, 0.5, 0, 0.3, 0, 0, 0.45);
      else arm(U, si, s * 0.17, -0.33, -0.05, s * 1, 0.2, 0.6, 0.6, 0, 0.6, 0, 0, 0.8);
    }
  }
}

function upClap(p, U, c, high) {
  const div = p.clapDiv;
  const q = fract(c.b / div + (div > 1 ? p.clapOff : 0));
  const open = Math.pow(Math.sin(PI * clamp(q * 1.05)), 0.75);
  const gap = 0.022 + (high ? 0.15 : 0.12) * open * c.amp;
  const hit = pulse(q, 9);
  if (high) {
    const lift = 0.02 * hit;
    for (let si = 0; si < 2; si++) { const s = si ? 1 : -1; arm(U, si, s * (gap + 0.01), 0.58 + lift, -0.17, s * 1, -0.3, 0.2, 0, s * 0.2, -0.25, 0.0, 0, 0.05); U[42 + si] = 1; U[44 + si] = PI - 0.2; }
    U[0] = 0.04; U[3] = 0.06; U[9] = 0.16 - 0.08 * hit;
  } else {
    const y = c.seat > 0.5 ? -0.02 : -0.06;
    for (let si = 0; si < 2; si++) { const s = si ? 1 : -1; arm(U, si, s * (gap + 0.008), y + 0.02 * hit, -0.3, s * 1, -0.8, 0.3, 0, s * 0.35, -0.5, 0.0, 0, 0.05); U[42 + si] = 1; U[44 + si] = PI - 0.75; }
    U[3] = -0.04 * hit; U[9] = -0.1 * hit;
  }
  U[6] = -0.05 * hit;
  U[12] = p.sings ? 0.25 + 0.2 * Math.sin(c.t * 9 + p.ph) : 0.05;
}

function upUp(p, U, c) {
  const sw = Math.sin(PI * c.b * 0.5 + p.ph * 0.3) * c.amp;
  const jh = c.jumpH;
  const one = p.oneArm;
  for (let si = 0; si < 2; si++) {
    const s = si ? 1 : -1;
    if (one && s !== p.hand) { arm(U, si, s * 0.2, -0.34, -0.03, s * 0.3, 0, 1, 0.5, 0, 0.1, 0, 0, 0.4); continue; }
    const wave = 0.13 * sw;
    arm(U, si, s * 0.36 + wave, 0.6 + 0.04 * jh + 0.03 * Math.cos(PI * c.b), -0.12, s * 1, -0.3, 0.1, 0, -s * 1.1, -0.15, 0.25 * sw, 0, 0.12);
  }
  U[2] = -0.06 * sw; U[5] = -0.05 * sw; U[0] = 0.03; U[9] = 0.12 + 0.05 * jh; U[11] = 0.08 * sw;
  U[12] = p.sings ? 0.35 : 0.1;
}

function upPump(p, U, c) {
  const q = c.ph;
  const hit = Math.max(pulse(q, 2.6), smooth(0.84, 1.0, q));
  const d = p.hand, both = p.both;
  for (let si = 0; si < 2; si++) {
    const s = si ? 1 : -1;
    if (s === d || both) {
      const k = both && s !== d ? Math.max(pulse(fract(q + 0.5), 2.6), smooth(0.84, 1, fract(q + 0.5))) : hit;
      const a = clamp(k * (0.6 + 0.5 * c.amp));
      arm(U, si, s * lerp(0.22, 0.12, a), lerp(0.2, 0.66, a), lerp(-0.33, -0.2, a), s * 1, -0.7 + 0.5 * a, 0.1, 0, s * 0.3, 0.2, 0, 0, 0.95, 0, 0.06 * a);
    } else arm(U, si, s * 0.2, -0.3, -0.1, s * 0.6, -0.2, 1, 0.3, 0, 0.2, 0, 0, 0.8);
  }
  U[3] = -0.08 * hit * c.amp; U[1] = d * -0.08 * hit; U[9] = -0.14 * hit + 0.06; U[6] = -0.06 * hit;
  U[12] = p.shouts ? 0.75 * hit : 0.1;
}

function upBang(p, U, c) {
  const q = fract(c.ph + 0.97);
  const hit = pulse(q, 3.5) * (1 - smooth(0.0, 0.03, -q));
  const down = Math.max(hit, smooth(0.8, 1.0, q) * 0.5);
  const a = c.amp;
  U[0] = -0.12 * a; U[3] = -0.18 * a - 0.12 * down * a; U[6] = -0.2 * down * a + 0.1 * (1 - down) * a; U[9] = -0.45 * down * a + 0.25 * (1 - down) * a;
  U[12] = p.shouts ? 0.6 * down : 0.15;
  for (let si = 0; si < 2; si++) {
    const s = si ? 1 : -1;
    if (p.horns && s === p.hand) arm(U, si, s * 0.16, 0.56, -0.2, s * 1, -0.4, 0.2, 0, s * 0.3, 0.1, 0, 0, 0.75);
    else arm(U, si, s * 0.19, -0.38 + 0.06 * down, -0.12 - 0.06 * down, s * 0.4, 0, 1, 0, 0, 0.2, 0, 0, 0.6);
  }
}

function upWorship(p, U, c) {
  const sw = Math.sin(PI * c.b * 0.25 + p.ph);
  const one = p.oneArm;
  for (let si = 0; si < 2; si++) {
    const s = si ? 1 : -1;
    if (one && s !== p.hand) { arm(U, si, -s * 0.02, -0.02, -0.16, s * 1, -0.6, 0.3, 0, s * 0.8, 0.2, 0.0, 0, 0.1); continue; }
    arm(U, si, s * 0.24 + 0.05 * sw, 0.47 + 0.03 * Math.sin(PI * c.b * 0.5 + p.ph), -0.3, s * 1, -0.5, 0.3, 0, -s * 1.25, -0.6, 0.0, 0, 0.08);
  }
  U[0] = 0.04; U[2] = 0.05 * sw; U[5] = 0.04 * sw; U[6] = 0.1; U[9] = 0.22; U[11] = 0.1 * sw;
  U[13] = 1; U[12] = p.sings ? 0.2 + 0.15 * Math.sin(c.t * 5 + p.ph) : 0.05;
}

function upHug(p, U, c) {
  const sw = Math.sin(PI * c.gb * 0.5 + p.rowPh);
  for (let si = 0; si < 2; si++) {
    const s = si ? 1 : -1;
    if (p.nb[si]) arm(U, si, s * 0.6, 0.11, 0.06, s * 0.15, -1, 0.3, 0, s * 0.6, -0.2, 0.2, 0, 0.3, 0, 0.06);
    else arm(U, si, s * 0.2, -0.34, -0.02, s * 0.3, 0, 1, 0.5, 0, 0.1, 0, 0, 0.4);
  }
  U[2] = -0.09 * sw; U[5] = -0.05 * sw; U[11] = -0.12 * sw; U[8] = -0.04 * sw;
  U[12] = 0.3 + 0.25 * Math.sin(c.t * 6 + p.ph);
}

function upMosh(p, U, c) {
  const a = c.amp;
  for (let si = 0; si < 2; si++) {
    const s = si ? 1 : -1;
    const q = fract(c.b * 2 + (si ? 0.5 : 0));
    const h = pulse(q, 6);
    arm(U, si, s * 0.3, -0.02 + 0.16 * h * a, -0.24, s * 1, 0.4, 0.1, 0, s * 0.3, 0.2, 0, 0, 0.95);
  }
  const hit = pulse(c.ph, 4);
  const tw = Math.sin(PI * c.b) * 0.22 * a;
  U[0] = -0.14 * a; U[3] = -0.16 * a; U[4] = tw; U[1] = tw * 0.5; U[6] = -0.12 * hit; U[9] = -0.25 * hit + 0.1;
  U[12] = p.shouts ? 0.85 * hit + 0.1 : 0.2;
}

function upSway(p, U, c) {
  const sw = Math.sin(PI * c.b * 0.5 + p.ph * 0.2);
  for (let si = 0; si < 2; si++) {
    const s = si ? 1 : -1;
    arm(U, si, s * 0.2 + 0.03 * sw, -0.34, -0.05 + 0.04 * sw * s, s * 0.3, 0, 1, 0.5, 0, 0.1, 0, 0, 0.35);
  }
  U[2] = -0.04 * sw; U[11] = -0.08 * sw; U[9] = 0.04;
  U[12] = p.sings ? 0.25 + 0.2 * Math.sin(c.t * 7 + p.ph) : 0.05;
}

function upRun(p, U, c) {
  for (let si = 0; si < 2; si++) {
    const s = si ? 1 : -1;
    const sw = Math.sin(PI * c.b + (si ? PI : 0));
    arm(U, si, s * 0.2, -0.17 + 0.13 * sw, -0.12 - 0.16 * sw, s * 0.4, -0.6, 0.6, 0, s * 0.3, 0.1, 0, 0, 0.9);
  }
  U[3] = -0.08; U[9] = -0.1 * pulse(c.ph, 5);
}

const UPS = [upRest, (p, U, c) => upClap(p, U, c, false), upUp, upPump, upBang, upWorship, upHug, upMosh, upSway, upRun, (p, U, c) => upClap(p, U, c, true)];

function loStill(p, L, c) {
  L[0] = 0.018 * Math.sin(c.t * 0.35 + p.ph); L[5] = -0.03 * Math.sin(c.t * 0.35 + p.ph);
}

function loSway(p, L, c) {
  const per = p.slow ? 0.25 : 0.5;
  const sw = Math.sin(PI * c.b * per + p.ph * 0.2);
  const k = pulse(c.ph, 4) * c.amp;
  L[0] = 0.045 * sw * c.amp; L[5] = -0.05 * sw * c.amp; L[1] = -0.012 * k; L[4] = 0.04 * sw;
}

function loBounce(p, L, c) {
  const a = c.amp, b = c.b;
  const dip = Math.pow(0.5 + 0.5 * Math.cos(TAU * (c.ph - 0.06)), 1.6);
  const w = Math.cos(PI * (b - 0.15));
  L[1] = -0.04 * dip * a;
  L[0] = 0.045 * w * a; L[5] = -0.05 * w * a; L[4] = 0.08 * Math.sin(PI * b) * a; L[3] = -0.03 * dip * a;
  const even = (Math.floor(b) & 1) === 0;
  const free = even ? 0 : 1;
  const lift = bump(c.ph, 0.08, 0.62) * a;
  const o = 6 + free * 5;
  L[o + 1] = 0.045 * lift; L[o] = (free ? -1 : 1) * 0.025 * lift; L[o + 2] = -0.02 * lift; L[o + 3] = 0.25 * lift;
}

function loJump(p, L, c) {
  const a = c.amp;
  const div = c.jdiv;
  const q = fract(c.b / div + 0.02);
  const T = c.per * div;
  const tf = 0.62 * T;
  const Hm = Math.min(0.26, 9.81 * tf * tf / 8) * a;
  const u = (q - 0.18) / 0.62;
  const h = u > 0 && u < 1 ? Hm * 4 * u * (1 - u) : 0;
  const cmp = (bump(fract(q + 0.2), 0.0, 0.4)) * 0.09 * a;
  L[1] = h - cmp;
  L[3] = -0.08 * cmp / 0.09;
  const tuck = u > 0 && u < 1 ? Math.sin(PI * u) * 0.05 * a : 0;
  for (let si = 0; si < 2; si++) { const o = 6 + si * 5; L[o + 1] = Math.max(0, h - tuck * 0.5); L[o + 3] = -0.7 * (u > 0 && u < 1 ? Math.sin(PI * clamp(u * 1.3)) : 0) * a; }
  c.jumpH = h / Math.max(0.01, Hm);
}

function loShuffle(p, L, c) {
  const a = c.amp;
  for (let si = 0; si < 2; si++) {
    const psi = fract(c.b / 2 + (si ? 0.25 : 0.75));
    const o = 6 + si * 5;
    if (psi < 0.5) { const k = psi / 0.5; L[o + 2] = lerp(-0.12, 0.12, k) * a; L[o + 1] = 0; L[o + 3] = 0.1 * k; }
    else { const k = (psi - 0.5) / 0.5; L[o + 2] = lerp(0.12, -0.12, k * k * (3 - 2 * k)) * a; L[o + 1] = 0.2 * Math.sin(PI * k) * a; L[o + 3] = -0.4 * Math.sin(PI * k); }
  }
  L[1] = -0.035 * Math.pow(0.5 + 0.5 * Math.cos(TAU * c.ph), 2) * a; L[3] = 0.06;
}

function shoveAt(p, n) {
  const h = hash2(p.seed * 0.013, n * 1.37);
  if (h > 0.42) return null;
  const an = hash2(p.seed * 0.71, n * 2.11) * TAU;
  const m = 0.06 + 0.1 * hash2(p.seed * 0.37, n * 0.53);
  return [Math.cos(an) * m, Math.sin(an) * m];
}

function loMosh(p, L, c) {
  const a = c.amp, b = c.b;
  let ox = 0, oz = 0;
  const n0 = Math.floor(b);
  for (let k = 0; k < 3; k++) {
    const n = n0 - k, s = shoveAt(p, n);
    if (!s) continue;
    const tau = (b - n) * c.per;
    const g = tau * Math.exp(-tau * 5.5) * 13.5;
    ox += s[0] * g; oz += s[1] * g;
  }
  const sx = Math.sin(p.x * 1.3 + c.gb * 0.45) * 0.07 + Math.sin(p.z * 1.7 - c.gb * 0.31) * 0.05;
  const sz = Math.sin(p.z * 1.1 + c.gb * 0.38) * 0.07 + Math.sin(p.x * 0.9 + c.gb * 0.27) * 0.04;
  ox = (ox + sx) * a; oz = (oz + sz) * a;
  const jump = p.moshJump;
  const q = c.ph;
  const hop = jump ? Math.max(0, Math.sin(PI * clamp((q - 0.15) / 0.65))) * 0.11 * a : 0;
  const dip = Math.pow(0.5 + 0.5 * Math.cos(TAU * (q - 0.05)), 2) * 0.05 * a;
  L[0] = ox; L[2] = oz; L[1] = hop - dip;
  L[5] = -ox * 1.6; L[3] = oz * 1.2 - 0.08;
  L[4] = 0.2 * Math.sin(PI * b * 0.5 + p.ph) * a;
  for (let si = 0; si < 2; si++) {
    const o = 6 + si * 5;
    const q8 = fract(b * 2 + (si ? 0.5 : 0));
    const kick = bump(q8, 0.05, 0.55) * (jump ? 0.3 : 1) * a;
    L[o] = ox * 0.55; L[o + 2] = oz * 0.55 - 0.1 * kick; L[o + 1] = Math.max(0, hop - 0.02) + 0.07 * kick; L[o + 3] = 0.3 * kick;
  }
  c.moshLean = ox;
}

const LOS = [loStill, loSway, loBounce, loJump, loShuffle, loMosh];

const SKINS = ['#f2d3bf', '#eac4ab', '#e2b89c', '#ecc8b0', '#d9a88b', '#e6bba0', '#f0cdb6'];
const IRIS = ['#5b7fa3', '#6f8ea8', '#7a8a7a', '#6b5a3e', '#4a3526', '#8095a4', '#55704f'];
const HAIR_OLD = ['#ece8e0', '#d9d5cc', '#c2bdb4', '#a29d95', '#8a847b', '#e2ddd2'];
const HAIR_DYED = ['#5a3a2c', '#4a2f2a', '#6e4a36', '#3b2a24', '#7a5a40'];
const HAIR_MID = ['#3a2a20', '#4e3a2a', '#2a211c', '#6b5238', '#8a6d48', '#1e1a18', '#5f5850'];
const HAIR_YOUNG = ['#3a2a20', '#5a4128', '#8f6c40', '#b8935e', '#241c18', '#6b4a2e', '#c9a46a'];
const COATS_OLD = ['#1e2a44', '#2a2b30', '#3a3634', '#4a3b30', '#6b5a48', '#b49f82', '#5a5f66', '#2f3a2f', '#43303c', '#2b3540', '#7a6a58', '#3d4552', '#1b1c20', '#8a7d6d', '#55483e'];
const PUFFERS = ['#1d2840', '#16171a', '#2e3a30', '#d4c8b0', '#5a6068', '#3e4636', '#2b3550', '#6a5a78', '#7a8a94', '#bfb39b', '#2a4a4a', '#8a6d3a', '#222c3a', '#40464e'];
const PUFF_YOUNG = ['#16171a', '#3e4636', '#c8c2b8', '#1d2840', '#7a6a3a', '#2a4a4a', '#5a6068', '#a8a49c', '#33302c', '#4b3f5c'];
const PANTS = ['#26272b', '#1c1d20', '#2e3440', '#3d342c', '#4a4844', '#55504a', '#6a6252', '#33363c'];
const JEANS = ['#2c3a52', '#34445e', '#1f2a3c', '#3a4a62'];
const TIGHTS = ['#1a1a1c', '#2b2422', '#3a302a', '#8a7060', '#242428'];
const SKIRTS = ['#2a2b30', '#33303a', '#3d342c', '#1e2a44', '#4a4844', '#3a3330', '#2f3a2f'];
const SHOES = ['#151515', '#1d1a18', '#2c231c', '#3a2c22', '#242424'];
const SNEAK = ['#d8d6d0', '#2a2a2a', '#4a5058', '#c9c4ba', '#1f2a3c'];
const SCARVES = ['#7a7570', '#b8ab92', '#2b3550', '#8a6d3a', '#5a2a30', '#3e4a3a', '#6a5a78', '#c9c2b4', '#4a4e56', '#7a3a32'];
const KNIT = ['#5a5f66', '#2b3550', '#1b1c20', '#b8ab92', '#6a5a78', '#3e4a3a', '#d8d2c6', '#4a3b30', '#7a6a58'];
const BERETS = ['#1e2a44', '#1b1c20', '#4a3b30', '#7a6a58', '#43303c', '#5a5f66'];
const CAPS = ['#5a5550', '#4a3b30', '#3a3634', '#6b6258', '#2a2b30'];
const KERCH = ['#2b3550', '#4a3b30', '#3e4a3a', '#5a4a6a', '#6b5a48', '#2a2b30'];
const FURS = ['#4a3a2c', '#6b5a48', '#8a8078', '#3a302a', '#d8d0c4'];

const HAIRS = ['short', 'bald', 'bob', 'long', 'bun', 'perm'];
const HATS = ['beanie', 'cap', 'beret', 'kerchief'];

function makeLook(r, o = {}) {
  const ageCls = o.ageCls ?? wpick(r, [['old', 55], ['mid', 25], ['teen', 10], ['kid', 6], ['young', 4]]);
  const age = o.age ?? { old: 60 + r() * 26, mid: 38 + r() * 21, teen: 13 + r() * 6, kid: 6 + r() * 6, young: 20 + r() * 17 }[ageCls];
  const male = o.male ?? (ageCls === 'old' ? r() < 0.4 : r() < 0.5);
  const L = { age, male, ageCls };
  const old = age >= 58, kid = age < 13, teen = age >= 13 && age < 20;
  let h = male ? 1.73 + (r() - 0.5) * 0.12 : 1.61 + (r() - 0.5) * 0.1;
  if (old) h -= 0.02 + (age - 60) * 0.0015;
  if (kid) h = 1.12 + (age - 6) * 0.055 + r() * 0.05;
  if (teen) h = male ? 1.6 + (age - 13) * 0.025 + r() * 0.08 : 1.55 + (age - 13) * 0.012 + r() * 0.06;
  if (o.h) h = o.h;
  const H = h / 1.72;
  const girth = o.girth ?? (kid ? 0.92 : teen ? 0.94 + r() * 0.06 : 0.97 + r() * (old ? 0.2 : 0.14));
  L.prop = {
    h: H, girth, belly: o.belly ?? (male && !kid && !teen ? 1 + r() * (old ? 0.35 : 0.2) : 1 + r() * 0.12),
    shoulder: male ? 1.0 + r() * 0.05 : 0.92 + r() * 0.04, hip: male ? 0.97 : 1.05 + r() * 0.05,
    head: kid ? 1.0 - (12 - age) * 0.012 : teen ? 0.97 : (male ? 1.0 : 0.96) + (r() - 0.5) * 0.04,
    leg: kid ? 0.97 : 1, arm: 1, limb: (male ? 1.02 : 0.96) * (0.97 + 0.06 * girth), neck: male ? 1.04 : 0.94, hand: male ? 0.96 : 0.88,
  };
  L.variant = o.variant ?? (kid || teen ? (!male && r() < 0.12 ? 2 : 0) : male ? (r() < (old ? 0.4 : 0.3) ? 1 : 0) : wpick(r, old ? [[1, 45], [2, 30], [0, 25]] : [[0, 55], [1, 30], [2, 15]]));
  const hairCol = o.hairCol ?? (old ? (!male && r() < 0.3 ? pick(r, HAIR_DYED) : pick(r, HAIR_OLD)) : ageCls === 'mid' ? (r() < 0.3 ? pick(r, ['#7a746a', '#8a847b', '#6a645c']) : pick(r, HAIR_MID)) : pick(r, HAIR_YOUNG));
  L.hairCol = hairCol;
  L.hair = o.hair ?? (male ? (old ? wpick(r, [['bald', 50], ['short', 50]]) : ageCls === 'mid' ? wpick(r, [['short', 70], ['bald', 30]]) : 'short')
    : old ? wpick(r, [['perm', 36], ['bun', 20], ['bob', 26], ['short', 18]]) : ageCls === 'mid' ? wpick(r, [['bob', 45], ['long', 25], ['bun', 18], ['short', 12]]) : wpick(r, [['long', 55], ['bob', 25], ['bun', 20]]));
  let hat = o.hat;
  if (hat === undefined) {
    hat = null;
    if (male && old && r() < 0.16) hat = 'cap';
    else if (male && r() < 0.08) hat = 'beanie';
    else if (!male && old && L.hair !== 'perm' && L.hair !== 'bun') hat = wpick(r, [[null, 64], ['beanie', 14], ['beret', 12], ['kerchief', 10]]);
    else if (!male && old && L.hair === 'perm' && r() < 0.12) hat = 'beret';
    else if ((teen || kid) && L.hair !== 'bun' && r() < 0.2) hat = 'beanie';
  }
  if (hat === 'kerchief') L.hair = null;
  L.hat = hat;
  L.hatCol = o.hatCol ?? (hat === 'beanie' ? pick(r, KNIT) : hat === 'beret' ? pick(r, BERETS) : hat === 'cap' ? pick(r, CAPS) : pick(r, KERCH));
  L.glasses = o.glasses ?? r() < (old ? 0.55 : ageCls === 'mid' ? 0.3 : 0.1);
  L.scarf = o.scarf ?? r() < (old ? 0.4 : 0.28);
  L.scarfCol = o.scarfCol ?? pick(r, SCARVES);
  L.skin = o.skin ?? (kid ? '#f3d8c6' : male && old && r() < 0.3 ? '#dba58a' : pick(r, SKINS));
  L.iris = pick(r, IRIS);
  L.face = o.face ?? (kid || teen ? 6 : old ? (male ? wpick(r, [[0, 40], [1, 35], [7, 25]]) : wpick(r, [[2, 55], [3, 45]])) : male ? 4 : 5);
  const puffy = L.variant !== 1 && r() < (teen || kid ? 0.85 : 0.6);
  L.coatPat = o.coatPat ?? (L.variant === 1 ? PT.wool : puffy ? PT.quilt : PT.plain);
  L.coat = o.coat ?? (L.variant === 1 ? pick(r, COATS_OLD) : puffy ? (teen || kid ? pick(r, PUFF_YOUNG) : pick(r, PUFFERS)) : pick(r, COATS_OLD));
  const fur = !male && old && L.variant === 1 && r() < 0.35;
  L.trim = o.trim ?? (fur ? pick(r, FURS) : new THREE.Color(L.coat).multiplyScalar(0.8).getStyle());
  L.trimPat = fur ? PT.fur : L.coatPat === PT.quilt ? PT.plain : L.coatPat;
  L.pants = o.pants ?? (L.variant === 2 ? pick(r, SKIRTS) : teen || (ageCls !== 'old' && r() < 0.45) ? pick(r, JEANS) : pick(r, PANTS));
  L.pantsPat = male && old && r() < 0.3 ? PT.cord : PT.plain;
  L.legs = o.legs ?? (L.variant === 2 ? pick(r, TIGHTS) : L.variant === 1 && !male ? (r() < 0.5 ? pick(r, TIGHTS) : L.pants) : L.pants);
  L.shoe = o.shoe ?? (teen || kid ? pick(r, SNEAK) : pick(r, SHOES));
  L.sole = teen || kid ? '#e8e6e0' : '#1a1918';
  L.gloves = r() < 0.06 ? pick(r, ['#1b1c20', '#3a2c22', '#4a4e56']) : null;
  return L;
}

const PRESETS = {
  redHatLady: { ageCls: 'old', age: 72, male: false, h: 1.58, variant: 1, coat: '#1c2742', coatPat: PT.wool, trim: '#18213a', hair: 'bob', hairCol: '#5a463a', hat: 'beanie', hatCol: '#b0252b', glasses: false, scarf: false, legs: '#1d1c20', pants: '#1d1c20', shoe: '#141414', face: 3, skin: '#ecc8b0' },
  navyJacketMan: { ageCls: 'old', age: 71, male: true, h: 1.76, girth: 1.12, belly: 1.25, variant: 0, coat: '#1b263d', coatPat: PT.quilt, trim: '#18213a', hair: 'short', hairCol: '#b4afa6', hat: null, glasses: false, scarf: false, pants: '#2a2b30', legs: '#2a2b30', shoe: '#161514', face: 0, skin: '#e2b89c' },
  beigeJacketLady: { ageCls: 'old', age: 77, male: false, h: 1.56, variant: 0, coat: '#d8ccb2', coatPat: PT.quilt, trim: '#cbbd9f', hair: 'perm', hairCol: '#eeeae2', hat: null, glasses: true, scarf: false, pants: '#2e2d31', legs: '#2e2d31', shoe: '#1d1a18', face: 2, skin: '#f0cdb6' },
};

function applyLook(pool, row, L) {
  const S = (slot, c, pat, rough = 0.85, metal = 0, ex = 0, ex2 = 0) => pool.setSlot(row, slot, new THREE.Color(c), pat, rough, metal, ex, ex2);
  S(S_SKIN, L.skin, PT.skin, 0.55, 0, L.face);
  S(S_HAIR, L.hairCol, L.hair === 'perm' ? PT.curly : PT.hair, 0.55);
  S(S_COAT, L.coat, L.coatPat, L.coatPat === PT.quilt ? 0.48 : 0.92);
  S(S_TRIM, L.trim, L.trimPat, 0.9);
  S(S_PANTS, L.pants, L.pantsPat, 0.88);
  S(S_LEGS, L.legs, L.variant === 2 ? PT.plain : L.pantsPat, L.variant === 2 ? 0.6 : 0.88);
  S(S_SHOE, L.shoe, PT.leather, L.shoe === '#d8d6d0' || L.shoe === '#c9c4ba' ? 0.7 : 0.38);
  S(S_SOLE, L.sole, PT.plain, 0.8);
  S(S_INNER, L.trim, PT.plain, 0.9);
  S(S_HAT, L.hatCol, L.hat === 'beanie' ? PT.knit : L.hat === 'kerchief' ? PT.print : L.hat === 'cap' ? PT.wool : PT.wool, 0.92);
  S(S_SCARF, L.scarfCol, PT.knit, 0.95);
  S(S_GLASS, L.age > 50 ? '#3a3330' : '#1a1a1c', PT.plain, 0.3, 0.3);
  S(S_IRIS, L.iris, PT.plain, 0.3, 0, 0);
  pool.pal[(row * NSLOT * 2 + S_IRIS * 2 + 1) * 4] = L.age > 60 ? 0.78 : L.age < 13 ? 1.15 : 0.92;
  S(S_HAND, L.gloves || L.skin, L.gloves ? PT.leather : PT.skin, L.gloves ? 0.6 : 0.55);
}

const _q4 = new Float32Array(4);
const UA = new Float32Array(UCN), UB = new Float32Array(UCN), LA = new Float32Array(LCN), LB = new Float32Array(LCN), UF = new Float32Array(UCN), LF = new Float32Array(LCN);
const _frus = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sp = new THREE.Sphere(new THREE.Vector3(), 1.15);

export class Congregation {
  constructor(scene, { places = [], quality = 'mid', seed = 1, fill = 0.6, special = [] } = {}) {
    const r = rng(seed * 7919 + 13);
    this.scene = scene;
    this.quality = quality;
    this.mood = { stand: 0, kneel: 0, sleep: 0, sway: 0, clap: 0, raise: 0, jump: 0, mosh: 0, worship: 0, headbang: 0, peace: 0, pump: 0, shuffle: 0, hug: 0, sing: 0 };
    this.slots = [];
    this.people = [];
    const all = places.map((pl) => ({ ...pl }));
    const used = new Set();
    const specials = [];
    for (const sp of special) {
      let best = -1, bd = 0.35;
      all.forEach((pl, i) => { const d = Math.hypot(pl.x - sp.x, pl.z - sp.z); if (d < bd && !used.has(i)) { bd = d; best = i; } });
      if (best >= 0) { used.add(best); specials.push([best, sp.preset]); }
      else { all.push({ x: sp.x, z: sp.z, yaw: sp.yaw ?? 0, kind: sp.kind || 'seat' }); used.add(all.length - 1); specials.push([all.length - 1, sp.preset]); }
    }
    const presetAt = new Map(specials);
    const chosen = [];
    all.forEach((pl, i) => {
      const slot = pl.kind === 'seat' ? { x: pl.x, z: pl.z, yaw: pl.yaw || 0, taken: false } : null;
      if (slot) this.slots.push(slot);
      const take = presetAt.has(i) || pl.kind === 'stand' || r() < fill;
      if (take) { if (slot) slot.taken = true; chosen.push({ pl, slot, preset: presetAt.get(i) }); }
    });
    const N = chosen.length;
    this.pool = new RigPool(NB_CROWD, Math.max(1, N));
    this.face = faceAtlas();
    this.mat = humanMaterial(this.pool.tex, this.pool.palTex, this.face, NB_CROWD);
    chosen.forEach((ch, i) => {
      const pr = ch.preset ? PRESETS[ch.preset] : null;
      const pit = ch.pl.kind === 'stand';
      const look = makeLook(r, pr ? pr : pit ? { ageCls: wpick(r, [['teen', 25], ['young', 25], ['mid', 30], ['old', 20]]) } : {});
      const rig = new Rig(this.pool, i);
      rig.setProportions(look.prop);
      applyLook(this.pool, i, look);
      const p = this.makePerson(r, i, ch.pl, look, rig, pit);
      p.slot = ch.slot;
      p.preset = ch.preset || null;
      this.people.push(p);
    });
    this.findNeighbors();
    this.meshes = [];
    const byKey = new Map();
    const addTo = (key, i) => { if (!byKey.has(key)) byKey.set(key, []); byKey.get(key).push(i); };
    this.people.forEach((p, i) => {
      addTo('body' + p.look.variant, i);
      if (p.look.hair) addTo('hair_' + p.look.hair, i);
      if (p.look.hat) addTo('hat_' + p.look.hat, i);
      if (p.look.glasses) addTo('glasses', i);
      if (p.look.scarf) addTo('scarf', i);
    });
    const geoCache = {};
    const geoFor = (key) => {
      if (geoCache[key]) return geoCache[key];
      let G;
      if (key.startsWith('body')) G = bodyGeo(+key.slice(4));
      else if (key.startsWith('hair_')) G = hairGeo(key.slice(5));
      else if (key.startsWith('hat_')) G = hatGeo(key.slice(4));
      else if (key === 'glasses') G = glassesGeo();
      else G = scarfGeo();
      return (geoCache[key] = G.build());
    };
    this.tris = 0;
    this.lod = [];
    const mkMesh = (geo, list, name) => {
      const g = geo.clone();
      const a = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, list.length)), 1);
      a.array.set(list);
      a.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('aPid', a);
      g.instanceCount = list.length;
      const m = new THREE.Mesh(g, this.mat);
      m.frustumCulled = false;
      m.name = 'crowd_' + name;
      m.onBeforeRender = (rd, sc, cam) => { this.cam = cam; };
      scene.add(m);
      this.meshes.push(m);
      return m;
    };
    for (const [key, list] of byKey) {
      const m = mkMesh(geoFor(key), list, key);
      this.tris += (m.geometry.index.count / 3) * list.length;
      if (key.startsWith('body')) {
        const v = +key.slice(4);
        const far = mkMesh(bodyGeo(v, 1).build(), list.slice(), key + '_lod');
        far.geometry.instanceCount = 0;
        far.visible = false;
        this.lod.push({ near: m, far, list });
      }
    }
    this.wU = new Float32Array(NU); this.wL = new Float32Array(NL); this.snap = new Float32Array(NU + NL); this.ver = 0;
    this.lastBeat = 0; this.per = 0.5; this.frame = 0; this.cpu = 0;
  }

  makePerson(r, i, pl, look, rig, pit) {
    const lazy = clamp((look.age - 50) / 30);
    const aff = new Float32Array(NU), affL = new Float32Array(NL);
    for (let k = 0; k < NU; k++) aff[k] = 0.5 + r();
    for (let k = 0; k < NL; k++) affL[k] = 0.5 + r();
    const oldM = [1, 2.2, 0.7, 0.5, 0.25, 1.6, 1.5, 0.15, 1.8, 0.15, 0.6], youngM = [1, 0.7, 1.3, 1.4, 1.3, 0.9, 0.9, 1.5, 0.6, 1.4, 1.3];
    const oldL = [1, 1.6, 1, 0.25, 0.15, 0.2], youngL = [1, 0.6, 1, 1.4, 1.5, 1.4];
    for (let k = 0; k < NU; k++) aff[k] *= lerp(youngM[k], oldM[k], lazy);
    for (let k = 0; k < NL; k++) affL[k] *= lerp(youngL[k], oldL[k], lazy);
    return {
      i, rig, look, pit, x: pl.x, z: pl.z, yaw: pl.yaw || 0, seat: pl.kind === 'seat', seed: 1 + Math.floor(r() * 1e6),
      lazy, aff, affL, ph: r() * TAU, lag: 0.004 + r() * 0.05 + lazy * 0.03, amp: (0.75 + r() * 0.45) * (1 - 0.35 * lazy),
      hand: r() < 0.86 ? 1 : -1, both: r() < 0.3, oneArm: r() < 0.25, horns: r() < 0.5, sings: r() < 0.6, shouts: r() < 0.55 + 0.3 * (1 - lazy),
      clapDiv: lazy > 0.6 && r() < 0.5 ? 2 : 1, clapOff: r() < 0.5 ? 0 : 0.5, slow: r() < 0.4, moshJump: r() < 0.5, halfJump: r() < 0.35 + lazy * 0.4,
      restKind: Math.floor(r() * 4), feetUp: r() < 0.35, noKneel: lazy > 0.8 && r() < 0.35, stayDown: lazy > 0.5 && r() < 0.08, sleepy: r() < 0.3 + 0.2 * lazy, sleepPer: 6 + r() * 9,
      react: 0.15 + r() * 0.6 + lazy * 0.8, dur: 0.7 + lazy * 0.9 + r() * 0.3, delay: 0.1 + r() * 0.5 + lazy * 0.9,
      post: 0, postWant: 0, postTimer: -1, sS: pit ? 1 : 0, kS: 0,
      uA: U_REST, uB: U_REST, uK: 1, lA: L_STILL, lB: L_STILL, lK: 1, pickAt: 4 + r() * 8, pickLen: r() < 0.5 ? 8 : 16, ver: -1,
      sleepW: 0, peaceW: 0, ly: 0, lp: 0, lyT: 0, lpT: 0, lookAt: r() * 4, blinkAt: r() * 4, rowPh: 0, nb: [0, 0], vis: true, rnd: rng(1 + i * 7717),
    };
  }

  findNeighbors() {
    const P = this.people;
    for (const p of P) {
      const sx = Math.cos(p.yaw), sz = -Math.sin(p.yaw);
      for (const q of P) {
        if (q === p) continue;
        const dx = q.x - p.x, dz = q.z - p.z;
        const side = dx * sx + dz * sz, fwd = Math.abs(dx * -Math.sin(p.yaw) + dz * -Math.cos(p.yaw));
        if (fwd < 0.25 && Math.abs(side) > 0.35 && Math.abs(side) < 0.8) p.nb[side > 0 ? 1 : 0] = 1;
      }
      const fz = p.x * Math.sin(p.yaw) + p.z * Math.cos(p.yaw);
      p.rowPh = hash(Math.round(fz / 0.9) + 0.5) * TAU;
    }
  }

  moodWeights(e) {
    const m = this.mood, U = this.wU, L = this.wL;
    const dance = m.sway + m.clap + m.raise + m.jump + m.mosh + m.worship + m.headbang + m.pump + m.shuffle + m.hug;
    U[U_REST] = Math.max(0, 1 - dance);
    U[U_CLAP] = m.clap * (1 - 0.55 * e); U[U_CLAPHI] = m.clap * 0.55 * e;
    U[U_UP] = m.raise + 0.45 * m.jump; U[U_PUMP] = m.pump + 0.35 * m.jump + 0.3 * m.mosh + 0.15 * m.headbang;
    U[U_BANG] = m.headbang; U[U_WORSHIP] = m.worship; U[U_HUG] = m.hug + 0.15 * m.sway; U[U_MOSH] = m.mosh; U[U_SWAY] = 0.7 * m.sway; U[U_RUN] = m.shuffle;
    L[L_STILL] = Math.max(0, 1 - dance); L[L_SWAY] = m.sway + m.worship + 0.8 * m.hug + 0.25 * m.clap; L[L_BOUNCE] = 0.6 * m.clap + 0.6 * m.raise + m.pump + m.headbang + 0.1 * dance;
    L[L_JUMP] = m.jump; L[L_SHUFFLE] = m.shuffle; L[L_MOSH] = m.mosh;
    let d = 0;
    for (let k = 0; k < NU; k++) d += Math.abs(U[k] - this.snap[k]);
    for (let k = 0; k < NL; k++) d += Math.abs(L[k] - this.snap[NU + k]);
    if (d > 0.3) { this.snap.set(U); this.snap.set(L, NU); this.ver++; }
    return dance;
  }

  pick(p, standing) {
    const U = this.wU, L = this.wL, r = p.rnd;
    let s = 0;
    const w = _wu;
    for (let k = 0; k < NU; k++) {
      let v = U[k] * p.aff[k];
      if (k === U_MOSH && !p.pit) v = 0;
      if (k === U_RUN && (!standing || !p.pit && p.seat && this.mood.stand < 0.5)) v = 0;
      if (k === U_REST) v += 0.12 * p.lazy * (1 - this.energy) * (U[k] < 0.95 ? 1 : 0);
      w[k] = v; s += v;
    }
    let x = r() * s, u = U_REST;
    for (let k = 0; k < NU; k++) { x -= w[k]; if (x <= 0 && w[k] > 0) { u = k; break; } }
    let l = L_STILL;
    if (standing) {
      let sl = 0;
      for (let k = 0; k < NL; k++) {
        let v = L[k] * p.affL[k];
        if (k === L_MOSH && !p.pit) v = 0;
        if (k === L_SHUFFLE && p.seat) v *= 0.4;
        if (u === U_RUN) v = k === L_SHUFFLE ? 1 : 0;
        else if (u === U_MOSH) v = k === L_MOSH ? 1 : k === L_JUMP ? 0.5 : 0;
        else if (u === U_WORSHIP || u === U_HUG) v = k === L_SWAY ? 1 : k === L_STILL ? 0.3 : 0;
        else if (k === L_JUMP && !(u === U_UP || u === U_PUMP || u === U_CLAPHI || u === U_BANG)) v *= 0.2;
        if (u !== U_REST && k === L_STILL) v *= 0.3;
        _wl[k] = v; sl += v;
      }
      let y = r() * sl;
      for (let k = 0; k < NL; k++) { y -= _wl[k]; if (y <= 0 && _wl[k] > 0) { l = k; break; } }
    }
    return [u, l];
  }

  update(dt, t, beat, beatPhase, energy = 0) {
    const t0 = performance.now();
    dt = Math.min(dt, 0.1);
    this.energy = energy;
    const db = beat - this.lastBeat;
    if (dt > 0 && db > 0 && db < 1) this.per = damp(this.per, clamp(dt / db, 0.25, 1.5), 2, dt);
    this.lastBeat = beat;
    const dance = this.moodWeights(energy);
    const cam = this.cam;
    if (cam) { _pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); _frus.setFromProjectionMatrix(_pm); }
    this.frame++;
    const far = this.quality === 'low' ? 8 : this.quality === 'high' ? 99 : 14;
    const cp = cam ? cam.position : null;
    if (cp) this.updateLod(cp);
    for (const p of this.people) {
      this.posture(p, dt, t);
      let vis = true, skip = false;
      if (cam) {
        _sp.center.set(p.x, 0.9, p.z);
        vis = _frus.intersectsSphere(_sp);
        if (vis && cp && Math.hypot(cp.x - p.x, cp.z - p.z) > far && ((this.frame + p.i) & 1)) skip = true;
      }
      p.vis = vis;
      if (!vis || skip) continue;
      this.pose(p, dt, t, beat, energy, dance);
    }
    this.pool.tex.needsUpdate = true;
    this.cpu = damp(this.cpu, performance.now() - t0, 3, Math.max(dt, 0.016));
  }

  updateLod(cp) {
    const lim = this.quality === 'low' ? 6 : this.quality === 'high' ? 14 : 9;
    let changed = false;
    for (const p of this.people) {
      const d = Math.hypot(cp.x - p.x, cp.z - p.z);
      const f = p.far ? d > lim - 0.8 : d > lim + 0.8;
      if (f !== !!p.far) { p.far = f; changed = true; }
    }
    if (!changed && this.lodInit) return;
    this.lodInit = true;
    for (const L of this.lod) {
      const na = L.near.geometry.attributes.aPid, fa = L.far.geometry.attributes.aPid;
      let n = 0, f = 0;
      for (const i of L.list) { if (this.people[i].far) fa.array[f++] = i; else na.array[n++] = i; }
      L.near.geometry.instanceCount = n; L.far.geometry.instanceCount = f;
      L.near.visible = n > 0; L.far.visible = f > 0;
      na.needsUpdate = true; fa.needsUpdate = true;
    }
  }

  posture(p, dt, t) {
    const m = this.mood;
    if (p.pit) { p.sS = 1; p.kS = 0; }
    else {
      let want = m.kneel > 0.5 && !p.noKneel ? 2 : m.stand > 0.5 && !(p.stayDown && m.stand < 0.95) ? 1 : 0;
      if (want !== p.postWant) { if (p.postTimer < 0) p.postTimer = p.delay; p.postTimer -= dt; if (p.postTimer <= 0) { p.postWant = want; p.postTimer = -1; } }
      else p.postTimer = -1;
      const sp = dt / p.dur;
      const tS = p.postWant === 1 ? 1 : 0, tK = p.postWant === 2 ? 1 : 0;
      if (p.kS > 0.01 && tK === 0) p.kS = Math.max(0, p.kS - sp);
      else if (tK === 1 && p.sS < 0.01) p.kS = Math.min(1, p.kS + sp);
      else if (tK === 0) p.sS = p.sS < tS ? Math.min(tS, p.sS + sp) : Math.max(tS, p.sS - sp);
      if (tK === 1 && p.sS > 0) p.sS = Math.max(0, p.sS - sp);
    }
    p.sleepW = damp(p.sleepW, p.sleepy && p.sS < 0.5 ? m.sleep : 0, 0.8, dt);
    p.peaceW = damp(p.peaceW, m.peace > 0.5 && (p.nb[0] || p.nb[1]) ? 1 : 0, 2.5 + p.react, dt);
  }

  pose(p, dt, t, beat, e, dance) {
    const r = p.rig, H = r.H, per = this.per;
    const standing = p.sS > 0.5 && p.kS < 0.5;
    const b = beat - p.lag / per;
    if (p.ver !== this.ver) { p.pickAt = Math.min(p.pickAt, beat + p.react / per); p.ver = this.ver; }
    if (beat >= p.pickAt) {
      const [u, l] = this.pick(p, standing);
      if (u !== p.uA) { p.uB = p.uA; p.uA = u; p.uK = 0; }
      if (l !== p.lA) { p.lB = p.lA; p.lA = l; p.lK = 0; }
      p.pickAt = (Math.floor(beat / p.pickLen) + 1) * p.pickLen + (p.i % 4);
      p.wasStanding = standing;
    }
    if (standing !== !!p.wasStanding) { p.pickAt = Math.min(p.pickAt, beat + 0.5); p.wasStanding = standing; }
    p.uK = Math.min(1, p.uK + dt * 2.2); p.lK = Math.min(1, p.lK + dt * 2.2);
    const ctx = _ctx;
    ctx.t = t; ctx.b = b; ctx.ph = fract(b); ctx.per = per; ctx.gb = beat; ctx.e = e;
    ctx.amp = p.amp * (0.45 + 0.55 * e); ctx.seat = 1 - p.sS; ctx.kneel = p.kS; ctx.jumpH = 0; ctx.moshLean = 0;
    ctx.jdiv = per < 0.4 || p.halfJump ? 2 : 1;
    const wS = p.sS * (1 - p.kS), wSeat = (1 - p.sS) * (1 - p.kS);
    LF.fill(0);
    if (wS > 0.01) {
      LA.fill(0); LOS[p.lA](p, LA, ctx);
      if (p.lK < 1) { LB.fill(0); const jh = ctx.jumpH; LOS[p.lB](p, LB, ctx); ctx.jumpH = Math.max(jh, ctx.jumpH); const k = p.lK * p.lK * (3 - 2 * p.lK); for (let i = 0; i < LCN; i++) LF[i] = lerp(LB[i], LA[i], k); }
      else LF.set(LA);
    }
    UA.fill(0); UPS[p.uA](p, UA, ctx);
    if (p.uK < 1) { UB.fill(0); UPS[p.uB](p, UB, ctx); const k = p.uK * p.uK * (3 - 2 * p.uK); for (let i = 0; i < UCN; i++) UF[i] = lerp(UB[i], UA[i], k); }
    else UF.set(UA);
    if (p.uA !== U_REST && p.uB !== U_REST || p.uK >= 1 && p.uA !== U_REST) {
      if (ctx.seat > 0.5) { const dip = pulse(ctx.ph, 5) * ctx.amp; UF[3] += -0.05 * dip; UF[9] += -0.08 * dip; }
    }
    const sw = p.sleepW, pw = p.peaceW;
    if (sw > 0.01) {
      const q = fract(t / p.sleepPer + p.ph);
      const jerk = bump(q, 0.9, 1.0);
      const droop = smooth(0.0, 0.6, q) * (1 - jerk);
      UF[3] -= 0.1 * sw; UF[6] -= (0.18 + 0.15 * droop) * sw; UF[9] -= (0.25 + 0.35 * droop) * sw; UF[11] += 0.15 * sw * Math.sin(p.ph);
      UF[13] = Math.max(UF[13], sw * (1 - jerk)); UF[12] = Math.max(UF[12], 0.12 * sw);
    }
    if (pw > 0.01) {
      const side = p.nb[0] && p.nb[1] ? (Math.floor(t / 3.2 + p.ph) & 1 ? 1 : -1) : p.nb[1] ? 1 : -1;
      const tw = -side * 0.75 * pw;
      UF[1] += tw * 0.25; UF[4] += tw * 0.3; UF[7] += tw * 0.2; UF[10] += tw * 0.35; UF[9] += -0.1 * pw * (0.5 + 0.5 * Math.sin(t * 4 + p.ph));
      const o = ua(1);
      const k = pw;
      const tx = 0.1, ty = -0.14 + 0.02 * Math.sin(t * 13), tz = -0.38;
      UF[o] = lerp(UF[o], tx, k); UF[o + 1] = lerp(UF[o + 1], ty, k); UF[o + 2] = lerp(UF[o + 2], tz, k);
      UF[o + 3] = lerp(UF[o + 3], 1, k); UF[o + 4] = lerp(UF[o + 4], -0.5, k); UF[o + 5] = lerp(UF[o + 5], 0.4, k); UF[o + 6] *= 1 - k; UF[o + 11] = lerp(UF[o + 11], 0.45, k);
      UF[12] = Math.max(UF[12], 0.18 * pw);
    }
    if (this.mood.sing > 0.01 && p.sings) UF[12] = Math.max(UF[12], this.mood.sing * (0.18 + 0.2 * (0.5 + 0.5 * Math.sin(t * 8.3 + p.ph)) * (0.5 + 0.5 * Math.sin(t * 2.1 + p.ph * 3))));
    if (t >= p.lookAt) {
      const rr = p.rnd;
      const busy = dance > 0.3;
      p.lyT = (rr() - 0.5) * (busy ? 0.6 : rr() < 0.25 ? 1.6 : 0.5); p.lpT = (rr() - 0.5) * 0.2 + (p.kS > 0.5 ? -0.2 : 0);
      p.lookAt = t + 1.5 + rr() * 5;
    }
    p.ly = damp(p.ly, p.lyT * (1 - sw), 3, dt); p.lp = damp(p.lp, p.lpT, 3, dt);
    if (t >= p.blinkAt) p.blinkAt = t + 2 + p.rnd() * 4;

    const sS = p.sS * p.sS * (3 - 2 * p.sS), kS = p.kS * p.kS * (3 - 2 * p.kS);
    const rise = Math.sin(PI * p.sS) * (p.sS > 0 && p.sS < 1 ? 1 : 0);
    const hipStand = r.hipY + 0.015 * H - 0.012;
    const seatY = 0.462 + 0.112 * H;
    let px = 0, py = lerp(seatY, hipStand, sS), pz = lerp(0.05, p.pit ? 0 : -0.15, sS) - 0.06 * rise;
    let prx = lerp(0.17, 0, sS) - 0.1 * rise;
    const kneelY = 0.165 + r.len[2] * 0.975 + 0.015 * H;
    py = lerp(py, kneelY, kS); pz = lerp(pz, -0.23, kS); prx = lerp(prx, 0.03, kS);
    const L = LF;
    const wsd = wS;
    px += L[0] * wsd; py += L[1] * wsd; pz += L[2] * wsd;
    if (wSeat > 0.01 && dance > 0.05) { const dip = Math.pow(0.5 + 0.5 * Math.cos(TAU * ctx.ph), 2); py -= 0.006 * dip * wSeat * ctx.amp; }
    const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
    r.root[0] = p.x + cy * px + sy * pz; r.root[1] = py; r.root[2] = p.z - sy * px + cy * pz;
    r.yaw = p.yaw;
    r.set(P, prx + L[3] * wsd, L[4] * wsd, L[5] * wsd);
    const slump = 0.07 * p.lazy;
    r.set(SP, lerp(-0.07, 0, sS) - 0.25 * rise + UF[0] - 0.02 * kS, UF[1], UF[2] - L[5] * wsd * 0.5);
    r.set(CH, -slump + lerp(-0.04, 0, sS) - 0.12 * rise + UF[3], UF[4] - L[4] * wsd * 0.7, UF[5] - L[5] * wsd * 0.4);
    r.set(NK, UF[6] - slump * 0.5 + p.lp * 0.4 - 0.12 * kS, UF[7] + p.ly * 0.4, UF[8]);
    r.set(HD, UF[9] + slump * 1.3 + p.lp * 0.6 - 0.15 * kS, UF[10] + p.ly * 0.6, UF[11]);
    r.set(JW, -0.2 * UF[12], 0, 0);
    for (let si = 0; si < 2; si++) {
      const s = si ? 1 : -1;
      const o = ua(si);
      r.armT[si * 3] = UF[o]; r.armT[si * 3 + 1] = UF[o + 1]; r.armT[si * 3 + 2] = UF[o + 2];
      r.armP[si * 3] = UF[o + 3]; r.armP[si * 3 + 1] = UF[o + 4]; r.armP[si * 3 + 2] = UF[o + 5];
      r.armF[si] = UF[o + 6]; r.armOn[si] = 1;
      const fo = si ? FOR : FOL, ha = si ? HAR : HAL, fi = si ? FIR : FIL, cl = si ? CLR : CLL;
      r.eul[fo * 3 + 1] = UF[o + 7];
      r.set(ha, UF[o + 9], UF[o + 10], -s * UF[o + 8]);
      r.set(fi, 0, 0, -s * UF[o + 11] * 1.9);
      r.set(cl, 0, UF[o + 12], s * UF[o + 13]);
      r.hw[si] = clamp(UF[42 + si]); r.hwP[si] = UF[44 + si];
      const fx = s * lerp(lerp(0.11, p.pit ? 0.1 : 0.09, sS), 0.1, kS) * H;
      const fy0 = 0.085 * H;
      let fy = lerp(fy0 + (p.feetUp ? 0.13 : 0), fy0, sS), fz = lerp(p.feetUp ? -0.34 : -0.25, (p.pit ? 0 : -0.15) + 0.025, sS);
      let pitch = lerp(p.feetUp ? 0.12 : 0, 0, sS);
      fy = lerp(fy, 0.075, kS); fz = lerp(fz, -0.31 + 0.36 * H, kS); pitch = lerp(pitch, -1.85, kS);
      const fo2 = 6 + si * 5;
      let lx = fx + L[fo2] * wsd, ly = fy + L[fo2 + 1] * wsd, lz = fz + L[fo2 + 2] * wsd;
      pitch += L[fo2 + 3] * wsd;
      if (wSeat > 0.01 && dance > 0.05 && si === (p.hand > 0 ? 1 : 0)) pitch += 0.22 * pulse(ctx.ph, 6) * wSeat * ctx.amp;
      const k = si * 3;
      r.legT[k] = p.x + cy * lx + sy * lz; r.legT[k + 1] = Math.max(0.06 * H, ly); r.legT[k + 2] = p.z - sy * lx + cy * lz;
      const plx = s * 0.06, plz = -1, ply = -0.25 * kS;
      r.legP[k] = cy * plx + sy * plz; r.legP[k + 1] = ply; r.legP[k + 2] = -sy * plx + cy * plz;
      r.legOn[si] = 1;
      r.footFlat(si ? FTR : FTL, p.yaw - s * 0.06 + L[fo2 + 4] * wsd, pitch, 0);
    }
    const bt = p.blinkAt - t;
    r.fx[0] = Math.max(clamp(UF[13]), bt < 0.13 && bt > 0 ? 1 : 0);
    r.fx[1] = clamp(UF[12]);
    r.fx[2] = clamp(-p.ly * 0.7, -1, 1); r.fx[3] = clamp(p.lp * 0.8 + 0.1, -1, 1);
    r.fk(true);
  }
}
const _ctx = {};
const _wu = new Float32Array(NU), _wl = new Float32Array(NL);

function robeSkinSide(side) {
  const th = side < 0 ? THL : THR, sh = side < 0 ? SHL : SHR;
  return (x, y, z) => {
    if (y > 0.86) return [th, P, smooth(0.99, 0.86, y) * (0.3 + 0.5 * smooth(0, 0.08, Math.abs(x)))];
    if (y > 0.62) return [th, P, lerp(0.75, 1, smooth(0.86, 0.7, y))];
    if (y > 0.46) return [sh, th, smooth(0.62, 0.48, y)];
    return [sh, sh, 1];
  };
}

function robePart(G, o) {
  const N = 12, seg = 12;
  for (const side of [-1, 1]) {
    const t0 = side > 0 ? -0.22 : PI - 0.22, t1 = side > 0 ? PI + 0.22 : TAU + 0.22;
    const pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const y = lerp(o.hem, o.top, i / N);
      const k = (y - o.hem) / (o.top - o.hem);
      const rx = lerp(o.rxB, o.rxT, Math.pow(k, 0.8)), rz = lerp(o.rzB, o.rzT, Math.pow(k, 0.8));
      for (let j = 0; j <= seg; j++) {
        const th = lerp(t0, t1, j / seg);
        const sn = Math.sin(th), cs = Math.cos(th);
        const ov = Math.abs(cs) > 0.9 && (side > 0 ? sn < 0.2 : sn > -0.2) ? 1 + 0.025 * (1 - k * 0.6) : 1;
        const m = (1 + (o.fold || 0) * Math.sin(th * 9) * (1 - k)) * ov;
        pos.push(rx * se(sn, 2.2) * m, y, 0.01 - rz * se(cs, 2.2) * m);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j, b = a + 1, c = a + seg + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    G.add(pos, idx, robeSkinSide(side), o.slot, { ao: (x, y) => 1 - 0.18 * smooth(o.hem + 0.06, o.hem, y) });
  }
}

function chasubleSkin(x, y, z) {
  const ax = Math.abs(x);
  const front = z < 0;
  const ar = x < 0 ? ARL : ARR, fo = x < 0 ? FOL : FOR, cl = x < 0 ? CLL : CLR;
  const up = front ? CFU : CBU, lo = front ? CFL : CBL;
  const side = smooth(0.16, 0.3, ax) * 0.62;
  if (y > 1.33) return side > 0.5 ? [cl, CH, 0.6] : [CH, up, smooth(1.42, 1.34, y) * 0.3];
  const armB = y > 1.12 ? ar : fo;
  const panel = y > 1.02 ? up : lo;
  if (side > 0.01) return [armB, panel, side * smooth(1.33, 1.25, y) + side * (1 - smooth(1.33, 1.25, y)) * 0.6];
  if (y > 1.02) return [up, CH, smooth(1.38, 1.24, y)];
  return [lo, up, smooth(1.06, 0.92, y)];
}

function chasubleGeo(G, hem) {
  const R = [
    [hem, 0.44, 0.18], [hem + 0.12, 0.43, 0.175], [0.9, 0.42, 0.172], [1.05, 0.4, 0.168], [1.18, 0.38, 0.165], [1.28, 0.352, 0.16],
    [1.34, 0.31, 0.152], [1.385, 0.262, 0.138], [1.415, 0.205, 0.122], [1.44, 0.145, 0.102], [1.458, 0.092, 0.084],
  ];
  const rings = R.map(([y, rx, rz]) => ({ c: [0, y, 0.008], rx, rz, n: 2.6, f: (th, sn, cs) => (y < 1.2 ? 1 - 0.05 * Math.abs(sn) * (1 - Math.abs(cs)) : 1) }));
  const [pos, idx] = loft(rings, 28, 'y', false, false);
  G.add(pos, idx, chasubleSkin, S_TRIM, { ao: (x, y) => 0.9 + 0.1 * smooth(hem, hem + 0.1, y) });
}

function priestGeo() {
  const G = new Geo();
  headPart(G);
  neckPart(G);
  for (const s of [-1, 1]) { armPart(G, s, { cuff: 0.05, sleeve: 1.08 }); handPart(G, s, { slot: S_SKIN }); shoePart(G, s); legPart(G, s, { trousers: true }); }
  pelvisPart(G, { top: 1.0, slot: S_COAT });
  torsoPart(G, { y0: 0.95, pad: 0.008, slot: S_COAT });
  robePart(G, { hem: 0.03, top: 0.99, rxB: 0.27, rzB: 0.2, rxT: 0.172, rzT: 0.118, slot: S_COAT, fold: 0.03 });
  chasubleGeo(G, 0.6);
  collarPart(G, { kind: 'stand', slot: S_INNER });
  for (const s of [-1, 1]) {
    const st = loft([
      { c: [s * 0.058, 0.44, -0.205], rx: 0.036, rz: 0.006, n: 4, cap: 0.002 },
      { c: [s * 0.058, 0.52, -0.2], rx: 0.034, rz: 0.006, n: 4 },
      { c: [s * 0.058, 0.66, -0.19], rx: 0.03, rz: 0.006, n: 4, cap: 0.002 },
    ], 8, 'y', true, true);
    G.add(st[0], st[1], (x, y) => [s < 0 ? THL : THR, P, smooth(0.66, 0.44, y)], S_SCARF);
  }
  const hair = hairGeo('bald'), gl = glassesGeo();
  for (const H of [hair, gl]) {
    const base = G.count;
    G.p.push(...H.p); G.n.push(...H.n); G.bi.push(...H.bi); G.bw.push(...H.bw); G.sl.push(...H.sl); G.fc.push(...H.fc); G.ao.push(...H.ao);
    for (const i of H.idx) G.idx.push(base + i);
  }
  return G;
}

function bellSleeve(G, s) {
  const J = [BIND[s < 0 ? ARL : ARR], BIND[s < 0 ? FOL : FOR]];
  const rings = [];
  const R = [[0.98, 0.1], [1.0, 0.098], [1.06, 0.088], [1.14, 0.075], [1.24, 0.068], [1.32, 0.066], [1.39, 0.062], [1.425, 0.05], [1.442, 0.024]];
  for (const [y, r] of R) {
    const k = clamp((y - J[1][1]) / (J[0][1] - J[1][1]), -0.5, 1);
    rings.push({ c: [lerp(J[1][0], J[0][0], k) + s * 0.004, y, lerp(J[1][2], J[0][2], k)], rx: r, rz: r * 1.05, n: 2.1 });
  }
  const [pos, idx] = loft(rings, 12, 'y', false, true);
  const ar = s < 0 ? ARL : ARR, fo = s < 0 ? FOL : FOR, cl = s < 0 ? CLL : CLR;
  G.add(pos, idx, (x, y) => (y > 1.36 ? [ar, cl, 1 - 0.35 * smooth(1.36, 1.45, y)] : y > 1.13 ? [ar, ar, 1] : [fo, ar, smooth(1.13, 1.04, y) * 0.8]), S_HAT, { ao: (x, y) => 0.85 + 0.15 * smooth(0.98, 1.05, y) });
}

function serverGeo() {
  const G = new Geo();
  headPart(G);
  neckPart(G, { r: 0.05 });
  for (const s of [-1, 1]) { armPart(G, s, { cuff: 0.044, sleeve: 0.95 }); handPart(G, s, { slot: S_SKIN }); shoePart(G, s); legPart(G, s, { trousers: true }); bellSleeve(G, s); }
  pelvisPart(G, { top: 1.0, slot: S_COAT });
  torsoPart(G, { y0: 0.95, pad: 0.0, slot: S_COAT });
  robePart(G, { hem: 0.04, top: 0.99, rxB: 0.22, rzB: 0.17, rxT: 0.166, rzT: 0.112, slot: S_COAT, fold: 0.015 });
  const sr = [[0.66, 0.24, 0.17], [0.7, 0.235, 0.165], [0.8, 0.215, 0.15], [0.92, 0.195, 0.135], [1.02, 0.185, 0.128], [1.12, 0.183, 0.13], [1.24, 0.188, 0.135], [1.32, 0.19, 0.133], [1.37, 0.188, 0.122], [1.405, 0.176, 0.104], [1.428, 0.14, 0.088], [1.448, 0.09, 0.074]];
  const rings = sr.map(([y, rx, rz]) => ({ c: [0, y, 0.006], rx, rz, n: 2.5, f: (th) => (y < 0.9 ? 1 + 0.02 * Math.sin(th * 10) * smooth(0.9, 0.66, y) : 1) }));
  const [pos, idx] = loft(rings, 22, 'y', false, false);
  G.add(pos, idx, (x, y, z) => (y < 0.97 ? skirtSkin(x, y, z) : torsoSkin(x, y, z)), S_HAT, { ao: (x, y) => 0.92 + 0.08 * smooth(0.66, 0.72, y) });
  collarPart(G, { kind: 'stand', slot: S_COAT });
  const hair = hairGeo('short');
  const base = G.count;
  G.p.push(...hair.p); G.n.push(...hair.n); G.bi.push(...hair.bi); G.bw.push(...hair.bw); G.sl.push(...hair.sl); G.fc.push(...hair.fc); G.ao.push(...hair.ao);
  for (const i of hair.idx) G.idx.push(base + i);
  return G;
}

function latheMesh(pts, mat, segs = 20) {
  return new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs), mat);
}

function thuribleProps() {
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 1, roughness: 0.32 });
  const coal = new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: 0xff5a14, emissiveIntensity: 1.6, roughness: 0.9 });
  const censer = new THREE.Group();
  censer.add(latheMesh([[0.001, -0.075], [0.03, -0.074], [0.035, -0.068], [0.05, -0.05], [0.062, -0.02], [0.064, 0.0], [0.06, 0.004], [0.001, 0.004]], brass, 22));
  censer.add(latheMesh([[0.065, 0.0], [0.062, 0.02], [0.054, 0.05], [0.04, 0.08], [0.028, 0.1], [0.018, 0.112], [0.012, 0.13], [0.001, 0.136]], brass, 22));
  const glow = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.006, 6, 18), coal);
  glow.rotation.x = Math.PI / 2; glow.position.y = 0.035;
  censer.add(glow);
  const foot = latheMesh([[0.001, -0.095], [0.028, -0.095], [0.026, -0.085], [0.02, -0.075], [0.001, -0.075]], brass, 14);
  censer.add(foot);
  const chainM = new THREE.MeshStandardMaterial({ color: 0xb8924a, metalness: 1, roughness: 0.45 });
  const chains = [];
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 1, 4, 1), chainM); chains.push(c); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 6, 14), brass);
  return { censer, chains, ring, brass };
}

function deckProps() {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5, metalness: 0.3 });
  const plat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.35, metalness: 0.2 });
  const lab = new THREE.MeshStandardMaterial({ color: 0xd8c690, roughness: 0.6, emissive: 0x302810, emissiveIntensity: 0.6 });
  const led = new THREE.MeshStandardMaterial({ color: 0x103018, emissive: 0x30ff70, emissiveIntensity: 2.2 });
  const discs = [];
  for (const s of [-1, 1]) {
    const tt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.34), dark);
    tt.position.set(s * 0.44, 0.03, 0);
    g.add(tt);
    const d = new THREE.Group();
    const rec = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 32), plat);
    const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.014, 20), lab);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.05), led);
    mark.position.set(0, 0, 0.08);
    d.add(rec, lb, mark);
    d.position.set(s * 0.44 - 0.03, 0.066, 0.0);
    g.add(d);
    discs.push(d);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.22), new THREE.MeshStandardMaterial({ color: 0xb0b0b4, metalness: 1, roughness: 0.3 }));
    arm.position.set(s * 0.44 + 0.15, 0.09, -0.02); arm.rotation.y = 0.35;
    g.add(arm);
  }
  const mx = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.34), dark);
  mx.position.set(0, 0.04, 0);
  g.add(mx);
  const knobM = new THREE.MeshStandardMaterial({ color: 0xd0d0d4, roughness: 0.4, metalness: 0.4 });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.02, 8), knobM); k.position.set(-0.1 + i * 0.065, 0.09, -0.11 + j * 0.06); g.add(k); }
  const fader = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.022, 0.016), knobM);
  fader.position.set(0, 0.092, 0.13);
  g.add(fader);
  const meters = [];
  for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.12), led); m.position.set(-0.02 + i * 0.04, 0.082, 0.02); g.add(m); meters.push(m); }
  return { g, discs, fader, meters };
}

function headphoneProps() {
  const m = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.4, metalness: 0.2 });
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 20, Math.PI), m);
  band.position.set(0, 0.0, 0);
  g.add(band);
  const cups = [];
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.04, 0.03, 16), m);
    c.rotation.z = Math.PI / 2;
    c.position.set(s * 0.1, -0.005, 0);
    g.add(c);
    cups.push(c);
  }
  return { g, cups };
}

const PN = 78;
const AO = (si) => 20 + si * 14;
const LO = (si) => 48 + si * 9;
const _eu = new THREE.Euler(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qc = new THREE.Quaternion(), _v3 = new THREE.Vector3(), _ax = new THREE.Vector3();
const AXY = new THREE.Vector3(0, 1, 0), AXX = new THREE.Vector3(1, 0, 0), AXZ = new THREE.Vector3(0, 0, 1);

function pq(p, q) { p[3] = q.x; p[4] = q.y; p[5] = q.z; p[6] = q.w; }
function pqe(p, x, y, z) { _eu.set(x, y, z, 'YXZ'); _qa.setFromEuler(_eu); pq(p, _qa); }
function pe(p, o, x, y, z) { p[o] = x; p[o + 1] = y; p[o + 2] = z; }
function parm(p, si, tx, ty, tz, px, py, pz, fr, tw, flex, dev, htw, curl, cy = 0, cz = 0) {
  const o = AO(si);
  p[o] = tx; p[o + 1] = ty; p[o + 2] = tz; p[o + 3] = px; p[o + 4] = py; p[o + 5] = pz; p[o + 6] = fr; p[o + 7] = tw;
  p[o + 8] = flex; p[o + 9] = dev; p[o + 10] = htw; p[o + 11] = curl; p[o + 12] = cy; p[o + 13] = cz;
}
function pleg(p, si, tx, ty, tz, px, py, pz, fy, fp, fr = 0) {
  const o = LO(si);
  p[o] = tx; p[o + 1] = ty; p[o + 2] = tz; p[o + 3] = px; p[o + 4] = py; p[o + 5] = pz; p[o + 6] = fy; p[o + 7] = fp; p[o + 8] = fr;
}
function pfk(p, si, tx, tz, sx, fx) { const o = 70 + si * 4; p[o] = tx; p[o + 1] = tz; p[o + 2] = sx; p[o + 3] = fx; }

function poseBase(p, c, wide = 0.1) {
  p.fill(0);
  const H = c.H;
  pe(p, 0, 0, c.hipY + 0.015 * H - 0.012, 0);
  p[6] = 1;
  for (let si = 0; si < 2; si++) {
    const s = si ? 1 : -1;
    pleg(p, si, s * wide * H, 0.085 * H, 0.02, s * 0.05, 0, -1, -s * 0.06, 0);
    parm(p, si, s * 0.2, -0.36, 0.0, s * 0.3, 0, 1, 0, 0, 0.1, 0, 0, 0.35);
  }
}

function poseIdle(p, c) {
  poseBase(p, c);
  for (let si = 0; si < 2; si++) { const s = si ? 1 : -1; parm(p, si, s * 0.035, -0.28, -0.2, s, -0.4, 0.6, 0, s * 0.8, 0.2, -0.2, 0, 0.3); }
  p[10] = 0.012 * Math.sin(c.t * 1.5); p[16] = -0.04; p[17] = 0.22 * Math.sin(c.t * 0.27); p[14] = 0.1 * Math.sin(c.t * 0.27);
}

function poseOrans(p, c) {
  poseBase(p, c);
  for (let si = 0; si < 2; si++) { const s = si ? 1 : -1; parm(p, si, s * 0.47, 0.17, -0.16, s * 0.3, -1, 0.3, 0, -s * 1.25, -0.35, 0, 0, 0.05); }
  p[10] = 0.04; p[16] = 0.08; p[13] = 0.02; p[17] = 0.12 * Math.sin(c.t * 0.3);
}

function poseTalk(p, c) {
  poseBase(p, c);
  const v = c.v, g = c.gst, g2 = c.gst2;
  const rest = (si) => { const s = si ? 1 : -1; return [s * 0.05, -0.27, -0.22]; };
  for (let si = 0; si < 2; si++) {
    const s = si ? 1 : -1;
    const k = si ? g : g2;
    const r = rest(si);
    const ox = s * 0.3, oy = -0.03 + 0.06 * Math.sin(c.t * 2.3 + si), oz = -0.36;
    parm(p, si, lerp(r[0], ox, k), lerp(r[1], oy, k), lerp(r[2], oz, k), s, -0.5, 0.4, 0, lerp(s * 0.8, -s * 1.4, k), lerp(0.2, -0.3, k), 0, 0, lerp(0.3, 0.12, k));
  }
  p[13] = -0.05 * v * Math.sin(c.t * 6.3); p[16] = 0.03 * v * Math.sin(c.t * 3.1) - 0.02; p[17] = 0.3 * Math.sin(c.t * 0.35) + 0.1 * (g - g2); p[14] = 0.08 * Math.sin(c.t * 0.35);
  p[4] = 0.05 * (g - g2); p[10] = 0.02 * v;
  p[19] = clamp(v * 1.1);
}

function poseElev(p, c) {
  poseBase(p, c);
  const e = c.el;
  for (let si = 0; si < 2; si++) { const s = si ? 1 : -1; parm(p, si, s * 0.03, lerp(-0.05, 0.6, e), lerp(-0.3, -0.12, e), s, -0.5, 0.35, 0, s * 0.3, lerp(0.4, -0.1, e), 0, 0, 0.45); }
  p[16] = 0.32 * e; p[13] = 0.08 * e; p[10] = 0.06 * e; p[7] = 0.02 * e;
}

function bounceLegs(p, c, a, wide = 0.11) {
  const b = c.b, ph = c.ph, H = c.H;
  const dip = Math.pow(0.5 + 0.5 * Math.cos(TAU * (ph - 0.06)), 1.6);
  const w = Math.cos(PI * (b - 0.15));
  p[0] = 0.045 * w * a; p[1] -= 0.045 * dip * a;
  pqe(p, -0.04 * dip * a, 0.1 * Math.sin(PI * b) * a, -0.05 * w * a);
  const free = (Math.floor(b) & 1) === 0 ? 0 : 1;
  const lift = bump(ph, 0.08, 0.62) * a;
  for (let si = 0; si < 2; si++) {
    const s = si ? 1 : -1, o = LO(si);
    p[o] = s * wide * H;
    if (si === free) { p[o + 1] += 0.05 * lift; p[o] -= s * 0.025 * lift; p[o + 7] = 0.25 * lift; }
  }
  return dip;
}

function posePump(p, c, si, a, k) {
  const s = si ? 1 : -1;
  parm(p, si, s * lerp(0.22, 0.12, k * a), lerp(0.2, 0.66, k * a), lerp(-0.33, -0.2, k * a), s, -0.7 + 0.5 * k, 0.1, 0, s * 0.3, 0.2, 0, 0, 0.95, 0, 0.05 * k);
}

function poseHype(p, c) {
  poseBase(p, c, 0.15);
  const a = 0.8 + 0.4 * c.e;
  const dip = bounceLegs(p, c, a, 0.15);
  const q = c.ph, hit = Math.max(pulse(q, 5), smooth(0.86, 1, q));
  posePump(p, c, 1, 1, hit);
  parm(p, 0, -0.22, 0.12, -0.42, -1, -0.3, 0.2, 0, 0.3, -0.1, 0, 0, 0.15);
  p[7] = -0.06; p[10] = -0.12 - 0.08 * hit; p[13] = -0.1 * hit; p[16] = 0.05 - 0.12 * hit; p[19] = 0.35 + 0.55 * hit;
}

function poseDance(p, c) {
  poseBase(p, c, 0.12);
  const a = 0.75 + 0.45 * c.e;
  const dip = bounceLegs(p, c, a, 0.12);
  const sec = Math.floor(c.b / 8) & 3;
  const q = c.ph, hit = Math.max(pulse(q, 5), smooth(0.86, 1, q));
  const sw = Math.sin(PI * c.b * 0.5);
  if (sec === 0) { posePump(p, c, 1, a, hit); parm(p, 0, -0.22, -0.05, -0.2, -1, -0.5, 0.5, 0, -0.3, 0.2, 0, 0, 0.9); }
  else if (sec === 1) for (let si = 0; si < 2; si++) { const s = si ? 1 : -1; parm(p, si, s * 0.36 + 0.13 * sw, 0.6 + 0.03 * Math.cos(PI * c.b), -0.12, s, -0.3, 0.1, 0, -s * 1.1, -0.15, 0.25 * sw, 0, 0.1); }
  else if (sec === 2) {
    const up = Math.floor(c.b) & 1;
    for (let si = 0; si < 2; si++) { const s = si ? 1 : -1; const k = si === up ? hit : 0; parm(p, si, s * lerp(0.25, 0.2, k), lerp(-0.1, 0.62, k), lerp(-0.22, -0.3, k), s, -0.6, 0.2, 0, s * 0.2, 0.1, 0, 0, lerp(0.8, 0.6, k)); }
    p[17] = (up ? -0.15 : 0.15); p[4] = (up ? -0.12 : 0.12);
  } else {
    const hq = fract(c.b), open = Math.pow(Math.sin(PI * clamp(hq * 1.05)), 0.75);
    for (let si = 0; si < 2; si++) { const s = si ? 1 : -1; parm(p, si, s * (0.022 + 0.15 * open), 0.6 + 0.02 * pulse(hq, 9), -0.17, s, -0.3, 0.2, 0, s * 0.2, -0.25, 0, 0, 0.05); }
    p[16] = 0.12;
  }
  p[10] += -0.05 * dip * a; p[13] = -0.12 * hit * a; p[16] += -0.1 * hit; p[4] += 0.06 * Math.sin(PI * c.b);
  p[19] = 0.15 + 0.35 * hit * c.e;
}

function poseDJ(p, c) {
  poseBase(p, c, 0.15);
  const a = 0.8 + 0.4 * c.e;
  const ph = c.ph, hit = pulse(fract(ph + 0.97), 4);
  const dip = Math.pow(0.5 + 0.5 * Math.cos(TAU * (ph - 0.05)), 1.8);
  p[1] -= 0.05 * dip * a; p[2] = 0.04;
  pqe(p, -0.05 * dip, 0.05 * Math.sin(PI * c.b * 0.5), 0);
  p[7] = -0.06; p[10] = -0.13 - 0.04 * dip; p[13] = -0.08 - 0.17 * hit * a; p[16] = 0.1 - 0.14 * hit * a; p[17] = -0.12;
  parm(p, 0, -0.155, 0.035, 0.015, -1, -1, 0.4, 2, 0.6, 0.3, 0.2, 0, 0.55, 0, 0.08);
  const bar = Math.floor(c.b / 4);
  const toFader = (bar & 1) === 1 && fract(c.b / 4) > 0.5;
  const s16 = fract(c.b * 4);
  const scratch = (Math.floor(c.b * 2) % 3 === 0 ? 1 : 0.4) * Math.sin(TAU * fract(c.b * 2)) * 0.05;
  const tx = toFader ? 0.0 + 0.04 * Math.sign(Math.sin(TAU * c.b * 2)) : 0.39, ty = toFader ? 1.07 : 1.045, tz = toFader ? -0.42 : -0.56 + scratch;
  parm(p, 1, tx, ty, tz, 1, 0.3, 0.5, 1, 0.2, 0.3, 0, 0, toFader ? 0.6 : 0.3);
  p[19] = (Math.floor(c.b) % 4 === 0 ? 0.6 * hit : 0.08) * c.e;
  c.djFader = toFader ? tx : 0; c.djScratch = toFader ? 0 : scratch;
}

function poseWalk(p, c) {
  poseBase(p, c, 0.09);
  const H = c.H, ph = c.wph, dx = c.wdx, dz = c.wdz;
  const step = 0.27 * H * clamp(c.wsp / 0.9, 0.4, 1.25);
  for (let si = 0; si < 2; si++) {
    const s = si ? 1 : -1, o = LO(si);
    const q = fract(ph + si * 0.5);
    let f, lift = 0;
    if (q < 0.6) f = 1 - q / 0.6 * 2;
    else { const u = (q - 0.6) / 0.4; f = -1 + 2 * (u * u * (3 - 2 * u)); lift = Math.sin(PI * u) * 0.09; }
    p[o] = s * 0.1 * H + dx * step * f; p[o + 2] = 0.02 + dz * step * f; p[o + 1] = 0.085 * H + lift; p[o + 7] = q < 0.6 ? -0.15 * (q / 0.6) : 0.2 * Math.sin(PI * (q - 0.6) / 0.4);
    const sw = Math.sin(TAU * (ph + si * 0.5));
    parm(p, si, s * 0.2, -0.35, -0.02 + 0.12 * sw, s * 0.3, 0, 1, 0, 0, 0.1, 0, 0, 0.35);
  }
  p[1] -= 0.025 * (0.5 + 0.5 * Math.cos(TAU * ph * 2));
  pqe(p, -0.03, 0.08 * Math.sin(TAU * ph), 0.03 * Math.sin(TAU * ph));
  p[4] = -0.1 * Math.sin(TAU * ph); p[10] = -0.02;
}

function bdToprock(p, c, lb) {
  poseBase(p, c, 0.14);
  const H = c.H;
  p[67] = 0.5;
  const n = Math.floor(lb), f = lb - n;
  const si = n & 1, s = si ? -1 : 1;
  const out = Math.pow(Math.sin(PI * f), 0.7);
  const kick = bump(f, 0.15, 0.55);
  const o = LO(si ? 0 : 1);
  p[o] = s * lerp(0.14, -0.04, out) * H; p[o + 2] = -0.34 * out; p[o + 1] += 0.13 * kick; p[o + 6] = s * 0.5 * out; p[o + 7] = 0.35 * kick;
  const so = LO(si ? 1 : 0);
  p[so + 7] = -0.25 * out;
  const dip = Math.pow(0.5 + 0.5 * Math.cos(TAU * f), 1.5);
  p[1] -= 0.05 + 0.06 * dip;
  p[0] = -s * 0.04 * out;
  pqe(p, -0.12, s * 0.35 * out, s * 0.06 * out);
  p[10] = -0.1 - 0.06 * dip; p[11] = -s * 0.3 * out; p[7] = -0.05;
  for (let k = 0; k < 2; k++) {
    const sd = k ? 1 : -1;
    const lead = sd === s;
    const sw = out * (lead ? 1 : 0.6);
    if (lead) parm(p, k, sd * lerp(0.5, -0.05, sw), lerp(0.05, 0.12, sw), lerp(-0.1, -0.42, sw), sd, -0.5, 0.3, 0, sd * 0.3, 0.1, 0, 0, 0.75);
    else parm(p, k, sd * lerp(0.42, 0.56, sw), lerp(0.0, 0.28, sw), lerp(-0.12, 0.05, sw), sd, -0.4, 0.2, 0, sd * 0.3, 0.1, 0, 0, 0.6, 0, 0.1 * sw);
  }
  p[13] = -0.15 * dip; p[16] = 0.06 - 0.06 * dip; p[17] = -s * 0.25 * out;
}

const SIX = [[[-0.15, -0.55], [-0.42, 0.14]], [[-0.08, -0.5], [0.06, 0.45]], [[0.46, 0.1], [0.06, 0.45]], [[0.46, 0.1], [0.12, -0.56]], [[-0.05, 0.45], [0.12, -0.52]], [[-0.05, 0.45], [-0.46, 0.1]]];

function bdSix(p, c, lb) {
  poseBase(p, c);
  p[67] = 0.85;
  const H = c.H;
  const u = Math.max(0, (lb - 5) / 3);
  const psi = -TAU * u;
  const steps = u * 6, k = Math.floor(steps), f = steps - k;
  const A = SIX[k % 6], B = SIX[(k + 1) % 6];
  const e = f * f * (3 - 2 * f);
  const hx = -0.08, hz = -0.12;
  const cs = Math.cos(psi), sn = Math.sin(psi);
  const rot = (x, z) => [cs * x + sn * z, -sn * x + cs * z];
  const off = rot(0.18, 0.34);
  pe(p, 0, hx + off[0], 0.52 * H, hz + off[1]);
  _qa.setFromAxisAngle(AXY, psi); _qb.setFromAxisAngle(AXX, -0.62); _qa.multiply(_qb); pq(p, _qa);
  for (let si = 0; si < 2; si++) {
    const a = A[si === 1 ? 0 : 1], b = B[si === 1 ? 0 : 1];
    const moving = Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.05;
    const lx = lerp(a[0], b[0], e) * H, lz = lerp(a[1], b[1], e) * H;
    const w = rot(lx, lz);
    const o = LO(si);
    p[o] = hx + off[0] + w[0]; p[o + 1] = 0.07 + (moving ? 0.07 * Math.sin(PI * f) : 0); p[o + 2] = hz + off[1] + w[1];
    const pl = rot((si ? 1 : -1) * 0.5, -1);
    p[o + 3] = pl[0]; p[o + 4] = 0.2; p[o + 5] = pl[1]; p[o + 6] = psi; p[o + 7] = 0;
  }
  parm(p, 0, hx, 0.05, hz, -0.6, 0.2, 0.6, 1, 0.4, -1.1, 0, 0, 0.1);
  const flick = Math.sin(TAU * u * 2);
  parm(p, 1, 0.36, -0.12 + 0.1 * flick, -0.08, 1, 0.3, 0.3, 0, 0.3, 0.2, 0, 0, 0.5);
  p[10] = 0.1; p[13] = 0.3; p[16] = 0.25; p[7] = -0.1;
}

function bdWindmill(p, c, lb) {
  p.fill(0); p[6] = 1;
  const rate = c.per < 0.5 ? 0.5 : 0.8;
  const psi = TAU * rate * Math.max(0, lb - 11.3);
  const tau = 0.32;
  _qa.setFromAxisAngle(AXY, psi); _qb.setFromAxisAngle(AXX, PI / 2 + tau); _qc.setFromAxisAngle(AXY, -psi * 1.0 + 0.4);
  _qa.multiply(_qb).multiply(_qc);
  pq(p, _qa);
  _v3.set(0, 0.36 * c.H, 0).applyQuaternion(_qa);
  pe(p, 0, -_v3.x, 0.14 - _v3.y, -_v3.z);
  p[69] = 1; p[68] = 1; p[67] = 1;
  const pump = Math.sin(TAU * rate * lb * 2);
  pfk(p, 0, 0.75 + 0.3 * pump, -0.8, 0, -1.0);
  pfk(p, 1, 0.75 - 0.3 * pump, 0.8, 0, -1.0);
  for (let si = 0; si < 2; si++) { const s = si ? 1 : -1; parm(p, si, s * 0.07, -0.18, -0.2, s, -0.6, 0.3, 0, s * 0.6, 0.3, 0, 0, 0.6); pleg(p, si, s * 0.3, 0.3, 0.4, 0, 0, -1, 0, -1); }
  p[13] = -0.35; p[16] = -0.2; p[10] = -0.15;
}

function bdHeadspin(p, c, lb) {
  p.fill(0); p[6] = 1;
  const t = Math.max(0, lb - 18.6);
  const rate = c.per < 0.5 ? 1.0 : 1.4;
  const psi = TAU * rate * (t + 0.08 * t * t);
  _qa.setFromAxisAngle(AXY, psi); _qb.setFromAxisAngle(AXX, PI - 0.06);
  _qa.multiply(_qb);
  pq(p, _qa);
  _v3.set(0, 0.79 * c.H, 0).applyQuaternion(_qa);
  pe(p, 0, -_v3.x, 0.01 - _v3.y, -_v3.z);
  p[69] = 1; p[68] = 1; p[67] = 1;
  const sc = 0.15 * Math.sin(TAU * lb * 0.5);
  pfk(p, 0, 0.12 + sc, -0.55, -0.05, -1.0);
  pfk(p, 1, 0.12 - sc, 0.55, -0.05, -1.0);
  const tap = smooth(19.4, 20.4, lb);
  for (let si = 0; si < 2; si++) {
    const s = si ? 1 : -1;
    parm(p, si, s * lerp(0.36, 0.6, tap), lerp(-0.2, 0.08, tap), lerp(-0.18, 0.0, tap), s * 0.2, lerp(1, -0.5, tap), 0.3, 0, -s * 0.3, -0.3, 0, 0, lerp(0.1, 0.2, tap));
    pleg(p, si, s * 0.3, 1.4, 0, 0, 0, -1, 0, -1);
  }
  p[13] = 0.1; p[16] = 0.05;
}

function bdFreeze(p, c, lb) {
  p.fill(0); p[6] = 1;
  const H = c.H;
  _qa.setFromAxisAngle(AXY, 0.5); _qb.setFromAxisAngle(AXZ, 1.18); _qc.setFromAxisAngle(AXX, -0.25);
  _qa.multiply(_qb).multiply(_qc);
  pq(p, _qa);
  pe(p, 0, 0.12, 0.5 * H, 0.0);
  p[69] = 1; p[68] = 1; p[67] = 1;
  pfk(p, 0, 1.9, -0.4, -1.9, -0.8);
  pfk(p, 1, 0.9, 0.55, -0.2, -0.9);
  for (let si = 0; si < 2; si++) pleg(p, si, 0, 0.5, 0, 0, 0, -1, 0, -1);
  const hold = 1 - 0.03 * Math.sin(TAU * lb * 2);
  parm(p, 0, -0.33, 0.035, 0.05, -0.2, 0.3, 1, 1, 0.5, -1.2, 0, 0, 0.0);
  parm(p, 1, 0.5 * hold, 0.3, -0.25, 1, 0, 0.3, 0, -1.2, -0.3, 0, 0, 0.1);
  p[7] = 0.1; p[10] = 0.15; p[13] = -0.15; p[16] = 0.2; p[18] = -0.2;
  p[19] = 0.6;
}

function bdCrouch(p, c, lb) {
  poseBase(p, c, 0.16);
  p[67] = 0.6;
  p[1] = 0.55 * c.H; p[2] = 0.08;
  pqe(p, -0.6, 0, 0);
  for (let si = 0; si < 2; si++) { const s = si ? 1 : -1; parm(p, si, s * 0.28, -0.38, -0.3, s, -0.3, 0.5, 0, 0, 0.2, 0, 0, 0.5); }
  p[10] = 0.1; p[16] = 0.35;
}

const BD = [
  [0, 4, bdToprock, 0.5], [4, 11, bdSix, 1.0], [11, 18.5, bdWindmill, 0.9], [18.5, 25.5, bdHeadspin, 0.8],
  [25.5, 29, bdFreeze, 0.22], [29, 30, bdCrouch, 0.6], [30, 32, bdToprock, 0.7],
];
const _bp = new Float32Array(PN);

function blendInto(out, a, k) {
  const ka = 1 - k;
  for (let i = 0; i < PN; i++) if (i < 3 || i > 6) out[i] = out[i] * ka + a[i] * k;
  let d = out[3] * a[3] + out[4] * a[4] + out[5] * a[5] + out[6] * a[6];
  const sg = d < 0 ? -1 : 1;
  let x = out[3] * ka + a[3] * k * sg, y = out[4] * ka + a[4] * k * sg, z = out[5] * ka + a[5] * k * sg, w = out[6] * ka + a[6] * k * sg;
  const l = Math.hypot(x, y, z, w) || 1;
  out[3] = x / l; out[4] = y / l; out[5] = z / l; out[6] = w / l;
}

function poseBreak(p, c) {
  const lb = ((c.lb % 32) + 32) % 32;
  let i = BD.length - 1;
  for (let k = 0; k < BD.length; k++) if (lb < BD[k][1]) { i = k; break; }
  const [s0, , f, bin] = BD[i];
  f(p, c, lb);
  const u = (lb - s0) / bin;
  if (u < 1 && i > 0) {
    BD[i - 1][2](_bp, c, lb);
    const k = u * u * (3 - 2 * u);
    const keep = p.slice(0);
    p.set(_bp);
    blendInto(p, keep, k);
  }
}

const MODES = ['idle', 'orans', 'talk', 'elev', 'hype', 'dance', 'breakdance', 'dj'];
const POSEFN = { idle: poseIdle, orans: poseOrans, talk: poseTalk, elev: poseElev, hype: poseHype, dance: poseDance, breakdance: poseBreak, dj: poseDJ };
const RAVE = { hype: 1, dance: 1, breakdance: 1, dj: 1 };
const _m4 = new THREE.Matrix4(), _p3 = new Float32Array(3), _p4 = new Float32Array(3), _va = new THREE.Vector3(), _vb = new THREE.Vector3(), _vc = new THREE.Vector3(), _qd = new THREE.Quaternion();

function boneMat(r, b, m) {
  const W = r.W, o = b * 12;
  return m.set(W[o], W[o + 1], W[o + 2], W[o + 9], W[o + 3], W[o + 4], W[o + 5], W[o + 10], W[o + 6], W[o + 7], W[o + 8], W[o + 11], 0, 0, 0, 1);
}

function cyl(mesh, a, b) {
  _va.subVectors(b, a);
  const l = _va.length() || 1e-4;
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(AXY, _va.multiplyScalar(1 / l));
  mesh.scale.set(1, l, 1);
}

class Actor {
  constructor(rig, root) {
    this.r = rig; this.root = root;
    this.w = {}; for (const m of MODES) this.w[m] = m === 'idle' ? 1 : 0;
    this.buf = {}; for (const m of MODES) this.buf[m] = new Float32Array(PN);
    this.walkBuf = new Float32Array(PN); this.F = new Float32Array(PN);
    this.last = root.position.clone(); this.vel = new THREE.Vector3(); this.walkW = 0; this.wph = 0; this.wdx = 0; this.wdz = -1; this.wsp = 0;
    this.armWT = new Float32Array(6); this.armWP = new Float32Array(6);
    this.active = [];
  }
  locomote(dt) {
    const p = this.root.position;
    if (dt > 0) {
      _va.subVectors(p, this.last).divideScalar(dt);
      _va.y = 0;
      if (_va.length() > 6) _va.set(0, 0, 0);
      this.vel.lerp(_va, 1 - Math.exp(-8 * dt));
    }
    this.last.copy(p);
    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.wsp = sp;
    this.walkW = damp(this.walkW, smooth(0.12, 0.3, sp), 6, dt);
    if (sp > 0.05) {
      const yaw = this.root.rotation.y, c = Math.cos(yaw), s = Math.sin(yaw);
      const lx = c * this.vel.x - s * this.vel.z, lz = s * this.vel.x + c * this.vel.z;
      const l = Math.hypot(lx, lz) || 1;
      this.wdx = damp(this.wdx, -lx / l, 8, dt); this.wdz = damp(this.wdz, -lz / l, 8, dt);
    }
    this.wph += (sp * dt) / (0.98 * this.r.H);
  }
  pose(dt, ctx, modeW, extra) {
    const act = this.active;
    act.length = 0;
    for (const m of MODES) { const w = modeW[m]; if (w > 0.002) { POSEFN[m](this.buf[m], ctx); act.push([w * (1 - this.walkW), this.buf[m], m]); } }
    if (extra) extra(act, ctx);
    if (this.walkW > 0.002) { poseWalk(this.walkBuf, ctx); act.push([this.walkW, this.walkBuf, 'walk']); }
    const F = this.F;
    let W = 0;
    for (const [w, b] of act) { if (W === 0) F.set(b); else blendInto(F, b, w / (W + w)); W += w; }
    for (const a of act) a[0] /= W || 1;
    this.apply(F, act);
  }
  apply(F, act) {
    const r = this.r, root = this.root, H = r.H;
    const yaw = root.rotation.y, cy = Math.cos(yaw), sy = Math.sin(yaw), rp = root.position;
    r.root[0] = rp.x + cy * F[0] + sy * F[2]; r.root[1] = rp.y + F[1]; r.root[2] = rp.z - sy * F[0] + cy * F[2];
    _qa.setFromAxisAngle(AXY, yaw); _qb.set(F[3], F[4], F[5], F[6]); _qa.multiply(_qb);
    _m4.makeRotationFromQuaternion(_qa);
    const e = _m4.elements, wr = r.wrot;
    wr[0] = e[0]; wr[1] = e[4]; wr[2] = e[8]; wr[3] = e[1]; wr[4] = e[5]; wr[5] = e[9]; wr[6] = e[2]; wr[7] = e[6]; wr[8] = e[10];
    r.wOn[P] = 1;
    if (this.baseSc) { const tk = clamp(F[67]); for (const [b, m] of [[THL, 0.62], [THR, 0.62], [SHL, 0.4], [SHR, 0.4]]) { const k = lerp(1, m, tk); r.sc[b * 3] = this.baseSc[b * 3] * k; r.sc[b * 3 + 2] = this.baseSc[b * 3 + 2] * k; } }
    r.set(SP, F[7], F[8], F[9]); r.set(CH, F[10], F[11], F[12]); r.set(NK, F[13], F[14], F[15]); r.set(HD, F[16], F[17], F[18]); r.set(JW, -0.2 * F[19], 0, 0);
    const free = F[68] > 0.5;
    for (let si = 0; si < 2; si++) {
      const o = LO(si), k = si * 3;
      r.legT[k] = rp.x + cy * F[o] + sy * F[o + 2]; r.legT[k + 1] = rp.y + F[o + 1]; r.legT[k + 2] = rp.z - sy * F[o] + cy * F[o + 2];
      r.legP[k] = cy * F[o + 3] + sy * F[o + 5]; r.legP[k + 1] = F[o + 4]; r.legP[k + 2] = -sy * F[o + 3] + cy * F[o + 5];
      r.legOn[si] = 1;
      const ft = si ? FTR : FTL;
      if (!free) r.footFlat(ft, yaw + F[o + 6], F[o + 7], F[o + 8]);
      else { r.wOn[ft] = 0; r.set(ft, F[70 + si * 4 + 3], 0, 0); }
      const ao = AO(si), s = si ? 1 : -1;
      const fo = si ? FOR : FOL, ha = si ? HAR : HAL, fi = si ? FIR : FIL, cl = si ? CLR : CLL;
      r.eul[fo * 3 + 1] = F[ao + 7];
      r.set(ha, F[ao + 9], F[ao + 10], -s * F[ao + 8]);
      r.set(fi, 0, 0, -s * F[ao + 11] * 1.9);
      r.set(cl, 0, F[ao + 12], s * F[ao + 13]);
      r.armOn[si] = 1; r.armW[si] = 1;
      r.armT[k] = this.armWT[k]; r.armT[k + 1] = this.armWT[k + 1]; r.armT[k + 2] = this.armWT[k + 2];
      r.armP[k] = this.armWP[k] || s; r.armP[k + 1] = this.armWP[k + 1]; r.armP[k + 2] = this.armWP[k + 2];
    }
    r.fk(false);
    const W = r.W, ch = CH * 12, hd = HD * 12;
    for (let si = 0; si < 2; si++) {
      const k = si * 3, ao = AO(si);
      let tx = 0, ty = 0, tz = 0, px = 0, py = 0, pz = 0;
      for (const [w, b] of act) {
        const fr = Math.round(b[ao + 6]);
        let x = b[ao], y = b[ao + 1], z = b[ao + 2], qx = b[ao + 3], qy = b[ao + 4], qz = b[ao + 5];
        let wx, wy, wz, ux, uy, uz;
        if (fr === 1) {
          wx = rp.x + cy * x + sy * z; wy = rp.y + y; wz = rp.z - sy * x + cy * z;
          ux = cy * qx + sy * qz; uy = qy; uz = -sy * qx + cy * qz;
        } else {
          const o = fr === 2 ? hd : ch;
          if (fr !== 2) { x *= H; y *= H; z *= H; }
          wx = W[o] * x + W[o + 1] * y + W[o + 2] * z + W[o + 9]; wy = W[o + 3] * x + W[o + 4] * y + W[o + 5] * z + W[o + 10]; wz = W[o + 6] * x + W[o + 7] * y + W[o + 8] * z + W[o + 11];
          ux = W[o] * qx + W[o + 1] * qy + W[o + 2] * qz; uy = W[o + 3] * qx + W[o + 4] * qy + W[o + 5] * qz; uz = W[o + 6] * qx + W[o + 7] * qy + W[o + 8] * qz;
        }
        tx += wx * w; ty += wy * w; tz += wz * w; px += ux * w; py += uy * w; pz += uz * w;
      }
      r.armT[k] = this.armWT[k] = tx; r.armT[k + 1] = this.armWT[k + 1] = ty; r.armT[k + 2] = this.armWT[k + 2] = tz;
      r.armP[k] = this.armWP[k] = px; r.armP[k + 1] = this.armWP[k + 1] = py; r.armP[k + 2] = this.armWP[k + 2] = pz;
    }
    r.fk(false);
    const lf = F[69];
    if (lf > 0.001) {
      for (let si = 0; si < 2; si++) {
        const th = si ? THR : THL, sh = si ? SHR : SHL, o = 70 + si * 4;
        r.eul[th * 3] = lerp(r.eul[th * 3], F[o], lf); r.eul[th * 3 + 1] = lerp(r.eul[th * 3 + 1], 0, lf); r.eul[th * 3 + 2] = lerp(r.eul[th * 3 + 2], F[o + 1], lf);
        r.eul[sh * 3] = lerp(r.eul[sh * 3], F[o + 2], lf);
        r.legOn[si] = 0;
      }
      r.fk(false);
    }
  }
}

export class Clergy {
  constructor(scene, { priest = { x: 0, y: 0, z: 0, yaw: 0 }, server = { x: 1, y: 0, z: 0, yaw: 0 }, deck = true } = {}) {
    this.scene = scene;
    this.mode = 'idle'; this.voice = 0;
    this.pool = new RigPool(NB_CLERGY, 2);
    this.face = faceAtlas();
    this.mat = humanMaterial(this.pool.tex, this.pool.palTex, this.face, NB_CLERGY, { side: THREE.DoubleSide });
    const pr = new Rig(this.pool, 0), sr = new Rig(this.pool, 1);
    pr.setProportions({ h: 1.74 / 1.72, girth: 1.05, belly: 1.18, shoulder: 1.0, hip: 1.0, head: 1.0, limb: 1.04, hand: 0.95, neck: 1.0 });
    sr.setProportions({ h: 1.56 / 1.72, girth: 0.9, belly: 1, shoulder: 0.9, hip: 0.94, head: 0.99, limb: 0.9, hand: 0.86, neck: 0.9 });
    const S = (row, slot, c, pat, rough = 0.85, metal = 0, ex = 0) => this.pool.setSlot(row, slot, new THREE.Color(c), pat, rough, metal, ex);
    S(0, S_SKIN, '#e4b497', PT.skin, 0.55, 0, 0); S(0, S_HAIR, '#c9c5bd', PT.hair, 0.55); S(0, S_COAT, '#f2f0ea', PT.plain, 0.86); S(0, S_TRIM, '#efe7d4', PT.chasuble, 0.62, 0.02, 0.6);
    S(0, S_PANTS, '#1e1e20', PT.plain); S(0, S_LEGS, '#1e1e20', PT.plain); S(0, S_SHOE, '#0d0d0e', PT.leather, 0.3); S(0, S_SOLE, '#141414', PT.plain); S(0, S_INNER, '#f6f4ef', PT.plain, 0.8);
    S(0, S_SCARF, '#caa24c', PT.plain, 0.35, 0.75); S(0, S_GLASS, '#2a2522', PT.plain, 0.3, 0.4); S(0, S_IRIS, '#5d7a94', PT.plain); S(0, S_HAND, '#e4b497', PT.skin, 0.55);
    this.pool.pal[(0 * NSLOT * 2 + S_IRIS * 2 + 1) * 4] = 0.8;
    S(1, S_SKIN, '#f1cfb8', PT.skin, 0.55, 0, 6); S(1, S_HAIR, '#4b3626', PT.hair, 0.55); S(1, S_COAT, '#141417', PT.plain, 0.8); S(1, S_HAT, '#f6f4ef', PT.lace, 0.85, 0, 0.66);
    S(1, S_PANTS, '#141417', PT.plain); S(1, S_LEGS, '#141417', PT.plain); S(1, S_SHOE, '#0d0d0e', PT.leather, 0.3); S(1, S_SOLE, '#141414', PT.plain); S(1, S_INNER, '#141417', PT.plain);
    S(1, S_IRIS, '#4f6f8f', PT.plain); S(1, S_HAND, '#f1cfb8', PT.skin, 0.55); S(1, S_TRIM, '#141417', PT.plain);
    this.pool.pal[(1 * NSLOT * 2 + S_IRIS * 2 + 1) * 4] = 1.05;
    this.pool.palTex.needsUpdate = true;
    this.meshes = [];
    for (const [G, row] of [[priestGeo(), 0], [serverGeo(), 1]]) {
      const g = G.build();
      g.setAttribute('aPid', new THREE.InstancedBufferAttribute(new Float32Array([row]), 1));
      g.instanceCount = 1;
      const m = new THREE.Mesh(g, this.mat);
      m.frustumCulled = false;
      m.name = row ? 'server' : 'priest';
      scene.add(m);
      this.meshes.push(m);
    }
    this.priestRoot = new THREE.Object3D(); this.priestRoot.name = 'priestRoot';
    this.priestRoot.position.set(priest.x, priest.y, priest.z); this.priestRoot.rotation.y = priest.yaw || 0;
    this.serverRoot = new THREE.Object3D(); this.serverRoot.name = 'serverRoot';
    this.serverRoot.position.set(server.x, server.y, server.z); this.serverRoot.rotation.y = server.yaw || 0;
    scene.add(this.priestRoot, this.serverRoot);
    this.P = new Actor(pr, this.priestRoot);
    this.P.baseSc = pr.sc.slice();
    this.Sv = new Actor(sr, this.serverRoot);
    this.host = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.005, 32), new THREE.MeshStandardMaterial({ color: 0xfbf6e8, roughness: 0.55, emissive: 0xfff0c8, emissiveIntensity: 0 }));
    this.host.visible = false;
    scene.add(this.host);
    const th = thuribleProps();
    this.censer = th.censer; this.chains = th.chains; this.cring = th.ring;
    scene.add(this.censer, this.cring, ...this.chains);
    this.censerPos = new THREE.Vector3();
    this.pend = null; this.kickV = 0; this.drive = 0;
    this.deck = deck ? deckProps() : null;
    if (this.deck) { this.deck.g.visible = false; scene.add(this.deck.g); }
    const hp = headphoneProps();
    this.phones = hp.g; this.phones.visible = false; scene.add(this.phones);
    this.panels = null;
    this.lastMode = 'idle'; this.bdStart = 0; this.el = 0; this.vs = 0; this.gT = -9; this.gSide = 1; this.per = 0.5; this.lastBeat = 0;
    this.ctx = { H: pr.H, hipY: pr.hipY };
    this.sctx = { H: sr.H, hipY: sr.hipY };
    this.sw = {}; for (const m of MODES) this.sw[m] = m === 'idle' ? 1 : 0;
  }

  kick(amount = 1) { this.kickV += amount; }

  update(dt, t, beat, beatPhase, energy = 0) {
    dt = Math.min(Math.max(dt, 0), 0.1);
    const db = beat - this.lastBeat;
    if (dt > 0 && db > 0 && db < 1) this.per = damp(this.per, clamp(dt / db, 0.25, 1.5), 2, dt);
    this.lastBeat = beat;
    const mode = MODES.includes(this.mode) ? this.mode : 'idle';
    if (mode !== this.lastMode) { if (mode === 'breakdance') this.bdStart = Math.floor(beat + 0.02); this.lastMode = mode; }
    const PA = this.P, SA = this.Sv;
    for (const m of MODES) {
      const target = m === mode ? 1 : 0;
      const rate = m === 'elev' || mode === 'elev' ? 2.2 : m === 'breakdance' || mode === 'breakdance' ? 5 : 3.5;
      PA.w[m] = target ? Math.min(1, PA.w[m] + dt * rate) : Math.max(0, PA.w[m] - dt * rate);
    }
    let tot = 0; for (const m of MODES) tot += PA.w[m];
    const mw = {}; for (const m of MODES) mw[m] = PA.w[m] / (tot || 1);
    this.el = clamp(this.el + (mode === 'elev' ? dt * 0.38 : -dt * 0.9));
    this.vs = damp(this.vs, clamp(this.voice), 14, dt);
    if (mode === 'talk' && this.vs > 0.32 && t - this.gT > 1.1) { this.gT = t; this.gSide = hash(Math.floor(t * 3.1)) < 0.65 ? 1 : 0; }
    const ge = t - this.gT;
    const genv = ge < 0 ? 0 : ge < 0.35 ? smooth(0, 0.35, ge) : ge < 0.8 ? 1 : 1 - smooth(0.8, 1.5, ge);
    const c = this.ctx;
    Object.assign(c, { t, b: beat, ph: fract(beat), per: this.per, e: energy, v: this.vs, el: smooth(0, 1, this.el), gst: this.gSide ? genv : genv * 0.3, gst2: this.gSide ? genv * 0.3 : genv, lb: beat - this.bdStart });
    PA.locomote(dt);
    Object.assign(c, { wph: PA.wph, wdx: PA.wdx, wdz: PA.wdz, wsp: PA.wsp });
    PA.pose(dt, c, mw);
    this.panelSim(dt);
    PA.r.write();
    const rave = RAVE[mode] ? 1 : 0;
    for (const m of MODES) this.sw[m] = 0;
    const sc = this.sctx;
    SA.locomote(dt);
    this.raveS = damp(this.raveS || 0, rave * (0.5 + 0.5 * energy), 2, dt);
    Object.assign(sc, { t, b: beat - 0.02, ph: fract(beat - 0.02), per: this.per, e: energy, v: 0, el: 0, gst: 0, gst2: 0, lb: 0, wph: SA.wph, wdx: SA.wdx, wdz: SA.wdz, wsp: SA.wsp, rave: this.raveS, drive: this.drive });
    this.sw.idle = 1;
    SA.pose(dt, sc, this.sw, (act, cc) => {
      const b = act[0][1];
      const rv = cc.rave;
      if (rv > 0.01) {
        const dip = bounceLegs(b, cc, rv * 0.9, 0.11);
        b[13] = -0.15 * pulse(cc.ph, 5) * rv; b[10] -= 0.04 * dip * rv;
      }
      parm(b, 0, -0.04, -0.12, -0.17, -1, -0.5, 0.5, 0, -0.6, 0.2, 0, 0, 0.5);
      parm(b, 1, 0.23, -0.27 + 0.03 * cc.drive * (1 + rv), -0.12 - (0.07 + 0.08 * rv) * cc.drive, 1, -0.2, 0.8, 0, 0.3, 0.1, 0, 0, 0.95);
      b[17] = 0.25 * Math.sin(cc.t * 0.2) * (1 - rv); b[16] = -0.06;
    });
    SA.r.write();
    this.pool.tex.needsUpdate = true;
    this.thurible(dt, energy, rave);
    this.props(dt, t, beat, mw);
  }

  panelSim(dt) {
    const r = this.P.r, W = r.W, H = r.H;
    const l1 = 0.4 * H, l2 = 0.38 * H;
    if (!this.panels) {
      this.panels = [CFU, CBU].map((b) => {
        const v = [0, 0, 0]; r.point(b, 0, -l1, 0, v);
        const v2 = [0, 0, 0]; r.point(b, 0, -l1 - l2, 0, v2);
        return { b, p1: v.slice(), q1: v.slice(), p2: v2.slice(), q2: v2.slice() };
      });
    }
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    const ch = CH * 12;
    for (const pn of this.panels) {
      const b = pn.b, front = b === CFU;
      const piv = [0, 0, 0]; r.point(b, 0, 0, 0, piv);
      const rest1 = [0, 0, 0]; r.point(CH, 0, BIND[b][1] - BIND[CH][1] - l1, (front ? -0.03 : 0.03) + BIND[b][2] - BIND[CH][2], rest1);
      const rest2 = [0, 0, 0]; r.point(CH, 0, BIND[b][1] - BIND[CH][1] - l1 - l2, (front ? -0.05 : 0.05) + BIND[b][2] - BIND[CH][2], rest2);
      for (let i = 0; i < n; i++) {
        for (const [p, q, rest, k] of [[pn.p1, pn.q1, rest1, 30], [pn.p2, pn.q2, rest2, 14]]) {
          for (let a = 0; a < 3; a++) {
            const v = (p[a] - q[a]) * Math.exp(-3.2 * h);
            q[a] = p[a];
            p[a] += v + ((a === 1 ? -9.81 : 0) + (rest[a] - p[a]) * k) * h * h;
          }
        }
        for (const [a, bb, L] of [[piv, pn.p1, l1], [pn.p1, pn.p2, l2]]) {
          const dx = bb[0] - a[0], dy = bb[1] - a[1], dz = bb[2] - a[2], d = Math.hypot(dx, dy, dz) || 1e-5;
          const f = L / d;
          bb[0] = a[0] + dx * f; bb[1] = a[1] + dy * f; bb[2] = a[2] + dz * f;
        }
        for (const p of [pn.p1, pn.p2]) {
          const rx = p[0] - W[ch + 9], ry = p[1] - W[ch + 10], rz = p[2] - W[ch + 11];
          const lz = W[ch + 2] * rx + W[ch + 5] * ry + W[ch + 8] * rz;
          const lim = front ? -0.11 * H : 0.12 * H;
          if (front ? lz > lim : lz < lim) {
            const dz = lim - lz;
            p[0] += W[ch + 2] * dz; p[1] += W[ch + 5] * dz; p[2] += W[ch + 8] * dz;
          }
        }
      }
      const setDir = (bone, parent, from, to, L) => {
        const o = parent * 12;
        const dx = (to[0] - from[0]) / L, dy = (to[1] - from[1]) / L, dz = (to[2] - from[2]) / L;
        const lx = W[o] * dx + W[o + 3] * dy + W[o + 6] * dz, ly = W[o + 1] * dx + W[o + 4] * dy + W[o + 7] * dz, lz = W[o + 2] * dx + W[o + 5] * dy + W[o + 8] * dz;
        r.set(bone, Math.atan2(-lz, -ly), 0, Math.asin(clamp(lx, -1, 1)));
        r.bone(bone);
      };
      setDir(b, CH, piv, pn.p1, l1);
      setDir(b + 1, b, pn.p1, pn.p2, l2);
    }
  }

  thurible(dt, energy, rave) {
    const r = this.Sv.r;
    r.point(HAR, 0.0, -0.075, -0.005, _p3);
    const piv = _vb.set(_p3[0], _p3[1], _p3[2]);
    const L = 0.56;
    if (!this.pend) { this.pend = { p: piv.clone().add(_va.set(0, -L, 0)), q: piv.clone().add(_va.set(0, -L, 0)), last: piv.clone() }; }
    const pd = this.pend;
    const yaw = this.serverRoot.rotation.y;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const n = Math.max(1, Math.ceil(dt / 0.006)), h = dt / n;
    if (this.kickV > 0 && h > 0) {
      const v = _va.subVectors(pd.p, pd.q);
      const sg = v.x * fx + v.z * fz >= 0 ? 1 : -1;
      const dv = Math.min(3, this.kickV * 1.1) * h;
      pd.q.x -= fx * sg * dv; pd.q.z -= fz * sg * dv;
      this.kickV = 0;
    }
    for (let i = 0; i < n; i++) {
      const k = (i + 1) / n;
      const px = lerp(pd.last.x, piv.x, k), py = lerp(pd.last.y, piv.y, k), pz = lerp(pd.last.z, piv.z, k);
      const damping = Math.exp(-(0.5 - 0.3 * rave) * h);
      const vx = (pd.p.x - pd.q.x) * damping, vy = (pd.p.y - pd.q.y) * damping, vz = (pd.p.z - pd.q.z) * damping;
      pd.q.copy(pd.p);
      pd.p.x += vx; pd.p.y += vy - 9.81 * h * h; pd.p.z += vz;
      const dx = pd.p.x - px, dy = pd.p.y - py, dz = pd.p.z - pz, d = Math.hypot(dx, dy, dz) || 1e-5;
      pd.p.set(px + dx * L / d, py + dy * L / d, pz + dz * L / d);
    }
    pd.last.copy(piv);
    const vfx = ((pd.p.x - pd.q.x) * fx + (pd.p.z - pd.q.z) * fz) / Math.max(1e-4, dt / n);
    this.dph = (this.dph || 0) + dt * Math.sqrt(9.81 / L);
    this.drive = damp(this.drive, clamp(vfx * 0.5 + 0.45 * Math.sin(this.dph), -1, 1), 10, dt);
    _va.subVectors(piv, pd.p).normalize();
    this.censer.position.copy(pd.p).addScaledVector(_va, -0.02);
    this.censer.quaternion.setFromUnitVectors(AXY, _va);
    this.censerPos.copy(this.censer.position);
    this.cring.position.copy(piv);
    this.cring.quaternion.copy(this.censer.quaternion);
    for (let i = 0; i < 4; i++) {
      const a = (i / 3) * TAU;
      if (i < 3) _vc.set(Math.cos(a) * 0.058, 0.004, Math.sin(a) * 0.058); else _vc.set(0, 0.136, 0);
      _vc.applyQuaternion(this.censer.quaternion).add(this.censer.position);
      cyl(this.chains[i], piv, _vc);
    }
  }

  props(dt, t, beat, mw) {
    const r = this.P.r, root = this.priestRoot;
    const yaw = root.rotation.y;
    this.host.visible = mw.elev > 0.05 && this.el > 0.02;
    if (this.host.visible) {
      r.point(FIL, 0, -0.05, -0.01, _p3); r.point(FIR, 0, -0.05, -0.01, _p4);
      this.host.position.set((_p3[0] + _p4[0]) / 2, (_p3[1] + _p4[1]) / 2 + 0.05, (_p3[2] + _p4[2]) / 2);
      _qa.setFromAxisAngle(AXY, yaw); _qb.setFromAxisAngle(AXX, PI / 2);
      this.host.quaternion.copy(_qa).multiply(_qb);
      this.host.material.emissiveIntensity = 0.3 + 1.6 * smooth(0.5, 1, this.el);
    }
    const dj = mw.dj;
    if (this.deck) {
      const D = this.deck;
      D.g.visible = dj > 0.35;
      if (D.g.visible) {
        const s = smooth(0.35, 0.8, dj);
        D.g.scale.setScalar(Math.max(0.001, s));
        D.g.position.set(root.position.x - Math.sin(yaw) * 0.55, root.position.y + 0.95, root.position.z - Math.cos(yaw) * 0.55);
        D.g.rotation.y = yaw;
        D.discs[0].rotation.y -= dt * 3.5;
        D.discs[1].rotation.y -= dt * 3.5 + (this.ctx.djScratch || 0) * 0.6;
        D.fader.position.x = (this.ctx.djFader || 0) * 1.5;
        const lv = pulse(fract(beat), 5);
        D.meters.forEach((m, i) => { m.scale.z = 0.2 + 0.8 * lv * (i ? 0.9 : 1); });
      }
    }
    this.phones.visible = dj > 0.3;
    if (this.phones.visible) {
      boneMat(r, HD, _m4);
      _m4.decompose(this.phones.position, _qd, _va);
      this.phones.quaternion.copy(_qd);
      _vc.set(0, HC[1] - BIND[HD][1] + 0.0, HC[2] - BIND[HD][2] + 0.004).applyQuaternion(_qd);
      this.phones.position.add(_vc);
      this.phones.children[2].position.set(0.1, -0.03, 0.035);
    }
  }
}
