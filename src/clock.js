const DOB = new Date(2005, 9, 16, 0, 0, 0);
const els = [...document.querySelectorAll('[data-u]')];
const pad = n => String(n).padStart(2, '0');
const at = (y, m = 0) => new Date(DOB.getFullYear() + y, DOB.getMonth() + m, DOB.getDate());
function parts(now) {
  let y = now.getFullYear() - DOB.getFullYear();
  if (at(y) > now) y--;
  let m = 0;
  while (at(y, m + 1) <= now) m++;
  const ms = now - at(y, m);
  return { y, m, d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, i: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 };
}
export function startClock() {
  const tick = () => {
    const p = parts(new Date());
    els.forEach(e => {
      const v = pad(p[e.dataset.u]);
      if (e.textContent !== v) {
        e.textContent = v;
        e.classList.remove('t'); void e.offsetWidth; e.classList.add('t');
      }
    });
  };
  tick();
  setInterval(tick, 250);
}
