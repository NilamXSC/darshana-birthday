import * as THREE from 'three';
import { glow, R } from './scene.js';

export function createCake(scene, onBlow) {
  const g = new THREE.Group(); g.position.set(0, 0, 3.3); scene.add(g);
  const M = (c, r = .55, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const cyl = (r1, r2, h, o = false) => new THREE.CylinderGeometry(r1, r2, h, 64, 1, o);
  const put = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; g.add(m); return m; };
  const cloth = M(0xf7ece6, .9); cloth.side = THREE.DoubleSide;
  put(cyl(1.9, 1.9, .08), cloth, 1.0); put(cyl(1.88, 2.4, 1, true), cloth, .5);
  put(cyl(1.55, 1.55, .05), M(0xd8b46a, .3, .85), 1.065);

  const gold = M(0xe7c07a, .3, .8), white = M(0xfffaf6, .4);
  let y = 1.09;
  [[1.25, .6, 0xf9cfd9], [.95, .5, 0xfff1ea], [.65, .42, 0xf4a9bd]].forEach(([r, h, c]) => {
    put(cyl(r, r, h), M(c, .5), y + h / 2);
    [y, y + h].forEach(yy => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .055, 12, 64), white); t.rotation.x = Math.PI / 2; t.position.y = yy; g.add(t); });
    const n = Math.round(r * 20);
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283, p = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), gold);
      p.position.set(Math.cos(a) * r * 1.01, y + .1, Math.sin(a) * r * 1.01); g.add(p);
    }
    y += h;
  });
  const topY = y;
  const berry = M(0xd81b3c, .35), leaf = M(0x2f7a43, .7), pink = M(0xffb3c6, .4);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * 6.283, b = new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 10), berry);
    b.scale.y = 1.2; b.position.set(Math.cos(a) * .8, 2.19 + .08, Math.sin(a) * .8); g.add(b);
    const l = new THREE.Mesh(new THREE.ConeGeometry(.04, .05, 5), leaf); l.position.set(b.position.x, 2.19 + .19, b.position.z); g.add(l);
  }
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * 6.283, b = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), pink);
    b.position.set(Math.cos(a) * 1.1, 1.69 + .06, Math.sin(a) * 1.1); g.add(b);
  }

  // 21 candles: 1 + 6 + 14
  const stripe = [0xffd6e0, 0xfff3c4, 0xc9e8ff, 0xffc2d1], candles = [];
  const spots = [[0, 0]];
  for (let i = 0; i < 6; i++) spots.push([Math.cos(i / 6 * 6.283) * .22, Math.sin(i / 6 * 6.283) * .22]);
  for (let i = 0; i < 14; i++) spots.push([Math.cos(i / 14 * 6.283) * .46, Math.sin(i / 14 * 6.283) * .46]);
  spots.forEach(([x, z], i) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .26, 10), M(stripe[i % 4], .6)); c.position.set(x, topY + .13, z); g.add(c);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffb347, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xfff2c0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    flame.position.set(x, topY + .38, z); core.position.set(x, topY + .33, z); g.add(flame, core);
    candles.push({ flame, core, x, z });
  });
  const light = new THREE.PointLight(0xffb070, 1.4, 7, 1.5); light.position.set(0, topY + .6, 0); g.add(light);

  // confetti
  const N = 450, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3);
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); cg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const cm = new THREE.PointsMaterial({ size: .1, vertexColors: true, transparent: true, depthWrite: false });
  const conf = new THREE.Points(cg, cm); conf.frustumCulled = false; conf.visible = false; scene.add(conf);
  const pal = ['#ff7a9a', '#ffd36e', '#fff1ec', '#f7a1c0', '#ff4d6d', '#c9a6ff'].map(h => new THREE.Color(h));
  let life = 0;
  function burst() {
    for (let i = 0; i < N; i++) {
      pos.set([g.position.x + (R() - .5) * .6, topY + .5, g.position.z + (R() - .5) * .6], i * 3);
      vel.set([(R() - .5) * 8, 3 + R() * 6, (R() - .5) * 8], i * 3);
      const c = pal[i % pal.length]; col.set([c.r, c.g, c.b], i * 3);
    }
    cg.attributes.color.needsUpdate = true; life = 5; conf.visible = true;
  }

  // smoke
  const smoke = [];
  let lit = true, blowT = 0, fade = 1;
  function extinguish() {
    lit = false;
    candles.forEach(c => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0x9a9a9a, transparent: true, opacity: .5, depthWrite: false }));
      s.position.copy(c.flame.position); s.scale.set(.1, .1, 1); g.add(s); smoke.push({ s, life: 1.8, dx: (R() - .5) * .12 });
    });
    burst(); onBlow && onBlow();
  }
  function update(dt, t, level) {
    fade += ((lit ? 1 : 0) - fade) * Math.min(1, dt * 12);
    candles.forEach((c, i) => {
      const fl = 1 + .12 * Math.sin(t * 17 + i * 2.3) + .06 * Math.sin(t * 31 + i), lean = lit ? level * .09 : 0;
      c.flame.visible = c.core.visible = fade > .02;
      c.flame.scale.set(.2 * fl * (1 - level * .4) * fade, .28 * fl * fade * (1 + level * .2), 1);
      c.flame.position.x = c.x + lean + Math.sin(t * 3 + i) * .006; c.core.position.x = c.flame.position.x;
      c.core.scale.setScalar(.08 * fade * fl);
    });
    light.intensity = 1.4 * fade * (.9 + .1 * Math.sin(t * 20));
    if (lit) { if (level > .25) blowT += dt * level; else blowT = Math.max(0, blowT - dt * 1.5); if (blowT > .12) extinguish(); }
    for (let i = smoke.length - 1; i >= 0; i--) {
      const o = smoke[i]; o.life -= dt; o.s.position.y += dt * .5; o.s.position.x += o.dx * dt;
      o.s.scale.addScalar(dt * .35); o.s.material.opacity = Math.max(0, o.life / 1.8) * .45;
      if (o.life <= 0) { g.remove(o.s); smoke.splice(i, 1); }
    }
    if (life > 0) {
      life -= dt;
      for (let i = 0; i < N; i++) {
        const k = i * 3; vel[k + 1] -= 6 * dt; vel[k] *= .99; vel[k + 2] *= .99;
        pos[k] += vel[k] * dt; pos[k + 1] += vel[k + 1] * dt; pos[k + 2] += vel[k + 2] * dt;
        if (pos[k + 1] < .05) { pos[k + 1] = .05; vel[k] = vel[k + 1] = vel[k + 2] = 0; }
      }
      cg.attributes.position.needsUpdate = true; cm.opacity = Math.min(1, life); if (life <= 0) conf.visible = false;
    }
  }
  return { update, relight() { lit = true; blowT = 0; } };
}
