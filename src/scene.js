import * as THREE from 'three';
export const R = Math.random;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;

export function canvasTex(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
export const glow = canvasTex(64, 64, g => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
});

export const canvas = document.getElementById('gl');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(55, 1, .1, 200);

const skyTex = canvasTex(16, 512, g => {
  const r = g.createLinearGradient(0, 0, 0, 512);
  [[0, '#05030f'], [.3, '#140a30'], [.45, '#5a2150'], [.5, '#e0707f'], [.54, '#7a2f5c'], [1, '#1a0c25']].forEach(s => r.addColorStop(s[0], s[1]));
  g.fillStyle = r; g.fillRect(0, 0, 16, 512);
});
scene.background = new THREE.Color(0x07040c);
const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, transparent: true, opacity: 0, fog: false, depthWrite: false }));
sky.renderOrder = -1; scene.add(sky);
scene.fog = new THREE.FogExp2(0x07040c, .04);

let starMat, moonMat, groundMat, grassMat, fireMat;
{ // stars and moon
  const n = 500, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = R() * 6.28, e = .15 + R() * 1.2, d = 90;
    p[i * 3] = Math.cos(a) * Math.cos(e) * d; p[i * 3 + 1] = Math.sin(e) * d; p[i * 3 + 2] = -Math.abs(Math.sin(a)) * Math.cos(e) * d;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  starMat = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, fog: false, color: 0xfff0f5, transparent: true, opacity: .8 }); scene.add(new THREE.Points(g, starMat));
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffe3ec, fog: false, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.set(-26, 26, -70); m.scale.set(30, 30, 1); scene.add(m); moonMat = m.material;
}

const hemi = new THREE.HemisphereLight(0x9a86e0, 0x2a1a30, .75); scene.add(hemi);
const moonL = new THREE.DirectionalLight(0xc4ccff, .95); moonL.position.set(-6, 10, 6); scene.add(moonL);
const rim = new THREE.DirectionalLight(0xff9a8a, .55); rim.position.set(6, 3, -8); scene.add(rim);
export const handLights = [0, 1].map(() => { const l = new THREE.PointLight(0xffc4a0, 0, 11, 1.4); scene.add(l); return l; });

{ // ground and grass
  const g = new THREE.Mesh(new THREE.CircleGeometry(60, 64), (groundMat = new THREE.MeshStandardMaterial({ color: 0x14241d, roughness: 1, transparent: true, opacity: 0 })));
  g.rotation.x = -Math.PI / 2; scene.add(g);
  const N = 3500, gr = new THREE.InstancedMesh(new THREE.ConeGeometry(.035, .55, 3, 1), (grassMat = new THREE.MeshStandardMaterial({ roughness: .9, transparent: true, opacity: 0 })), N);
  const d = new THREE.Object3D(), c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const r = Math.sqrt(R()) * 16, a = R() * 6.28, s = .5 + R() * 1.1;
    d.position.set(Math.cos(a) * r, .27 * s, Math.sin(a) * r - 3); d.scale.set(1, s, 1);
    d.rotation.set((R() - .5) * .4, R() * 6, (R() - .5) * .4); d.updateMatrix();
    gr.setMatrixAt(i, d.matrix); c.setHSL(.33 + R() * .1, .5, .1 + R() * .14); gr.setColorAt(i, c);
  }
  scene.add(gr);
}

const FN = 260, fb = new Float32Array(FN * 3), fpos = new Float32Array(FN * 3), fph = [];
for (let i = 0; i < FN; i++) { fb[i * 3] = (R() - .5) * 26; fb[i * 3 + 1] = .2 + R() * 4; fb[i * 3 + 2] = -10 + R() * 14; fph.push(R() * 6); }
const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
fireMat = new THREE.PointsMaterial({ map: glow, size: .2, color: 0xffd9a0, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }); scene.add(new THREE.Points(fg, fireMat));
export function updateEnv(t) {
  for (let i = 0; i < FN; i++) {
    const p = fph[i];
    fpos[i * 3] = fb[i * 3] + Math.sin(t * .3 + p) * .7;
    fpos[i * 3 + 1] = fb[i * 3 + 1] + Math.sin(t * .5 + p * 2) * .35;
    fpos[i * 3 + 2] = fb[i * 3 + 2] + Math.cos(t * .25 + p) * .6;
  }
  fg.attributes.position.needsUpdate = true;
}

const ease = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const back = l => 1 + 2.70158 * (l - 1) ** 3 + 1.70158 * (l - 1) ** 2;

// photo frames: two stacked on each side at the same depth, so none hides another
export function addFrames() {
  const loader = new THREE.TextureLoader();
  const defs = [['baby', 1.333, -1, 3.8], ['kid', 1.129, -1, 1.65], ['portrait', .562, 1, 3.8], ['bouquet', .763, 1, 1.65]];
  const items = defs.map(([name, asp, side, y], i) => {
    const h = 1.85, w = h * asp, g = new THREE.Group();
    const tex = loader.load(`/photos/${name}.jpg`); tex.encoding = THREE.sRGBEncoding;
    g.add(new THREE.Mesh(new THREE.BoxGeometry(w + .16, h + .16, .04), new THREE.MeshStandardMaterial({ color: 0xfbf3ee, roughness: .6 })));
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); pic.position.z = .025; g.add(pic);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xff8fb0, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.set(w * 2.6, h * 2.6, 1); halo.position.z = -.1; g.add(halo);
    g.rotation.y = -side * .25; g.visible = false; scene.add(g);
    return { g, w, side, y, i };
  });
  return (t, r) => {
    const fit = Math.min(1, camera.aspect / 1.78);
    items.forEach(o => {
      const l = clamp((r - .35 - o.i * .07) / .35, 0, 1);
      o.g.visible = l > 0; o.g.scale.setScalar(Math.max(back(l), 1e-4) * fit);
      o.g.position.set(o.side * (3.8 + o.w / 2) * fit, o.y + Math.sin(t * .7 + o.i * 1.7) * .09, .8);
      o.g.rotation.z = Math.sin(t * .5 + o.i) * .03;
    });
  };
}

// glowing heart of light behind the cake
export function addHeart() {
  const n = 420, p = new Float32Array(n * 3), g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const t = i / n * 6.2832, j = .08;
    p[i * 3] = (16 * Math.sin(t) ** 3) * .13 + (R() - .5) * j;
    p[i * 3 + 1] = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * .13 + (R() - .5) * j;
    p[i * 3 + 2] = (R() - .5) * .3;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.add(new THREE.Points(geo, new THREE.PointsMaterial({ map: glow, size: .16, color: 0xff8fb0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xff5f8a, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false }));
  h.scale.set(7, 7, 1); g.add(h); g.position.set(0, 3.1, -3); g.visible = false; scene.add(g);
  return (t, r) => {
    const l = clamp((r - .5) / .4, 0, 1); g.visible = l > 0;
    g.rotation.y = Math.sin(t * .4) * .5; g.scale.setScalar(Math.max(back(l), 1e-4) * (1 + .035 * Math.sin(t * 3)));
  };
}

// intro glow under the table, fades as the garden appears
const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: glow, color: 0xff7a9a, transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false }));
floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.set(0, .02, 3.3); scene.add(floorGlow);
const FOG0 = new THREE.Color(0x07040c), FOG1 = new THREE.Color(0x3a1a40);
export function setReveal(r) {
  sky.material.opacity = ease(0, .6, r);
  scene.fog.color.copy(FOG0).lerp(FOG1, ease(0, .7, r));
  groundMat.opacity = grassMat.opacity = ease(.1, .7, r);
  starMat.opacity = .8 * ease(.2, .8, r); moonMat.opacity = ease(.2, .9, r);
  const k = .3 + .7 * ease(0, .8, r); hemi.intensity = .75 * k; moonL.intensity = .95 * k; rim.intensity = .55 * k;
  floorGlow.material.opacity = .4 * (1 - ease(.1, .6, r)); fireMat.opacity = lerp(.5, .9, r);
}
