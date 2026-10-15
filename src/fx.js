const cv = document.getElementById('fx'), g = cv.getContext('2d');
const COLORS = ['#ff7a9a', '#ffb3c6', '#ffd36e', '#fff1ec', '#ff4d6d'];
let ps = [], running = false, last = 0;
function size() { const d = Math.min(devicePixelRatio, 2); cv.width = innerWidth * d; cv.height = innerHeight * d; g.setTransform(d, 0, 0, d, 0, 0); }
addEventListener('resize', size); size();

function heart(x, y, s) {
  g.beginPath(); g.moveTo(x, y + s * .35);
  g.bezierCurveTo(x - s, y - s * .35, x - s * .55, y - s * 1.05, x, y - s * .45);
  g.bezierCurveTo(x + s * .55, y - s * 1.05, x + s, y - s * .35, x, y + s * .35); g.fill();
}
export function emit(x, y, n, kind) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, h = kind === 'heart', v = h ? 1.5 + Math.random() * 3.5 : .3 + Math.random() * .8;
    ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (h ? 1.5 : .2), life: 1, d: .7 + Math.random() * .8, s: h ? 6 + Math.random() * 8 : 1.5 + Math.random() * 2.5, c: COLORS[i % COLORS.length], h });
  }
  if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
}
function tick(now) {
  const dt = Math.min((now - last) / 1e3, .05), f = dt * 60; last = now;
  g.clearRect(0, 0, innerWidth, innerHeight);
  ps = ps.filter(p => (p.life -= dt / p.d) > 0);
  for (const p of ps) {
    p.x += p.vx * f; p.y += p.vy * f; p.vx *= .985; p.vy += (p.h ? .06 : .01) * f;
    g.globalAlpha = Math.min(1, p.life * 1.4); g.fillStyle = p.c;
    g.globalCompositeOperation = p.h ? 'source-over' : 'lighter';
    if (p.h) heart(p.x, p.y, p.s); else { g.beginPath(); g.arc(p.x, p.y, p.s * p.life, 0, 6.283); g.fill(); }
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  if (ps.length) requestAnimationFrame(tick); else running = false;
}

// sparkle trail and click hearts
let lx = 0, ly = 0;
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || Math.hypot(e.clientX - lx, e.clientY - ly) < 12) return;
  lx = e.clientX; ly = e.clientY; emit(lx, ly, 1, 'spark');
});
addEventListener('pointerdown', e => { if (!e.target.closest('button,a')) emit(e.clientX, e.clientY, 8, 'heart'); });

// floating hearts behind the photo heart
const love = document.getElementById('love');
for (let i = 0; i < 16; i++) {
  const s = document.createElement('span'); s.className = 'fl'; s.textContent = '♥';
  s.style.cssText = `left:${Math.random() * 100}%;font-size:${12 + Math.random() * 22}px;animation-duration:${9 + Math.random() * 9}s;animation-delay:${-Math.random() * 14}s;--rise:-110vh`;
  love.prepend(s);
}

// photo hearts: tilt, shine, open full picture
const lb = document.getElementById('lightbox'), lbImg = lb.querySelector('img');
document.querySelectorAll('.q').forEach(q => {
  const t = q.closest('.tile');
  q.addEventListener('pointermove', e => {
    const b = q.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
    t.style.setProperty('--ry', (x - .5) * 14 + 'deg'); t.style.setProperty('--rx', (.5 - y) * 14 + 'deg');
    q.style.setProperty('--mx', x * 100 + '%'); q.style.setProperty('--my', y * 100 + '%');
  });
  q.addEventListener('pointerleave', () => { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); });
  q.addEventListener('click', e => { emit(e.clientX, e.clientY, 22, 'heart'); lbImg.src = q.dataset.full; lb.hidden = false; });
});
lb.addEventListener('click', () => { lb.hidden = true; });
addEventListener('keydown', e => { if (e.key === 'Escape') lb.hidden = true; });

// scroll progress
const bar = document.getElementById('bar');
addEventListener('scroll', () => { bar.style.transform = `scaleX(${scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)})`; }, { passive: true });
