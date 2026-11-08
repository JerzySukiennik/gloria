// Gloria effects: incense smoke, sunbeams through the slots, moving-head beams from the dome, the altar ray and falling gold.
import * as THREE from 'three';
import { H, DOME, ALTAR, ROOM, HALL } from './layout.js';
import { rnd, canvasTex } from './util.js';

const puffTex = () => canvasTex(128, 128, (c, w, h) => {
  const r = rnd(9);
  for (let i = 0; i < 26; i++) {
    const x = w / 2 + (r() - 0.5) * w * 0.4, y = h / 2 + (r() - 0.5) * h * 0.4, rad = w * (0.16 + r() * 0.22);
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }
}, false);

export class Smoke {
  constructor(scene, max = 700) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.age = new Float32Array(max).fill(1e9);
    this.life = new Float32Array(max).fill(1);
    this.size0 = new Float32Array(max);
    this.grow = new Float32Array(max);
    this.op = new Float32Array(max);
    this.aSize = new Float32Array(max);
    this.aAlpha = new Float32Array(max);
    this.aRot = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.aSize, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.aAlpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aRot', new THREE.BufferAttribute(this.aRot, 1));
    const r = rnd(5);
    for (let i = 0; i < max; i++) this.aRot[i] = r() * 6.28;
    this.uniforms = { uTex: { value: puffTex() }, uTint: { value: new THREE.Color(0.92, 0.9, 0.88) }, uLight: { value: 1 }, uScale: { value: 600 } };
    const m = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `attribute float aSize; attribute float aAlpha; attribute float aRot; uniform float uScale; varying float vA; varying float vR;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = min(aSize * uScale / max(0.3, -mv.z), 200.0); vA = aAlpha * smoothstep(0.2, 1.2, -mv.z); vR = aRot; }`,
      fragmentShader: `uniform sampler2D uTex; uniform vec3 uTint; uniform float uLight; varying float vA; varying float vR;
        void main(){ vec2 p = gl_PointCoord - 0.5; float c = cos(vR), s = sin(vR); p = mat2(c,-s,s,c) * p; vec4 t = texture2D(uTex, p + 0.5);
          float a = t.a * vA; if (a < 0.003) discard; gl_FragColor = vec4(uTint * uLight, a); }`,
      transparent: true, depthWrite: false,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.next = 0;
    this.r = rnd(77);
  }

  emit(p, n, o = {}) {
    const r = this.r;
    for (let k = 0; k < n; k++) {
      const i = this.next; this.next = (this.next + 1) % this.max;
      const sp = o.spread ?? 0.05;
      this.pos[i * 3] = p.x + (r() - 0.5) * sp; this.pos[i * 3 + 1] = p.y + (r() - 0.5) * sp; this.pos[i * 3 + 2] = p.z + (r() - 0.5) * sp;
      const v = o.vel || { x: 0, y: 0.25, z: 0 };
      const j = o.jitter ?? 0.15;
      this.vel[i * 3] = v.x + (r() - 0.5) * j; this.vel[i * 3 + 1] = v.y + (r() - 0.3) * j; this.vel[i * 3 + 2] = v.z + (r() - 0.5) * j;
      this.age[i] = 0;
      this.life[i] = (o.life ?? 6) * (0.7 + r() * 0.6);
      this.size0[i] = (o.size ?? 0.12) * (0.7 + r() * 0.6);
      this.grow[i] = o.grow ?? 0.35;
      this.op[i] = (o.opacity ?? 0.5) * (0.6 + r() * 0.4);
    }
  }

  update(dt, t) {
    let live = 0;
    for (let i = 0; i < this.max; i++) {
      const a = (this.age[i] += dt);
      const L = this.life[i];
      if (a > L) { this.aAlpha[i] = 0; continue; }
      live++;
      const i3 = i * 3;
      const x = this.pos[i3], y = this.pos[i3 + 1], z = this.pos[i3 + 2];
      const tx = Math.sin(y * 1.3 + t * 0.4 + z) * 0.05, tz = Math.cos(x * 1.1 + t * 0.33) * 0.05;
      this.vel[i3] = this.vel[i3] * (1 - dt * 0.6) + tx * dt * 3;
      this.vel[i3 + 1] = this.vel[i3 + 1] * (1 - dt * 0.5) + 0.05 * dt;
      this.vel[i3 + 2] = this.vel[i3 + 2] * (1 - dt * 0.6) + tz * dt * 3 + 0.02 * dt;
      if (y > H - 0.3) this.vel[i3 + 1] *= 0.5;
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const f = a / L;
      this.aSize[i] = this.size0[i] * (1 + this.grow[i] * a * 2.5);
      this.aAlpha[i] = this.op[i] * Math.min(1, a * 3) * (1 - f) * (1 - f);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.aSize.needsUpdate = true; g.attributes.aAlpha.needsUpdate = true;
    this.live = live;
  }
}

export class SunBeams {
  constructor(scene, slots, toSun) {
    const d = toSun.clone().negate();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0, 0.5);
    this.uniforms = { uHaze: { value: 0 }, uTime: { value: 0 }, uSunDir: { value: d.clone() }, uColor: { value: new THREE.Color(1.0, 0.86, 0.66) } };
    const m = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `varying vec3 vL; varying vec3 vW;
        void main(){ vL = position; vec4 w = modelMatrix * instanceMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uHaze; uniform float uTime; uniform vec3 uSunDir; uniform vec3 uColor; varying vec3 vL; varying vec3 vW;
        float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
        float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
        void main(){
          float ex = 1.0 - smoothstep(0.25, 0.5, abs(vL.x));
          float ey = 1.0 - smoothstep(0.38, 0.5, abs(vL.y));
          float ez = smoothstep(0.0, 0.04, vL.z) * (1.0 - smoothstep(0.75, 1.0, vL.z));
          vec3 vd = normalize(vW - cameraPosition);
          float fw = 0.35 + 1.6 * pow(max(0.0, dot(vd, uSunDir)), 3.0);
          float nz = 0.55 + 0.9 * n3(vW * 1.7 + vec3(0.0, uTime * 0.08, uTime * 0.05));
          float a = ex * ey * ez * fw * nz * uHaze * 0.075;
          gl_FragColor = vec4(uColor * a, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const im = new THREE.InstancedMesh(geo, m, slots.length);
    const mtx = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    slots.forEach((s, i) => {
      const c = s.center;
      let len = s.maxLen ?? 12;
      if (d.x < 0) len = Math.min(len, (c.x - (s.xMin ?? ROOM.x0 + 0.02)) / -d.x);
      if (d.y < 0) len = Math.min(len, (c.y - 0.01) / -d.y);
      const X = s.t.clone().multiplyScalar(0.17);
      const Y = up.clone().multiplyScalar(s.len * 0.92);
      const Z = d.clone().multiplyScalar(len);
      mtx.makeBasis(X, Y, Z).setPosition(c);
      im.setMatrixAt(i, mtx);
    });
    im.frustumCulled = false;
    im.renderOrder = 4;
    scene.add(im);
    this.mesh = im;
  }
}

function beamMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color }, uI: { value: 0 }, uHaze: { value: 0.3 } },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vW;
      void main(){ vY = -position.y; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uI; uniform float uHaze; varying float vY; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 vd = normalize(cameraPosition - vW); float edge = pow(abs(dot(normalize(vN), vd)), 1.6);
        float along = exp(-vY * 0.32) * smoothstep(0.0, 0.25, vY);
        float a = edge * along * uI * (0.25 + uHaze) * 0.22;
        gl_FragColor = vec4(uColor * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

export class ShowLights {
  constructor(scene) {
    this.heads = [];
    const geo = new THREE.ConeGeometry(0.75, 8, 28, 1, true);
    geo.translate(0, -4, 0);
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3;
      const pos = new THREE.Vector3(DOME.x + Math.cos(a) * (DOME.a + 0.15), H - 0.02, DOME.z + Math.sin(a) * (DOME.b + 0.15));
      const mat = beamMaterial(new THREE.Color(1, 1, 1));
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      m.frustumCulled = false;
      m.renderOrder = 6;
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.14, 12), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.6 }));
      housing.position.copy(pos).add(new THREE.Vector3(0, 0.0, 0));
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.055, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      lens.rotation.x = Math.PI / 2;
      lens.position.copy(pos).add(new THREE.Vector3(0, -0.071, 0));
      scene.add(m, housing, lens);
      this.heads.push({ m, lens, a, base: pos, pan: 0, tilt: 0.5, color: new THREE.Color(1, 1, 1) });
    }
    const gr = new THREE.ConeGeometry(1.15, 6, 36, 1, true);
    gr.translate(0, -3, 0);
    this.ray = new THREE.Mesh(gr, beamMaterial(new THREE.Color(1.0, 0.86, 0.6)));
    this.ray.position.set(0, H + 1.5, -4.2);
    this.ray.rotation.x = -0.1;
    this.ray.frustumCulled = false;
    this.ray.renderOrder = 6;
    scene.add(this.ray);
  }

  update(dt, t, beat, prog) {
    for (let i = 0; i < this.heads.length; i++) {
      const h = this.heads[i];
      let pan, tilt;
      const b = beat * Math.PI * 0.5;
      if (prog.pattern === 0) { pan = h.a + Math.sin(t * 0.3 + i) * 0.3; tilt = 0.35 + 0.1 * Math.sin(t * 0.4 + i); }
      else if (prog.pattern === 1) { pan = h.a + Math.sin(b + i * 1.1) * 0.9; tilt = 0.6 + 0.25 * Math.sin(b * 2 + i); }
      else if (prog.pattern === 2) { pan = t * 1.2 + i * (Math.PI / 3); tilt = 0.7; }
      else { pan = Math.atan2(-4.2 - h.base.z, 0 - h.base.x); tilt = 0.55 + 0.1 * Math.sin(b + i); }
      h.pan += (pan - h.pan) * Math.min(1, dt * 4);
      h.tilt += (tilt - h.tilt) * Math.min(1, dt * 4);
      const dir = new THREE.Vector3(Math.cos(h.pan) * Math.sin(h.tilt), -Math.cos(h.tilt), Math.sin(h.pan) * Math.sin(h.tilt));
      h.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
      const col = prog.colors[i % prog.colors.length];
      h.color.copy(col);
      h.m.material.uniforms.uColor.value.copy(col);
      const strobe = prog.strobe ? (Math.sin(beat * Math.PI * 4 + i) > 0 ? 1 : 0.15) : 1;
      h.m.material.uniforms.uI.value = prog.intensity * strobe * (prog.flash ? 1.6 : 1);
      h.m.material.uniforms.uHaze.value = prog.haze;
      h.lens.material.color.copy(col).multiplyScalar(prog.intensity > 0.02 ? 3 * prog.intensity : 0.05);
      h.dir = dir;
    }
    this.ray.material.uniforms.uI.value = prog.ray;
    this.ray.material.uniforms.uHaze.value = 0.5 + prog.haze;
  }
}

export class Glitter {
  constructor(scene, n = 420) {
    this.n = n;
    const r = rnd(3);
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n);
    for (let i = 0; i < n; i++) this.reset(i, r, true);
    this.r = r;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = { uI: { value: 0 }, uTime: { value: 0 } };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `uniform float uTime; varying float vT; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; vT = sin(uTime * 9.0 + position.x * 31.0 + position.z * 17.0); gl_PointSize = (2.0 + 3.0 * max(0.0, vT)) * 6.0 / max(0.5, -mv.z); }`,
      fragmentShader: `uniform float uI; varying float vT; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); float a = smoothstep(0.5, 0.0, d) * uI * (0.35 + 0.65 * max(0.0, vT)); gl_FragColor = vec4(vec3(1.0, 0.82, 0.45) * a * 3.0, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.active = 0;
  }
  reset(i, r, init) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r());
    this.pos[i * 3] = HALL.xc + Math.cos(a) * rr * 10;
    this.pos[i * 3 + 1] = init ? r() * HALL.h : HALL.h - 0.3 - r() * 0.4;
    this.pos[i * 3 + 2] = -1.5 + Math.sin(a) * rr * 6.5;
    this.vel[i] = 0.35 + r() * 0.4;
  }
  update(dt, t) {
    this.uniforms.uTime.value = t;
    this.uniforms.uI.value += (this.active - this.uniforms.uI.value) * Math.min(1, dt * 1.5);
    if (this.uniforms.uI.value < 0.005) return;
    for (let i = 0; i < this.n; i++) {
      this.pos[i * 3 + 1] -= this.vel[i] * dt;
      this.pos[i * 3] += Math.sin(t * 1.3 + i) * 0.12 * dt;
      if (this.pos[i * 3 + 1] < 0) this.reset(i, this.r, false);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
