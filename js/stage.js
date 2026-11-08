// Gloria stage: renderer, camera rig, daylight through the lattice, show lights and post-processing.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { buildChurch } from './church.js';
import { H, DOME, ALTAR, PEWS, SEAT, WALL, HALL, HDOME, HALTAR, STAGE, MIRROR_X } from './layout.js';

export const TO_SUN = new THREE.Vector3(0.94, 0.2, 0.27).normalize();

export function pickQuality() {
  const q = new URLSearchParams(location.search).get('q');
  if (q) return q;
  const mobile = /iPhone|iPad|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
  return mobile ? 'low' : 'mid';
}

export class Stage {
  constructor(canvas, quality) {
    this.quality = quality;
    const r = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'high', powerPreference: 'high-performance', stencil: false });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = new URLSearchParams(location.search).get('tm') === 'agx' ? THREE.AgXToneMapping : THREE.NeutralToneMapping;
    r.toneMappingExposure = 0.9;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.shadowMap.autoUpdate = false;
    this.renderer = r;
    this.maxPR = Math.min(window.devicePixelRatio || 1, quality === 'high' ? 1.5 : quality === 'mid' ? 1.25 : 1.0);
    this.pixelRatio = this.maxPR;
    r.setPixelRatio(this.pixelRatio);
    RectAreaLightUniformsLib.init();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0a09);
    this.scene = scene;
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.05, 80);
    this.camera.rotation.order = 'YXZ';

    this.church = buildChurch(scene, TO_SUN);
    this.lights();
    this.post();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  lights() {
    const s = this.scene;
    const sun = new THREE.DirectionalLight(0xffe2bd, 11);
    const target = new THREE.Vector3(-16, 0, 0);
    sun.position.copy(TO_SUN).multiplyScalar(40).add(target);
    sun.target.position.copy(target);
    sun.castShadow = true;
    const sz = this.quality === 'high' ? 4096 : 2048;
    sun.shadow.mapSize.set(sz, sz);
    const c = sun.shadow.camera;
    c.left = -24; c.right = 24; c.top = 11; c.bottom = -11; c.near = 15; c.far = 75;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    s.add(sun, sun.target);
    this.sun = sun;

    const hemi = new THREE.HemisphereLight(0xdfe6f0, 0x8a5a44, 0.55);
    s.add(hemi);
    this.hemi = hemi;

    const rect = (x, y, z, w, h, lx, lz, I) => {
      const l = new THREE.RectAreaLight(0xe6eefc, I, w, h);
      l.position.set(x, y, z);
      l.lookAt(lx, y, lz);
      s.add(l);
      return l;
    };
    const xc = HALL.xc;
    this.walls = [
      rect(xc, 4.3, -11.6, 22, 7.6, xc, 0, 2.4),
      rect(HALL.x1 - 0.25, 6.4, 0.6, 11.8, 3.6, xc, 0.6, 2.6),
      rect(HALL.x0 + 0.25, 6.4, 0.6, 11.8, 3.6, xc, 0.6, 1.6),
      rect(3.82, 2.2, 0.0, 12.5, 3.6, 0, 0, 3.4),
    ];
    if (this.quality !== 'low') {
      this.walls.push(rect(-0.2, 2.2, -5.45, 6.4, 3.6, -0.2, 0, 2.2));
      this.walls.push(rect(MIRROR_X - 3.82, 2.2, 0.0, 12.5, 3.6, MIRROR_X, 0, 2.6));
    }
    this.wallBase = this.walls.map((l) => l.intensity);

    const domeL = new THREE.PointLight(0xf4f6ff, 6, 0, 2);
    domeL.position.set(DOME.x, H + 1.2, DOME.z);
    s.add(domeL);
    const hDome = new THREE.PointLight(0xf4f6ff, 30, 0, 2);
    hDome.position.set(HDOME.x, HALL.h + 1.6, HDOME.z);
    s.add(hDome);
    this.domeLight = hDome;
    this.chapelDome = domeL;

    this.spots = [0, 1, 2, 3].map((i) => {
      const l = new THREE.SpotLight(0xffffff, 0, 30, 0.32, 0.6, 1.2);
      l.position.set(xc + [-7, -2.5, 2.5, 7][i], HALL.h - 0.4, -4.5);
      l.target.position.set(xc, 0, 2);
      s.add(l, l.target);
      return l;
    });
    const al = new THREE.SpotLight(0xfff0d6, 0, 20, 0.2, 0.55, 1.2);
    al.position.set(HALTAR.x, HALL.h + 1.6, HALTAR.z + 2.5);
    al.target.position.set(HALTAR.x, 1.2, HALTAR.z - 0.6);
    s.add(al, al.target);
    this.altarSpot = al;
    const pyro = new THREE.PointLight(0xff8a2e, 0, 22, 1.6);
    pyro.position.set(xc, 2.2, STAGE.z1 + 0.5);
    s.add(pyro);
    this.pyroLight = pyro;
  }

  post() {
    const r = this.renderer;
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: this.quality === 'high' ? 4 : this.quality === 'mid' ? 2 : 0 });
    const comp = new EffectComposer(r, rt);
    comp.addPass(new RenderPass(this.scene, this.camera));
    if (this.quality === 'high') {
      const ao = new GTAOPass(this.scene, this.camera, 1, 1);
      ao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.6, thickness: 1.2, scale: 1.1, samples: 12 });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      ao.blendIntensity = 0.9;
      comp.addPass(ao);
      this.ao = ao;
    }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.16, 0.4, 2.2);
    comp.addPass(this.bloom);
    comp.addPass(new OutputPass());
    this.composer = comp;
  }

  setPixelRatio(pr) {
    this.pixelRatio = pr;
    this.renderer.setPixelRatio(pr);
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 68 : 52;
    this.camera.updateProjectionMatrix();
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w * this.pixelRatio * 0.5, h * this.pixelRatio * 0.5);
  }

  bakeStatic() {
    this.renderer.shadowMap.needsUpdate = true;
    const pm = new THREE.PMREMGenerator(this.renderer);
    const keep = this.scene.background;
    this.scene.background = new THREE.Color(0x30302e);
    this.renderer.render(this.scene, this.camera);
    const cubeRT = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
    const cc = new THREE.CubeCamera(0.1, 40, cubeRT);
    cc.position.set(0, 1.6, 0);
    this.scene.add(cc);
    cc.update(this.renderer, this.scene);
    this.scene.remove(cc);
    const env = pm.fromCubemap(cubeRT.texture);
    this.scene.environment = env.texture;
    this.scene.environmentIntensity = 0.55;
    this.scene.background = keep;
    cubeRT.dispose();
    pm.dispose();
  }

  seatPose() {
    const z = PEWS.z0 + SEAT.row * PEWS.pitch + 0.05;
    return { pos: new THREE.Vector3(SEAT.x, 1.17, z), yaw: 0.08, pitch: 0.08 };
  }

  render() {
    this.composer.render();
  }
}
