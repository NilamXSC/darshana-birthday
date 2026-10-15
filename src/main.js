import * as THREE from 'three';
import { renderer, scene, camera, updateEnv, addFrames, addHeart, setReveal, handLights, clamp, lerp } from './scene.js';
import { createRoses } from './roses.js';
import { createCake } from './cake.js';
import { hands, nav, updateGestures, startHands, startMic, micLevel, manualBlow, resumeAudio, initMouse } from './input.js';
import { startClock } from './clock.js';
import './fx.js';

const $ = s => document.querySelector(s), hero = $('#hero'), body = document.body, rings = [...document.querySelectorAll('.ring')];
const roses = createRoses(scene, [0, 3.3, 2.8]), frames = addFrames(), heart = addHeart();
let rvT = 0, rv = 0, lastRv = -1, done = false;
initMouse(hero); startClock();
const d0 = new Date(); if (d0.getMonth() === 9 && d0.getDate() === 16) body.classList.add('bday');

// background music: put song.mp3 in public/music
const bgm = $('#bgm'), mb = $('#music'); let pending = false, primed = false;
const noFile = () => !!bgm.error || bgm.networkState === 3;
function playMusic() {
  bgm.volume = 0;
  bgm.play().then(() => {
    mb.classList.remove('wait'); mb.classList.add('on'); let v = 0;
    const id = setInterval(() => { v = Math.min(.6, v + .02); bgm.volume = v; if (v >= .6) clearInterval(id); }, 100);
  }).catch(e => { if (e.name === 'NotAllowedError') { pending = true; mb.hidden = false; mb.classList.add('wait'); } });
}
mb.onclick = () => { if (bgm.paused) { bgm.volume = .6; bgm.play(); mb.classList.remove('wait'); mb.classList.add('on'); } else { bgm.pause(); mb.classList.remove('on'); } };
// first tap or key: wake the audio engine and let the browser allow music later
const unlock = () => {
  resumeAudio();
  if (pending) { pending = false; playMusic(); return; }
  if (!primed && !rvT) {
    primed = true; bgm.muted = true;
    bgm.play().then(() => { if (!rvT) { bgm.pause(); bgm.currentTime = 0; } bgm.muted = false; }).catch(() => { bgm.muted = false; });
  }
};
addEventListener('pointerdown', unlock, true); addEventListener('keydown', unlock, true);

// the cake comes first; blowing the candles reveals everything
const cake = createCake(scene, () => {
  if (done) $('#relight').hidden = false;
  $('#wish').classList.add('show'); setTimeout(() => $('#wish').classList.remove('show'), 3400);
  if (rvT) return;
  roses.bloomAll();
  setTimeout(() => { rvT = 1; nav.zoomT = 8.2; playMusic(); }, 1100);
  setTimeout(() => { done = true; body.classList.remove('intro'); body.classList.add('revealed'); $('#relight').hidden = false; mb.hidden = noFile(); }, 3000);
});

// microphone starts right away, the mic button is the tap fallback
let micTried = false;
async function ensureMic() { if (micTried) return; micTried = true; const b = $('#mic'); try { await startMic(); b.classList.add('on'); } catch (e) { b.classList.add('err'); } }
ensureMic();
$('#mic').onclick = () => { if (!micTried) ensureMic(); else manualBlow(); };
$('#hand').onclick = async e => { const b = e.currentTarget; if (b.classList.contains('on')) return; b.classList.add(await startHands() ? 'on' : 'err'); };
$('#relight').onclick = () => { cake.relight(); $('#relight').hidden = true; };
addEventListener('keydown', e => { if (e.key === 'b') manualBlow(); if (e.key === 'r' && done) { cake.relight(); $('#relight').hidden = true; } });

const NAV = { in: ['zoomT', -1], out: ['zoomT', 1], up: ['camYT', .6], down: ['camYT', -.6] };
document.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => {
  const [k, d] = NAV[b.dataset.nav]; nav[k] = k === 'zoomT' ? clamp(nav[k] + d, 2.6, 11) : clamp(nav[k] + d, -1.2, 5);
});
hero.addEventListener('wheel', e => {
  if (e.ctrlKey) { e.preventDefault(); nav.zoomT = clamp(nav.zoomT + e.deltaY * .02, 2.6, 11); }
  else if (e.shiftKey) { e.preventDefault(); nav.camYT = clamp(nav.camYT - (e.deltaY + e.deltaX) * .004, -1.2, 5); }
}, { passive: false });
let td = 0;
hero.addEventListener('touchmove', e => {
  if (e.touches.length !== 2) return;
  const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  if (td) nav.zoomT = clamp(nav.zoomT - (d - td) * .02, 2.6, 11); td = d;
}, { passive: true });
hero.addEventListener('touchend', () => { td = 0; });

function resize() { const w = hero.clientWidth, h = hero.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(hero); resize();
let vis = true; new IntersectionObserver(([e]) => { vis = e.isIntersecting; }).observe(hero);

let last = performance.now(), T = 0, camX = 0, zoom = 8.9, camY = 0;
const vp = new THREE.Vector3(), vd = new THREE.Vector3(), sm = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
(function frame() {
  requestAnimationFrame(frame);
  const now = performance.now(), dt = Math.min((now - last) / 1e3, .05); last = now;
  if (!vis) return;
  T += dt;
  if (rvT > rv) rv = Math.min(rvT, rv + dt / 5);
  if (rv !== lastRv) { setReveal(rv); roses.setReveal(rv); lastRv = rv; }
  const W = hero.clientWidth, H = hero.clientHeight, Rad = Math.min(W, H) * .22;
  let ax = 0, an = 0;
  hands.forEach((h, i) => {
    if (rv < .05) h.on = false;
    if (h.on && now - h.seen > 400) h.on = false;
    h.x += (h.tx - h.x) * Math.min(1, dt * 14); h.y += (h.ty - h.y) * Math.min(1, dt * 14); h.o += (h.to - h.o) * Math.min(1, dt * 10);
    const rg = rings[i], sz = Rad * 2, dot = rg.firstChild;
    rg.style.width = rg.style.height = sz + 'px';
    rg.style.transform = `translate(${h.x - sz / 2}px,${h.y - sz / 2}px) scale(${.85 + .15 * h.o})`;
    rg.style.opacity = h.on ? 1 : 0; dot.style.width = dot.style.height = (14 + h.o * 70) + 'px';
    const l = handLights[i];
    if (h.on) {
      ax += h.x / W; an++;
      vp.copy(camera.position); vd.set(h.x / W * 2 - 1, -(h.y / H * 2 - 1), .5).unproject(camera).sub(vp).normalize();
      l.position.copy(vp).addScaledVector(vd, 7); l.intensity = lerp(l.intensity, .8 + 1.4 * h.o, dt * 6);
    } else l.intensity = lerp(l.intensity, 0, dt * 4);
  });
  updateGestures();
  const kk = sm((rv - .05) / .85);
  zoom += (nav.zoomT - zoom) * Math.min(1, dt * (rv > 0 && rv < 1 ? 1.1 : 5)); camY += (nav.camYT - camY) * Math.min(1, dt * 5);
  const tx = an ? (ax / an - .5) * 2.4 : Math.sin(T * .12) * .8; camX += (tx - camX) * dt * 1.5;
  camera.position.set(camX, Math.max(.35, 1.9 + (zoom - 2.6) * .1 + camY) + Math.sin(T * .17) * .1, zoom);
  camera.lookAt(camX * .3, lerp(1.4, 2.3, kk) + camY * .6, lerp(3.3, 1.5, kk));
  roses.update(dt, T, hands, camera, W, H, Rad);
  cake.update(dt, T, micLevel());
  frames(T, rv); heart(T, rv); updateEnv(T);
  renderer.render(scene, camera);
})();

