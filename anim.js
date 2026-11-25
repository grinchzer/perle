/* Perle : animations sobres (recherche, attente, montant, confirmation). Sans dépendance. */
(function () {
  'use strict';
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // comptes à rebours : <span class="u-cd" data-until="timestamp ms">
  function tick() {
    var l = document.querySelectorAll('.u-cd[data-until]'), i, s;
    for (i = 0; i < l.length; i++) {
      s = Math.max(0, Math.round((+l[i].getAttribute('data-until') - Date.now()) / 1000));
      l[i].textContent = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60);
    }
    // anneau de temps restant (demande à accepter côté coiffeuse)
    var r = document.querySelectorAll('.u-ring[data-until]');
    for (i = 0; i < r.length; i++) {
      var a = +r[i].getAttribute('data-from'), b = +r[i].getAttribute('data-until'), left = Math.max(0, b - Date.now()), f = b > a ? left / (b - a) : 0;
      var c = r[i].querySelector('.u-ring-p'), t = r[i].querySelector('.u-ring-t');
      if (c) c.style.strokeDashoffset = (163.4 * (1 - f)).toFixed(1);
      r[i].classList.toggle('low', left < 3 * 36e5);
      if (t) { var h = Math.floor(left / 36e5), m = Math.floor(left % 36e5 / 6e4); t.innerHTML = h >= 2 ? '<b>' + h + ' h</b>restantes' : '<b>' + Math.floor(left / 6e4) + ' min</b>restantes'; }
    }
    // une petite vibration à l'arrivée d'une nouvelle demande (une fois par demande)
    var q = document.querySelectorAll('.u-req[data-req]');
    for (i = 0; i < q.length; i++) {
      var id = 'perle-buzz-' + q[i].getAttribute('data-req'), done = true;
      try { done = !!sessionStorage.getItem(id); if (!done) sessionStorage.setItem(id, '1'); } catch (e) {}
      if (!done && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate([12, 60, 12]); } catch (e) {}
    }
  }
  setInterval(tick, 1000);
  try { var mo, pend = 0; mo = new MutationObserver(function () { if (pend) return; pend = 1; requestAnimationFrame(function () { pend = 0; tick(); }); }); document.addEventListener('DOMContentLoaded', function () { mo.observe(document.body, { childList: true, subtree: true }); tick(); }); } catch (e) {}
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
    if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate(15); } catch (e) {}
  }

  // ----- trajet animé du jour J (carte du suivi) : ligne qui se trace, point qui avance, durée, heure de départ -----
  function km(a, b) { var R = Math.PI / 180, x = Math.sin((b.lat - a.lat) * R / 2), y = Math.sin((b.lng - a.lng) * R / 2); return 12742 * Math.asin(Math.sqrt(x * x + Math.cos(a.lat * R) * Math.cos(b.lat * R) * y * y)); }
  function etaMin(k) { return Math.max(3, Math.min(90, Math.round(k * 4.5 + 4))); }   // même estimation que « Je suis en route »
  function hm(d) { return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  function trip(L, m, b, dir, root) {
    var box = m.getContainer(), dest = { lat: b.pro_lat, lng: b.pro_lng };
    var start = new Date(b.starts_at).getTime() + (b.pro_delay_min || 0) * 60000;
    if (Date.now() >= start) return;
    var chip = document.createElement('div'); chip.className = 'u-eta'; box.appendChild(chip);
    function ask() {
      chip.innerHTML = '<button type="button" class="u-eta-b">Voir mon trajet</button>';
      chip.firstChild.addEventListener('click', function (e) {
        e.stopPropagation(); if (!navigator.geolocation) return;
        chip.firstChild.textContent = 'Calcul du trajet…';
        // position lue une seule fois, gardée en mémoire le temps de la session, jamais envoyée
        navigator.geolocation.getCurrentPosition(function (p) { dir.me = { lat: p.coords.latitude, lng: p.coords.longitude }; draw(dir.me); },
          function () { chip.innerHTML = '<span class="u-eta-e">Position indisponible</span>'; }, { timeout: 8000, maximumAge: 120000 });
      });
    }
    function draw(me) {
      var k = km(me, dest);
      if (k > 80) { chip.innerHTML = '<span class="u-eta-e">Tu es loin du salon</span>'; return; }
      var eta = etaMin(k), leave = new Date(start - (eta + 5) * 60000), now = Date.now();
      var top = b.client_onway ? 'Arrivée vers ' + hm(new Date(now + eta * 60000)) : leave.getTime() <= now ? 'Pars maintenant' : 'Pars à ' + hm(leave);
      chip.innerHTML = '<b>' + eta + ' min</b><span>' + top + '</span>';
      // tracé en arc entre toi et le salon (à vol d'oiseau : l'itinéraire exact reste dans « Itinéraire »)
      var A = [me.lat, me.lng], B = [dest.lat, dest.lng], dx = B[1] - A[1], dy = B[0] - A[0], C = [(A[0] + B[0]) / 2 + dx * 0.18, (A[1] + B[1]) / 2 - dy * 0.18], pts = [];
      for (var i = 0; i <= 48; i++) { var t = i / 48, u = 1 - t; pts.push([u * u * A[0] + 2 * u * t * C[0] + t * t * B[0], u * u * A[1] + 2 * u * t * C[1] + t * t * B[1]]); }
      L.polyline(pts, { color: '#150B1F', weight: 4, opacity: .25, dashArray: '1 10', lineCap: 'round', interactive: false }).addTo(m);
      var line = L.polyline([A], { color: '#150B1F', weight: 5, lineCap: 'round', interactive: false }).addTo(m);
      L.circleMarker(A, { radius: 7, color: '#fff', weight: 3, fillColor: '#150B1F', fillOpacity: 1, interactive: false }).addTo(m);
      L.circleMarker(B, { radius: 11, color: '#fff', weight: 4, fillColor: '#5B2A86', fillOpacity: 1, interactive: false }).addTo(m);
      var dot = L.circleMarker(A, { radius: 8, color: '#fff', weight: 3, fillColor: '#5B2A86', fillOpacity: 1, interactive: false });
      try { m.fitBounds(L.latLngBounds([A, B]), { paddingTopLeft: [40, 80], paddingBottomRight: [40, 70], maxZoom: 16 }); } catch (e) {}
      if (reduce) { line.setLatLngs(pts); return; }
      var t0 = 0;
      (function grow(ts) {
        if (!document.body.contains(box)) return;
        if (!t0) t0 = ts; var k2 = Math.min(1, (ts - t0) / 1100), n = Math.max(1, Math.round(k2 * 48));
        line.setLatLngs(pts.slice(0, n + 1));
        if (k2 < 1) return requestAnimationFrame(grow);
        dot.addTo(m); var t1 = 0;
        (function move(ts2) {
          if (!document.body.contains(box)) return;
          if (!t1) t1 = ts2; var c = ((ts2 - t1) % 4800) / 4000, e = c >= 1 ? 1 : c < .5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2, f = e * 48, j = Math.min(47, Math.floor(f)), r = f - j;
          dot.setLatLng([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * r, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * r]);
          requestAnimationFrame(move);
        })(ts);
      })(performance.now());
    }
    if (dir.me) draw(dir.me); else ask();
  }
  window.UA = { count: count, confirm: confirm, trip: trip };
})();
