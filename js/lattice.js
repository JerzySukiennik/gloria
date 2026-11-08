// Gloria lattice wall: precast concrete slot panels along the curved apse, milky glass behind, slot-addressable light show.
import * as THREE from 'three';
import { LATTICE, H } from './layout.js';
import { frameAt, sweepCurve } from './util.js';

export const LED_GLSL = /* glsl */ `
uniform float uTime, uBeat, uLed, uMode, uCross, uFlash, uColPitch, uCenterCol, uY0, uY1, uGap, uDayGain;
uniform vec3 uColA, uColB, uColC, uDay;
uniform float uLevels[8];
uniform float uPat[15];
uniform float uPatN[3];
float lhash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float patOf(float col){ return mod(col, 7.0) == 3.0 ? 2.0 : mod(col, 2.0); }
vec2 slotAt(float col, float y){
  int pi = int(patOf(col));
  float n = uPatN[pi];
  float total = -uGap;
  for (int k = 0; k < 5; k++) { if (float(k) < n) total += uPat[pi * 5 + k] + uGap; }
  float yy = y - uY0 - ((uY1 - uY0) - total) * 0.5;
  for (int k = 0; k < 5; k++) {
    if (float(k) >= n) break;
    float L = uPat[pi * 5 + k];
    if (yy >= -0.02 && yy <= L + 0.02) return vec2(float(k), clamp(yy / L, 0.0, 1.0));
    yy -= L + uGap;
  }
  return vec2(-1.0, 0.0);
}
vec3 ledColor(float col, float yn, float k){
  float t = uTime, b = uBeat;
  vec3 c = vec3(0.0);
  if (uMode < 0.5) {
  } else if (uMode < 1.5) {
    float w = 0.5 + 0.5 * sin(col * 0.33 - t * 1.4);
    c = mix(uColA, uColB, w) * (0.55 + 0.45 * sin(col * 0.11 + t * 0.7));
  } else if (uMode < 2.5) {
    float lv = uLevels[int(mod(col, 8.0))];
    c = mix(uColA, uColB, yn) * step(yn, lv) * (0.6 + 0.4 * lv);
  } else if (uMode < 3.5) {
    float h = lhash(vec2(col * 7.0 + k * 3.0, floor(b * 2.0)));
    float d = 1.0 - fract(b * 2.0);
    c = (h > 0.6 ? mix(uColA, uColC, lhash(vec2(k, col))) : vec3(0.0)) * (0.3 + 0.7 * d * d);
  } else if (uMode < 4.5) {
    float ph = fract((col - b * 4.0) / 16.0);
    c = mix(uColA, uColB, ph) * smoothstep(0.35, 0.0, ph);
    c += uColC * 0.15;
  } else {
    float d = abs(col - uCenterCol);
    float r = 0.5 + 0.5 * sin(d * 0.5 - t * 5.0);
    c = mix(uColA, uColC, r) * (0.25 + 0.75 * r * r);
  }
  return c;
}
float crossMask(float col, float yn){
  float d = abs(col - uCenterCol);
  float v = step(d, 1.5) * step(0.18, yn);
  float h = step(d, 5.5) * step(0.6, yn) * step(yn, 0.8);
  return max(v, h);
}
vec3 latticeLight(float col, float y, float sunF){
  vec2 s = slotAt(col, y);
  float k = s.x;
  float yn = (y - uY0) / (uY1 - uY0);
  float h1 = lhash(vec2(col, k + 11.0));
  float h2 = lhash(vec2(k * 1.7, col * 0.37));
  vec3 day = uDay * (0.78 + 0.34 * h1) * (0.75 + 0.25 * yn);
  day = mix(day, day * vec3(0.78, 0.9, 1.18), step(0.78, h2));
  day *= 1.0 + sunF * 1.6;
  day *= uDayGain;
  vec3 led = ledColor(col, yn, k) * 2.6;
  vec3 c = mix(day, led, uLed);
  float cm = crossMask(col, yn);
  c = mix(c, c * 0.12, uCross * (1.0 - cm));
  c += vec3(1.0, 0.78, 0.42) * 7.0 * uCross * cm;
  c += vec3(1.0) * uFlash * 5.0;
  return c * step(0.0, k);
}
`;

export function latticeUniforms() {
  const pats = new Array(15).fill(0);
  LATTICE.patterns.forEach((p, i) => p.forEach((v, k) => { pats[i * 5 + k] = v; }));
  return {
    uTime: { value: 0 }, uBeat: { value: 0 }, uLed: { value: 0 }, uMode: { value: 0 }, uCross: { value: 0 }, uFlash: { value: 0 },
    uColPitch: { value: LATTICE.pitch }, uCenterCol: { value: 0 }, uY0: { value: LATTICE.y0 }, uY1: { value: LATTICE.y1 }, uGap: { value: LATTICE.gap },
    uDayGain: { value: 1 },
    uColA: { value: new THREE.Color(1, 0.6, 0.2) }, uColB: { value: new THREE.Color(0.3, 0.5, 1) }, uColC: { value: new THREE.Color(1, 1, 1) },
    uDay: { value: new THREE.Color(0.9, 0.93, 0.97).multiplyScalar(7.0) },
    uLevels: { value: new Array(8).fill(0) },
    uPat: { value: pats },
    uPatN: { value: LATTICE.patterns.map((p) => p.length) },
  };
}

export const patternOf = (c) => (c % 7 === 3 ? 2 : c % 2);

function panelGeometry(pattern, pitch) {
  const { y0, y1, slotW, gap, depth } = LATTICE;
  const h = y1 - y0;
  const s = new THREE.Shape();
  s.moveTo(-pitch / 2, 0); s.lineTo(pitch / 2, 0); s.lineTo(pitch / 2, h); s.lineTo(-pitch / 2, h); s.lineTo(-pitch / 2, 0);
  const total = pattern.reduce((a, b) => a + b, 0) + gap * (pattern.length - 1);
  let y = (h - total) / 2;
  const r = slotW / 2;
  for (const L of pattern) {
    const hole = new THREE.Path();
    hole.moveTo(r, y + r);
    hole.lineTo(r, y + L - r);
    hole.absarc(0, y + L - r, r, 0, Math.PI, false);
    hole.lineTo(-r, y + r);
    hole.absarc(0, y + r, r, Math.PI, Math.PI * 2, false);
    s.holes.push(hole);
    y += L + gap;
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 7 });
  g.translate(0, 0, -depth / 2);
  return g;
}

export function buildLattice(mats, uniforms, toSun, opts = {}) {
  const pts = opts.pts || LATTICE.pts;
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const L = curve.getLength();
  const N = Math.round(L / LATTICE.pitch);
  const pitch = L / N;
  const group = new THREE.Group();
  const geos = LATTICE.patterns.map((p) => panelGeometry(p, pitch * 1.002));
  const counts = [0, 0, 0];
  const cols = [];
  for (let c = 0; c < N; c++) {
    const u = (c + 0.5) / N;
    const f = frameAt(curve, u);
    cols.push({ c, u, ...f, pat: patternOf(c), sunF: Math.max(0, -f.n.dot(toSun)) });
    counts[patternOf(c)]++;
  }
  const concrete = mats.lattice;
  const meshes = geos.map((g, i) => {
    const m = new THREE.InstancedMesh(g, concrete, Math.max(1, counts[i]));
    m.count = counts[i];
    const aCol = new Float32Array(counts[i]);
    const aSun = new Float32Array(counts[i]);
    let k = 0;
    const mtx = new THREE.Matrix4();
    for (const col of cols) {
      if (col.pat !== i) continue;
      const y = new THREE.Vector3(0, 1, 0);
      mtx.makeBasis(col.t, y, col.n);
      mtx.setPosition(col.p.x, LATTICE.y0, col.p.z);
      m.setMatrixAt(k, mtx);
      aCol[k] = col.c; aSun[k] = col.sunF;
      k++;
    }
    g.setAttribute('aCol', new THREE.InstancedBufferAttribute(aCol, 1));
    g.setAttribute('aSun', new THREE.InstancedBufferAttribute(aSun, 1));
    m.castShadow = !opts.noShadow;
    m.receiveShadow = true;
    m.instanceMatrix.needsUpdate = true;
    group.add(m);
    return m;
  });

  const segs = N * 3;
  const pos = [], aU = [], aS = [];
  const back = LATTICE.depth / 2 - 0.035;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const f = frameAt(curve, u);
    const sf = Math.max(0, -f.n.dot(toSun));
    for (const y of [LATTICE.y0 - 0.02, LATTICE.y1 + 0.02]) {
      pos.push(f.p.x - f.n.x * back, y, f.p.z - f.n.z * back);
      aU.push(u * N);
      aS.push(sf);
    }
  }
  const idx = [];
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 2, a + 3, a + 1); }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  gg.setAttribute('aU', new THREE.Float32BufferAttribute(aU, 1));
  gg.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
  gg.setIndex(idx);
  const glassMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      attribute float aU; attribute float aS;
      varying float vU; varying float vY; varying float vS;
      void main(){ vU = aU; vY = position.y; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: LED_GLSL + /* glsl */ `
      varying float vU; varying float vY; varying float vS;
      void main(){
        float col = floor(vU);
        vec3 c = latticeLight(col, vY, vS);
        vec2 s = slotAt(col, vY);
        if (s.x < 0.0) c = uDay * 0.4 * uDayGain;
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.DoubleSide,
    toneMapped: true,
  });
  const glass = new THREE.Mesh(gg, glassMat);
  group.add(glass);

  const d2 = LATTICE.depth / 2;
  const sill = new THREE.Mesh(sweepCurve(curve, [[d2, 0], [d2, LATTICE.y0], [-d2, LATTICE.y0]], N * 2, 1.2), mats.concreteBand);
  sill.receiveShadow = true; sill.castShadow = !opts.noShadow;
  group.add(sill);
  if (!opts.noTop) {
    const prof = [[-d2, LATTICE.y1], [d2, LATTICE.y1], [d2, H - 0.26]];
    for (let i = 1; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; prof.push([d2 + 0.26 - Math.cos(a) * 0.26, H - 0.26 + Math.sin(a) * 0.26]); }
    const top = new THREE.Mesh(sweepCurve(curve, prof, N * 2, 1.2), mats.concreteBand);
    top.castShadow = !opts.noShadow; top.receiveShadow = true;
    group.add(top);
  }

  const slots = [];
  for (const col of cols) {
    if (col.sunF < 0.2) continue;
    const pat = LATTICE.patterns[col.pat];
    const h = LATTICE.y1 - LATTICE.y0;
    const total = pat.reduce((a, b) => a + b, 0) + LATTICE.gap * (pat.length - 1);
    let y = LATTICE.y0 + (h - total) / 2;
    pat.forEach((len, k) => {
      slots.push({ col: col.c, k, len, center: new THREE.Vector3(col.p.x + col.n.x * d2, y + len / 2, col.p.z + col.n.z * d2), t: col.t.clone(), n: col.n.clone(), sunF: col.sunF });
      y += len + LATTICE.gap;
    });
  }

  let center = 0, best = 1e9;
  for (const col of cols) { const d = Math.hypot(col.p.x, col.p.z + 5.7); if (d < best && col.n.z > 0.8) { best = d; center = col.c; } }
  if (!opts.noShadow) uniforms.uCenterCol.value = center;
  return { group, curve, N, cols, slots, glass, meshes, center };
}

export function patchLatticeMaterial(mat, uniforms) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aCol; attribute float aSun; varying float vCol; varying float vLY; varying float vLZ; varying float vLN; varying float vSun;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCol = aCol; vLY = position.y; vLZ = position.z; vLN = normal.z; vSun = aSun;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vCol; varying float vLY; varying float vLZ; varying float vLN; varying float vSun;\n' + LED_GLSL)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float side = 1.0 - abs(vLN);
          float depthT = clamp((vLZ + ${(LATTICE.depth / 2).toFixed(3)}) / ${LATTICE.depth.toFixed(3)}, 0.0, 1.0);
          float g = side * (0.25 + 0.75 * pow(1.0 - depthT, 1.6));
          vec3 lc = latticeLight(vCol, vLY + uY0, vSun);
          totalEmissiveRadiance += lc * g * 0.3;
        }`);
  };
  mat.customProgramCacheKey = () => 'lattice';
}
