/* Perle : animations sobres (recherche, attente, montant, confirmation). Sans dépendance. */
(function () {
  'use strict';
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // comptes à rebours : <span class="u-cd" data-until="timestamp ms">
  setInterval(function () {
    var l = document.querySelectorAll('.u-cd[data-until]');
    for (var i = 0; i < l.length; i++) {
      var s = Math.max(0, Math.round((+l[i].getAttribute('data-until') - Date.now()) / 1000));
      l[i].textContent = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60);
    }
  }, 1000);
  // montant qui défile de 0 jusqu'à la valeur
  function count(el, v, fmt) {
    if (!el) return;
    if (reduce || !window.requestAnimationFrame) { el.textContent = fmt(v); return; }
    var t0 = 0;
    function step(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(k < 1 ? Math.round(v * e) : v);
      if (k < 1) requestAnimationFrame(step);
    }
    el.textContent = fmt(0); requestAnimationFrame(step);
  }
  // écran plein « C'est confirmé », une seule fois par rendez-vous
  function confirm(list, fmtWhen) {
    if (!list || !list.length || document.querySelector('.u-ok')) return;
    var seen = [];
    try { seen = JSON.parse(localStorage.getItem('perle-conf-vu') || '[]'); } catch (e) {}
    var b = list.filter(function (x) { return x.status === 'confirme' && new Date(x.starts_at).getTime() > Date.now() && seen.indexOf(x.ref) < 0; })[0];
    if (!b) return;
    seen.push(b.ref);
    try { localStorage.setItem('perle-conf-vu', JSON.stringify(seen.slice(-30))); } catch (e) {}
    var d = document.createElement('div');
    d.className = 'u-ok'; d.setAttribute('role', 'status');
    d.innerHTML = '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="48" transform="rotate(-90 60 60)"/><path d="M38 62 L54 77 L84 45"/></svg>' +
      '<h2>C’est confirmé</h2><p></p><button type="button">OK</button>';
    d.querySelector('p').textContent = fmtWhen(b);
    function close() { d.classList.add('out'); setTimeout(function () { d.remove(); }, 300); }
    d.addEventListener('click', close);
    document.body.appendChild(d);
    setTimeout(close, 3600);
    if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) {}
  }
  window.UA = { count: count, confirm: confirm };
})();
