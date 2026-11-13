// Page de réservation d'une coiffeuse : /son-lien (ou /?c=son-lien)
(function () {
  var S = Perle.store, U = Perle.U, esc = U.esc;
  var app = document.getElementById('app'), bar = document.getElementById('bar'), barA = document.getElementById('barA'), barB = document.getElementById('barB'), barBtn = document.getElementById('barBtn');
  var slug = (new URLSearchParams(location.search).get('c') || ((window.PERLE || {}).LIENS_COURTS ? decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, '')) : '') || '').toLowerCase();
  if (slug === 'index.html') slug = '';
  var st = { pro: null, svcs: [], svc: null, choices: [], day: null, time: null, busy: [], step: 'home', done: null };
  var ARROW = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var BACK = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';

  function top(back) {
    return '<div class="top">' + (back ? '<button class="round" data-go="' + back + '" aria-label="Retour">' + BACK + '</button>' : '<a class="logo" href="./">perle</a>') + (S.live ? '' : '<span class="badge">Mode essai</span>') + '</div>';
  }
  function setBar(a, b, label, fn, disabled) {
    if (!label) { bar.hidden = true; return; }
    bar.hidden = false; barA.textContent = a; barB.textContent = b; barBtn.innerHTML = esc(label) + ARROW; barBtn.disabled = !!disabled; barBtn.onclick = fn;
  }
  function q() { return U.quote(st.svc, st.choices); }
  function dep(p) { return Math.round(p * st.pro.deposit_pct) / 100; }

  // ----- créneaux libres d'un jour -----
  function slotsFor(d) {
    var out = [], ranges = (st.pro.hours || {})[String(d.getDay())] || [], step = st.pro.slot_step || 30, need = q().minutes, min = Date.now() + 36e5;
    ranges.forEach(function (r) {
      var a = r[0].split(':'), b = r[1].split(':');
      var open = new Date(d.getFullYear(), d.getMonth(), d.getDate(), +a[0], +a[1]), close = new Date(d.getFullYear(), d.getMonth(), d.getDate(), +b[0], +b[1]);
      for (var t = open.getTime(); t + need * 6e4 <= close.getTime(); t += step * 6e4) {
        if (t < min) continue;
        var e = t + need * 6e4;
        if (st.busy.some(function (x) { return new Date(x.ends_at).getTime() > t && new Date(x.starts_at).getTime() < e; })) continue;
        out.push(new Date(t));
      }
    });
    return out;
  }
  function days() { var a = [], n = new Date(); for (var i = 0; i < 28; i++) a.push(new Date(n.getFullYear(), n.getMonth(), n.getDate() + i)); return a; }

  // ----- écrans -----
  function home() {
    var p = st.pro, h = top() + '<h1>' + esc(p.name) + '</h1>';
    h += '<p class="sub">' + esc([p.city, p.bio].filter(Boolean).join(' · ')) + '</p>';
    h += '<h2>Choisis ta prestation</h2>';
    if (!st.svcs.length) h += '<p class="note info">Aucune prestation en ligne pour l’instant.</p>';
    st.svcs.forEach(function (s, i) {
      var from = (s.options || []).length ? 'dès ' : '';
      h += '<button class="svc" data-svc="' + i + '"><span class="grow"><span class="b">' + esc(s.name) + '</span><br><span class="mut">Environ ' + U.dur(s.minutes) + '</span></span><span class="big">' + from + U.eur(s.price) + '</span></button>';
    });
    h += '<p class="note info">Tu bloques ta place avec un acompte de ' + p.deposit_pct + ' %. Le reste se règle sur place.</p>';
    h += '<p class="foot">Page de réservation créée avec Perle. Ton prénom et ton numéro servent seulement à ce rendez-vous.</p>';
    app.innerHTML = h; setBar();
  }
  function options() {
    var s = st.svc, h = top('home') + '<h1>' + esc(s.name) + '</h1><p class="sub">Chez ' + esc(st.pro.name) + ', à partir de ' + U.eur(s.price) + '</p>';
    (s.options || []).forEach(function (g, gi) {
      h += '<h2>' + esc(g.group) + '</h2><div class="pills" role="group" aria-label="' + esc(g.group) + '">';
      (g.choices || []).forEach(function (c, ci) {
        h += '<button class="pill" aria-pressed="' + ((st.choices[gi] || 0) === ci) + '" data-g="' + gi + '" data-c="' + ci + '">' + esc(c.label) + (Number(c.plus) ? '<small>+' + U.eur(c.plus) + '</small>' : '') + '</button>';
      });
      h += '</div>';
    });
    if (!(s.options || []).length) h += '<p class="note info">Pas d’option à choisir pour cette prestation.</p>';
    app.innerHTML = h;
    var x = q(); setBar(U.eur(x.price), 'environ ' + U.dur(x.minutes), 'Choisir le créneau', function () { go('slot'); });
  }
  function slot() {
    var x = q(), ds = days(), h = top('options') + '<h1>Ton <span class="hl">créneau</span>.</h1><p class="sub">' + esc(st.svc.name) + (x.text ? ', ' + esc(x.text) : '') + ', environ ' + U.dur(x.minutes) + '</p><h2>Quel jour ?</h2><div class="days">';
    if (!st.day || !slotsFor(st.day).length) { st.day = ds.filter(function (d) { return slotsFor(d).length; })[0] || null; st.time = null; }
    ds.forEach(function (d, i) {
      var free = slotsFor(d).length > 0;
      h += '<button class="dayb" data-day="' + i + '" aria-pressed="' + (st.day && +st.day === +d) + '"' + (free ? '' : ' disabled') + ' aria-label="' + esc(U.day(d)) + (free ? '' : ', complet') + '"><span>' + d.toLocaleDateString('fr-FR', { weekday: 'short' }) + '</span><b>' + d.getDate() + '</b></button>';
    });
    h += '</div>';
    if (!st.day) h += '<p class="note info">Plus de créneau libre dans les 4 prochaines semaines.</p>';
    else {
      h += '<h2>' + esc(U.day(st.day)) + ', à quelle heure ?</h2><div class="times">';
      slotsFor(st.day).forEach(function (t) { h += '<button class="time" data-time="' + t.getTime() + '" aria-pressed="' + (st.time && +st.time === +t) + '">' + U.hm(t) + '</button>'; });
      h += '</div>';
    }
    app.innerHTML = h;
    var end = st.time ? new Date(st.time.getTime() + x.minutes * 6e4) : null;
    setBar(st.time ? U.hm(st.time) : U.eur(x.price), st.time ? 'fin vers ' + U.hm(end) : 'choisis une heure', 'Continuer', function () { go('me'); }, !st.time);
  }
  function me() {
    var x = q(), d = dep(x.price), saved = {}; try { saved = JSON.parse(localStorage.getItem('perle-moi') || '{}'); } catch (e) { }
    var h = top('slot') + '<h1>Tu paies <span class="hl">' + U.eur(d) + '</span> d’acompte.</h1>';
    h += '<div class="card" style="margin-top:16px"><div class="line"><span class="mut">' + esc(U.day(st.time)) + '</span><span class="b">' + U.hm(st.time) + '</span></div><div class="line"><span class="mut">' + esc(st.svc.name) + (x.text ? ', ' + esc(x.text) : '') + '</span><span class="b">' + U.eur(x.price) + '</span></div><div class="line"><span class="mut">Acompte de ' + st.pro.deposit_pct + ' %</span><span class="b">' + U.eur(d) + '</span></div><div class="line t"><span>À régler sur place</span><span>' + U.eur(x.price - d) + '</span></div></div>';
    h += '<label for="fn">Ton prénom</label><input id="fn" type="text" autocomplete="given-name" maxlength="40" value="' + esc(saved.n || '') + '">';
    h += '<label for="ft">Ton numéro de téléphone</label><input id="ft" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" placeholder="06 12 34 56 78" value="' + esc(saved.t || '') + '">';
    h += '<label for="fm">Un mot pour ' + esc(st.pro.name) + ' (facultatif)</label><textarea id="fm" maxlength="300"></textarea>';
    h += '<div id="err"></div><p class="mut" style="margin-top:14px">L’acompte se paie directement à ' + esc(st.pro.name) + ', à l’étape suivante. Ta place est confirmée à réception.</p>';
    app.innerHTML = h;
    setBar(U.eur(d), 'acompte', 'Réserver', submit);
  }
  async function submit() {
    var n = document.getElementById('fn').value, t = document.getElementById('ft').value, m = document.getElementById('fm').value, er = document.getElementById('err');
    barBtn.disabled = true; er.innerHTML = '';
    try {
      var r = await S.book({ slug: slug, service: st.svc.id, choices: st.choices, start: st.time.toISOString(), name: n, phone: t, note: m });
      try { localStorage.setItem('perle-moi', JSON.stringify({ n: n, t: t })); } catch (e) { }
      st.done = r; go('done');
    } catch (e) {
      er.innerHTML = '<p class="note err" role="alert">' + esc(U.msg(e)) + '</p>'; barBtn.disabled = false;
      if (/PRIS|HORAIRES|DATE/.test(e.message)) { st.time = null; await loadBusy(); }
    }
  }
  function done() {
    var r = st.done, p = st.pro, s = new Date(r.starts_at), pay = p.pay_info || '', url = (pay.match(/https?:\/\/\S+/) || [])[0];
    var h = top() + '<h1>Presque fini.<br>Envoie <span class="hl">' + U.eur(r.deposit) + '</span>.</h1>';
    h += '<div class="vio" style="margin-top:16px"><span class="mut">Ta référence, à indiquer avec le paiement</span><div class="ref">' + esc(r.ref) + '</div><div style="margin-top:10px">' + esc(r.service) + (r.options ? ', ' + esc(r.options) : '') + '<br>' + esc(U.day(s)) + ' à ' + U.hm(s) + '</div></div>';
    h += '<h2>Comment payer l’acompte</h2><div class="card">' + (pay ? esc(pay) : 'Écris à ' + esc(p.name) + ' pour régler l’acompte.') + '</div>';
    if (url) h += '<a class="btn" style="margin-top:10px" href="' + esc(url) + '" target="_blank" rel="noopener">Payer ' + U.eur(r.deposit) + ARROW + '</a>';
    if (p.whatsapp) { var w = p.whatsapp.replace(/[^0-9]/g, '').replace(/^0/, '33'); h += '<a class="btn ghost" style="margin-top:10px" target="_blank" rel="noopener" href="https://wa.me/' + w + '?text=' + encodeURIComponent('Bonjour, j’ai réservé ' + r.service + ' le ' + U.day(s) + ' à ' + U.hm(s) + ' (référence ' + r.ref + '). Je t’envoie l’acompte de ' + U.eur(r.deposit) + '.') + '">Prévenir sur WhatsApp</a>'; }
    h += '<p class="note info">' + esc(p.name) + ' confirme ton rendez-vous dès réception de l’acompte. Il restera ' + U.eur(r.price - r.deposit) + ' à régler sur place. Garde cette page ou fais une capture d’écran.</p>';
    app.innerHTML = h; setBar();
  }
  function landing() {
    app.innerHTML = top() + '<h1>Ton lien de <span class="hl">réservation</span>.</h1><p class="sub">Tes prestations, tes prix selon les options, tes créneaux, et un acompte pour bloquer chaque rendez-vous.</p><a class="btn" style="margin-top:22px" href="pro.html">Je coiffe, je crée ma page' + ARROW + '</a>' + (S.live ? '' : '<a class="btn ghost" style="margin-top:10px" href="./?c=awabraids">Voir une page d’exemple</a>');
    setBar();
  }
  function missing() { app.innerHTML = top() + '<h1>Cette page n’existe pas.</h1><p class="sub">Vérifie le lien que la coiffeuse t’a envoyé.</p>'; setBar(); }

  var SCREENS = { home: home, options: options, slot: slot, me: me, done: done };
  function go(step) { st.step = step; SCREENS[step](); window.scrollTo(0, 0); }
  async function loadBusy() {
    try { st.busy = await S.busy(slug, new Date().toISOString(), new Date(Date.now() + 29 * 864e5).toISOString()) || []; } catch (e) { st.busy = []; }
    if (st.step === 'slot') slot();
  }

  app.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.go) return go(b.dataset.go);
    if (b.dataset.svc) { st.svc = st.svcs[+b.dataset.svc]; st.choices = (st.svc.options || []).map(function () { return 0; }); st.time = null; return go('options'); }
    if (b.dataset.g) { st.choices[+b.dataset.g] = +b.dataset.c; st.time = null; return options(); }
    if (b.dataset.day) { st.day = days()[+b.dataset.day]; st.time = null; return slot(); }
    if (b.dataset.time) { st.time = new Date(+b.dataset.time); return slot(); }
  });

  (async function () {
    if (!slug) return landing();
    try {
      st.pro = await S.getPro(slug);
      if (!st.pro) return missing();
      document.title = 'Réserver chez ' + st.pro.name + ' · Perle';
      st.svcs = await S.services(st.pro.id) || [];
      await loadBusy(); go('home');
    } catch (e) { app.innerHTML = top() + '<p class="note err" role="alert">Impossible de charger la page. Vérifie ta connexion et recharge.</p>'; }
  })();
})();
