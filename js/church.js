// Gloria chapel: brick wall with the arch, nave glimpse, oval dome, altar with the real icons, oak pews and wall details.
import * as THREE from 'three';
import { H, ROOM, ARCH, NAVE, DOME, ALTAR, PEWS, WALL, LATTICE } from './layout.js';
import { boxGeo, planeGeo, at, merge, sweepEllipse, canvasTex, rnd, boxProjectUV } from './util.js';
import { buildLattice, latticeUniforms, patchLatticeMaterial } from './lattice.js';

const loader = new THREE.TextureLoader();
const texCache = new Map();
function tex(path, srgb, repeat = 1, rot = 0) {
  const key = path + repeat + rot;
  if (texCache.has(key)) return texCache.get(key);
  const t = loader.load(path);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.rotation = rot;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

function pbr(name, tile, o = {}) {
  const r = 1 / tile;
  const P = o.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const m = new P({
    map: tex(`assets/tex/${name}_c.jpg`, true, r, o.rot || 0),
    normalMap: tex(`assets/tex/${name}_n.jpg`, false, r, o.rot || 0),
    roughnessMap: tex(`assets/tex/${name}_orm.jpg`, false, r, o.rot || 0),
    aoMap: o.ao ? tex(`assets/tex/${name}_orm.jpg`, false, r, o.rot || 0) : null,
    color: new THREE.Color(o.color ?? 0xffffff),
    roughness: o.rough ?? 1,
    metalness: 0,
    normalScale: new THREE.Vector2(o.ns ?? 1, o.ns ?? 1),
    side: o.side ?? THREE.FrontSide,
  });
  if (o.physical) { m.clearcoat = o.clearcoat ?? 0.5; m.clearcoatRoughness = o.ccr ?? 0.2; }
  return m;
}

function imgMat(name, o = {}) {
  const t = loader.load(`assets/img/${name}.jpg`);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: t, color: new THREE.Color(o.tint ?? 0xffffff), roughness: o.rough ?? 0.6, metalness: 0, emissive: new THREE.Color(0xffffff), emissiveMap: t, emissiveIntensity: o.glow ?? 0, envMapIntensity: 0.6 });
}

export function makeMaterials() {
  const m = {
    brick: pbr('brick', 1.55, { color: 0xf2dccd, ns: 1.2 }),
    brickDark: pbr('brick', 1.55, { color: 0x6a4a3e, ns: 1.2, side: THREE.DoubleSide }),
    plaster: pbr('plaster', 2.2, { color: 0xe9e0cf, ns: 0.6 }),
    plasterWhite: pbr('plaster', 2.2, { color: 0xf4f1ea, ns: 0.4 }),
    lattice: pbr('concrete', 1.4, { color: 0xa29e96, ns: 0.8 }),
    concreteBand: pbr('concrete', 1.4, { color: 0xa9a59c, ns: 0.6, side: THREE.DoubleSide }),
    pillar: pbr('concrete', 1.4, { color: 0xc8c4bb, ns: 0.6 }),
    floor: pbr('floor', 1.4, { color: 0xd9cdb8, rough: 0.75, ns: 0.4 }),
    wood: pbr('wood', 1.3, { physical: true, color: 0xe7b47c, rough: 0.5, clearcoat: 0.8, ccr: 0.14, rot: Math.PI / 2, ns: 0.45 }),
    door: pbr('wood', 1.3, { color: 0xa8683a, rough: 0.6, ns: 0.4 }),
    marble: new THREE.MeshPhysicalMaterial({ color: 0xf1ede6, roughness: 0.28, clearcoat: 0.3 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd8b25e, metalness: 1, roughness: 0.32 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a25a, metalness: 1, roughness: 0.38 }),
    black: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.45, metalness: 0.2 }),
    candle: new THREE.MeshStandardMaterial({ color: 0xf6f0e2, roughness: 0.6, emissive: 0xffd9a0, emissiveIntensity: 0.05 }),
    flame: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.62, 0.25).multiplyScalar(9) }),
    copper: new THREE.MeshStandardMaterial({ color: 0x9a5a36, metalness: 0.8, roughness: 0.5 }),
    tile: new THREE.MeshStandardMaterial({ color: 0x3fae98, roughness: 0.3, metalness: 0.1 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x3f6e2c, roughness: 0.6, side: THREE.DoubleSide }),
    pot: new THREE.MeshStandardMaterial({ color: 0xe8e3da, roughness: 0.7 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0xf7f5ef, roughness: 0.85 }),
  };
  return m;
}

function leftWall(m) {
  const g = new THREE.Group();
  const z0 = WALL.pilaster.z - WALL.pilaster.d / 2 - 0.4, z1 = ROOM.zBack;
  const s = new THREE.Shape();
  s.moveTo(z0, 0); s.lineTo(z1, 0); s.lineTo(z1, H); s.lineTo(z0, H); s.lineTo(z0, 0);
  const r = ARCH.w / 2;
  const hole = new THREE.Path();
  hole.moveTo(ARCH.z - r, 0);
  hole.lineTo(ARCH.z - r, ARCH.spring);
  hole.absarc(ARCH.z, ARCH.spring, r, Math.PI, 0, true);
  hole.lineTo(ARCH.z + r, 0);
  hole.lineTo(ARCH.z - r, 0);
  s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: ARCH.depth, bevelEnabled: false, curveSegments: 24 });
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i));
  const mtx = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0)).setPosition(ROOM.x0, 0, 0);
  geo.applyMatrix4(mtx);
  const wall = new THREE.Mesh(geo, m.brick);
  wall.receiveShadow = wall.castShadow = true;
  g.add(wall);

  const band = new THREE.Mesh(planeGeo(z1 - z0, H - WALL.band, 2.2), m.plasterWhite);
  band.position.set(ROOM.x0 + 0.004, (H + WALL.band) / 2, (z0 + z1) / 2);
  band.rotation.y = Math.PI / 2;
  band.receiveShadow = true;
  g.add(band);

  const ring = [];
  const rr = rnd(7);
  const nB = 44;
  for (let i = 0; i <= nB; i++) {
    const a = Math.PI - (i / nB) * Math.PI;
    const b = boxGeo(0.07, 0.24, 0.115, 1.55);
    const rad = r + 0.12;
    at(b, ROOM.x0 + 0.006 + rr() * 0.006, ARCH.spring + Math.sin(a) * rad, ARCH.z + Math.cos(a) * rad, 0, 0, 0);
    const q = new THREE.Matrix4().makeRotationX(-(a - Math.PI / 2));
    b.translate(-(ROOM.x0 + 0.006), -(ARCH.spring + Math.sin(a) * rad), -(ARCH.z + Math.cos(a) * rad));
    b.applyMatrix4(q);
    b.translate(ROOM.x0 + 0.03, ARCH.spring + Math.sin(a) * rad, ARCH.z + Math.cos(a) * rad);
    ring.push(b);
  }
  const ringMesh = new THREE.Mesh(merge(ring), m.brick);
  ringMesh.castShadow = ringMesh.receiveShadow = true;
  g.add(ringMesh);

  const cross = [];
  const cz = WALL.cross.z, cy = WALL.cross.y;
  const cells = [];
  for (let i = -6; i <= 8; i++) cells.push([0, i]);
  for (let j = -4; j <= 4; j++) if (j) cells.push([j, 4]);
  const cr = rnd(31);
  for (const [j, i] of cells) {
    const jit = Math.round((cr() - 0.5) * 1.6);
    for (const dj of [-0.5, 0.5]) {
      const b = boxGeo(0.06, 0.068, 0.24, 1.55);
      at(b, ROOM.x0 + 0.03 + cr() * 0.025, cy + i * 0.075, cz + (j + dj + jit * 0.5) * 0.125);
      cross.push(b);
    }
  }
  const crossMesh = new THREE.Mesh(merge(cross), m.brick);
  crossMesh.castShadow = crossMesh.receiveShadow = true;
  g.add(crossMesh);

  const pil = new THREE.Mesh(boxGeo(WALL.pilaster.w, H, WALL.pilaster.d, 1.55), m.brick);
  pil.position.set(ROOM.x0 + WALL.pilaster.w / 2 - 0.05, H / 2, WALL.pilaster.z);
  pil.castShadow = pil.receiveShadow = true;
  g.add(pil);
  const pilBand = new THREE.Mesh(boxGeo(WALL.pilaster.w + 0.01, H - WALL.band, WALL.pilaster.d + 0.01, 2.2), m.plasterWhite);
  pilBand.position.set(pil.position.x, (H + WALL.band) / 2, pil.position.z);
  g.add(pilBand);
  const front = new THREE.Mesh(planeGeo(1.2, H, 1.55), m.brick);
  front.position.set(ROOM.x0 + 0.1, H / 2, WALL.pilaster.z - WALL.pilaster.d / 2 - 0.3);
  g.add(front);

  const d = WALL.door;
  const frame = [];
  frame.push(at(boxGeo(0.1, d.h + 0.1, d.w + 0.24, 2), ROOM.x0 + 0.03, (d.h + 0.1) / 2, d.z));
  const fr = new THREE.Mesh(merge(frame), m.plasterWhite);
  fr.receiveShadow = true;
  g.add(fr);
  const door = new THREE.Mesh(boxGeo(0.05, d.h, d.w, 1.3), m.door);
  door.position.set(ROOM.x0 + 0.07, d.h / 2, d.z);
  door.receiveShadow = true;
  g.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), m.brass);
  knob.position.set(ROOM.x0 + 0.11, 1.02, d.z + d.w / 2 - 0.1);
  g.add(knob);

  const art = (name, w, h, z, y, o = {}) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), imgMat(name, o));
    p.position.set(ROOM.x0 + 0.04, y, z);
    p.rotation.y = Math.PI / 2;
    p.receiveShadow = true;
    const back = new THREE.Mesh(boxGeo(0.03, h + 0.02, w + 0.02), o.frame || m.plasterWhite);
    back.position.set(ROOM.x0 + 0.02, y, z);
    back.castShadow = true;
    g.add(back, p);
    return p;
  };
  const mosaic = art('mosaic', WALL.mosaic.w, WALL.mosaic.h, WALL.mosaic.z, WALL.mosaic.y, { tint: 0xc9c4bb });
  for (const pq of WALL.plaques) art('plaque', pq.w, pq.h, pq.z, pq.y, { tint: 0xb9b4aa });
  art('painting', WALL.painting.w, WALL.painting.h, WALL.painting.z, WALL.painting.y, { frame: m.gold });
  art('station', WALL.station.w, WALL.station.h, WALL.station.z, WALL.station.y, { frame: m.gold });
  const tiles = [];
  const st = WALL.station;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const tz = st.z + Math.cos(a) * (st.w / 2 + 0.07), ty = st.y + Math.sin(a) * (st.h / 2 + 0.07);
    tiles.push(at(boxGeo(0.02, 0.075, 0.075), ROOM.x0 + 0.02, ty, tz));
  }
  g.add(new THREE.Mesh(merge(tiles), m.tile));

  const flames = [];
  for (const sc of WALL.sconces) flames.push(...sconce(g, m, ROOM.x0 + 0.02, sc.y, sc.z, Math.PI / 2));

  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, H - 1.4, 8), m.copper);
  pipe.position.set(ROOM.x0 + 0.03, 1.4 + (H - 1.4) / 2, WALL.pipe.z + ARCH.w / 2);
  g.add(pipe);
  return { group: g, mosaic, flames };
}

function sconce(g, m, x, y, z, ry) {
  const s = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.02), m.brass);
  plate.position.set(0, 0, 0.01);
  s.add(plate);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.06), m.brass);
  arm.position.set(0.02, -0.02, 0.05);
  s.add(arm);
  const flames = [];
  [[-0.05, 0.05, 0.36], [0.03, 0.09, 0.42], [0.1, 0.06, 0.34]].forEach(([dx, dz, h]) => {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, h, 14), m.black);
    tube.position.set(dx, h / 2 - 0.03, dz);
    tube.castShadow = true;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.035, 12), m.candle);
    cap.position.set(dx, h - 0.02, dz);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), m.flame);
    fl.scale.set(1, 2.2, 1);
    fl.position.set(dx, h + 0.012, dz);
    s.add(tube, cap, fl);
    flames.push(fl);
  });
  s.position.set(x, y, z);
  s.rotation.y = ry;
  g.add(s);
  return flames;
}

function nave(m, uniforms, toSun) {
  const g = new THREE.Group();
  const { x0, zMin, zMax, h } = NAVE;
  const xw = ROOM.x0 - ARCH.depth;
  const w = xw - x0, dz = zMax - zMin;
  const floor = new THREE.Mesh(planeGeo(w, dz, 1.4), m.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((x0 + xw) / 2, 0, (zMin + zMax) / 2);
  floor.receiveShadow = true;
  const ceil = new THREE.Mesh(planeGeo(w, dz, 2.2), m.plaster);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set((x0 + xw) / 2, h, (zMin + zMax) / 2);
  const wallA = new THREE.Mesh(planeGeo(w, h, 1.55), m.brickDark);
  wallA.position.set((x0 + xw) / 2, h / 2, zMax);
  wallA.rotation.y = Math.PI;
  const upper = new THREE.Mesh(planeGeo(dz, h - H, 1.55), m.brick);
  upper.position.set(xw, H + (h - H) / 2, (zMin + zMax) / 2);
  upper.rotation.y = -Math.PI / 2;
  g.add(floor, ceil, wallA, upper);
  const sub = new THREE.Group();
  const lat = buildLattice(m, uniforms, toSun, { pts: [[x0 + 2.2, zMin], [x0 + 0.6, zMin + 2.2], [x0, zMin + 4.5], [x0, zMax]], noShadow: true, noTop: true });
  sub.add(lat.group);
  sub.scale.y = (h - 0.2) / H;
  g.add(sub);
  const pil = new THREE.Mesh(boxGeo(0.55, h, 0.55, 1.4), m.pillar);
  pil.position.set(xw - 1.1, h / 2, ARCH.z + 1.05);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, h, 28), m.brickDark);
  col.position.set(xw - 2.6, h / 2, ARCH.z - 1.2);
  g.add(pil, col);
  const table = new THREE.Mesh(boxGeo(1.4, 0.92, 0.7), m.cloth);
  table.position.set(xw - 3.6, 0.46, ARCH.z + 0.3);
  g.add(table);
  const tv = new THREE.Mesh(boxGeo(0.95, 0.55, 0.05), m.black);
  tv.position.set(xw - 0.85, 3.1, ARCH.z + 1.05 - 0.3);
  tv.rotation.y = 0.4;
  g.add(tv);
  const flames = sconce(g, m, xw - 3.2, 2.9, zMax - 0.03, Math.PI);
  return { group: g, flames };
}

function backWall(m) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  const xa = ROOM.x0, xb = ROOM.x1 + 0.4;
  s.moveTo(xa, 0); s.lineTo(xb, 0); s.lineTo(xb, H); s.lineTo(xa, H); s.lineTo(xa, 0);
  const hole = new THREE.Path();
  hole.moveTo(-0.95, 0); hole.lineTo(0.95, 0); hole.lineTo(0.95, 2.45); hole.lineTo(-0.95, 2.45); hole.lineTo(-0.95, 0);
  s.holes.push(hole);
  const geo = new THREE.ShapeGeometry(s);
  const wall = new THREE.Mesh(geo, m.brick);
  wall.rotation.y = Math.PI;
  wall.position.z = ROOM.zBack;
  wall.receiveShadow = true;
  const doors = new THREE.Mesh(boxGeo(1.9, 2.45, 0.08, 1.3), m.door);
  doors.position.set(0, 1.225, ROOM.zBack + 0.06);
  const band = new THREE.Mesh(planeGeo(xb - xa, H - WALL.band, 2.2), m.plasterWhite);
  band.rotation.y = Math.PI;
  band.position.set((xa + xb) / 2, (H + WALL.band) / 2, ROOM.zBack - 0.004);
  g.add(wall, doors, band);
  return g;
}

function ceiling(m) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  const xa = ROOM.x0 - ARCH.depth, xb = 4.5, za = -6.2, zb = ROOM.zBack;
  s.moveTo(xa, za); s.lineTo(xb, za); s.lineTo(xb, zb); s.lineTo(xa, zb); s.lineTo(xa, za);
  const hole = new THREE.Path();
  hole.absellipse(DOME.x, DOME.z, DOME.a + DOME.rim, DOME.b + DOME.rim, 0, Math.PI * 2, false);
  s.holes.push(hole);
  const geo = new THREE.ShapeGeometry(s, 64);
  geo.rotateX(Math.PI / 2);
  const c = new THREE.Mesh(geo, m.plaster);
  c.position.y = H;
  c.receiveShadow = c.castShadow = true;
  g.add(c);
  return g;
}

function dome(m) {
  const g = new THREE.Group();
  const { x, z, a, b, rim, drum, win } = DOME;
  const rimProf = [[rim, H], [rim * 0.7, H - 0.035], [rim * 0.35, H - 0.06], [0.04, H - 0.05], [0.0, H - 0.01], [0.0, H + 0.12], [0.05, H + 0.16]];
  const rimMesh = new THREE.Mesh(sweepEllipse(x, z, a, b, rimProf.map(([o, y]) => [o, y]), 128, 1.5), m.plasterWhite);
  rimMesh.material = m.plasterWhite.clone();
  rimMesh.material.side = THREE.DoubleSide;
  rimMesh.receiveShadow = true;
  const y0 = H + 0.16;
  const drumMesh = new THREE.Mesh(sweepEllipse(x, z, a, b, [[0.05, y0], [0.05, y0 + drum]], 128, 1.55), m.brickDark);
  drumMesh.castShadow = true;
  const shelf = new THREE.Mesh(sweepEllipse(x, z, a, b, [[0.05, y0 + drum], [-0.08, y0 + drum + 0.02], [-0.08, y0 + drum + 0.05]], 128, 1.5), m.plasterWhite);
  const wy = y0 + drum + 0.05;
  const winMat = new THREE.ShaderMaterial({
    uniforms: { uGlow: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uGlow; uniform vec3 uTint; varying vec2 vUv;
      void main(){
        float n = 26.0; float x = fract(vUv.x * n) - 0.5; float y = vUv.y;
        float r = 0.3; float ys = 0.62;
        float inside = (abs(x) < r && y > 0.08 && y < ys) || (y >= ys && length(vec2(x, (y - ys) * 1.45)) < r) ? 1.0 : 0.0;
        vec3 plaster = vec3(0.85, 0.84, 0.8) * (0.55 + 0.6 * uGlow * 0.4);
        vec3 glass = vec3(0.92, 0.95, 1.0) * 5.5 * uGlow * uTint;
        gl_FragColor = vec4(mix(plaster, glass, inside), 1.0);
      }`,
  });
  const winGeo = sweepEllipse(x, z, a - 0.08, b - 0.08, [[0, wy], [0, wy + win]], 128, 1);
  const uv = winGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, Math.floor(i / 2) / 128, i % 2);
  const winMesh = new THREE.Mesh(winGeo, winMat);
  winMesh.material.side = THREE.DoubleSide;
  winMesh.castShadow = true;
  const capY = wy + win;
  const ribTex = canvasTex(1024, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#d9d6cf'); gr.addColorStop(1, '#f2efe8');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const xx = (i / 26) * w;
      c.fillStyle = 'rgba(120,115,105,0.35)'; c.fillRect(xx - 3, 0, 6, h);
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(xx + 3, 0, 3, h);
    }
  });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: ribTex, roughness: 0.9, side: THREE.BackSide, emissive: 0xffffff, emissiveMap: ribTex, emissiveIntensity: 0.35 }));
  cap.scale.set(a - 0.08, DOME.cap, b - 0.08);
  cap.position.set(x, capY, z);
  cap.material.shadowSide = THREE.DoubleSide;
  cap.castShadow = true;
  g.add(rimMesh, drumMesh, shelf, winMesh, cap);
  return { group: g, winMat, cap, top: capY };
}

function altar(m) {
  const g = new THREE.Group();
  const st = ALTAR.step;
  const step = new THREE.Mesh(boxGeo(9, st.h, st.z1 - st.z0, 1.4), m.floor);
  step.position.set(0, st.h / 2, (st.z0 + st.z1) / 2);
  step.receiveShadow = step.castShadow = true;
  g.add(step);
  const me = ALTAR.mensa;
  const base = new THREE.Mesh(boxGeo(me.w - 0.2, me.h - 0.08 - st.h, me.d - 0.16, 1.55), m.brick);
  base.position.set(0, st.h + (me.h - 0.08 - st.h) / 2, me.z);
  const top = new THREE.Mesh(boxGeo(me.w, 0.08, me.d), m.marble);
  top.position.set(0, me.h - 0.04, me.z);
  const cloth = new THREE.Mesh(boxGeo(me.w * 0.9, 0.012, me.d * 0.7), m.cloth);
  cloth.position.set(0, me.h + 0.006, me.z);
  base.castShadow = base.receiveShadow = top.castShadow = top.receiveShadow = true;
  g.add(base, top, cloth);
  const flames = [];
  for (const sx of [-0.68, 0.68]) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.32, 16), m.brass);
    stick.position.set(sx, me.h + 0.16, me.z - 0.18);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.28, 14), m.candle);
    c.position.set(sx, me.h + 0.46, me.z - 0.18);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), m.flame);
    fl.scale.set(1, 2.4, 1);
    fl.position.set(sx, me.h + 0.62, me.z - 0.18);
    stick.castShadow = c.castShadow = true;
    g.add(stick, c, fl);
    flames.push(fl);
  }
  const rt = ALTAR.retable;
  const block = new THREE.Mesh(boxGeo(rt.w, rt.h - 0.3, rt.d, 1.55), m.brick);
  block.position.set(0, st.h + (rt.h - 0.3) / 2, rt.z);
  const b2 = new THREE.Mesh(boxGeo(rt.w - 0.32, 0.18, rt.d, 1.55), m.brick);
  b2.position.set(0, st.h + rt.h - 0.3 + 0.09, rt.z);
  const b3 = new THREE.Mesh(boxGeo(rt.w - 0.62, 0.12, rt.d, 1.55), m.brick);
  b3.position.set(0, st.h + rt.h - 0.12 + 0.06, rt.z);
  block.castShadow = block.receiveShadow = b2.castShadow = b3.castShadow = true;
  g.add(block, b2, b3);
  const ctop = st.h + rt.h;
  const cv = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.36, 0.035), m.black);
  cv.position.set(0, ctop + 0.2, rt.z);
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 0.035), m.black);
  ch.position.set(0, ctop + 0.27, rt.z);
  g.add(cv, ch);
  const icon = (name, w, h, xx, y, zz, glow = 0) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), imgMat(name, { glow, rough: 0.45 }));
    p.position.set(xx, y, zz);
    const bk = new THREE.Mesh(boxGeo(w + 0.01, h + 0.01, 0.04), m.gold);
    bk.position.set(xx, y, zz - 0.025);
    bk.castShadow = true;
    g.add(bk, p);
    return p;
  };
  const iy = st.h + 1.62;
  const madonna = icon('madonna', 0.62, 0.73, 0, iy, rt.z + rt.d / 2 + 0.03, 0.0);
  const pope = icon('pope', 0.48, 0.55, -0.82, iy + 0.02, rt.z + 0.05);
  const wota = icon('wota', 0.48, 0.55, 0.82, iy + 0.02, rt.z + 0.05);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.03, 0.03), m.brass);
  bar.position.set(0, iy + 0.33, rt.z + 0.02);
  g.add(bar);
  const plant = (px, pz, s) => {
    const pg = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.16 * s, 0.34 * s, 20), m.pot);
    pot.position.y = 0.17 * s;
    pg.add(pot);
    const leaves = [];
    const r = rnd(Math.round(px * 100 + 7));
    const leaf = new THREE.Shape();
    leaf.moveTo(0, 0); leaf.quadraticCurveTo(0.045, 0.06, 0, 0.15); leaf.quadraticCurveTo(-0.045, 0.06, 0, 0);
    const lg = new THREE.ShapeGeometry(leaf, 3);
    for (let i = 0; i < 520; i++) {
      const hgt = 0.55 + r() * 1.3 * s;
      const rad = (0.06 + r() * 0.36) * s * (1 - Math.abs(hgt - 1.15) * 0.45);
      const a = r() * Math.PI * 2;
      const l = lg.clone();
      l.rotateX(-0.6 - r() * 0.9);
      l.rotateY(a + Math.PI / 2 + (r() - 0.5));
      l.translate(Math.cos(a) * rad, hgt, Math.sin(a) * rad);
      leaves.push(l);
    }
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 1.3 * s, 6), m.door);
    trunk.position.y = 0.34 * s + 0.6 * s;
    const lm = new THREE.Mesh(merge(leaves), m.leaf);
    lm.castShadow = true;
    pg.add(trunk, lm);
    pg.position.set(px, st.h, pz);
    g.add(pg);
  };
  plant(-1.65, -4.95, 1.0);
  plant(1.9, -4.8, 0.95);
  return { group: g, madonna, pope, wota, flames, iconY: iy };
}

function pewGeometry(len) {
  const parts = [];
  parts.push(at(boxGeo(len, 0.045, 0.42, 1.3), 0, 0.44, 0));
  const back = boxGeo(len, 0.5, 0.03, 1.3);
  back.rotateX(-0.12);
  parts.push(at(back, 0, 0.72, 0.24));
  const rail = new THREE.Shape();
  rail.moveTo(-0.05, -0.035); rail.lineTo(0.06, -0.035); rail.quadraticCurveTo(0.085, 0, 0.06, 0.04); rail.lineTo(-0.05, 0.045); rail.quadraticCurveTo(-0.075, 0.005, -0.05, -0.035);
  const rg = new THREE.ExtrudeGeometry(rail, { depth: len, bevelEnabled: false, curveSegments: 6 });
  rg.rotateY(Math.PI / 2);
  rg.translate(-len / 2, 0, 0);
  parts.push(at(rg, 0, 0.995, 0.29));
  parts.push(at(boxGeo(len, 0.018, 0.15, 1.3), 0, 0.8, 0.36));
  parts.push(at(boxGeo(len, 0.11, 0.018, 1.3), 0, 0.85, 0.44));
  parts.push(at(boxGeo(len, 0.07, 0.12, 1.3), 0, 0.11, 0.62));
  const end = new THREE.Shape();
  end.moveTo(-0.24, 0); end.lineTo(0.36, 0); end.lineTo(0.36, 0.95); end.quadraticCurveTo(0.36, 1.06, 0.26, 1.06);
  end.lineTo(0.12, 1.06); end.quadraticCurveTo(0.02, 1.05, 0.0, 0.92); end.quadraticCurveTo(-0.04, 0.62, -0.2, 0.6);
  end.quadraticCurveTo(-0.26, 0.58, -0.26, 0.5); end.lineTo(-0.24, 0);
  const eg = new THREE.ExtrudeGeometry(end, { depth: 0.055, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 8 });
  eg.rotateY(Math.PI / 2);
  for (const sx of [-len / 2 - 0.03, len / 2 - 0.025]) {
    const e = eg.clone();
    e.translate(sx, 0, 0);
    const uv = e.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.3, uv.getY(i) / 1.3);
    parts.push(e);
  }
  return boxProjectUV(merge(parts), 1);
}

function pews(m) {
  const g = new THREE.Group();
  const rows = [];
  for (const [xa, xb] of [PEWS.left, PEWS.right]) {
    const len = xb - xa;
    const geo = pewGeometry(len);
    const im = new THREE.InstancedMesh(geo, m.wood, PEWS.rows);
    const mtx = new THREE.Matrix4();
    for (let r = 0; r < PEWS.rows; r++) {
      const z = PEWS.z0 + r * PEWS.pitch;
      mtx.makeTranslation((xa + xb) / 2, 0, z);
      im.setMatrixAt(r, mtx);
      rows.push({ x0: xa, x1: xb, z });
    }
    im.castShadow = im.receiveShadow = true;
    g.add(im);
  }
  return { group: g, rows };
}

function tv(m) {
  const t = WALL.tv;
  const g = new THREE.Group();
  const body = new THREE.Mesh(boxGeo(t.w, t.h, 0.05), m.black);
  const cnv = document.createElement('canvas');
  cnv.width = 768; cnv.height = 432;
  const ct = new THREE.CanvasTexture(cnv);
  ct.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(t.w - 0.04, t.h - 0.04), new THREE.MeshBasicMaterial({ map: ct, toneMapped: false }));
  screen.position.z = 0.026;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), m.black);
  arm.position.z = -0.15;
  g.add(body, screen, arm);
  g.position.set(t.x, t.y, t.z);
  g.rotation.y = t.yaw;
  return { group: g, canvas: cnv, texture: ct };
}

export function buildChurch(scene, toSun) {
  const m = makeMaterials();
  const uniforms = latticeUniforms();
  patchLatticeMaterial(m.lattice, uniforms);
  const lat = buildLattice(m, uniforms, toSun);
  scene.add(lat.group);

  const floor = new THREE.Mesh(planeGeo(9.4, ROOM.zBack + 6.4, 1.4), m.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0.1, 0, (ROOM.zBack - 6.4) / 2 + 0.0);
  floor.receiveShadow = true;
  scene.add(floor);

  const lw = leftWall(m);
  scene.add(lw.group);
  const nv = nave(m, uniforms, toSun);
  scene.add(nv.group);
  scene.add(backWall(m));
  scene.add(ceiling(m));
  const dm = dome(m);
  scene.add(dm.group);
  const al = altar(m);
  scene.add(al.group);
  const pw = pews(m);
  scene.add(pw.group);
  const screen = tv(m);
  scene.add(screen.group);

  scene.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.uv && !o.geometry.attributes.uv1) o.geometry.setAttribute('uv1', o.geometry.attributes.uv); });

  return {
    materials: m,
    uniforms,
    lattice: lat,
    dome: dm,
    altar: al,
    pews: pw,
    tv: screen,
    mosaic: lw.mosaic,
    flames: [...lw.flames, ...nv.flames, ...al.flames],
  };
}
