import * as THREE from 'three';
import { R, clamp, lerp } from './scene.js';

const PAL = ['#d1103a', '#ff4d6d', '#f7a1c0', '#fff1ec', '#ff9a76', '#c2185b', '#ffd36e', '#8e1b4a', '#ff6b9a', '#e63946'];

function petalGeo() {
  const g = new THREE.PlaneGeometry(1, 1, 10, 14), p = g.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + .5, v = p.getY(i) + .5, w = Math.pow(Math.sin(Math.PI * (.12 + .78 * v)), .6), x = (u - .5) * w;
    let z = -.9 * x * x; if (v > .7) z += 1.8 * (v - .7) ** 2; z += .025 * Math.sin(u * 14 + v * 6) * v * v;
    p.setXYZ(i, x, v, z);
    const c = (.5 + .5 * Math.min(1, v * 1.25)) * (.94 + .06 * Math.sin(u * 28)) + .1 * Math.pow(Math.abs(u - .5) * 2, 3) * v;
    col.push(c, c * .97, c * .98);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
const PG = petalGeo();
const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f7a43, vertexColors: true, roughness: .7, side: THREE.DoubleSide });
const stemMat = new THREE.MeshStandardMaterial({ color: 0x24562f, roughness: .8 });

function makeRose(scene, hex, sh, lean, x, z) {
  const root = new THREE.Group(), V = THREE.Vector3; root.position.set(x, 0, z);
  const curve = new THREE.CatmullRomCurve3([new V(0, 0, 0), new V(lean * .3, sh * .4, lean * .1), new V(lean * .7, sh * .75, -lean * .1), new V(lean, sh, 0)]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, .035, 6), stemMat));
  [.35, .65].forEach(t => {
    const lg = new THREE.Group(); lg.position.copy(curve.getPoint(t)); lg.rotation.y = R() * 6.28;
    const m = new THREE.Mesh(PG, leafMat); m.rotation.x = 1 + R() * .3; m.scale.set(.5, .8, .5); lg.add(m); root.add(lg);
  });
  const head = new THREE.Group(); head.position.copy(curve.getPoint(1)); head.rotation.order = 'YXZ';
  head.rotation.set(.3 + R() * .3, R() * 6.28, 0); head.scale.setScalar(.5); root.add(head);
  const c = new THREE.Color(hex);
  const mat = new THREE.MeshStandardMaterial({ color: c, vertexColors: true, roughness: .45, side: THREE.DoubleSide, emissive: c.clone().multiplyScalar(.14) });
  head.add(new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 8), leafMat));
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group(); g.rotation.y = i * 1.2566;
    const p = new THREE.Group(); p.position.set(0, -.02, .05); p.rotation.x = 1.6;
    const m = new THREE.Mesh(PG, leafMat); m.scale.set(.32, .6, .32); p.add(m); g.add(p); head.add(g);
  }
  const petals = [], N = z < -7 ? 20 : z < -2 ? 25 : 30;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), g = new THREE.Group(); g.rotation.y = i * 2.39996 + R() * .12;
    const p = new THREE.Group(); p.position.set(0, (1 - t) * .12, .03 + .3 * t);
    const m = new THREE.Mesh(PG, mat), size = .4 + .65 * Math.pow(t, .85);
    m.rotation.z = (R() - .5) * .16; m.scale.set(size, size, size); p.add(m); g.add(p); head.add(g);
    petals.push({ p, m, t, size, closed: -.04 + .2 * t, open: .2 + 1.3 * Math.pow(t, 1.2), ph: R() * 6 });
  }
  scene.add(root);
  return { root, head, petals, hex, bloom: .05, idle: .05 + R() * .06, ph: R() * 6 };
}

export function createRoses(scene, avoid) {
  const roses = [], pts = []; let tries = 0;
  while (pts.length < 46 && tries++ < 3000) {
    const x = (R() - .5) * 27, z = -13 + R() * 17;
    if (Math.hypot(x - avoid[0], z - avoid[1]) > avoid[2] && !(Math.abs(x) > 2.8 && Math.abs(x) < 8.2 && z > -.8 && z < 2.4) && pts.every(q => Math.hypot(q[0] - x, q[1] - z) > 1.45)) pts.push([x, z]);
  }
  pts.forEach(q => roses.push(makeRose(scene, PAL[Math.floor(R() * PAL.length)], 1.1 + R() * 1.5, (R() - .5) * .6, q[0], q[1])));

  const fall = [];
  for (let i = 0; i < 50; i++) {
    const m = new THREE.Mesh(PG, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .5 }));
    m.visible = false; scene.add(m); fall.push({ m, life: 0, v: new THREE.Vector3(), sp: new THREE.Vector3() });
  }
  const V3 = new THREE.Vector3();
  function spawn(r) {
    const f = fall.find(o => o.life <= 0); if (!f) return;
    r.head.getWorldPosition(V3); f.m.material.color.set(r.hex);
    f.m.position.set(V3.x + (R() - .5) * .4, V3.y, V3.z + (R() - .5) * .4); f.life = 9;
    f.v.set((R() - .5) * .25, -.18 - R() * .12, (R() - .5) * .25); f.sp.set(R() * 2, R() * 2, R() * 2); f.m.visible = true;
  }
  function update(dt, t, hands, camera, W, H, Rad) {
    for (const r of roses) {
      r.head.getWorldPosition(V3); V3.project(camera);
      const sx = (V3.x * .5 + .5) * W, sy = (-V3.y * .5 + .5) * H; let best = 0, tgt = 0;
      hands.forEach(h => {
        if (!h.on || h.pinch) return;
        const k = clamp(1 - Math.hypot(sx - h.x, sy - h.y) / (Rad * (h.to < .5 ? 1.5 : 1)), 0, 1), inf = k * k * (3 - 2 * k);
        if (inf > best) { best = inf; tgt = h.o; }
      });
      if (best > .02) r.bloom += (tgt - r.bloom) * Math.min(1, dt * (tgt < r.bloom ? 5 : 2.6)) * Math.min(1, best * 1.8);
      else r.bloom = Math.max(r.idle, r.bloom - dt * .015);
      if (r.bloom > .8 && best > .1 && R() < dt * 1.1) spawn(r);
      r.root.rotation.z = Math.sin(t * .8 + r.ph) * .02;
      for (const o of r.petals) {
        const loc = clamp((r.bloom - (1 - o.t) * .55) / .45, 0, 1), e = loc * loc * (3 - 2 * loc);
        o.p.rotation.x = lerp(o.closed, o.open, e) + Math.sin(t * 1.3 + o.ph) * .012 * (.4 + e);
        const s = o.size * (.9 + .12 * e); o.m.scale.set(s, s, s);
      }
    }
    for (const f of fall) {
      if (f.life <= 0) continue; f.life -= dt; const m = f.m;
      if (m.position.y > .03) {
        m.position.addScaledVector(f.v, dt); m.position.x += Math.sin(t * 2 + f.sp.x * 5) * .004;
        m.rotation.x += f.sp.x * dt; m.rotation.y += f.sp.y * dt; m.rotation.z += f.sp.z * dt;
      }
      m.scale.setScalar(.22 * Math.min(1, f.life)); if (f.life <= 0) m.visible = false;
    }
  }
  const rd = roses.map(r => ({ r, d: Math.min(.4, Math.hypot(r.root.position.x, r.root.position.z - 3.3) / 22 * .4) }));
  function setReveal(rv) {
    for (const { r, d } of rd) {
      const l = clamp((rv - .15 - d) / .4, 0, 1), s = 1 + 2.70158 * (l - 1) ** 3 + 1.70158 * (l - 1) ** 2;
      r.root.visible = l > 0; r.root.scale.setScalar(Math.max(s, 1e-4));
    }
  }
  return { update, setReveal, bloomAll: () => roses.forEach(r => { r.bloom = 1; }) };
}
