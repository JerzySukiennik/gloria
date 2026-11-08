// Gloria geometry helpers: world-scaled UVs, sweeps along curves, merging, hashing.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const rnd = (seed) => {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

export function boxGeo(w, h, d, tile = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * dims[f][0] / tile, uv.getY(k) * dims[f][1] / tile);
    }
  }
  return g;
}

export function planeGeo(w, h, tile = 1) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile);
  return g;
}

export function at(g, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
  return g.applyMatrix4(m);
}

export function merge(list) {
  const flat = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
    if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
    return n;
  });
  return mergeGeometries(flat, false);
}

export function boxProjectUV(geo, tile = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b));
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const v = [a, b, c][k];
      let u, w;
      if (ay >= ax && ay >= az) { u = v.x; w = v.z; } else if (ax >= az) { u = v.z; w = v.y; } else { u = v.x; w = v.y; }
      uv[(i + k) * 2] = u / tile; uv[(i + k) * 2 + 1] = w / tile;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

export function frameAt(curve, u, center) {
  const p = curve.getPointAt(u);
  const t = curve.getTangentAt(u).setY(0).normalize();
  const n = new THREE.Vector3(-t.z, 0, t.x);
  const cx = center ? center[0] : 0, cz = center ? center[1] : 0;
  if (n.dot(new THREE.Vector3(cx - p.x, 0, cz - p.z)) < 0) { n.negate(); t.negate(); }
  return { p, t, n };
}

export function sweepCurve(curve, profile, segs, uScale = 1, center) {
  const pos = [], uv = [], idx = [];
  const L = curve.getLength();
  const plen = [0];
  for (let j = 1; j < profile.length; j++) plen.push(plen[j - 1] + Math.hypot(profile[j][0] - profile[j - 1][0], profile[j][1] - profile[j - 1][1]));
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const { p, n } = frameAt(curve, u, center);
    for (let j = 0; j < profile.length; j++) {
      const [off, y] = profile[j];
      pos.push(p.x + n.x * off, y, p.z + n.z * off);
      uv.push(u * L / uScale, plen[j] / uScale);
    }
  }
  const m = profile.length;
  for (let i = 0; i < segs; i++) for (let j = 0; j < m - 1; j++) {
    const a = i * m + j, b = (i + 1) * m + j;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function sweepEllipse(cx, cz, a, b, profile, segs, uScale = 1, inward = false) {
  const pos = [], uv = [], idx = [];
  const plen = [0];
  for (let j = 1; j < profile.length; j++) plen.push(plen[j - 1] + Math.hypot(profile[j][0] - profile[j - 1][0], profile[j][1] - profile[j - 1][1]));
  const per = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  for (let i = 0; i <= segs; i++) {
    const th = (i / segs) * Math.PI * 2;
    const nx = b * Math.cos(th), nz = a * Math.sin(th);
    const nl = Math.hypot(nx, nz);
    for (let j = 0; j < profile.length; j++) {
      const [off, y] = profile[j];
      pos.push(cx + a * Math.cos(th) + (nx / nl) * off, y, cz + b * Math.sin(th) + (nz / nl) * off);
      uv.push((i / segs) * per / uScale, plen[j] / uScale);
    }
  }
  const m = profile.length;
  for (let i = 0; i < segs; i++) for (let j = 0; j < m - 1; j++) {
    const a0 = i * m + j, b0 = (i + 1) * m + j;
    if (inward) idx.push(a0, a0 + 1, b0, b0, a0 + 1, b0 + 1);
    else idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
