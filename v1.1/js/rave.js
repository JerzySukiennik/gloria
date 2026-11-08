// Gloria rave rig: lasers, moving heads, pyro (flame jets, spark fountains, CO2), swinging botafumeiro censers and a mirror ball.
import * as THREE from 'three';
import { HALL, STAGE, BOTA, DISCO, APSE } from './layout.js';
import { rnd, canvasTex } from './util.js';

const UP = new THREE.Vector3(0, 1, 0);

function rayBox(o, d) {
  let tmin = 0.05, tmax = 60;
  const lo = [HALL.x0 + 0.02, 0.01, HALL.z0 + 0.6], hi = [HALL.x1 - 0.02, HALL.h - 0.02, HALL.z1 - 0.02];
  const oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dd[i]) < 1e-6) continue;
    const a = (lo[i] - oo[i]) / dd[i], b = (hi[i] - oo[i]) / dd[i];
    tmax = Math.min(tmax, Math.max(a, b));
  }
  return Math.max(0.1, tmax);
}

const beamVS = `varying vec2 vUv; varying vec3 vW;
  void main(){ vUv = uv; vec4 w = modelMatrix * instanceMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

export class Lasers {
  constructor(scene, quality) {
    this.emitters = [];
    const xc = HALL.xc;
    const spots = [[xc - 3, 0.72, STAGE.z1 + 0.05], [xc + 3, 0.72, STAGE.z1 + 0.05], [xc - 6, HALL.h - 0.5, -11.0], [xc + 6, HALL.h - 0.5, -11.0], [xc, HALL.h - 0.5, -11.6], [-26.0, 6.2, -2.9], [-6.84, 6.2, -2.9]];
    const cols = ['#2bff6a', '#19d4ff', '#ff2bd6', '#8a5cff', '#ffffff', '#2bff6a', '#19d4ff'];
    this.per = quality === 'low' ? 4 : quality === 'mid' ? 6 : 8;
    spots.forEach((p, i) => this.emitters.push({ pos: new THREE.Vector3(...p), color: new THREE.Color(cols[i]), top: p[1] > 2 && i < 5, side: i >= 5 ? (p[0] < xc ? 1 : -1) : 0, i }));
    const n = this.emitters.length * this.per;
    const geo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    geo.translate(0, 0.5, 0);
    this.uniforms = { uHaze: { value: 0.5 }, uI: { value: 0 }, uCol: { value: new THREE.Color(0.2, 1, 0.4) }, uRainbow: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `attribute vec3 aColor; uniform vec3 uCol; uniform float uRainbow; varying vec3 vC; varying float vY; varying vec3 vN; varying vec3 vW;
        void main(){ vC = mix(uCol, aColor, uRainbow); vY = position.y; vec3 p = position; p.xz *= 1.0 + p.y * 2.5; vec4 w = modelMatrix * instanceMatrix * vec4(p,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix * instanceMatrix) * vec3(position.x, 0.0, position.z)); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uHaze; uniform float uI; varying vec3 vC; varying float vY; varying vec3 vN; varying vec3 vW;
        void main(){ vec3 vd = normalize(cameraPosition - vW); float e = pow(abs(dot(normalize(vN), vd)), 1.6);
          float a = e * uI * (0.35 + uHaze * 1.2) * (1.0 - vY * 0.75) * smoothstep(0.0, 0.02, vY);
          gl_FragColor = vec4(vC * a * 2.4, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    const ac = new Float32Array(n * 3);
    this.emitters.forEach((e, i) => { for (let k = 0; k < this.per; k++) e.color.toArray(ac, (i * this.per + k) * 3); });
    geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(ac, 3));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 7;
    this.mesh.count = 0;
    scene.add(this.mesh);
    const dotGeo = new THREE.SphereGeometry(0.035, 8, 6);
    this.heads = this.emitters.map((e) => {
      const m = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: e.color.clone().multiplyScalar(3) }));
      m.position.copy(e.pos);
      scene.add(m);
      return m;
    });
    this.mode = 0;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._d = new THREE.Vector3();
  }

  update(t, beat, o) {
    this.uniforms.uI.value = o.intensity;
    this.uniforms.uHaze.value = o.haze;
    if (o.color) this.uniforms.uCol.value.copy(o.color);
    this.uniforms.uRainbow.value = o.rainbow ? 1 : 0;
    if (o.intensity < 0.01) { this.mesh.count = 0; return; }
    let k = 0;
    const b = beat;
    for (const e of this.emitters) {
      if (o.only !== undefined && !o.only.includes(e.i)) continue;
      if (o.mode === 5 && !e.top) continue;
      for (let j = 0; j < this.per; j++) {
        const u = this.per > 1 ? j / (this.per - 1) - 0.5 : 0;
        let yaw, pitch;
        const dir = e.top ? 1 : -1;
        if (e.side) {
          const a = o.mode === 1 ? u * 1.2 + Math.sin(t * 2.5 + e.i) * 0.6 : u * 0.9 + Math.sin(b * Math.PI * 0.5 + e.i) * 0.7;
          const pt = -0.18 + Math.sin(t * 1.7 + j * 0.4 + e.i) * 0.12;
          const d = this._d.set(e.side * Math.cos(a) * Math.cos(pt), Math.sin(pt), Math.sin(a) * Math.cos(pt)).normalize();
          const len = rayBox(e.pos, d);
          this._q.setFromUnitVectors(UP, d);
          this._m.compose(e.pos, this._q, new THREE.Vector3(0.03, len, 0.03));
          this.mesh.setMatrixAt(k++, this._m);
          continue;
        }
        if (o.mode === 5) { yaw = u * 2.1 + Math.sin(t * 0.6) * 0.15; pitch = -0.24 + Math.sin(b * Math.PI * 0.5) * 0.03; }
        else if (o.mode === 4) { yaw = u * 2.2 + Math.sin(t * 1.2) * 0.25; pitch = e.top ? -0.12 - Math.abs(u) * 0.05 : 0.33; }
        else if (o.mode === 0) { yaw = u * 1.6 + Math.sin(t * 0.7 + e.i) * 0.5; pitch = (e.top ? -0.5 : 0.18) + Math.sin(b * Math.PI * 0.5 + e.i) * 0.12; }
        else if (o.mode === 1) { const a = u * Math.PI * 2 + t * 2.2 * dir; yaw = Math.cos(a) * 0.35; pitch = (e.top ? -0.55 : 0.32) + Math.sin(a) * 0.3; }
        else if (o.mode === 2) { yaw = Math.sin(b * Math.PI * 0.25 + e.i * 0.8) * 1.0 + u * 0.08; pitch = (e.top ? -0.45 : 0.05) + u * 0.9; }
        else { yaw = u * 2.4; pitch = (e.top ? -0.35 : 0.42) + Math.sin(t * 3 + j) * 0.05; }
        const d = this._d.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
        if (e.top) d.z = Math.abs(d.z);
        else d.z = Math.abs(d.z);
        d.normalize();
        const len = rayBox(e.pos, d);
        this._q.setFromUnitVectors(UP, d);
        this._m.compose(e.pos, this._q, new THREE.Vector3(0.026, len, 0.026));
        this.mesh.setMatrixAt(k++, this._m);
      }
    }
    this.mesh.count = k;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

function coneMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uI: { value: 0 }, uHaze: { value: 0.3 } },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vW;
      void main(){ vY = -position.y; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uI; uniform float uHaze; varying float vY; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 vd = normalize(cameraPosition - vW); float edge = pow(abs(dot(normalize(vN), vd)), 1.5);
        float along = exp(-vY * 0.17) * smoothstep(0.0, 0.3, vY);
        gl_FragColor = vec4(uColor * edge * along * uI * (0.3 + uHaze) * 0.26, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

export class MovingHeads {
  constructor(scene) {
    const geo = new THREE.ConeGeometry(1.1, 12, 24, 1, true);
    geo.translate(0, -6, 0);
    const housingM = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.4, metalness: 0.6 });
    this.heads = [];
    const xc = HALL.xc;
    for (const z of [-4.25, 3.55]) for (let i = 0; i < 6; i++) {
      const pos = new THREE.Vector3(xc - 9 + i * 3.6, HALL.h - 0.62, z);
      const m = new THREE.Mesh(geo, coneMaterial());
      m.position.copy(pos);
      m.frustumCulled = false;
      m.renderOrder = 6;
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.26, 12), housingM);
      housing.position.copy(pos).add(new THREE.Vector3(0, 0.1, 0));
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      lens.rotation.x = Math.PI / 2;
      lens.position.copy(pos).add(new THREE.Vector3(0, -0.04, 0));
      scene.add(m, housing, lens);
      this.heads.push({ m, lens, base: pos, i: this.heads.length, pan: 0, tilt: 0.4, color: new THREE.Color(), dir: new THREE.Vector3(0, -1, 0) });
    }
  }

  update(dt, t, beat, prog) {
    for (const h of this.heads) {
      const i = h.i;
      const b = beat * Math.PI * 0.5;
      let pan, tilt;
      if (prog.pattern === 0) { pan = i * 1.3 + Math.sin(t * 0.25 + i) * 0.6; tilt = 0.3 + 0.12 * Math.sin(t * 0.3 + i); }
      else if (prog.pattern === 1) { pan = i * 1.3 + Math.sin(b + i * 0.7) * 1.2; tilt = 0.55 + 0.3 * Math.sin(b * 2 + i); }
      else if (prog.pattern === 2) { pan = t * 2.4 * (i % 2 ? 1 : -1) + i; tilt = 0.75 + 0.15 * Math.sin(b * 4 + i); }
      else { const tx = HALL.xc - h.base.x, tz = -8.6 - h.base.z; pan = Math.atan2(tz, tx); tilt = Math.atan2(Math.hypot(tx, tz), HALL.h - 1.6); }
      h.pan += (pan - h.pan) * Math.min(1, dt * (prog.pattern === 2 ? 10 : 4));
      h.tilt += (tilt - h.tilt) * Math.min(1, dt * 5);
      h.dir.set(Math.cos(h.pan) * Math.sin(h.tilt), -Math.cos(h.tilt), Math.sin(h.pan) * Math.sin(h.tilt)).normalize();
      h.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), h.dir);
      h.color.copy(prog.colors[i % prog.colors.length]);
      const strobe = prog.strobe ? (((beat + i * 0.25) % 1) < 0.5 ? 1.4 : 0.35) : 1;
      h.m.material.uniforms.uColor.value.copy(h.color);
      h.m.material.uniforms.uI.value = prog.intensity * strobe;
      h.m.material.uniforms.uHaze.value = prog.haze;
      h.m.visible = prog.intensity > 0.01;
      h.lens.material.color.copy(h.color).multiplyScalar(prog.intensity > 0.02 ? 4 * prog.intensity * strobe : 0.05);
    }
  }
}

const fireTex = () => canvasTex(64, 64, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}, false);

class Particles {
  constructor(scene, max, kind) {
    this.max = max;
    this.kind = kind;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3);
    this.age = new Float32Array(max).fill(99); this.life = new Float32Array(max).fill(1);
    this.size = new Float32Array(max); this.aSize = new Float32Array(max); this.aT = new Float32Array(max).fill(1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.aSize, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aT', new THREE.BufferAttribute(this.aT, 1).setUsage(THREE.DynamicDrawUsage));
    const frag = kind === 'fire'
      ? `uniform sampler2D uTex; varying float vT; void main(){ float a = texture2D(uTex, gl_PointCoord).a; a = a * a; vec3 c = mix(vec3(1.0, 0.92, 0.6) * 6.0, mix(vec3(1.0, 0.42, 0.06) * 3.5, vec3(0.3, 0.06, 0.0), smoothstep(0.5, 1.0, vT)), smoothstep(0.0, 0.3, vT)); gl_FragColor = vec4(c * a * (1.0 - vT) * 0.8, 1.0); }`
      : `uniform sampler2D uTex; varying float vT; void main(){ float a = texture2D(uTex, gl_PointCoord).a; vec3 c = mix(vec3(1.0, 0.95, 0.75) * 7.0, vec3(1.0, 0.55, 0.15) * 3.0, vT); gl_FragColor = vec4(c * a * (1.0 - vT * vT), 1.0); }`;
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uTex: { value: fireTex() }, uScale: { value: 500 } },
      vertexShader: `attribute float aSize; attribute float aT; uniform float uScale; varying float vT; void main(){ vT = aT; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aT >= 1.0 ? 0.0 : min(aSize * uScale / max(0.3, -mv.z), 220.0); }`,
      fragmentShader: frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 8;
    scene.add(this.points);
    this.next = 0;
    this.r = rnd(kind === 'fire' ? 11 : 13);
  }
  emit(p, v, spread, life, size, n) {
    const r = this.r;
    for (let k = 0; k < n; k++) {
      const i = this.next; this.next = (this.next + 1) % this.max;
      this.pos[i * 3] = p.x + (r() - 0.5) * spread; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z + (r() - 0.5) * spread;
      this.vel[i * 3] = v.x + (r() - 0.5) * v.j; this.vel[i * 3 + 1] = v.y * (0.75 + r() * 0.5); this.vel[i * 3 + 2] = v.z + (r() - 0.5) * v.j;
      this.age[i] = 0; this.life[i] = life * (0.6 + r() * 0.6); this.size[i] = size * (0.6 + r() * 0.8);
    }
  }
  update(dt, grav, drag) {
    for (let i = 0; i < this.max; i++) {
      if (this.age[i] >= this.life[i]) { this.aT[i] = 1; continue; }
      this.age[i] += dt;
      const i3 = i * 3;
      this.vel[i3 + 1] -= grav * dt;
      this.vel[i3] *= 1 - drag * dt; this.vel[i3 + 1] *= 1 - drag * dt; this.vel[i3 + 2] *= 1 - drag * dt;
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      if (this.pos[i3 + 1] < 0.02 && this.kind === 'spark') { this.pos[i3 + 1] = 0.02; this.vel[i3 + 1] *= -0.3; }
      const f = this.age[i] / this.life[i];
      this.aT[i] = Math.min(0.999, f);
      this.aSize[i] = this.size[i] * (this.kind === 'fire' ? 0.5 + f * 1.3 : 1);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.aSize.needsUpdate = true; g.attributes.aT.needsUpdate = true;
  }
}

export class Pyro {
  constructor(scene, smoke, light, quality) {
    this.fire = new Particles(scene, quality === 'low' ? 700 : 1400, 'fire');
    this.spark = new Particles(scene, quality === 'low' ? 900 : 2600, 'spark');
    this.curtain = 0;
    this.smoke = smoke;
    this.light = light;
    const xc = HALL.xc;
    this.jets = [-8.2, -5.2, -2.2, 2.2, 5.2, 8.2].map((dx) => new THREE.Vector3(xc + dx, STAGE.h, STAGE.z1 + 0.25));
    this.fountains = [-4.0, -1.4, 1.4, 4.0].map((dx) => new THREE.Vector3(xc + dx, STAGE.h, STAGE.z1 + 0.2));
    this.co2 = [-6.8, 6.8].map((dx) => new THREE.Vector3(xc + dx, STAGE.h, STAGE.z1 + 0.15));
    const nozzle = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.5, metalness: 0.6 });
    for (const p of [...this.jets, ...this.fountains, ...this.co2]) {
      const n = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.22, 10), nozzle);
      n.position.copy(p).add(new THREE.Vector3(0, 0.11, 0));
      scene.add(n);
      p.y += 0.22;
    }
    this.burning = this.jets.map(() => 0);
    this.sparking = 0;
    this.flash = 0;
  }
  flames(which = 'all', dur = 0.7) {
    this.jets.forEach((_, i) => { if (which === 'all' || (which === 'odd' && i % 2) || (which === 'even' && !(i % 2)) || which === i) this.burning[i] = dur; });
  }
  blast() {
    for (const p of this.co2) this.smoke.emit(p, 26, { vel: { x: 0, y: 7, z: 0.6 }, jitter: 1.2, life: 2.6, size: 0.55, grow: 1.4, opacity: 0.32 });
  }
  update(dt, sparkle) {
    let any = 0;
    this.jets.forEach((p, i) => {
      if (this.burning[i] <= 0) return;
      this.burning[i] -= dt;
      any++;
      this.fire.emit(p, { x: 0, y: 15, z: 0.1, j: 0.7 }, 0.14, 0.5, 0.4, Math.ceil(dt * 520));
    });
    this.sparking += (sparkle - this.sparking) * Math.min(1, dt * 6);
    if (this.sparking > 0.05) for (const p of this.fountains) this.spark.emit(p, { x: 0, y: 7.5, z: 0.4, j: 2.4 }, 0.06, 1.7, 0.055, Math.ceil(dt * 200 * this.sparking));
    if (this.curtain > 0.02) for (let i = 0; i < 6; i++) this.spark.emit(new THREE.Vector3(HALL.xc + (Math.random() - 0.5) * 17, HALL.h - 0.5, -8.0), { x: 0, y: -0.5, z: 0.15, j: 0.5 }, 0.05, 2.4, 0.05, Math.ceil(dt * 70 * this.curtain));
    this.flash += ((any ? 1 : 0) - this.flash) * Math.min(1, dt * (any ? 20 : 6));
    this.light.intensity = this.flash * 45 + this.sparking * 10 + this.curtain * 5;
    this.fire.update(dt, -1.5, 0.6);
    this.spark.update(dt, 9.8, 0.35);
  }
}

export class Thuribles {
  constructor(scene, smoke) {
    this.smoke = smoke;
    const brass = new THREE.MeshStandardMaterial({ color: 0xd8b062, metalness: 1, roughness: 0.25 });
    const rope = new THREE.MeshStandardMaterial({ color: 0x8a6b4a, roughness: 0.9 });
    const coal = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.35, 0.08).multiplyScalar(4) });
    const prof = [[0.001, -0.36], [0.12, -0.34], [0.26, -0.22], [0.31, -0.02], [0.27, 0.12], [0.2, 0.2], [0.22, 0.26], [0.16, 0.42], [0.08, 0.55], [0.05, 0.62], [0.001, 0.64]].map(([r, y]) => new THREE.Vector2(r, y));
    const bodyGeo = new THREE.LatheGeometry(prof, 28);
    this.items = BOTA.map((b, i) => {
      const anchor = new THREE.Vector3(b.x, HALL.h - 0.1, b.z);
      const pivot = new THREE.Group();
      pivot.position.copy(anchor);
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, b.len, 6), rope);
      r.position.y = -b.len / 2;
      const body = new THREE.Mesh(bodyGeo, brass);
      body.position.y = -b.len - 0.6;
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), coal);
      glow.scale.set(1, 0.35, 1);
      glow.position.y = -b.len - 0.62;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.035, 10), coal);
        hole.position.set(Math.cos(a) * 0.3, -b.len - 0.62, Math.sin(a) * 0.3);
        hole.lookAt(new THREE.Vector3(Math.cos(a) * 2, -b.len - 0.62, Math.sin(a) * 2));
        pivot.add(hole);
      }
      body.castShadow = true;
      pivot.add(r, body, glow);
      scene.add(pivot);
      return { pivot, len: b.len + 0.6, amp: 0.12, phase: i * 1.7, w: Math.sqrt(9.8 / (b.len + 0.6)), pos: new THREE.Vector3(), prev: new THREE.Vector3() };
    });
    this.target = 0.12;
  }
  update(dt, t) {
    for (const it of this.items) {
      it.amp += (this.target - it.amp) * Math.min(1, dt * (this.target > it.amp ? 0.6 : 0.25));
      it.phase += dt * it.w;
      const a = Math.sin(it.phase) * it.amp;
      it.pivot.rotation.z = a;
      it.prev.copy(it.pos);
      it.pos.set(it.pivot.position.x + Math.sin(a) * it.len, it.pivot.position.y - Math.cos(a) * it.len, it.pivot.position.z);
      const speed = it.prev.distanceTo(it.pos) / Math.max(dt, 1e-3);
      const n = Math.random() < dt * (10 + speed * 9) ? 1 + (speed > 3 ? 1 : 0) : 0;
      if (n) this.smoke.emit(it.pos, n, { vel: { x: -Math.cos(a) * speed * 0.08, y: 0.3, z: 0 }, jitter: 0.08, life: 7, size: 0.34 + speed * 0.04, grow: 0.9, opacity: 0.26 });
    }
  }
}

export class DiscoBall {
  constructor(scene, n = 280) {
    const geo = new THREE.IcosahedronGeometry(0.5, 3);
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08, flatShading: true, envMapIntensity: 2 });
    this.ball = new THREE.Mesh(geo, m);
    this.ball.position.set(DISCO.x, DISCO.y, DISCO.z);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, HALL.h - DISCO.y - 0.5, 4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    cord.position.set(DISCO.x, (HALL.h + DISCO.y + 0.5) / 2, DISCO.z);
    scene.add(this.ball, cord);
    const r = rnd(21);
    this.dirs = [];
    for (let i = 0; i < n; i++) {
      const y = r() * 1.6 - 0.95, a = r() * Math.PI * 2, s = Math.sqrt(1 - Math.min(1, y * y));
      this.dirs.push(new THREE.Vector3(Math.cos(a) * s, y, Math.sin(a) * s));
    }
    this.pos = new Float32Array(n * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = { uI: { value: 0 }, uColor: { value: new THREE.Color(1, 1, 1) } };
    this.dots = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = 7.0 * 8.0 / max(1.0, -mv.z); }`,
      fragmentShader: `uniform float uI; uniform vec3 uColor; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.15, d) * uI; gl_FragColor = vec4(uColor * a * 3.0, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.dots.frustumCulled = false;
    scene.add(this.dots);
    this.rot = 0;
    this._d = new THREE.Vector3();
  }
  update(dt, intensity, color) {
    this.rot += dt * 0.45;
    this.ball.rotation.y = this.rot;
    this.uniforms.uI.value = intensity;
    this.uniforms.uColor.value.copy(color);
    this.dots.visible = intensity > 0.01;
    if (!this.dots.visible) return;
    const c = Math.cos(this.rot), s = Math.sin(this.rot);
    const o = this.ball.position;
    this.dirs.forEach((d, i) => {
      const dd = this._d.set(d.x * c - d.z * s, d.y, d.x * s + d.z * c);
      const L = rayBox(o, dd);
      this.pos[i * 3] = o.x + dd.x * L * 0.995; this.pos[i * 3 + 1] = o.y + dd.y * L * 0.995; this.pos[i * 3 + 2] = o.z + dd.z * L * 0.995;
    });
    this.dots.geometry.attributes.position.needsUpdate = true;
  }
}

export class Confetti {
  constructor(scene, n = 1400) {
    this.n = n;
    const geo = new THREE.PlaneGeometry(0.045, 0.065);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.4, metalness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.15 }), n);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.r = new Float32Array(n * 3); this.age = new Float32Array(n).fill(99);
    const pal = ['#ffd36b', '#ffffff', '#ff4fd8', '#19d4ff', '#2bff6a', '#e2b25a'].map((c) => new THREE.Color(c));
    for (let i = 0; i < n; i++) this.mesh.setColorAt(i, pal[i % pal.length]);
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.next = 0;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
    this.live = 0;
  }
  burst(count = 500) {
    for (const sx of [-1, 1]) for (let k = 0; k < count / 2; k++) {
      const i = this.next; this.next = (this.next + 1) % this.n;
      this.p[i * 3] = HALL.xc + sx * 8.4; this.p[i * 3 + 1] = STAGE.h + 0.6; this.p[i * 3 + 2] = STAGE.z1 + 0.2;
      const sp = 9 + Math.random() * 6;
      this.v[i * 3] = -sx * (1.2 + Math.random() * 3.2); this.v[i * 3 + 1] = sp; this.v[i * 3 + 2] = 1.5 + Math.random() * 5;
      this.r[i * 3] = Math.random() * 6; this.r[i * 3 + 1] = Math.random() * 6; this.r[i * 3 + 2] = Math.random() * 6;
      this.age[i] = 0;
    }
    this.live = 14;
  }
  update(dt, t) {
    if (this.live <= 0) { this.mesh.count = 0; return; }
    this.live -= dt;
    const zero = this._z || (this._z = new THREE.Matrix4().makeScale(0, 0, 0));
    for (let i = 0; i < this.n; i++) {
      if (this.age[i] > 13) { this.mesh.setMatrixAt(i, zero); continue; }
      this.age[i] += dt;
      const i3 = i * 3;
      const fall = this.v[i3 + 1] < -0.6;
      this.v[i3 + 1] -= 9.8 * dt * (fall ? 0.1 : 1);
      if (fall) this.v[i3 + 1] = Math.max(this.v[i3 + 1], -0.75);
      const drag = fall ? 2.5 : 0.4;
      this.v[i3] *= 1 - drag * dt; this.v[i3 + 2] *= 1 - drag * dt;
      this.p[i3] += (this.v[i3] + (fall ? Math.sin(t * 3 + i) * 0.4 : 0)) * dt;
      this.p[i3 + 1] += this.v[i3 + 1] * dt;
      this.p[i3 + 2] += (this.v[i3 + 2] + (fall ? Math.cos(t * 2.3 + i) * 0.3 : 0)) * dt;
      if (this.p[i3 + 1] > HALL.h - 0.2) { this.p[i3 + 1] = HALL.h - 0.2; this.v[i3 + 1] = -0.2; }
      if (this.p[i3 + 1] < 0.01) { this.p[i3 + 1] = 0.01; this.v[i3] = this.v[i3 + 1] = this.v[i3 + 2] = 0; }
      this.r[i3] += dt * 5; this.r[i3 + 1] += dt * 3.7;
      this._q.setFromEuler(this._e.set(this.r[i3], this.r[i3 + 1], this.r[i3 + 2]));
      this._m.compose(this._v.set(this.p[i3], this.p[i3 + 1], this.p[i3 + 2]), this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export class Blinders {
  constructor(scene) {
    this.mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0) });
    const body = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.5, metalness: 0.5 });
    this.group = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const x = HALL.xc - 7.7 + i * 2.2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.12), body);
      b.position.set(x, STAGE.h + 0.12, STAGE.z1 + 0.32);
      b.rotation.x = -0.35;
      for (const dx of [-0.1, 0.1]) {
        const l = new THREE.Mesh(new THREE.CircleGeometry(0.075, 14), this.mat);
        l.position.set(x + dx, STAGE.h + 0.13, STAGE.z1 + 0.39);
        l.rotation.x = -0.35;
        this.group.add(l);
      }
      this.group.add(b);
    }
    scene.add(this.group);
  }
  set(v) { this.mat.color.setRGB(1, 0.92, 0.75).multiplyScalar(v * 9); }
}
