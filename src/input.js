import { clamp } from './scene.js';

export const hands = [0, 1].map(() => ({ on: false, tx: 0, ty: 0, x: 0, y: 0, to: 0, o: 0, seen: 0, pinch: false }));
export const nav = { zoomT: 8.9, camYT: 0, n: 0, m: 0, d: 0 };
const hero = document.getElementById('hero'), vid = document.getElementById('vid'), pip = document.getElementById('pip');
const sk = document.getElementById('sk').getContext('2d');
const CONN = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
const D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z - b.z) * .8);
let camMode = false;

function onResults(res) {
  const L = res.multiHandLandmarks || [], W = hero.clientWidth, H = hero.clientHeight;
  sk.clearRect(0, 0, 320, 240);
  hands.forEach((h, i) => {
    const lm = L[i]; if (!lm) { h.on = false; return; }
    let cx = 0, cy = 0; [0, 5, 9, 13, 17].forEach(k => { cx += lm[k].x / 5; cy += lm[k].y / 5; });
    h.tx = clamp(((1 - cx) - .5) * 1.35 + .5, 0, 1) * W; h.ty = clamp((cy - .5) * 1.35 + .5, 0, 1) * H;
    let r = 0; [[8, 5], [12, 9], [16, 13], [20, 17]].forEach(f => { r += D(lm[f[0]], lm[0]) / D(lm[f[1]], lm[0]) / 4; });
    const o = clamp((r - 1.05) / .7, 0, 1); h.to = o < .3 ? 0 : o > .7 ? 1 : (o - .3) / .4;
    h.pinch = D(lm[4], lm[8]) / D(lm[0], lm[9]) < .32;
    if (!h.on) { h.x = h.tx; h.y = h.ty; h.o = h.to; }
    h.on = true; h.seen = performance.now();
    sk.strokeStyle = i ? '#ffd36e' : '#ff8fae'; sk.fillStyle = '#fff'; sk.lineWidth = 2;
    CONN.forEach(c => { sk.beginPath(); sk.moveTo(lm[c[0]].x * 320, lm[c[0]].y * 240); sk.lineTo(lm[c[1]].x * 320, lm[c[1]].y * 240); sk.stroke(); });
    lm.forEach(p => { sk.beginPath(); sk.arc(p.x * 320, p.y * 240, 2.5, 0, 6.3); sk.fill(); });
  });
}

export async function startHands() {
  try {
    const st = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
    vid.srcObject = st; await vid.play(); pip.style.display = 'block';
    if (typeof Hands === 'undefined') throw new Error('hands lib');
    const m = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}` });
    m.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: .6, minTrackingConfidence: .6 });
    m.onResults(onResults);
    await Promise.race([m.initialize(), new Promise((_, j) => setTimeout(() => j(new Error('timeout')), 25000))]);
    camMode = true; let busy = false;
    (async function pump() {
      if (vid.readyState >= 2 && !busy) { busy = true; try { await m.send({ image: vid }); } catch (e) { /* skip frame */ } busy = false; }
      requestAnimationFrame(pump);
    })();
    return true;
  } catch (e) { pip.style.display = 'none'; return false; }
}

export function initMouse(el) {
  const ok = e => !e.target.closest('button,a');
  el.addEventListener('pointermove', e => {
    if (camMode || !ok(e)) return;
    const b = el.getBoundingClientRect(), h = hands[0]; h.tx = e.clientX - b.left; h.ty = e.clientY - b.top;
    if (!h.on) { h.x = h.tx; h.y = h.ty; h.on = true; h.to = 1; } h.seen = 1e12;
  });
  el.addEventListener('pointerleave', () => { if (!camMode) hands[0].on = false; });
  el.addEventListener('pointerdown', e => { if (!camMode && ok(e)) hands[0].to = 0; });
  addEventListener('pointerup', () => { if (!camMode) hands[0].to = 1; });
}

// two-hand pinch zooms, any pinch moves the camera up or down
export function updateGestures() {
  const pn = hands.filter(h => h.on && h.pinch), n = pn.length;
  if (n && n === nav.n) {
    const my = pn.reduce((s, h) => s + h.y, 0) / n;
    nav.camYT = clamp(nav.camYT - (my - nav.m) * .012, -1.2, 5); nav.m = my;
    if (n === 2) { const d = Math.hypot(pn[0].x - pn[1].x, pn[0].y - pn[1].y); nav.zoomT = clamp(nav.zoomT - (d - nav.d) * .014, 2.6, 11); nav.d = d; }
  } else if (n) {
    nav.m = pn.reduce((s, h) => s + h.y, 0) / n;
    if (n === 2) nav.d = Math.hypot(pn[0].x - pn[1].x, pn[0].y - pn[1].y);
  }
  nav.n = n;
}

// microphone
let ac, analyser, buf, base = 0, cal = 0, level = 0, manualUntil = 0;
export async function startMic() {
  const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  ac = new (window.AudioContext || window.webkitAudioContext)(); ac.resume();
  analyser = ac.createAnalyser(); analyser.fftSize = 1024; ac.createMediaStreamSource(st).connect(analyser);
  buf = new Uint8Array(analyser.fftSize);
}
export function micLevel() {
  let l = 0;
  if (analyser) {
    analyser.getByteTimeDomainData(buf);
    let s = 0; for (const v of buf) { const x = (v - 128) / 128; s += x * x; }
    const rms = Math.sqrt(s / buf.length);
    if (cal < 40) { base = (base * cal + rms) / (cal + 1); cal++; } else l = clamp((rms - base * 1.4 - .015) / .12, 0, 1);
  }
  level += (l - level) * .5;
  return Math.max(level, performance.now() < manualUntil ? 1 : 0);
}
export const manualBlow = () => { manualUntil = performance.now() + 700; };
export const resumeAudio = () => { if (ac && ac.state !== 'running') ac.resume(); };
