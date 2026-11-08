// Gloria live lyrics: words pop up in the hall the moment they are sung and the sentence clears when it ends. Text comes from LRCLIB at play time, only the timing map ships with the game.
import * as THREE from 'three';

export function lrcWords(synced) {
  const lines = [];
  for (const raw of (synced || '').split('\n')) {
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    if (!text) continue;
    lines.push(text.split(/\s+/).filter(Boolean));
  }
  return lines;
}

export async function loadLyrics(key) {
  const map = await fetch(`assets/lyrics-${key}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!map) return null;
  const lrc = await fetch(`https://lrclib.net/api/get/${map.lrclib}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!lrc || !lrc.syncedLyrics) return null;
  const lines = lrcWords(lrc.syncedLyrics);
  if (map.counts && map.counts.some((n, i) => (lines[i] || []).length !== n)) return null;
  return map.sentences.map((s) => ({ t0: s.t0, t1: s.t1, words: s.words.map(([t, li, wi]) => ({ t, text: (lines[li] || [])[wi] || '' })).filter((w) => w.text) })).filter((s) => s.words.length);
}

const texCache = new Map();
function wordTex(text) {
  if (texCache.has(text)) return texCache.get(text);
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const fs = 96, pad = 30, font = `800 ${fs}px -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + pad * 2;
  c.width = w; c.height = 128 + pad;
  g.font = font;
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0, 0, 0, 0.9)';
  g.shadowBlur = 22;
  g.fillStyle = '#fff';
  g.fillText(text, pad, c.height / 2 + 2);
  g.shadowBlur = 8;
  g.fillText(text, pad, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const v = { tex, aspect: w / c.height, pad: pad / c.height };
  texCache.set(text, v);
  if (texCache.size > 400) { const [k, old] = texCache.entries().next().value; old.tex.dispose(); texCache.delete(k); }
  return v;
}

export class Lyrics3D {
  constructor(scene, opts = {}) {
    this.group = new THREE.Group();
    this.group.renderOrder = 9;
    scene.add(this.group);
    this.height = opts.height || 0.5;
    this.maxW = opts.maxWidth || 6.2;
    this.dist = opts.distance || 6.5;
    this.y = opts.y || 3.0;
    this.bounds = opts.bounds || null;
    this._f = new THREE.Vector3();
    this.sentences = null;
    this.cur = -1;
    this.items = [];
    this.fade = 1;
    this.on = true;
    this.geo = new THREE.PlaneGeometry(1, 1);
  }
  set(sentences) { this.sentences = sentences; this.clear(); }
  clear() {
    for (const it of this.items) { this.group.remove(it.mesh); it.mesh.material.dispose(); }
    this.items = [];
    this.cur = -1;
  }
  place(camera) {
    camera.getWorldDirection(this._f);
    this._f.y = 0;
    if (this._f.lengthSq() < 1e-6) this._f.set(0, 0, -1);
    this._f.normalize();
    const p = this.group.position.copy(camera.position).addScaledVector(this._f, this.dist);
    const b = this.bounds;
    if (b) { p.x = Math.max(b.x0, Math.min(b.x1, p.x)); p.z = Math.max(b.z0, Math.min(b.z1, p.z)); }
    p.y = Math.max(this.y, camera.position.y + 1.0);
    this.group.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
  }
  build(s, camera) {
    this.clear();
    if (camera) this.place(camera);
    const H = this.height, hh = H * 1.3, space = H * 0.26;
    const ws = s.words.map((w) => { const t = wordTex(w.text); const ww = t.aspect * hh, pw = t.pad * hh; return { ...w, ...t, ww, pw, vis: ww - 2 * pw }; });
    const rows = [[]];
    let rowW = 0;
    for (const w of ws) {
      if (rowW + w.vis > this.maxW && rows[rows.length - 1].length) { rows.push([]); rowW = 0; }
      rows[rows.length - 1].push(w);
      rowW += w.vis + space;
    }
    rows.forEach((row, ri) => {
      const total = row.reduce((a, w) => a + w.vis, 0) + space * (row.length - 1);
      let x = -total / 2;
      const y = ((rows.length - 1) / 2 - ri) * H * 1.2;
      for (const w of row) {
        const mat = new THREE.MeshBasicMaterial({ map: w.tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, color: new THREE.Color(1.7, 1.7, 1.7) });
        const mesh = new THREE.Mesh(this.geo, mat);
        const cx = x + w.vis / 2;
        mesh.scale.set(w.ww, hh, 1);
        mesh.position.set(cx, y, 0);
        mesh.renderOrder = 9;
        this.group.add(mesh);
        this.items.push({ mesh, t: w.t, x: cx, y, ww: w.ww, hh });
        x += w.vis + space;
      }
    });
  }
  update(dt, songTime, camera, active) {
    const show = this.on && active && this.sentences && songTime != null;
    this.group.visible = !!show;
    if (!show) { if (this.cur >= 0) this.clear(); return; }
    const S = this.sentences;
    let k = -1;
    for (let i = 0; i < S.length; i++) if (songTime >= S[i].t0 - 0.05 && songTime <= S[i].t1 + 0.45) { k = i; }
    if (k !== this.cur) { if (k >= 0) this.build(S[k], camera); else this.clear(); this.cur = k; }
    if (k < 0) return;
    const s = S[k];
    const out = songTime > s.t1 + 0.15 ? Math.min(1, (songTime - s.t1 - 0.15) / 0.3) : 0;
    for (const it of this.items) {
      const a = songTime - it.t;
      const pop = a <= 0 ? 0 : Math.min(1, a / 0.11);
      const e = 1 - Math.pow(1 - pop, 3);
      it.mesh.material.opacity = e * (1 - out);
      const sc = 0.72 + 0.28 * e + (a > 0 && a < 0.18 ? 0.06 * Math.sin((a / 0.18) * Math.PI) : 0);
      it.mesh.scale.set(it.ww * sc, it.hh * sc, 1);
      it.mesh.position.y = it.y + (1 - e) * -0.12 + out * 0.35;
    }
    const yaw = Math.atan2(camera.position.x - this.group.position.x, camera.position.z - this.group.position.z);
    let d = yaw - this.group.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.group.rotation.y += d * Math.min(1, dt * 3);
  }
}
