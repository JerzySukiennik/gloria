// Gloria first-person player: walk the chapel, look around, sit down in a free pew seat, jump to the beat.
import * as THREE from 'three';
import { LATTICE, ARCH, NAVE, PEWS, ALTAR, WALL, ROOM, HALL, APSE, STAGE, HALTAR, COLUMNS, HPEWS, MIRROR_X } from './layout.js';
import { frameAt, clamp, lerp, damp } from './util.js';

const CELL = 0.1, X0 = -37.6, Z0 = -12.8, NX = 424, NZ = 218, R = 0.22;

function insidePoly(poly, x, z) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

export class Player {
  constructor(camera, dom, seats) {
    this.cam = camera;
    this.dom = dom;
    this.seats = seats;
    this.pos = new THREE.Vector3(HALL.xc, 0, HALL.z1 - 0.9);
    this.yaw = 0;
    this.pitch = 0.04;
    this.vel = new THREE.Vector2();
    this.keys = new Set();
    this.mode = 'walk';
    this.seat = null;
    this.anim = null;
    this.eye = 1.65;
    this.jumpV = 0; this.jumpY = 0;
    this.bob = 0;
    this.locked = false;
    this.touchMove = new THREE.Vector2();
    this.enabled = false;
    this.buildGrid();
    this.bind();
  }

  buildGrid() {
    const curve = new THREE.CatmullRomCurve3(LATTICE.pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    const inner = [];
    for (let i = 0; i <= 120; i++) {
      const { p, n } = frameAt(curve, i / 120);
      inner.push([p.x + n.x * (LATTICE.depth / 2 + 0.04), p.z + n.z * (LATTICE.depth / 2 + 0.04)]);
    }
    const chapel = [...inner, [inner[inner.length - 1][0], ROOM.zBack - 0.08], [ROOM.x0 + 0.04, ROOM.zBack - 0.08], [ROOM.x0 + 0.04, WALL.pilaster.z + WALL.pilaster.d / 2 + 0.02], [ROOM.x0 + WALL.pilaster.w, WALL.pilaster.z + WALL.pilaster.d / 2 + 0.02], [ROOM.x0 + WALL.pilaster.w, inner[0][1] + 0.1]];
    const chapelL = chapel.map(([x, z]) => [MIRROR_X - x, z]);
    const apse = new THREE.CatmullRomCurve3(APSE.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    const hall = [];
    for (let i = 0; i <= 80; i++) {
      const { p, n } = frameAt(apse, i / 80, [HALL.xc, 0]);
      hall.push([p.x + n.x * 0.32, p.z + n.z * 0.32]);
    }
    hall.push([HALL.x1 - 0.06, -9.0], [HALL.x1 - 0.06, HALL.z1 - 0.08], [HALL.x0 + 0.06, HALL.z1 - 0.08], [HALL.x0 + 0.06, -9.0]);
    const az0 = ARCH.z - ARCH.w / 2 + 0.12, az1 = ARCH.z + ARCH.w / 2 - 0.12;
    const passR = [[ROOM.x0 - 0.6, az0], [ROOM.x0 + 0.3, az0], [ROOM.x0 + 0.3, az1], [ROOM.x0 - 0.6, az1]];
    const passL = passR.map(([x, z]) => [MIRROR_X - x, z]);
    const polys = [chapel, chapelL, hall, passR, passL];
    const boxes = [];
    const box = (x0, x1, z0, z1, mirror = false) => { boxes.push([x0, x1, z0, z1]); if (mirror) boxes.push([MIRROR_X - x1, MIRROR_X - x0, z0, z1]); };
    const lastZ = PEWS.z0 + (PEWS.rows - 1) * PEWS.pitch;
    for (const [xa, xb] of [PEWS.left, PEWS.right]) box(xa - 0.05, xb + 0.05, PEWS.z0 - 0.24, lastZ + 0.7, true);
    const hLast = HPEWS.z0 + (HPEWS.rows - 1) * HPEWS.pitch;
    for (const [xa, xb] of [HPEWS.left, HPEWS.right]) box(xa - 0.05, xb + 0.05, HPEWS.z0 - 0.24, hLast + 0.7);
    const me = ALTAR.mensa, rt = ALTAR.retable;
    box(-me.w / 2, me.w / 2, me.z - me.d / 2, me.z + me.d / 2, true);
    box(-rt.w / 2, rt.w / 2, rt.z - rt.d / 2 - 0.05, rt.z + rt.d / 2, true);
    box(ALTAR.server.x - 0.28, ALTAR.server.x + 0.28, ALTAR.server.z - 0.28, ALTAR.server.z + 0.28, true);
    box(ALTAR.priest.x - 0.3, ALTAR.priest.x + 0.3, ALTAR.priest.z - 0.25, ALTAR.priest.z + 0.25, true);
    box(-1.65 - 0.25, -1.65 + 0.25, -4.95 - 0.25, -4.95 + 0.25, true);
    box(1.9 - 0.25, 1.9 + 0.25, -4.8 - 0.25, -4.8 + 0.25, true);
    box(HALTAR.x - HALTAR.w / 2, HALTAR.x + HALTAR.w / 2, HALTAR.z - HALTAR.d / 2, HALTAR.z + HALTAR.d / 2);
    for (const [cx, cz] of COLUMNS) box(cx - 0.48, cx + 0.48, cz - 0.48, cz + 0.48);
    for (const px of [HALL.x1 - 0.3, HALL.x0 + 0.3]) for (const dz of [-1.95, 1.95]) box(px - 0.28, px + 0.28, ARCH.z + dz - 0.28, ARCH.z + dz + 0.28);
    const inside = new Uint8Array(NX * NZ);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL;
      let ok = false;
      for (const pg of polys) if (insidePoly(pg, x, z)) { ok = true; break; }
      if (ok) for (const [a, b, c, d] of boxes) if (x > a && x < b && z > c && z < d) { ok = false; break; }
      inside[j * NX + i] = ok ? 1 : 0;
    }
    const rc = Math.ceil(R / CELL);
    const disk = [];
    for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) if (di * di + dj * dj <= rc * rc) disk.push([di, dj]);
    this.grid = new Uint8Array(NX * NZ);
    for (let j = rc; j < NZ - rc; j++) for (let i = rc; i < NX - rc; i++) {
      if (!inside[j * NX + i]) continue;
      let ok = 1;
      for (const [di, dj] of disk) if (!inside[(j + dj) * NX + i + di]) { ok = 0; break; }
      this.grid[j * NX + i] = ok;
    }
  }

  free(x, z) {
    const i = Math.floor((x - X0) / CELL), j = Math.floor((z - Z0) / CELL);
    if (i < 0 || j < 0 || i >= NX || j >= NZ) return false;
    return this.grid[j * NX + i] === 1;
  }

  bind() {
    const down = (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (!this.enabled) return;
      this.keys.add(k);
      if (k === 'e' && !e.repeat) this.toggleSeat();
      if (k === ' ' && !e.repeat) this.jump();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
    this.dom.addEventListener('click', () => {
      if (!this.enabled || this.touch || this.locked) return;
      if (this.dom.requestPointerLock) this.dom.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === this.dom; });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.look(e.movementX * 0.0022, e.movementY * 0.0022);
    });
    let drag = null;
    this.dom.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && this.locked) return;
      if (e.pointerType !== 'mouse') this.touch = true;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      this.dom.setPointerCapture(e.pointerId);
    });
    this.dom.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      this.look((e.clientX - drag.x) * 0.006, (e.clientY - drag.y) * 0.006);
      drag.x = e.clientX; drag.y = e.clientY;
    });
    const up = (e) => { if (drag && drag.id === e.pointerId) drag = null; };
    this.dom.addEventListener('pointerup', up);
    this.dom.addEventListener('pointercancel', up);
  }

  bindStick(el, knob) {
    let id = null, cx = 0, cy = 0;
    const rad = 46;
    el.addEventListener('pointerdown', (e) => {
      this.touch = true;
      id = e.pointerId;
      const r = el.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      el.setPointerCapture(id);
      move(e);
    });
    const move = (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const l = Math.hypot(dx, dy);
      if (l > rad) { dx *= rad / l; dy *= rad / l; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.touchMove.set(dx / rad, dy / rad);
    };
    el.addEventListener('pointermove', move);
    const end = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; this.touchMove.set(0, 0); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  look(dx, dy) {
    this.yaw -= dx;
    this.pitch = clamp(this.pitch - dy, -1.2, 1.25);
    if (this.mode === 'sitting') this.yaw = clamp(this.yaw, -1.7, 1.7);
  }

  jump() {
    if (this.mode !== 'walk' || this.jumpY > 0.01) return;
    this.jumpV = 2.6;
  }

  nearestSeat() {
    if (this.mode !== 'walk') return null;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    let best = null, bd = 1e9;
    for (const s of this.seats) {
      if (s.taken) continue;
      const dx = s.x - this.pos.x, dz = s.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.0) continue;
      const facing = (dx * fx + dz * fz) / (d || 1);
      const score = d - facing * 0.8;
      if (score < bd) { bd = score; best = s; }
    }
    return best;
  }

  toggleSeat() {
    if (this.mode === 'sitting') return this.standUp();
    const s = this.nearestSeat();
    if (s) this.sitDown(s);
  }

  sitDown(s) {
    this.mode = 'anim';
    this.seat = s;
    s.taken = true;
    this.back = this.pos.clone();
    this.anim = { t: 0, dur: 1.1, from: this.pos.clone(), fromEye: this.eye, to: new THREE.Vector3(s.x, 0, s.z + 0.04), toEye: 1.17, fromYaw: this.yaw, toYaw: 0, then: 'sitting' };
  }

  standUp() {
    if (!this.seat) return;
    this.seat.taken = false;
    this.mode = 'anim';
    this.anim = { t: 0, dur: 0.9, from: this.pos.clone(), fromEye: this.eye, to: this.back.clone(), toEye: 1.65, fromYaw: this.yaw, toYaw: this.yaw, then: 'walk' };
    this.seat = null;
  }

  stepHeight(x, z) {
    if (x > -4.2) return z < ALTAR.step.z1 && z > ALTAR.step.z0 ? ALTAR.step.h : 0;
    if (x < MIRROR_X + 4.2) return z < ALTAR.step.z1 && z > ALTAR.step.z0 ? ALTAR.step.h : 0;
    if (z < STAGE.z1 && x > STAGE.x0 - 0.6 && x < STAGE.x1 + 0.6) return STAGE.h;
    if (z < STAGE.z1 + 0.55 && Math.abs(x - HALL.xc) < 2.1) return 0.3;
    return 0;
  }

  update(dt, t, beatPhase, rave) {
    const k = this.keys;
    if (this.mode === 'walk' && this.enabled) {
      let f = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0) - this.touchMove.y;
      let r = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0) + this.touchMove.x;
      if (k.has('arrowleft')) this.yaw += dt * 1.8;
      if (k.has('arrowright')) this.yaw -= dt * 1.8;
      const l = Math.hypot(f, r);
      if (l > 1) { f /= l; r /= l; }
      const sp = k.has('shift') ? 2.7 : 1.55;
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const tx = (fx * f + -fz * r) * sp, tz = (fz * f + fx * r) * sp;
      this.vel.x = damp(this.vel.x, tx, 10, dt);
      this.vel.y = damp(this.vel.y, tz, 10, dt);
      const nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.y * dt;
      if (this.free(nx, nz)) { this.pos.x = nx; this.pos.z = nz; }
      else if (this.free(nx, this.pos.z)) { this.pos.x = nx; this.vel.y *= 0.5; }
      else if (this.free(this.pos.x, nz)) { this.pos.z = nz; this.vel.x *= 0.5; }
      else this.vel.set(0, 0);
      const spd = this.vel.length();
      this.bob += dt * spd * 5.5;
      this.eye = damp(this.eye, 1.65, 6, dt);
    } else if (this.mode === 'anim') {
      const a = this.anim;
      a.t += dt;
      const u = Math.min(1, a.t / a.dur), s = u * u * (3 - 2 * u);
      this.pos.lerpVectors(a.from, a.to, s);
      this.eye = lerp(a.fromEye, a.toEye, s);
      this.yaw = lerp(a.fromYaw, a.toYaw, s);
      if (u >= 1) { this.mode = a.then; this.anim = null; }
    }
    this.jumpV -= 9.8 * dt;
    this.jumpY = Math.max(0, this.jumpY + this.jumpV * dt);
    if (this.jumpY === 0) this.jumpV = Math.max(0, this.jumpV);
    const step = this.stepHeight(this.pos.x, this.pos.z);
    this.stepY = damp(this.stepY || 0, step, 12, dt);
    const walkBob = this.mode === 'walk' ? Math.sin(this.bob) * 0.025 * Math.min(1, this.vel.length()) : 0;
    const dance = rave * (this.mode === 'walk' ? 0.03 : 0.012) * Math.abs(Math.sin(beatPhase * Math.PI));
    this.cam.position.set(this.pos.x, this.eye + this.stepY + this.jumpY + walkBob - dance, this.pos.z);
    const dir = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    this.cam.lookAt(this.cam.position.clone().add(dir));
  }
}
