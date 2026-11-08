// Gloria people: instanced congregation that wakes up with the music, the priest and the altar server with the thurible.
import * as THREE from 'three';
import { PEWS, SEAT, ALTAR } from './layout.js';
import { rnd, clamp, lerp, damp, canvasTex } from './util.js';

const UP = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4(), _s = new THREE.Vector3();

function limb(mesh, i, a, b, r, len0) {
  _v.subVectors(b, a);
  const len = _v.length();
  _q.setFromUnitVectors(UP, _v.multiplyScalar(1 / Math.max(1e-5, len)));
  _s.set(1, len / len0, 1);
  _v2.addVectors(a, b).multiplyScalar(0.5);
  _m.compose(_v2, _q, _s);
  mesh.setMatrixAt(i, _m);
}

const COATS = [0x1d2a44, 0x2b2b2e, 0x4a3b2e, 0xd9cdb6, 0x3d4a3a, 0x5a2f35, 0x6b6f78, 0x8a6f52, 0x22303a, 0xb8b0a2, 0x37415c, 0x7d4b3a];
const HAIRS = [0xd8d5cf, 0xbdb8ae, 0x9a948a, 0x5a4a3c, 0x2f2620, 0xe9e5dc, 0x8c7f70];
const SKINS = [0xe8bfa0, 0xdcae8c, 0xf0caae, 0xc89474, 0xe2b596];
const HATS = [0xc8323a, 0x2c3e66, 0x6b4e8a, 0xd9cdb6];

export class Congregation {
  constructor(scene, quality) {
    const r = rnd(1977);
    this.people = [];
    const seatZ = (row) => PEWS.z0 + row * PEWS.pitch + 0.02;
    const special = [
      { row: 2, x: -2.9, coat: 0x1e2c4a, hat: 0xc8323a, hair: 0x2f2620, female: true },
      { row: 3, x: -1.85, coat: 0x1b2640, hair: 0xc9c4ba, female: false, big: true },
      { row: 3, x: 1.05, coat: 0xe2d8c6, hair: 0xeeebe4, female: true },
    ];
    for (const sp of special) this.people.push(this.make(r, sp.x, seatZ(sp.row), sp));
    for (let row = 0; row < PEWS.rows; row++) {
      for (const [xa, xb] of [PEWS.left, PEWS.right]) {
        const n = Math.floor((xb - xa) / 0.62);
        for (let k = 0; k < n; k++) {
          const x = xa + 0.31 + k * ((xb - xa - 0.62) / Math.max(1, n - 1));
          if (row === SEAT.row && Math.abs(x - SEAT.x) < 0.75) continue;
          if (row < SEAT.row && row >= SEAT.row - 2 && x > -1.35 && x < 0.6) continue;
          if (this.people.some((p) => Math.abs(p.z - seatZ(row)) < 0.1 && Math.abs(p.x - x) < 0.5)) continue;
          const fill = row < 2 ? 0.55 : 0.68;
          if (r() > fill) continue;
          this.people.push(this.make(r, x + (r() - 0.5) * 0.12, seatZ(row), {}));
        }
      }
    }
    this.slots = [];
    for (let row = 0; row < PEWS.rows; row++) {
      for (const [xa, xb] of [PEWS.left, PEWS.right]) {
        const n = Math.floor((xb - xa) / 0.62);
        for (let k = 0; k < n; k++) {
          const x = xa + 0.31 + k * ((xb - xa - 0.62) / Math.max(1, n - 1));
          const z = seatZ(row);
          this.slots.push({ row, x, z, taken: this.people.some((p) => Math.abs(p.z - z) < 0.1 && Math.abs(p.x - x) < 0.42) });
        }
      }
    }
    const N = this.people.length;
    const mk = (geo, color, n = N) => {
      const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), n);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.castShadow = false; m.receiveShadow = true;
      m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    const coatGeo = new THREE.CapsuleGeometry(0.165, 0.34, 6, 14);
    this.torso = mk(coatGeo);
    this.lower = mk(new THREE.CapsuleGeometry(0.14, 0.48, 4, 12));
    this.head = mk(new THREE.SphereGeometry(0.1, 18, 14));
    this.hair = mk(new THREE.SphereGeometry(0.106, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.56));
    this.hat = mk(new THREE.CylinderGeometry(0.1, 0.112, 0.09, 18));
    this.upper = mk(new THREE.CapsuleGeometry(0.046, 1, 4, 10), null, N * 2);
    this.fore = mk(new THREE.CapsuleGeometry(0.038, 1, 4, 10), null, N * 2);
    this.hand = mk(new THREE.SphereGeometry(0.046, 10, 8), null, N * 2);
    this.upperLen = 1.092; this.foreLen = 1.076;
    const c = new THREE.Color();
    this.people.forEach((p, i) => {
      this.torso.setColorAt(i, c.setHex(p.coat));
      this.lower.setColorAt(i, c.setHex(p.pants));
      this.head.setColorAt(i, c.setHex(p.skin));
      this.hair.setColorAt(i, c.setHex(p.hair));
      this.hat.setColorAt(i, c.setHex(p.hatColor || 0));
      for (const s of [0, 1]) {
        this.upper.setColorAt(i * 2 + s, c.setHex(p.coat));
        this.fore.setColorAt(i * 2 + s, c.setHex(p.coat));
        this.hand.setColorAt(i * 2 + s, c.setHex(p.skin));
      }
    });
    for (const m of [this.torso, this.lower, this.head, this.hair, this.hat, this.upper, this.fore, this.hand]) m.instanceColor.needsUpdate = true;
    this.energy = 0;
    this.mood = { stand: 0, kneel: 0, clap: 0, raise: 0, sway: 0, peace: 0, sleep: 1, jump: 0 };
  }

  make(r, x, z, o) {
    const female = o.female ?? r() < 0.58;
    const s = (o.big ? 1.06 : 0.93 + r() * 0.12) * (female ? 0.96 : 1.02);
    const hatColor = o.hat ?? (r() < 0.12 ? HATS[Math.floor(r() * HATS.length)] : 0);
    return {
      x, z, s, female, hatColor,
      coat: o.coat ?? COATS[Math.floor(r() * COATS.length)],
      pants: [0x1f1f22, 0x2b2d33, 0x3a3530, 0x4a4136][Math.floor(r() * 4)],
      hair: o.hair ?? HAIRS[Math.floor(r() * HAIRS.length)],
      skin: SKINS[Math.floor(r() * SKINS.length)],
      bald: !female && !o.hair && r() < 0.25,
      ph: r() * Math.PI * 2,
      lag: 0.1 + r() * 0.9,
      shy: r(),
      sleepy: r() < 0.3,
      st: { stand: 0, kneel: 0, clap: 0, raise: 0, sway: 0, peace: 0, sleep: 0, jump: 0 },
      turn: r() < 0.5 ? -1 : 1,
    };
  }

  update(dt, t, beat, beatPhase) {
    const M = this.mood;
    const Mz = PEWS;
    this.people.forEach((p, i) => {
      const k = 1.2 + 2.5 * (1 - p.lag);
      const gate = (v, need) => (p.shy < need ? v : 0);
      const st = p.st;
      st.stand = damp(st.stand, M.stand > 0.5 ? (p.shy < 0.92 || M.stand > 0.9 ? 1 : 0) : 0, k * 1.6, dt);
      st.kneel = damp(st.kneel, M.kneel, k * 1.4, dt);
      st.clap = damp(st.clap, gate(M.clap, 0.45 + M.clap * 0.5), k * 2, dt);
      st.raise = damp(st.raise, gate(M.raise, M.raise * 0.95), k * 1.5, dt);
      st.sway = damp(st.sway, M.sway * (0.5 + p.shy * 0.5), k, dt);
      st.peace = damp(st.peace, M.peace, k * 1.5, dt);
      st.sleep = damp(st.sleep, p.sleepy ? M.sleep : 0, 1.5, dt);
      st.jump = damp(st.jump, gate(M.jump, 0.6), k * 2, dt);

      const s = p.s;
      const stand = st.stand * (1 - st.kneel);
      const kneel = st.kneel;
      const bounce = (st.jump * 0.07 * Math.max(0, Math.sin(beatPhase * Math.PI))) + st.sway * 0.02 * Math.sin(beatPhase * Math.PI * 2);
      const hipY = lerp(lerp(0.5, 0.97 * s, stand), 0.42, kneel) + bounce;
      const hipZ = p.z + lerp(lerp(0.02, -0.17, stand), -0.32, kneel);
      const swayX = st.sway * 0.06 * Math.sin(beat * Math.PI + p.ph);
      const yaw = st.peace * p.turn * 0.9 + Math.sin(t * 0.3 + p.ph) * 0.04;
      const lean = kneel * 0.38 + st.sleep * 0.12 - st.raise * 0.08 + (1 - stand) * 0.06;
      const hip = _hip.set(p.x + swayX, hipY, hipZ);
      const fwd = _fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      const side = _side.set(Math.cos(yaw), 0, -Math.sin(yaw));
      const spine = _spine.copy(UP).multiplyScalar(Math.cos(lean)).addScaledVector(fwd, Math.sin(lean)).addScaledVector(side, swayX * 0.8).normalize();
      const torsoLen = 0.5 * s;
      const chest = _chest.copy(hip).addScaledVector(spine, torsoLen * 0.62);
      _q.setFromUnitVectors(UP, spine);
      const yq = _q2.setFromAxisAngle(UP, yaw);
      _q.multiply(yq);
      _m.compose(_v.copy(hip).addScaledVector(spine, torsoLen * 0.42), _q, _s.set(s * (p.female ? 0.94 : 1.05), s, s * 0.78));
      this.torso.setMatrixAt(i, _m);
      const legY = lerp(0.3, hipY * 0.5, stand);
      _m.compose(_v.set(p.x + swayX * 0.5, legY, hipZ + lerp(-0.12, 0.02, stand)), yq, _s.set(s, lerp(0.4, 1, stand), s));
      this.lower.setMatrixAt(i, _m);
      const neck = _neck.copy(hip).addScaledVector(spine, torsoLen * 0.98);
      const nod = st.sleep * 0.5 * (0.7 + 0.3 * Math.sin(t * 0.5 + p.ph)) + st.sway * 0.12 * Math.sin(beat * Math.PI * 2 + p.ph);
      const headDir = _hd.copy(spine).applyAxisAngle(side, -nod).normalize();
      const headC = _hc.copy(neck).addScaledVector(headDir, 0.12 * s);
      _q.setFromUnitVectors(UP, headDir).multiply(yq);
      _m.compose(headC, _q, _s.set(s * 0.92, s * 1.1, s));
      this.head.setMatrixAt(i, _m);
      _q3.copy(_q).multiply(HAIR_TILT);
      _m.compose(_v.copy(headC).addScaledVector(headDir, 0.006 * s).addScaledVector(fwd, -0.012 * s), _q3, p.bald ? _s.set(0.001, 0.001, 0.001) : _s.set(s * (p.female ? 1.06 : 0.99), s * (p.female ? 1.2 : 1.08), s * 1.08));
      this.hair.setMatrixAt(i, _m);
      if (p.hatColor) _m.compose(_v.copy(headC).addScaledVector(headDir, 0.085 * s), _q, _s.set(s, s, s));
      else _m.makeScale(0, 0, 0);
      this.hat.setMatrixAt(i, _m);

      for (const sd of [-1, 1]) {
        const sh = _sh.copy(chest).addScaledVector(side, sd * 0.19 * s).addScaledVector(spine, 0.08 * s);
        const clapT = 0.5 + 0.5 * Math.cos(beatPhase * Math.PI * 2);
        let elbow, hand;
        const restE = _e.copy(sh).addScaledVector(spine, -0.26 * s).addScaledVector(side, sd * 0.03).addScaledVector(fwd, 0.04);
        const restH = _h.copy(restE).addScaledVector(fwd, 0.24 * s).addScaledVector(side, -sd * 0.06).addScaledVector(UP, 0.02);
        const clapE = _e2.copy(sh).addScaledVector(spine, -0.18 * s).addScaledVector(fwd, 0.16 * s).addScaledVector(side, sd * 0.06);
        const clapH = _h2.copy(chest).addScaledVector(fwd, 0.3 * s).addScaledVector(side, sd * (0.02 + 0.09 * clapT)).addScaledVector(UP, 0.02);
        const upE = _e3.copy(sh).addScaledVector(UP, 0.24 * s).addScaledVector(side, sd * 0.12 * s).addScaledVector(fwd, 0.03);
        const wave = Math.sin(beat * Math.PI + p.ph + sd) * 0.08;
        const upH = _h3.copy(upE).addScaledVector(UP, 0.25 * s).addScaledVector(side, sd * (0.06 + wave));
        const peaceH = _h4.copy(chest).addScaledVector(fwd, 0.22).addScaledVector(side, p.turn * 0.32).addScaledVector(UP, -0.1);
        elbow = _eo.copy(restE).lerp(clapE, st.clap).lerp(upE, st.raise);
        hand = _ho.copy(restH).lerp(clapH, st.clap).lerp(upH, st.raise);
        if (sd === p.turn) { elbow.lerp(_v.copy(sh).lerp(peaceH, 0.5), st.peace); hand.lerp(peaceH, st.peace); }
        const j = i * 2 + (sd > 0 ? 1 : 0);
        limb(this.upper, j, sh, elbow, 0.05, this.upperLen);
        limb(this.fore, j, elbow, hand, 0.045, this.foreLen);
        _m.compose(hand, yq, _s.set(s, s, s));
        this.hand.setMatrixAt(j, _m);
      }
    });
    for (const m of [this.torso, this.lower, this.head, this.hair, this.hat, this.upper, this.fore, this.hand]) m.instanceMatrix.needsUpdate = true;
  }
}
const _hip = new THREE.Vector3(), _fwd = new THREE.Vector3(), _side = new THREE.Vector3(), _spine = new THREE.Vector3(), _chest = new THREE.Vector3(), _neck = new THREE.Vector3(), _hd = new THREE.Vector3(), _hc = new THREE.Vector3(), _sh = new THREE.Vector3();
const _e = new THREE.Vector3(), _h = new THREE.Vector3(), _e2 = new THREE.Vector3(), _h2 = new THREE.Vector3(), _e3 = new THREE.Vector3(), _h3 = new THREE.Vector3(), _h4 = new THREE.Vector3(), _eo = new THREE.Vector3(), _ho = new THREE.Vector3();
const _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const HAIR_TILT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.55);

function lathe(points, mat, segs = 28) {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}

function limbMesh(r, mat) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, 1, 4, 12), mat);
  m.castShadow = true;
  return m;
}
function setLimb(m, a, b) {
  _v.subVectors(b, a);
  const len = _v.length();
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, _v.multiplyScalar(1 / Math.max(1e-5, len)));
  m.scale.set(1, len / (1 + 2 * m.geometry.parameters.radius), 1);
}

class Figure {
  constructor(o) {
    this.g = new THREE.Group();
    this.o = o;
    const skin = new THREE.MeshStandardMaterial({ color: o.skin, roughness: 0.6 });
    const hair = new THREE.MeshStandardMaterial({ color: o.hair, roughness: 0.8 });
    this.body = new THREE.Group();
    this.g.add(this.body);
    for (const part of o.robes) this.body.add(part);
    this.headG = new THREE.Group();
    this.headG.position.set(0, o.neckY, 0);
    const faceTex = canvasTex(256, 128, (c, w, h) => {
      c.fillStyle = '#' + new THREE.Color(o.skin).getHexString(); c.fillRect(0, 0, w, h);
      const cx = w * 0.25;
      c.fillStyle = 'rgba(40,28,22,0.9)';
      for (const dx of [-13, 13]) { c.beginPath(); c.ellipse(cx + dx, h * 0.46, 3.2, 3.8, 0, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = 'rgba(90,70,60,0.75)'; c.lineWidth = 2.4;
      for (const dx of [-13, 13]) { c.beginPath(); c.moveTo(cx + dx - 6, h * 0.4); c.lineTo(cx + dx + 6, h * 0.39); c.stroke(); }
      c.strokeStyle = 'rgba(120,60,55,0.8)'; c.lineWidth = 2.6;
      c.beginPath(); c.arc(cx, h * 0.62, 8, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
      c.fillStyle = 'rgba(210,120,110,0.18)';
      for (const dx of [-20, 20]) { c.beginPath(); c.arc(cx + dx, h * 0.6, 7, 0, Math.PI * 2); c.fill(); }
    });
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.6 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), faceMat);
    head.scale.set(0.92, 1.12, 1.0);
    head.position.y = 0.12;
    head.castShadow = true;
    const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 12, 0, Math.PI * 2, 0, Math.PI * (o.hairCap || 0.5)), hair);
    hairM.scale.set(0.95, 1.08, 1.04);
    hairM.position.set(0, 0.13, 0.01);
    hairM.rotation.x = 0.35;
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), skin);
    nose.scale.set(0.8, 1.2, 1);
    nose.position.set(0, 0.11, 0.1);
    this.headG.add(head, hairM, nose);
    if (o.glasses) {
      const gm = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.5 });
      for (const sx of [-0.04, 0.04]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0035, 6, 18), gm);
        ring.position.set(sx, 0.135, 0.095);
        this.headG.add(ring);
      }
    }
    this.body.add(this.headG);
    this.arms = [-1, 1].map((sd) => {
      const up = limbMesh(o.sleeveR, o.sleeveMat);
      const fo = limbMesh(o.sleeveR * 0.85, o.sleeveMat);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), skin);
      this.body.add(up, fo, hd);
      return { sd, up, fo, hd };
    });
    this.shoulderY = o.neckY - 0.06;
  }
  pose(armTargets) {
    for (const a of this.arms) {
      const t = armTargets[a.sd < 0 ? 0 : 1];
      const sh = _v2.set(a.sd * 0.2, this.shoulderY, 0);
      setLimb(a.up, sh, t.e);
      setLimb(a.fo, t.e, t.h);
      a.hd.position.copy(t.h);
    }
  }
}

export class Clergy {
  constructor(scene) {
    const white = new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 0.8 });
    const chasTex = canvasTex(512, 512, (c, w, h) => {
      c.fillStyle = '#f2ece0'; c.fillRect(0, 0, w, h);
      const g = c.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, '#b8892f'); g.addColorStop(0.5, '#f1d27a'); g.addColorStop(1, '#b8892f');
      c.fillStyle = g;
      for (const cx of [w * 0.25, w * 0.75]) {
        c.fillRect(cx - 22, 0, 44, h);
        c.fillRect(cx - 70, h * 0.18, 140, 34);
      }
      c.strokeStyle = 'rgba(184,137,47,0.5)'; c.lineWidth = 6;
      c.strokeRect(6, 6, w - 12, h - 12);
    });
    const chas = new THREE.MeshStandardMaterial({ map: chasTex, roughness: 0.65, metalness: 0.08, side: THREE.DoubleSide });
    const alb = lathe([[0.001, 0.0], [0.27, 0.0], [0.25, 0.4], [0.21, 0.9], [0.2, 1.2], [0.19, 1.38], [0.12, 1.47], [0.06, 1.5], [0.001, 1.5]], white);
    const cas = lathe([[0.001, 0.62], [0.4, 0.62], [0.38, 0.85], [0.31, 1.15], [0.24, 1.38], [0.14, 1.48], [0.08, 1.51], [0.001, 1.51]], chas, 36);
    cas.scale.z = 0.62;
    const stoleCol = lathe([[0.075, 1.47], [0.085, 1.5], [0.07, 1.53]], white);
    this.priest = new Figure({ skin: 0xe2b596, hair: 0xc9c5bd, robes: [alb, cas, stoleCol], neckY: 1.52, sleeveR: 0.06, sleeveMat: white, glasses: true, hairCap: 0.42 });
    this.priest.g.position.set(ALTAR.priest.x, 0.17, ALTAR.priest.z);
    scene.add(this.priest.g);

    const black = new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: 0.75 });
    const cassock = lathe([[0.001, 0.0], [0.2, 0.0], [0.18, 0.5], [0.16, 1.0], [0.15, 1.15], [0.1, 1.24], [0.001, 1.25]], black);
    const surplice = lathe([[0.001, 0.55], [0.27, 0.55], [0.23, 0.8], [0.19, 1.05], [0.15, 1.18], [0.09, 1.25], [0.001, 1.26]], white);
    this.server = new Figure({ skin: 0xf0caae, hair: 0x5a4a3c, robes: [cassock, surplice], neckY: 1.27, sleeveR: 0.05, sleeveMat: white, hairCap: 0.55 });
    this.server.g.scale.setScalar(0.92);
    this.server.g.position.set(ALTAR.server.x, 0.17, ALTAR.server.z);
    this.server.g.rotation.y = -0.5;
    scene.add(this.server.g);

    const brass = new THREE.MeshStandardMaterial({ color: 0xd2ad62, metalness: 1, roughness: 0.3 });
    this.censer = new THREE.Group();
    const pot = lathe([[0.001, -0.06], [0.06, -0.05], [0.075, 0.0], [0.06, 0.05], [0.001, 0.06]], brass, 18);
    const lid = lathe([[0.06, 0.05], [0.045, 0.1], [0.02, 0.13], [0.001, 0.15]], brass, 14);
    const chainM = new THREE.MeshStandardMaterial({ color: 0xc9a25a, metalness: 1, roughness: 0.4 });
    this.chain = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 5), chainM);
    this.censer.add(pot, lid);
    scene.add(this.censer, this.chain);
    this.censerPos = new THREE.Vector3();
    this.swing = 0.35;
    this.swingAmp = 0.35;

    const host = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.006, 32), new THREE.MeshStandardMaterial({ color: 0xfbf6e8, roughness: 0.5, emissive: 0xfff2d0, emissiveIntensity: 0 }));
    host.rotation.x = Math.PI / 2;
    host.visible = false;
    scene.add(host);
    this.host = host;
    const chalice = lathe([[0.001, 0], [0.06, 0], [0.05, 0.01], [0.012, 0.03], [0.012, 0.11], [0.05, 0.14], [0.055, 0.2], [0.05, 0.2], [0.001, 0.15]], brass, 22);
    chalice.position.set(0.18, ALTAR.mensa.h, ALTAR.mensa.z - 0.1);
    scene.add(chalice);

    this.mode = 'idle';
    this.voice = 0;
    this.elev = 0;
    this.hype = 0;
    this.orans = 0;
    this.dance = 0;
  }

  update(dt, t, beat, beatPhase, energy) {
    const P = this.priest;
    const want = { idle: [0, 0, 0], orans: [1, 0, 0], hype: [0, 1, 0], elev: [0, 0, 1], dance: [0, 1, 0] }[this.mode] || [0, 0, 0];
    this.orans = damp(this.orans, want[0], 3, dt);
    this.hype = damp(this.hype, want[1], 3, dt);
    this.elev = damp(this.elev, want[2], 1.1, dt);
    this.dance = damp(this.dance, this.mode === 'dance' ? 1 : energy > 0.5 && this.mode !== 'elev' ? 0.5 : 0, 2, dt);
    const groove = this.dance * Math.sin(beatPhase * Math.PI * 2);
    P.body.rotation.z = groove * 0.05;
    P.body.position.y = this.dance * 0.02 * Math.abs(Math.sin(beatPhase * Math.PI));
    P.headG.rotation.x = -this.voice * 0.18 * Math.sin(t * 9) - this.dance * 0.08 * Math.abs(Math.sin(beatPhase * Math.PI)) - this.elev * 0.25;
    P.headG.rotation.y = Math.sin(t * 0.7) * 0.12 * (1 - this.elev);
    const sy = P.shoulderY;
    const rest = (sd) => ({ e: new THREE.Vector3(sd * 0.22, sy - 0.27, 0.08), h: new THREE.Vector3(sd * 0.05, sy - 0.33, 0.24) });
    const orans = (sd) => ({ e: new THREE.Vector3(sd * 0.4, sy - 0.12, 0.1), h: new THREE.Vector3(sd * 0.55, sy + 0.1, 0.18) });
    const pump = Math.max(0, Math.sin(beatPhase * Math.PI * 2));
    const hype = (sd) => sd > 0
      ? { e: new THREE.Vector3(0.32, sy + 0.08, 0.06), h: new THREE.Vector3(0.3, sy + 0.32 + pump * 0.12, 0.1) }
      : { e: new THREE.Vector3(-0.28, sy - 0.2, 0.12), h: new THREE.Vector3(-0.2, sy - 0.12, 0.3) };
    const elev = (sd) => ({ e: new THREE.Vector3(sd * 0.2, sy + 0.12, 0.2), h: new THREE.Vector3(sd * 0.05, sy + 0.42, 0.24) });
    const talk = Math.sin(t * 3.3) * this.voice;
    const arms = [-1, 1].map((sd) => {
      const r = rest(sd), o = orans(sd), hy = hype(sd), el = elev(sd);
      const e = r.e.clone().lerp(o.e, this.orans).lerp(hy.e, this.hype).lerp(el.e, this.elev);
      const h = r.h.clone().lerp(o.h, this.orans).lerp(hy.h, this.hype).lerp(el.h, this.elev);
      h.x += sd * talk * 0.06; h.y += talk * 0.04 * (sd > 0 ? 1 : 0.5);
      return { e, h };
    });
    P.pose(arms);
    this.host.visible = this.elev > 0.05;
    if (this.host.visible) {
      const hh = arms[1].h.clone().add(arms[0].h).multiplyScalar(0.5);
      hh.y += 0.07;
      P.g.localToWorld(hh);
      this.host.position.copy(hh);
      this.host.material.emissiveIntensity = this.elev * 2.5;
    }

    const S = this.server;
    this.swing += dt * Math.PI * 2 * 0.62;
    this.swingAmp = damp(this.swingAmp, 0.35, 0.8, dt);
    const ang = Math.sin(this.swing) * this.swingAmp;
    const sy2 = S.shoulderY;
    const handL = new THREE.Vector3(0.22 + Math.sin(this.swing) * 0.05, sy2 - 0.15, 0.25);
    S.pose([
      { e: new THREE.Vector3(-0.22, sy2 - 0.26, 0.05), h: new THREE.Vector3(-0.08, sy2 - 0.32, 0.2) },
      { e: new THREE.Vector3(0.26, sy2 - 0.22, 0.12), h: handL },
    ]);
    S.body.rotation.z = this.dance * 0.04 * Math.sin(beatPhase * Math.PI * 2);
    const top = S.g.localToWorld(handL.clone());
    const len = 0.62;
    const yaw = S.g.rotation.y;
    const dir = new THREE.Vector3(Math.sin(ang) * Math.sin(yaw + Math.PI / 2) * 0, -Math.cos(ang), 0);
    dir.x = Math.sin(ang) * Math.cos(yaw);
    dir.z = -Math.sin(ang) * Math.sin(yaw);
    dir.normalize();
    const bot = top.clone().addScaledVector(dir, len);
    setLimb(this.chain, top, bot);
    this.chain.scale.set(1, len, 1);
    this.censer.position.copy(bot).addScaledVector(dir, 0.05);
    this.censer.quaternion.setFromUnitVectors(UP, dir.clone().negate());
    this.censerPos.copy(this.censer.position);
  }

  kick(amount) {
    this.swingAmp = Math.min(1.1, this.swingAmp + amount);
  }
}
