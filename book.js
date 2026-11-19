// Page de réservation d'une coiffeuse : ?c=son-lien
(function () {
  var S = Perle.store, U = Perle.U, esc = U.esc;
  var app = document.getElementById('app'), bar = document.getElementById('bar'), barA = document.getElementById('barA'), barB = document.getElementById('barB'), barBtn = document.getElementById('barBtn');
  var slug = (window.PERLE_SLUG != null ? window.PERLE_SLUG : new URLSearchParams(location.search).get('c') || ((window.PERLE || {}).LIENS_COURTS ? decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, '')) : '') || '').toLowerCase();
  if (slug === 'index.html') slug = '';
  var st = { pro: null, svcs: [], svc: null, choices: [], wantDay: null, wantT: null, day: null, time: null, busy: [], step: 'home', done: null, tab: 'svc' };
  function svg(p, s, w) { return '<svg aria-hidden="true" width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }
  var I = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', back: '<path d="M15 6l-6 6 6 6"/>', pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>',
    euro: '<path d="M17 6.500A6.500 6.500 0 1 0 17 17.500M4 10.500h9M4 13.500h9"/>', shield: '<path d="M12 3l7 3v5.500c0 4.500-3 7.800-7 9.500-4-1.700-7-5-7-9.500V6z"/><path d="M9 12l2 2 4-4"/>',
    msg: '<path d="M4 12a8 8 0 1 1 3.500 6.600L4 20l1.200-3.500A7.900 7.900 0 0 1 4 12z"/>', photo: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
    check: '<path d="M5 12.500l4.500 4.500L19 7.500"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>', clock: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>'
  };
  var ARROW = svg(I.arrow, 18, 2.2);
  // boutons de paiement : un par lien trouvé dans les consignes de la coiffeuse
  function calBtn(o, cls, st2) { return '<a class="' + cls + '"' + (st2 ? ' style="' + st2 + '"' : '') + ' href="' + U.ics(o) + '" download="perle-' + esc(o.ref) + '.ics">' + svg(I.cal, 18) + 'Ajouter à mon agenda</a>'; }
  function payLinks(pay) { return (String(pay || '').match(/https?:\/\/\S+/g) || []).slice(0, 3); }
  function payText(pay) { return String(pay || '').replace(/https?:\/\/\S+/g, '').replace(/\n{2,}/g, '\n').trim(); }
  function payBtn(u, dep, first, mt) {
    var pp = /^https?:\/\/(?:www\.)?paypal\.(?:me|com\/paypalme)\/[\w.-]+\/?$/i.test(u), rv = /^https?:\/\/(?:www\.)?revolut\.me\//i.test(u);
    var href = pp ? u.replace(/\/$/, '') + '/' + (Math.round(dep * 100) / 100) + 'EUR' : u;
    return '<a class="btn' + (first ? '' : ' glass') + '" style="margin-top:' + mt + 'px' + (first ? '' : ';border-radius:28px') + '" href="' + esc(href) + '" target="_blank" rel="noopener">Payer ' + U.eur(dep) + (pp ? ' avec PayPal' : rv ? ' avec Revolut' : '') + ARROW + '</a>';
  }


  function badge() { return S.live ? '' : '<span class="badge">Mode essai</span>'; }
  function stepn() { var seq = (st.svc && (st.svc.options || []).length ? ['options'] : []).concat(['slot', 'me']), i = seq.indexOf(st.step); return i < 0 ? '' : '<span class="stepn">Étape ' + (i + 1) + ' sur ' + seq.length + '</span>'; }
  function top(back) { return '<div class="top">' + (back ? '<button class="round" data-go="' + back + '" aria-label="Retour">' + svg(I.back, 20) + '</button>' : U.logo()) + stepn() + badge() + '</div>'; }
  var barT;
  function setBarA(a) {
    a = String(a); var o = barA.textContent, re = /\d+(?:[.,]\d+)?/, mo = o.match(re), mn = a.match(re); cancelAnimationFrame(barT);
    if (!mo || !mn || mo[0] === mn[0] || o.replace(re, '#') !== a.replace(re, '#') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) { barA.textContent = a; return; }
    var f = parseFloat(mo[0].replace(',', '.')), t = parseFloat(mn[0].replace(',', '.')), t0 = null;
    barT = requestAnimationFrame(function tick(now) { if (t0 == null) t0 = now; var k = Math.min(1, (now - t0) / 260), v = f + (t - f) * (1 - Math.pow(1 - k, 3)); if (k < 1) { barA.textContent = a.replace(re, String(Math.round(v))); barT = requestAnimationFrame(tick); } else barA.textContent = a; });
  }
  function setBar(a, b, label, fn, disabled) {
    if (!label) { bar.hidden = true; return; }
    var wasH = bar.hidden; bar.hidden = false; if (wasH) barA.textContent = a; else setBarA(a); barB.textContent = b; barBtn.innerHTML = esc(label) + ARROW; barBtn.disabled = !!disabled; barBtn.onclick = fn;
  }
  function q() { return U.quote(st.svc, st.choices); }
  function dep(p) { return Math.round(p * st.pro.deposit_pct) / 100; }
  function photoOf(s) { return (s && s.photo_url) || st.pro.cover_url || ''; }
  function thumb(u, cls) { return u ? '<span class="thumb ph ' + (cls || '') + '" style="' + U.bg(u) + '"></span>' : '<span class="thumb empty ' + (cls || '') + '">' + svg(I.photo, 20) + '</span>'; }
  function wa() { return st.pro.whatsapp ? 'https://wa.me/' + st.pro.whatsapp.replace(/[^0-9]/g, '').replace(/^0/, '33') : ''; }
  function photos() { var a = []; if (st.pro.cover_url) a.push(st.pro.cover_url); st.svcs.forEach(function (s) { if (s.photo_url && a.indexOf(s.photo_url) < 0) a.push(s.photo_url); }); (st.pro.gallery || []).forEach(function (u) { if (a.indexOf(u) < 0) a.push(u); }); return a; }
  function openLine(p) {
    var n = new Date(), nowM = n.getHours() * 60 + n.getMinutes(), mm = function (s) { var x = String(s).split(':'); return +x[0] * 60 + +x[1]; }, lab = function (m) { return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + ('0' + m % 60).slice(-2) : ''); };
    for (var i = 0; i < 14; i++) { var d = new Date(n.getFullYear(), n.getMonth(), n.getDate() + i), ds = U.ymd(d); if ((p.closed || []).some(function (r) { return ds >= r[0] && ds <= r[1]; })) continue; var rg = ((p.hours || {})[String(d.getDay())] || []).map(function (r) { return [mm(r[0]), mm(r[1])]; }).sort(function (a, c) { return a[0] - c[0]; });
      for (var j = 0; j < rg.length; j++) { if (i === 0 && nowM >= rg[j][1]) continue; if (i === 0 && nowM >= rg[j][0]) return ['Ouvert aujourd’hui', ' jusqu’à ' + lab(rg[j][1])]; return [i === 0 ? 'Ouvre aujourd’hui' : i === 1 ? 'Ouvre demain' : 'Ouvre ' + d.toLocaleDateString('fr-FR', { weekday: 'long' }), ' à ' + lab(rg[j][0])]; } }
    return null;
  }
  function lead(a, b, cls) { return '<div class="lead' + (cls ? ' ' + cls : '') + '"><span>' + a + '</span><i></i><b>' + b + '</b></div>'; }
  function recap(price, rows) { var x = q(); return '<div class="tk"><div class="tk-top">' + thumb(photoOf(st.svc)) + '<span class="grow"><b>' + esc(st.svc.name) + '</b><span class="mut">' + esc([x.text, U.dur(x.minutes)].filter(Boolean).join(', ')) + '</span></span></div>' + (price || rows ? '<div class="tk-rows">' + (price ? lead('Prix de la coiffure', U.eur(x.price)) : '') + (rows || '') + '</div>' : '') + '</div>'; }

  // ----- créneaux libres d'un jour -----
  function slotsFor(d) { return U.slots(st.pro, q().minutes, d, st.busy); }
  function days() { var a = [], n = new Date(); for (var i = 0; i < 28; i++) a.push(new Date(n.getFullYear(), n.getMonth(), n.getDate() + i)); return a; }

  // ----- écrans -----
  function hero(u, back, extra) {
    return '<div class="hero ph" style="' + U.bg(u) + (u ? '' : ';background:radial-gradient(circle at 30% 12%,#5B2A86 0%,#2A1340 45%,#150B1F 75%)') + '"><div class="top">' + (back ? '<button class="round" data-go="' + back + '" aria-label="Retour">' + svg(I.back, 20) + '</button>' : U.logo()) + stepn() + badge() + '</div>' + (extra || '') + '</div>';
  }
  function home() {
    var p = st.pro, ph = photos(), prices = st.svcs.map(function (s) { return Number(s.price); });
    var h = hero(p.cover_url, null, (prices.length ? '<span class="fprice hp">' + (Math.min.apply(0, prices) === Math.max.apply(0, prices) ? '' : '<small>à partir de</small>') + U.eur(Math.min.apply(0, prices)) + '</span>' : '') + (ph.length > 1 ? '<span class="count">' + svg(I.photo, 14, 2.2) + ph.length + ' photos</span>' : '')) + '<div class="sheet"><div class="row">' + (p.avatar_url ? '<span class="ava ph" style="' + U.bg(p.avatar_url) + '"></span>' : '') + '<h1 class="grow">' + esc(p.name) + '</h1></div><div class="meta">';
    if (p.city) h += '<span>' + svg(I.pin, 16) + esc(p.city) + '</span>';
    if (p.instagram) h += '<a class="igl" href="https://www.instagram.com/' + encodeURIComponent(p.instagram) + '/" target="_blank" rel="noopener">@' + esc(p.instagram) + ' sur Instagram</a>';
    if (prices.length && Math.min.apply(0, prices) !== Math.max.apply(0, prices)) h += '<span>' + svg(I.euro, 16) + 'jusqu’à ' + U.eur(Math.max.apply(0, prices)) + '</span>';
    h += '</div>';
    if (p.bio) h += '<p class="sub">' + esc(p.bio) + '</p>';
    var op = openLine(p); if (op) h += '<p class="facts"><b>' + op[0] + '</b>' + op[1] + '</p>';
    if (p.created_at) { var since = new Date(p.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); h += '<p class="facts">Sur Perle depuis ' + esc(since) + (st.doneN > 0 ? ', ' + st.doneN + ' coiffure' + (st.doneN > 1 ? 's' : '') + ' réalisée' + (st.doneN > 1 ? 's' : '') + ' via Perle' : '') + '.</p>'; }
    h += favBtn(p.slug);
    h += '<p class="dpl">' + svg(I.shield, 16, 2) + '<span>Tu verses ' + p.deposit_pct + ' % à la réservation, le reste sur place.' + (p.whatsapp ? ' Répond sur WhatsApp.' : '') + '</span></p>';
    if (ph.length > 1) h += '<div class="tabs" role="tablist"><button class="tab" role="tab" aria-selected="' + (st.tab === 'svc') + '" data-tab="svc">Prestations</button><button class="tab" role="tab" aria-selected="' + (st.tab === 'ph') + '" data-tab="ph">Photos</button></div>';
    else st.tab = 'svc';
    h += '<div style="margin-top:14px">';
    if (st.tab === 'ph') { h += '<div class="gal">'; ph.forEach(function (u) { h += '<span class="ph" style="' + U.bg(u) + '"></span>'; }); h += '</div>'; }
    else {
      if (!st.svcs.length) h += '<p class="note info">Aucune prestation en ligne pour l’instant.</p>'; else h += '<p class="pk">Touche une coiffure pour choisir tes options et ton créneau.</p>';
      st.svcs.forEach(function (s, i) { h += '<button class="svc" data-svc="' + i + '">' + thumb(s.photo_url) + '<span class="grow"><span class="lead"><b>' + esc(s.name) + '</b><i></i><b>' + ((s.options || []).length ? 'dès ' : '') + U.eur(s.price) + '</b></span><span class="mut">Environ ' + U.dur(s.minutes) + '</span></span><span class="go" aria-hidden="true">' + ARROW + '</span></button>'; });
    }
    h += '</div>' + revsHtml() + '<p class="foot">Page créée avec Perle. <a href="legal.html">Mentions légales et confidentialité</a></p></div>';
    app.innerHTML = h;
    if (st.svcs.length) setBar(prices.length ? 'dès ' + U.eur(Math.min.apply(0, prices)) : '', st.svcs.length + ' prestation' + (st.svcs.length > 1 ? 's' : ''), 'Réserver', function () { if (st.svcs.length === 1) { pick(0); } else { st.tab = 'svc'; home(); var e = app.querySelector('.svc'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }); else setBar();
  }
  function pick(i, ch) { st.svc = st.svcs[i]; st.choices = (st.svc.options || []).map(function (g, k) { var c = ch ? parseInt(ch[k], 10) : 0; return c >= 0 && c < (g.choices || []).length ? c : 0; }); st.time = null; go('options'); }
  function options() {
    var s = st.svc, h = hero(photoOf(s), 'home') + '<div class="sheet"><h1>' + esc(s.name) + '</h1><p class="sub">Chez ' + esc(st.pro.name) + ', à partir de ' + U.eur(s.price) + '</p>';
    (s.options || []).forEach(function (g, gi) {
      h += '<h2>' + esc(g.group) + '</h2><div class="pills" role="group" aria-label="' + esc(g.group) + '">';
      (g.choices || []).forEach(function (c, ci) { h += '<button class="pill" aria-pressed="' + ((st.choices[gi] || 0) === ci) + '" data-g="' + gi + '" data-c="' + ci + '">' + esc(c.label) + (Number(c.plus) ? '<small>+' + U.eur(c.plus) + '</small>' : '') + '</button>'; });
      h += '</div>';
    });
    if (!(s.options || []).length) h += '<p class="note info">Pas d’option à choisir pour cette prestation.</p>';
    app.innerHTML = h + '</div>';
    var x = q(); setBar(U.eur(x.price), 'environ ' + U.dur(x.minutes), 'Choisir le créneau', function () { go('slot'); });
  }
  function slot() {
    var x = q(), ds = days(), h = top('options') + '<h1>Choisis ton créneau</h1>' + recap(false) + '<h2>Quel jour ?</h2><div class="days">';
    if (!st.day || !slotsFor(st.day).length) { var fr = ds.filter(function (d) { return slotsFor(d).length; }), wd = st.wantDay; st.day = (wd ? fr.slice().sort(function (a, c) { return Math.abs(a - wd) - Math.abs(c - wd); })[0] : fr[0]) || null; st.time = null; }
    if (st.wantT != null && st.day && !st.time) { st.time = slotsFor(st.day).filter(function (t) { return st.wantDay && +st.day === +st.wantDay && t.getHours() * 60 + t.getMinutes() === st.wantT; })[0] || null; st.wantT = null; }
    var moved = st.wantDay && st.day && +st.day !== +st.wantDay;
    ds.forEach(function (d, i) {
      var free = slotsFor(d).length > 0;
      h += '<button class="dayb" data-day="' + i + '" aria-pressed="' + (st.day && +st.day === +d) + '"' + (free ? '' : ' disabled') + ' aria-label="' + esc(U.day(d)) + (free ? '' : ', complet') + '"><span>' + d.toLocaleDateString('fr-FR', { weekday: 'short' }) + '</span><b>' + d.getDate() + '</b></button>';
    });
    h += '</div>';
    if (moved) h += '<p class="note info">Plus de place le ' + esc(U.day(st.wantDay)) + ' pour cette coiffure avec ces options. Voici le jour libre le plus proche.</p>';
    if (!st.day) h += '<p class="note info">Plus de créneau libre dans les 4 prochaines semaines.</p>';
    else {
      h += '<h2>' + esc(U.day(st.day)) + ', à quelle heure ?</h2><div class="times">';
      slotsFor(st.day).forEach(function (t) { h += '<button class="time" data-time="' + t.getTime() + '" aria-pressed="' + (st.time && +st.time === +t) + '">' + U.hm(t) + '<small>fin ' + U.hm(new Date(t.getTime() + x.minutes * 6e4)) + '</small></button>'; });
      h += '</div>';
    }
    if (st.pro.city) h += '<h2>Où ?</h2><div class="card row" style="border-radius:24px">' + svg(I.pin, 20) + '<span class="grow"><span class="b">Chez ' + esc(st.pro.name.split(' ')[0]) + ', ' + esc(st.pro.city) + '</span><br><span class="mut">Adresse précise donnée par message</span></span></div>';
    if (S.addAlert) h += '<div class="alertb"><b>Aucun créneau ne te va ?</b><p class="mut">Laisse ton e-mail : on te prévient dès qu’une place se libère chez ' + esc(st.pro.name.split(' ')[0]) + '.</p><div class="alrow"><label for="ale" class="sr">Ton e-mail</label><input id="ale" type="email" autocomplete="email" inputmode="email" maxlength="120" placeholder="Ton e-mail" value="' + esc(pme().e || '') + '"><button type="button" class="btn sm" data-alert="1">Me prévenir</button></div><p id="alm" class="mut" role="status" style="margin:8px 0 0"></p></div>';
    app.innerHTML = h;
    var end = st.time ? new Date(st.time.getTime() + x.minutes * 6e4) : null;
    setBar(st.time ? U.hm(st.time) : U.eur(x.price), st.time ? 'fin vers ' + U.hm(end) : 'choisis une heure', 'Continuer', function () { go('me'); }, !st.time);
  }
  function me() {
    var x = q(), d = dep(x.price), saved = {}; try { saved = JSON.parse(localStorage.getItem('perle-moi') || '{}'); } catch (e) { }
    var h = top('slot') + '<h1>Tu verses ' + U.eur(d) + ' maintenant, le reste sur place</h1>' + recap(false, lead(esc(U.day(st.time)), U.hm(st.time) + ' à ' + U.hm(new Date(st.time.getTime() + x.minutes * 6e4))) + lead('Prix de la coiffure', U.eur(x.price)) + lead('Acompte de ' + st.pro.deposit_pct + ' %, maintenant', U.eur(d)) + lead('À régler sur place', U.eur(x.price - d), 't'));
    h += '<label for="fn">Ton prénom</label><input id="fn" type="text" autocomplete="given-name" maxlength="40" value="' + esc(saved.n || '') + '">';
    h += '<label for="ft">Ton numéro de téléphone</label><input id="ft" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" placeholder="06 12 34 56 78" value="' + esc(saved.t || '') + '">';
    h += '<label for="fe">Ton e-mail (facultatif)</label><input id="fe" type="email" autocomplete="email" inputmode="email" maxlength="120" placeholder="Pour recevoir ta confirmation" value="' + esc(saved.e || '') + '">';
    h += '<details class="more"><summary>Ajouter un mot pour ' + esc(st.pro.name) + '</summary><textarea id="fm" maxlength="300" aria-label="Un mot pour ' + esc(st.pro.name) + '"></textarea></details>';
    h += '<div id="err"></div><p class="note ok" style="display:flex;gap:10px;align-items:flex-start">' + svg(I.shield, 20) + '<span>L’acompte se paie directement à ' + esc(st.pro.name) + ', à l’étape suivante. Ta place est confirmée à réception. Si tu annules, l’acompte n’est pas remboursé ; si c’est ' + esc(st.pro.name) + ' qui annule, il t’est rendu.</span></p><p class="mut" style="margin-top:10px;font-size:13px">Ton prénom et ton numéro servent seulement à ce rendez-vous.</p>';
    app.innerHTML = h;
    setBar(U.eur(d), 'acompte', 'Réserver', submit);
  }
  async function submit() {
    var n = document.getElementById('fn').value, t = document.getElementById('ft').value, m = document.getElementById('fm').value, er = document.getElementById('err'), em = ((document.getElementById('fe') || {}).value || '').trim();
    var old = document.getElementById('fer'); if (old) old.remove();
    var bad = !n.trim() ? ['fn', 'Écris ton prénom pour réserver.'] : t.replace(/\D/g, '').length < 9 ? ['ft', 'Écris ton numéro de téléphone : ' + st.pro.name + ' en a besoin pour te joindre.'] : null;
    if (bad) { var fe2 = document.getElementById(bad[0]); fe2.insertAdjacentHTML('afterend', '<p class="note err" id="fer" role="alert" style="margin-top:8px">' + bad[1] + '</p>'); fe2.focus(); fe2.scrollIntoView({ block: 'center' }); return; }
    barBtn.disabled = true; er.innerHTML = '';
    try {
      var r = await S.book({ slug: slug, service: st.svc.id, choices: st.choices, start: st.time.toISOString(), name: n, phone: t, note: m });
      try { localStorage.setItem('perle-moi', JSON.stringify({ n: n, t: t, e: em })); } catch (e) { }
      if (em && S.bookingEmail) { try { S.bookingEmail(r.ref, t, em).catch(function () { }); } catch (e) { } }
      try { var l = saved(); l.push({ ref: r.ref, phone: t }); localStorage.setItem('perle-rdv', JSON.stringify(l.slice(-20))); } catch (e) { }
      if (cu && S.claimRefs) S.claimRefs([{ ref: r.ref, phone: t }]).catch(function () { });
      r.name = n.trim(); r.phone = t; st.done = r; go('done');
    } catch (e) {
      er.innerHTML = '<p class="note err" role="alert">' + esc(U.msg(e)) + '</p>'; barBtn.disabled = false; er.scrollIntoView({ block: 'center' });
      if (/PRIS|HORAIRES|DATE/.test(e.message)) { st.time = null; await loadBusy(); }
    }
  }
  function done() {
    var r = st.done, p = st.pro, s = new Date(r.starts_at), pay = p.pay_info || '', links = payLinks(pay), ptx = payText(pay), w = wa();
    var h = '<div class="dark-screen" style="' + U.bg(photoOf(st.svc)) + '"><div class="top">' + U.logo() + badge() + '</div>';
    h += '<h1>Presque fini, ' + esc(r.name.split(' ')[0]) + '.<br>Envoie l’acompte.</h1>';
    h += '<div class="stub"><div><span>Acompte à envoyer</span><b>' + U.eur(r.deposit) + '</b></div><div><span>Référence à écrire</span><b class="ref">' + esc(r.ref) + '</b></div></div>';
    h += '<p class="soft dn-t">' + (links.length ? 'Touche un bouton pour payer chez ' + esc(p.name) + '. Écris <b>' + esc(r.ref) + '</b> dans le message du paiement.' : (ptx ? esc(ptx) : 'Écris à ' + esc(p.name) + ' pour régler l’acompte.')) + '</p>';
    links.forEach(function (u, i) { h += payBtn(u, r.deposit, true, i === 0 ? 12 : 10).replace('class="btn"', i === 0 ? 'class="btn"' : 'class="btn pay2"'); });
    if (links.length && ptx) h += '<p class="soft dn-t" style="white-space:pre-line">Autre moyen : ' + esc(ptx) + '</p>';
    h += '<button class="btn glass" style="margin-top:10px" data-paid="' + esc(r.ref) + '" data-phone="' + esc(r.phone || '') + '">J’ai envoyé l’acompte</button>';
    h += '<p class="dn-sep">Ton rendez-vous</p>';
    h += '<div class="glass"><div class="dline"><span class="ico">' + svg(I.cal, 20) + '</span><span><b>' + esc(U.day(s)) + ' à ' + U.hm(s) + '</b><br><span class="soft">' + esc(r.service) + (r.options ? ', ' + esc(r.options) : '') + '</span></span></div><div class="dline"><span class="ico">' + svg(I.pin, 20) + '</span><span><b>' + esc(p.name) + '</b><br><span class="soft">' + esc(p.city || 'Adresse précise donnée par message') + '</span></span></div><div class="dline"><span class="ico">' + svg(I.euro, 20) + '</span><span><b>Il restera ' + U.eur(r.price - r.deposit) + '</b><br><span class="soft">à régler sur place</span></span></div></div>';
    var sv0 = (st.svcs || []).filter(function (x) { return x.name === r.service; })[0], prep = sv0 && sv0.prep;
    if (prep) h += '<div class="glass"><b>À préparer avant de venir</b><div class="soft" style="margin-top:4px;white-space:pre-line">' + esc(prep) + '</div></div>';
    if (w) h += '<a class="btn glass" style="margin-top:10px;border-radius:28px" target="_blank" rel="noopener" href="' + w + '?text=' + encodeURIComponent('Bonjour, j’ai réservé ' + r.service + ' le ' + U.day(s) + ' à ' + U.hm(s) + ' (référence ' + r.ref + '). Je t’envoie l’acompte de ' + U.eur(r.deposit) + '.') + '">' + svg(I.msg, 18) + 'Prévenir sur WhatsApp</a>';
    h += calBtn({ ref: r.ref, start: r.starts_at, end: r.ends_at, title: r.service + ' chez ' + p.name, where: p.city || '', desc: 'Référence ' + r.ref + '. Acompte ' + U.eur(r.deposit) + ', reste ' + U.eur(r.price - r.deposit) + '.' + (prep ? '\nAvant de venir : ' + prep : '') + '\nhttps://perleapp.fr/?v=rdv' }, 'btn glass', 'margin-top:10px;border-radius:28px');
    h += '<a class="btn glass" style="margin-top:10px;border-radius:28px" href="./?v=rdv">Voir mes rendez-vous</a>';
    h += '<p class="soft" style="margin-top:16px">' + esc(p.name) + ' confirme ton rendez-vous dès réception de l’acompte. Si tu annules, l’acompte n’est pas remboursé ; si c’est ' + esc(p.name) + ' qui annule, il t’est rendu. Garde cette page ou fais une capture d’écran.</p></div>';
    app.innerHTML = h; setBar();
  }
  function seen() { try { return localStorage.getItem('perle-vu') === '1'; } catch (e) { return true; } }
  var dir = { list: null, busy: null, day: null, mom: 'all', me: null, sel: '', ck: '', csel: {}, q: '', cat: 'Tout', f: { max: null, when: 'all', pour: [], ou: [], sort: 'soon' }, view: (window.PERLE_VIEW != null ? window.PERLE_VIEW : new URLSearchParams(location.search).get('v')) || (seen() ? 'home' : 'open'), rdv: null };
  var CATS = [['Tresses', /braid|tresse|natte|knotless|fulani|cornrow|vanille/], ['Locks', /lock|locs|retwist/], ['Twists', /twist/], ['Perruques', /perruque|lace|wig|closure/], ['Cils', /cil|lash/], ['Hommes', /homme|barbe|degrade|coupe/]];
  I.home = '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'; I.grid = '<rect x="4" y="4" width="7" height="9" rx="2"/><rect x="13" y="4" width="7" height="5" rx="2"/><rect x="13" y="11" width="7" height="9" rx="2"/><rect x="4" y="15" width="7" height="5" rx="2"/>';
  function saved() { try { return JSON.parse(localStorage.getItem('perle-rdv') || '[]'); } catch (e) { return []; } }
  // ----- compte cliente (facultatif) : retrouve ses rendez-vous sur tous ses appareils -----
  var cu = null, cprov = null, CAN = !!(S.providers && S.oauth);
  function cacct() {
    if (!CAN) return '';
    if (cu) return '<p class="cin">Compte : <b>' + esc(cu.email || '') + '</b> <button class="link" data-cout="1">Me déconnecter</button></p>';
    var pv = cprov || {}, h = '';
    if (pv.google) h += '<button type="button" class="btn oab" data-coa="google">Continuer avec Google</button>';
    if (pv.apple) h += '<button type="button" class="btn oab dk" data-coa="apple">Continuer avec Apple</button>';
    return h ? '<div class="cacct"><p class="mut">Connecte-toi pour retrouver tes rendez-vous sur tous tes appareils. Tu peux aussi réserver sans compte.</p>' + h.replace(/data-coa/g, 'data-to="?v=' + (dir.view === 'moi' ? 'moi' : 'rdv') + '" data-coa') + '</div>' : '';
  }
  // ----- écran Profil -----
  var PI = { help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8"/><path d="M12 17h.01"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>', doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 12h5M10 16h5"/>', spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>', out: '<path d="M10 4H5v16h5"/><path d="M14 8l4 4-4 4"/><path d="M18 12H9"/>', chev: '<path d="M9 6l6 6-6 6"/>', heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>' };
  // ----- favoris, avis, alerte créneau -----
  function favs() { try { return JSON.parse(localStorage.getItem('perle-fav') || '[]'); } catch (e) { return []; } }
  function favBtn(s) { var on = favs().indexOf(s) >= 0; return '<button class="favb" data-fav="' + esc(s) + '" aria-pressed="' + on + '">' + svg(PI.heart, 18) + '<span>' + (on ? 'Dans tes favoris' : 'Garder en favori') + '</span></button>'; }
  function stars(n) { return '<span class="rvs" aria-label="' + n + ' sur 5">' + '★★★★★'.slice(0, n) + '<i>' + '★★★★★'.slice(n) + '</i></span>'; }
  function revsHtml() {
    var r = st.revs; if (!r || !r.n) return '';
    return '<h2 class="rvh">Avis<span>' + stars(Math.round(r.avg)) + ' ' + String(r.avg).replace('.', ',') + ' sur 5 · ' + r.n + ' avis</span></h2>' + (r.list || []).map(function (x) {
      return '<div class="rv"><div class="rvt">' + stars(x.rating) + '<b>' + esc(x.name || 'Cliente') + '</b><span class="mut">' + new Date(x.at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + '</span></div>' + (x.body ? '<p>' + esc(x.body) + '</p>' : '') + (x.reply ? '<p class="rvr"><b>Réponse de ' + esc(st.pro.name) + '</b>' + esc(x.reply) + '</p>' : '') + '</div>';
    }).join('') + '<p class="mut" style="font-size:12px;margin-top:10px">Seules les clientes dont le rendez-vous a eu lieu peuvent laisser un avis.</p>';
  }
  function revForm(bk) {
    var s = ''; for (var n = 1; n <= 5; n++) s += '<button type="button" data-star="' + n + '" aria-pressed="' + ((dir.revN || 0) >= n) + '" aria-label="' + n + ' sur 5">★</button>';
    return '<div class="revf"><b>Ta note</b><div class="starsel">' + s + '</div><label for="rvt" class="sr">Ton avis</label><textarea id="rvt" maxlength="600" rows="3" placeholder="Comment ça s’est passé ? (facultatif)"></textarea><button type="button" class="btn sm" style="margin-top:10px" data-revsend="' + esc(bk.ref) + '" data-phone="' + esc(bk.phone) + '">Publier mon avis</button><p id="rvm" class="mut" role="status" style="margin:8px 0 0"></p><p class="mut" style="font-size:12px;margin:6px 0 0">Ton prénom et ton avis seront visibles sur la page de la coiffeuse.</p></div>';
  }
  function prow(ic, t, s, attr, tag) { tag = tag || 'button'; return '<' + tag + ' class="prow" ' + attr + '>' + svg(ic, 22, 1.8) + '<span class="grow"><b>' + t + '</b>' + (s ? '<span class="mut">' + s + '</span>' : '') + '</span>' + svg(PI.chev, 18) + '</' + tag + '>'; }
  function pme() { try { return JSON.parse(localStorage.getItem('perle-moi') || '{}'); } catch (e) { return {}; } }
  function phead() {
    var me = pme(), nm = String(me.n || '').trim(), em = cu ? (cu.email || '') : '';
    return '<div class="phead"><div class="grow"><h1>' + (nm ? esc(nm.split(' ')[0]) : 'Ton profil') + '</h1><p class="mut">' + (em ? esc(em) : nm ? 'Sans compte pour l’instant' : 'Ajoute ton prénom pour réserver plus vite') + '</p></div><button class="pav" data-view="infos" aria-label="Modifier mes informations">' + (nm ? esc(nm.slice(0, 2).toUpperCase()) : svg(I.user, 28, 1.8)) + '</button></div>';
  }
  // le profil est réservé aux personnes connectées ; sinon on propose la connexion
  function pmode() { if (!CAN) return 'in'; if (!cready) return 'wait'; if (cu) return 'in'; return (!cprov || cprov.google || cprov.apple) ? 'gate' : 'in'; }
  function pgb() {
    var pv = cprov || {}, h = '';
    if (pv.google) h += '<button type="button" class="btn oab" data-to="?v=moi" data-coa="google">Continuer avec Google</button>';
    if (pv.apple) h += '<button type="button" class="btn oab dk" data-to="?v=moi" data-coa="apple">Continuer avec Apple</button>';
    return h;
  }
  function pgate() {
    return '<div class="pgate"><span class="pav">' + svg(I.user, 28, 1.8) + '</span><h1>Ton <span class="hl">profil</span>.</h1><p class="sub">Connecte-toi pour retrouver tes rendez-vous et tes informations sur tous tes appareils.</p><div id="pgb">' + pgb() + '</div><p class="mut">Pas envie de créer un compte ? Tu peux réserver sans : ton prénom et ton téléphone suffisent.</p><p class="plinks"><button class="link mutl" data-view="how">Comment ça marche</button><a class="link mutl" href="mailto:contact@perleapp.fr?subject=Aide%20Perle">Aide</a><a class="link mutl" href="legal.html">Conditions</a></p></div>';
  }
  function pfoot() {
    return (cu ? '<p class="pdel"><button type="button" class="link mutl" data-delacct="1">Supprimer mon compte</button></p><p id="pdm" class="mut" role="status" style="margin:6px 0 0"></p>' : '') + '<p class="pver">Perle · perleapp.fr</p>';
  }
  // premier écran : la connexion d'abord, puis le choix « je me fais coiffer / je coiffe »
  var cready = !CAN;
  function roles() { return '<button class="btn obtn" data-view="home">Je veux me faire coiffer<span class="oarr">' + svg(I.arrow, 18) + '</span></button><a class="btn glass obtn" href="pro.html">Je coiffe, je veux des clients<span class="oarr w">' + svg(I.arrow, 18) + '</span></a>'; }
  function oopen() {
    if (!CAN || cu) return (cu ? '<p class="soft ocin">Connexion réussie. Tu viens pour quoi ?</p>' : '') + roles() + (cu ? '<p class="soft ocin obye">' + esc(cu.email || '') + ' · <button class="olink" data-cout="1">Me déconnecter</button></p>' : '');
    if (!cready || !cprov) return '';
    var pv = cprov, h = '';
    if (pv.google) h += '<button type="button" class="btn oab" data-coa="google">Continuer avec Google</button>';
    if (pv.apple) h += '<button type="button" class="btn oab dk" data-coa="apple">Continuer avec Apple</button>';
    return h ? h : roles();
  }
  // l'appli est réservée aux personnes connectées (cliente ou coiffeuse) ; la page d'une coiffeuse ouverte par son lien reste visible
  function locked() { return CAN && !cu && (!cprov || !!(cprov.google || cprov.apple)); }
  function lstate() { return !CAN ? 'free' : !cready ? 'wait' : locked() ? 'lock' : 'free'; }
  function drawAcct() { if (!slug && dir.ls !== lstate()) return landing(); var o = document.getElementById('cacct'); if (o) o.innerHTML = cacct(); var p = document.getElementById('oopen'); if (p) p.innerHTML = oopen(); var x = document.getElementById('phead'); if (!slug && dir.view === 'moi' && dir.pm !== pmode()) return landing(); if (x) { x.innerHTML = phead(); document.getElementById('pfoot').innerHTML = pfoot(); } var g = document.getElementById('pgb'); if (g) g.innerHTML = pgb(); }
  async function initAcct() {
    if (!CAN) return;
    S.providers().then(function (x) { cprov = x || {}; drawAcct(); }).catch(function () { cprov = {}; drawAcct(); });
    try { cu = await S.session(); } catch (e) { cu = null; }
    cready = true; drawAcct();
    if (!cu) return;
    try {
      var me = {}; try { me = JSON.parse(localStorage.getItem('perle-moi') || '{}'); } catch (e) { }
      var md = cu.user_metadata || {}, ch = false;
      if (!me.n && (md.full_name || md.name)) { me.n = String(md.full_name || md.name).slice(0, 40); ch = true; }
      if (!me.e && cu.email) { me.e = cu.email; ch = true; }
      if (ch) localStorage.setItem('perle-moi', JSON.stringify(me));
    } catch (e) { }
    try {
      var l = saved(); if (l.length) await S.claimRefs(l);
      var mine = await S.myRefs() || [], seen = {}, out = [];
      try { if (S.myFavs) { var lf = favs(), sf = await S.myFavs() || []; lf.forEach(function (x) { if (sf.indexOf(x) < 0) S.setFav(x, true).catch(function () { }); }); localStorage.setItem('perle-fav', JSON.stringify(sf.concat(lf.filter(function (x) { return sf.indexOf(x) < 0; })).slice(0, 100))); } } catch (e) { }
      var hid = {}; mine.forEach(function (x) { if (x && x.hidden) hid[x.ref] = 1; });
      l.concat(mine).forEach(function (x) { if (x && x.ref && !seen[x.ref] && !hid[x.ref]) { seen[x.ref] = 1; out.push({ ref: x.ref, phone: x.phone }); } });
      if (out.length !== l.length || out.some(function (x, i) { return x.ref !== l[i].ref; })) { localStorage.setItem('perle-rdv', JSON.stringify(out.slice(-20))); if (!slug && (dir.view === 'rdv' || dir.view === 'home')) loadRdv(); }
    } catch (e) { }
  }
  I.search = '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'; I.user = '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.500-4 5-5 8-5s6.500 1 8 5"/>'; I.tagi = '<path d="M4 4h7l9 9-7 7-9-9z"/><circle cx="8.500" cy="8.500" r="1.500"/>'; I.filt = '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'; I.chev = '<path d="M9 6l6 6-6 6"/>';
  function cnav() { var cur = /^(search|filters|date|calc)$/.test(dir.view) ? 'search' : /^(moi|infos|ideas|fav)$/.test(dir.view) ? 'moi' : dir.view; return '<nav class="nav" aria-label="Menu">' + [['home', 'Accueil', I.home], ['search', 'Rechercher', I.search], ['map', 'Carte', I.map], ['rdv', 'Rendez-vous', I.cal], ['moi', 'Profil', I.user]].map(function (t) { return '<button data-view="' + t[0] + '" aria-selected="' + (cur === t[0]) + '" aria-label="' + t[1] + '">' + svg(t[2], 22) + '<span>' + t[1] + '</span></button>'; }).join('') + '</nav>'; }
  function anim() { app.classList.remove('anim'); void app.offsetWidth; app.classList.add('anim'); }
  function sk(n, h) { var o = ''; for (var i = 0; i < n; i++) o += '<div class="sk" style="height:' + h + 'px"></div>'; return '<div aria-label="Chargement" role="status" style="margin-top:16px">' + o + '</div>'; }
  function catOf(p) { var t = U.norm(p.services.map(function (s) { return s.name; }).join(' ')); return CATS.filter(function (c) { return c[1].test(t); }).map(function (c) { return c[0]; }); }
  function proCta() { return '<div class="card" style="margin-top:22px;border-radius:28px;padding:18px"><div class="b" style="font-size:18px">Tu coiffes ?</div><div class="mut" style="margin:4px 0 14px">Crée ta page de réservation : tes photos, tes prix, tes créneaux, et un acompte pour chaque rendez-vous.</div><a class="btn dark" href="pro.html">Créer ma page' + ARROW + '</a></div><p class="foot" style="text-align:center"><a href="legal.html">Mentions légales, confidentialité et conditions</a></p>'; }
  function landing() {
    dir.ls = lstate();
    if (dir.ls === 'wait') { app.innerHTML = ''; return; }
    if (dir.ls === 'lock' && dir.view !== 'how') dir.view = 'open';
    app.classList.remove('bkf');
    if (dir.map) { try { dir.map.remove(); } catch (e) { } dir.map = null; dir.marks = null; }
    document.body.classList.toggle('dark', dir.view === 'open');
    var NT = !!(window.PERLE || {}).APP && /^(search|rdv|moi|ideas)$/.test(dir.view), h = NT ? '' : top(), me = {}; try { me = JSON.parse(localStorage.getItem('perle-moi') || '{}'); } catch (e) { }
    if (dir.view === 'open') {
      h = '<div class="dark-screen open" style="background-image:url(img/bgKnotless.jpg)"><div class="top">' + U.logo() + badge() + '</div><div class="openb"><h1>Trouve <span class="hl" style="color:var(--noir)">ta perle</span> près de chez toi</h1><p class="soft" style="font-size:15px;margin:0">Perle te met en relation avec des coiffeuses et des coiffeurs près de chez toi. Tu réserves en ligne et tu bloques ta place avec un acompte.</p><div id="oopen">' + oopen() + '</div><button class="olink" data-view="how">Comment ça marche ?</button></div></div>';
    } else if (dir.view === 'how') {
      h += '<h1 style="font-size:30px">Comment ça <span class="hl">marche</span></h1>';
      [['1', 'Tu choisis ta coiffure', 'Tu vois le prix exact selon la taille et la longueur, avant de réserver.'], ['2', 'Tu prends ton créneau', 'Seuls les créneaux vraiment libres s’affichent. Tu en choisis un en deux touches.'], ['3', 'Tu bloques ta place', 'Tu envoies un acompte à ta coiffeuse. Elle confirme, et le reste se règle sur place.']].forEach(function (s) { h += '<div class="card row" style="margin-top:12px;align-items:flex-start;border-radius:28px;padding:16px"><span class="stepn">' + s[0] + '</span><span class="grow"><span class="b" style="font-size:17px">' + s[1] + '</span><br><span class="mut">' + s[2] + '</span></span></div>'; });
      h += '<p class="note info">Tu peux annuler toi-même depuis « Mes rendez-vous », jusqu’au délai fixé par ta coiffeuse.</p><button class="btn" style="margin-top:16px" data-view="home">Trouver ma coiffure' + ARROW + '</button>';
    } else if (dir.view === 'ideas') {
      h += '<h1>Des idées pour <span class="hl">ta tête</span>.</h1><div id="dir"></div>';
    } else if (dir.view === 'date') {
      h = sub('Par date', '<label class="sr" for="fcat">Type de coiffure</label><select id="fcat" class="catsel"></select>') + '<h1>Tu es libre <span class="hl">quand</span> ?</h1><div id="fdays"></div><div id="fmom"></div><div id="dir"></div>';
    } else if (dir.view === 'map') {
      h = '<div class="mapfull"><div id="map" role="region" aria-label="Carte des coiffeuses"></div><div class="maptop"><div class="row" style="gap:8px"><button class="round lglass" data-view="search" aria-label="Retour">' + svg(I.back, 20) + '</button><button class="lglass mapwhere" data-city="1" aria-expanded="false" id="cityb">' + svg(I.pin, 18) + '<span id="mapwhere" class="grow">' + esc(dir.city || 'Partout') + '</span>' + svg('<path d="M6 9l6 6 6-6"/>', 18) + '</button>' + (AP || !navigator.geolocation ? '' : '<button class="round lglass" data-locate="1" aria-label="Me localiser">' + svg(I.target, 20) + '</button>') + '<button class="round fbtn" style="width:52px;height:52px;border-radius:26px" data-view="filters" aria-label="Filtres" id="fbtn2">' + svg(I.filt, 21) + '</button></div><div id="citybox"></div><div class="maprow"><span class="seg" role="group" aria-label="Affichage"><button data-view="search">' + svg(I.list, 15, 2.2) + 'Liste</button><button aria-pressed="true" data-view="map">' + svg(I.map, 15, 2.2) + 'Carte</button></span><button class="pill" data-view="date">' + svg(I.cal, 16) + 'Choisir une date</button><span id="chips" class="mapchips"></span></div><p class="mapnote" id="mapmsg">' + (AP ? 'Aperçu : le fond de carte et la localisation ne s’affichent pas ici.' : '') + '</p></div><div id="dir" class="mapcard"></div></div>';
    } else if (dir.view === 'calc') {
      h = sub('Mon prix') + '<h1>Ton prix, <span class="hl">avant</span> de réserver.</h1><p class="sub">Choisis ta coiffure et tes options : tu vois le prix chez chaque coiffeuse.</p><div id="dir"></div>';
    } else if (dir.view === 'rdv') {
      h += '<h1>Tes <span class="hl">rendez-vous</span>.</h1><div id="cacct">' + cacct() + '</div><div id="dir"></div>';
    } else if (dir.view === 'fav') {
      h = '<div class="top"><button class="round" data-view="moi" aria-label="Retour">' + svg(I.back, 20) + '</button><span class="ttl">Tes favoris</span></div><div id="dir"></div>';
    } else if (dir.view === 'moi' && (dir.pm = pmode()) !== 'in') {
      h += dir.pm === 'gate' ? pgate() : '';
    } else if (dir.view === 'moi') {
      h += '<div id="phead">' + phead() + '</div>' +
        '<div class="ptiles"><button data-view="rdv">' + svg(I.cal, 24, 1.8) + '<span>Rendez-vous</span></button><button data-view="ideas">' + svg(I.grid, 24, 1.8) + '<span>Idées</span></button><button data-view="fav">' + svg(PI.heart, 24, 1.8) + '<span>Favoris</span></button></div>' +
        '<h2 class="psec">Compte</h2><div class="plist">' + prow(I.user, 'Mes informations', 'Prénom, téléphone, e-mail', 'data-view="infos"') + (cu ? prow(PI.out, 'Me déconnecter', esc(cu.email || ''), 'data-cout="1"') : '') + '</div>' +
        '<h2 class="psec">Perle</h2><div class="plist">' + prow(PI.info, 'Comment ça marche', '', 'data-view="how"') + prow(PI.help, 'Aide', 'On te répond sous 24 heures', 'href="mailto:contact@perleapp.fr?subject=Aide%20Perle"', 'a') + prow(PI.spark, 'Je coiffe, je veux des clients', 'Créer ou ouvrir ma page', 'href="pro.html"', 'a') + '</div>' +
        '<h2 class="psec">Légal</h2><div class="plist">' + prow(PI.doc, 'Conditions d’utilisation', '', 'href="legal.html#cgu"', 'a') + prow(I.shield, 'Confidentialité', '', 'href="legal.html#confidentialite"', 'a') + '</div>' +
        '<div id="pfoot">' + pfoot() + '</div>';
    } else if (dir.view === 'infos' && pmode() !== 'in') {
      dir.view = 'moi'; return landing();
    } else if (dir.view === 'infos') {
      h = '<div class="top"><button class="round" data-view="moi" aria-label="Retour">' + svg(I.back, 20) + '</button><span class="ttl">Mes informations</span></div>' +
        '<p class="sub" style="margin-top:6px">Elles remplissent tes réservations à ta place.</p>' +
        '<div class="fmoi"><label for="mn">Ton prénom</label><input id="mn" type="text" autocomplete="given-name" maxlength="40" value="' + esc(me.n || '') + '"><label for="mt">Ton téléphone</label><input id="mt" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" value="' + esc(me.t || '') + '"><label for="mm">Ton e-mail</label><input id="mm" type="email" autocomplete="email" maxlength="120" value="' + esc(me.e || '') + '"><button type="button" class="btn" style="margin-top:20px" data-msave="1">Enregistrer</button><p id="mok" class="mut" role="status" style="margin:10px 0 0;text-align:center"></p><p style="text-align:center;margin:18px 0 0"><button type="button" class="link mutl" data-mclear="1"><b>Effacer mes infos de ce téléphone</b></button></p></div>';
    } else if (dir.view === 'filters') {
      h = sub('Filtres', '<button class="link mutl" data-fclear="1">Tout effacer</button>') + '<div id="dir"></div>';
    } else if (dir.view === 'search') {
      var fld = function (ic, inner) { return '<span class="fld">' + svg(ic, 18) + inner + '</span>'; };
      h = (NT ? '' : top()) + '<div class="scard"><p class="st">Trouve <b>ta coiffeuse</b></p><label for="q" class="sr">Chercher une coiffure, une coiffeuse ou un quartier</label>' + fld(I.search, '<input id="q" type="text" placeholder="Coiffure, coiffeuse, quartier" value="' + esc(dir.q) + '" autocomplete="off">') + fld(I.pin, '<select id="fcity" aria-label="Quartier"><option value="">Tous les quartiers</option></select>') + fld(I.cal, '<select id="fwhen" aria-label="Quand"><option value="all">Peu importe le jour</option><option value="today">Aujourd’hui</option><option value="week">Cette semaine</option><option value="date">Choisir une date…</option></select>') + '<div class="grid2">' + fld(I.user, '<select id="fpour" aria-label="Pour qui"><option value="">Pour qui ?</option><option value="femme">Femme</option><option value="homme">Homme</option><option value="enfant">Enfant</option></select>') + fld(I.euro, '<select id="fbud" aria-label="Budget"><option value="">Budget</option><option value="40">40 € max</option><option value="60">60 € max</option><option value="80">80 € max</option><option value="100">100 € max</option></select>') + '</div><div id="stabs"></div><button class="btn" data-res="1">Rechercher</button></div><div id="chips2"></div><div id="dir"></div>';
    } else {
      var nm = String(me.n || '').trim().split(' ')[0];
      h = '<div class="top hd"><button class="hdme" data-view="moi" aria-label="Mon profil et mes réglages">' + (nm ? '<span class="hi">' + esc(nm.slice(0, 2).toUpperCase()) + '</span>' : '<svg viewBox="0 0 100 100" width="44" height="44" aria-hidden="true" style="flex-shrink:0"><rect width="100" height="100" rx="50" fill="#5B2A86"></rect><g transform="translate(50 52) scale(.72) translate(-50 -50)"><circle cx="50" cy="38" r="26" fill="#D9A441"></circle><circle cx="50" cy="52" r="13" fill="#FFFFFF"></circle><path d="M24 88 Q24 68 50 68 Q76 68 76 88 Z" fill="#FFFFFF"></path></g></svg>') + '<span class="grow hdt"><small>' + (nm ? 'Bonjour' : 'Bienvenue sur') + '</small><b>' + (nm ? esc(nm) : 'Perle') + '</b></span><span class="hdch" aria-hidden="true">›</span></button><button class="round wb" data-view="filters" aria-label="Filtres">' + svg(I.filt, 20) + '</button></div><div class="row"><p class="t1 grow">Tu cherches</p>' + badge() + '</div><h1 class="t2">quelle coiffure ?</h1><div id="chips"></div><div id="tip"></div><div id="dir"></div><p style="text-align:center;margin:22px 0 0"><button class="link mutl" data-view="how">Comment ça marche ?</button></p>' + proCta();
    }
    app.innerHTML = h + (dir.view === 'open' || dir.view === 'filters' ? '' : cnav()); setBar(); anim(); drawDir();
    var q = document.getElementById('q'); if (q) q.addEventListener('input', function () { dir.q = q.value; drawDir(); });
    if (!dir.list) S.listPros().then(function (l) { dir.list = l || []; drawDir(); }).catch(function () { dir.list = []; drawDir(); });
    if (dir.view === 'rdv' || (dir.view === 'home' && !dir.rdv && saved().length)) loadRdv();
  }
  // ----- recherche par date, carte, calculateur (écrans V_Date et V_Carte de la maquette) -----
  var AP = !!(window.PERLE || {}).APERCU;
  I.target = '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>';
  I.list = '<path d="M4 7h16M4 12h16M4 17h16"/>'; I.map = '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'; I.go = '<path d="M7 17L17 7M9 7h8v8"/>';
  var MOM = [['all', 'Toute la journée', 0, 24], ['am', 'Matin', 0, 12], ['pm', 'Après-midi', 12, 17], ['eve', 'Soir', 17, 24]];
  function sub(title, right) { return '<div class="top"><button class="round" data-view="search" aria-label="Retour">' + svg(I.back, 20) + '</button><span class="ttl">' + title + '</span>' + (right || badge()) + '</div>'; }
  function minPrice(p) { return Math.min.apply(0, p.services.map(function (s) { return Number(s.price); })); }
  function cats() { return CATS.map(function (c) { return c[0]; }).filter(function (c) { return dir.list.some(function (p) { return catOf(p).indexOf(c) >= 0; }); }); }
  function svcsOf(p) { return dir.cat === 'Tout' ? p.services : p.services.filter(function (s) { var t = U.norm(s.name); return CATS.some(function (c) { return c[0] === dir.cat && c[1].test(t); }); }); }
  // créneaux libres d'une coiffeuse un jour donné (durée de base de chaque prestation), filtrés par moment de la journée
  function freeOn(p, d, mom) {
    var bz = (dir.busy || {})[p.slug] || [], m = MOM.filter(function (x) { return x[0] === (mom || 'all'); })[0], times = {}, fit = [];
    svcsOf(p).forEach(function (s) {
      var sl = U.slots(p, U.quote(s, []).minutes, d, bz).filter(function (t) { return t.getHours() >= m[2] && t.getHours() < m[3]; });
      if (sl.length) { fit.push(s); sl.forEach(function (t) { (times[+t] = times[+t] || []).push(s); }); }
    });
    var ts = Object.keys(times).map(Number).sort(function (a, b) { return a - b; });
    return fit.length ? { first: new Date(ts[0]), times: ts, by: times, svcs: fit } : null;
  }
  function nextSlots(p, n) { var ds = days(), out = [], last = 0; for (var i = 0; i < ds.length && out.length < n; i++) { var f = freeOn(p, ds[i]); if (!f) continue; var all = svcsOf(p).length, ts = f.times.filter(function (t) { return f.by[t].length >= all; }); for (var j = 0; j < ts.length && out.length < n; j++) { if (ts[j] - last >= 90 * 60000) { out.push(new Date(ts[j])); last = ts[j]; } } } return out; }
  function nextFree(p) { var ds = days(); for (var i = 0; i < ds.length; i++) { var f = freeOn(p, ds[i]); if (f) return f.first; } return null; }
  function whenS(t) { if (!t) return 'Complet'; var n = new Date(), d0 = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime(), k = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime() - d0) / 864e5), w = t.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''); return (k === 0 ? 'Auj.' : k === 1 ? 'Demain' : w.charAt(0).toUpperCase() + w.slice(1) + '.' + (k > 6 ? ' ' + t.getDate() : '')) + ' ' + U.hm(t); }
  function whenL(t) { if (!t) return 'Complet ces 4 semaines'; var n = new Date(), d0 = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime(), k = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime() - d0) / 864e5), w = t.toLocaleDateString('fr-FR', k > 6 ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'long' }); return (k === 0 ? 'Aujourd’hui' : k === 1 ? 'Demain' : w.charAt(0).toUpperCase() + w.slice(1)) + ' à ' + U.hm(t); }
  function loadBusyAll() {
    if (dir.busy || dir.busyLoading) return; dir.busyLoading = true;
    var from = new Date().toISOString(), to = new Date(Date.now() + 29 * 864e5).toISOString();
    S.busyAll(from, to).catch(function () { return {}; }).then(function (r) { dir.busy = r || {}; dir.busyLoading = false; if (dir.view === 'map') refreshMarks(); drawDir(); });
  }
  function drawChips() {
    var c = ['Tout'].concat(cats());
    var ch = document.getElementById('chips'); if (ch) ch.innerHTML = c.length > 2 ? '<div class="chips" role="group" aria-label="Type de coiffure">' + c.map(function (x) { return '<button class="pill" data-cat="' + x + '" aria-pressed="' + (dir.cat === x) + '">' + x + '</button>'; }).join('') + '</div>' : '';
  }
  function hhmm(t) { return ('0' + t.getHours()).slice(-2) + ('0' + t.getMinutes()).slice(-2); }
  function drawDate(box) {
    if (!dir.busy) { box.innerHTML = sk(1, 300) + sk(2, 200); return loadBusyAll(); }
    var sel = document.getElementById('fcat'); if (sel && !sel.options.length) sel.innerHTML = '<option value="Tout">Toutes les coiffures</option>' + cats().map(function (c) { return '<option' + (dir.cat === c ? ' selected' : '') + '>' + c + '</option>'; }).join('');
    var ds = days(), free = ds.map(function (d) { return dir.list.some(function (p) { return freeOn(p, d, dir.mom); }); });
    if (!dir.day || !free[ds.map(Number).indexOf(+dir.day)]) dir.day = ds.filter(function (d, i) { return free[i]; })[0] || null;
    // calendrier : 4 semaines à partir d'aujourd'hui, rangées du lundi au dimanche
    var a = ds[0], z = ds[ds.length - 1], mo = function (d, y) { var t = d.toLocaleDateString('fr-FR', y ? { month: 'long', year: 'numeric' } : { month: 'long' }); return t.charAt(0).toUpperCase() + t.slice(1); };
    var cal = '<div class="calbox"><div class="calhead"><span>' + (a.getMonth() === z.getMonth() ? mo(a, true) : mo(a) + ' et ' + mo(z, true).toLowerCase()) + '</span><span class="calleg"><i></i>jour avec de la place</span></div><div class="calgrid calw" aria-hidden="true">' + ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div><div class="calgrid">';
    for (var k = 0; k < (a.getDay() + 6) % 7; k++) cal += '<span></span>';
    ds.forEach(function (d, i) { var on = dir.day && +dir.day === +d; cal += '<button class="cday' + (i === 0 ? ' today' : '') + '" data-fday="' + i + '" aria-pressed="' + !!on + '"' + (free[i] ? '' : ' disabled') + ' aria-label="' + esc(U.day(d)) + (free[i] ? ', des créneaux libres' : ', complet') + '">' + d.getDate() + (free[i] ? '<i></i>' : '') + '</button>'; });
    document.getElementById('fdays').innerHTML = cal + '</div></div>';
    document.getElementById('fmom').innerHTML = '<div class="chips" role="group" aria-label="Moment de la journée">' + MOM.map(function (m) { return '<button class="pill" data-mom="' + m[0] + '" aria-pressed="' + (dir.mom === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div>';
    var seg = '<span class="seg" role="group" aria-label="Affichage"><button aria-pressed="true" data-view="date">' + svg(I.list, 15, 2.2) + 'Liste</button><button data-view="map">' + svg(I.map, 15, 2.2) + 'Carte</button></span>';
    if (!dir.day) { box.innerHTML = '<p class="note info">Aucun créneau libre dans les 4 prochaines semaines avec ces filtres.</p>'; return; }
    var l = dir.list.map(function (p) { return { p: p, f: freeOn(p, dir.day, dir.mom) }; }).filter(function (x) { return x.f; }).sort(function (x, y) { return x.f.first - y.f.first; });
    box.innerHTML = '<div class="row" style="justify-content:space-between;margin:18px 0 10px"><h2 style="margin:0">' + l.length + ' coiffeuse' + (l.length > 1 ? 's' : '') + ' libre' + (l.length > 1 ? 's' : '') + ' le ' + dir.day.getDate() + '</h2>' + seg + '</div>' + l.map(function (x) {
      var p = x.p, base = './?c=' + encodeURIComponent(p.slug) + '&d=' + U.ymd(dir.day), pick = [], last = -1e15, n = x.f.times.length;
      x.f.times.forEach(function (t) { if (pick.length < 4 && t - last >= 90 * 6e4) { pick.push(t); last = t; } });
      return '<div class="drow"><a class="photo-card ph" href="' + base + '" style="display:block;text-decoration:none;height:150px;margin:0;border-radius:26px;' + cov(p) + '">' + ini(p) + '<span class="when">dès ' + U.hm(x.f.first) + '</span><span class="plate glass pl2"><b>' + esc(p.name) + '</b>' + esc(p.city || '') + '</span><span class="fprice r"><small>à partir de</small>' + U.eur(Math.min.apply(0, x.f.svcs.map(function (s) { return Number(s.price); }))) + '</span><span class="pgo cgo">' + svg(I.go, 20) + '</span></a><div class="dbody"><span class="mut">' + n + ' créneau' + (n > 1 ? 'x' : '') + ' libre' + (n > 1 ? 's' : '') + '</span><span class="spills">' + pick.map(function (t, i) { var sv = x.f.by[t], d = new Date(t); return '<a class="spill' + (i === 0 ? ' on' : '') + '" href="' + base + '&t=' + hhmm(d) + (sv.length === 1 ? '&s=' + encodeURIComponent(sv[0].id) : '') + '">' + U.hm(d) + '</a>'; }).join('') + '</span></div></div>';
    }).join('') + '<p class="mut" style="margin-top:10px">Créneaux calculés pour la durée de base. Avec des options plus longues, l’heure peut changer : tu le vois avant de réserver.</p>';
  }
  function leaflet() { return new Promise(function (res, rej) { if (window.L) return res(window.L); var s = document.createElement('script'); s.src = 'vendor/leaflet.js'; s.onload = function () { window.L ? res(window.L) : rej(new Error('CARTE')); }; s.onerror = function () { rej(new Error('CARTE')); }; document.head.appendChild(s); }); }
  // plusieurs coiffeuses du même quartier : même point, étiquettes empilées (décalage en pixels, quel que soit le zoom)
  function onMap() {
    var grp = {}; results().forEach(function (x) { var p = x.p; if (p.lat != null && p.lng != null) (grp[p.lat + ',' + p.lng] = grp[p.lat + ',' + p.lng] || []).push(p); });
    var out = []; Object.keys(grp).forEach(function (k) { var g = grp[k], n = g.length, cols = n > 5 ? 2 : 1, rows = Math.ceil(n / cols); g.forEach(function (p, i) { out.push({ p: p, lat: Number(p.lat), lng: Number(p.lng), dx: cols === 2 ? (i % 2 ? 25 : -25) : 0, dy: Math.round((Math.floor(i / cols) - (rows - 1) / 2) * 48) }); }); });
    return out;
  }
  // fond de carte épuré (routes blanches, parcs menthe, eau turquoise) : tuiles OpenFreeMap dessinées par MapLibre, avec nos couleurs
  function perleStyle(st) {
    var LAND = '#E9EBF1', LAND2 = '#E4E6EE', WATER = '#A9DCD8', PARK = '#C6EAD3', BLD = '#DDE0E9', ROAD = '#FFFFFF', RAIL = '#D3D6E0', TXT = '#858A9E';
    function sc(w, k) { if (typeof w === 'number') return w * k; if (w && w.stops) return { base: w.base, stops: w.stops.map(function (s) { return [s[0], s[1] * k]; }) }; return w; }
    st.layers = st.layers.filter(function (l) { return !/shield|airport|aeroway|boundary|ice|glacier|dashline|highway-name-path|highway-name-minor|waterway_line_label|subtle|casing|label_other/.test(l.id); });
    st.layers.forEach(function (l) {
      var p = l.paint = l.paint || {}, sl = l['source-layer'] || '';
      if (l.type === 'background') p['background-color'] = LAND;
      else if (l.type === 'fill') { p['fill-color'] = sl === 'water' ? WATER : (sl === 'park' || l.id === 'landcover_wood') ? PARK : sl === 'building' ? BLD : LAND2; delete p['fill-outline-color']; delete p['fill-pattern']; p['fill-opacity'] = 1; if (sl === 'building') p['fill-antialias'] = false; }
      else if (l.type === 'line') { var rail = /rail/.test(l.id); p['line-color'] = sl === 'waterway' ? WATER : rail ? RAIL : ROAD; p['line-opacity'] = 1; if (sl === 'transportation' && !rail) p['line-width'] = sc(p['line-width'], 2.1); }
      else if (l.type === 'symbol') { p['text-color'] = TXT; p['text-halo-color'] = 'rgba(255,255,255,.85)'; p['text-halo-width'] = 1.2; l.layout = l.layout || {}; l.layout['text-field'] = '{name}'; }
    });
    return st;
  }
  function glLayer(L, m) {
    function ld(u) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = u; s.onload = res; s.onerror = function () { rej(new Error('CARTE')); }; document.head.appendChild(s); }); }
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'; document.head.appendChild(css);
    var job = (window.maplibregl ? Promise.resolve() : ld('https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js')).then(function () { return L.maplibreGL ? null : ld('https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js'); }).then(function () { return fetch('https://tiles.openfreemap.org/styles/positron'); }).then(function (r) { if (!r.ok) throw new Error('CARTE'); return r.json(); }).then(function (st) { if (dir.map !== m) return; L.maplibreGL({ style: perleStyle(st) }).addTo(m); });
    return Promise.race([job, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('CARTE')); }, 9000); })]);
  }
  function markHtml(p, on) {
    var t = dir.busy ? whenS(nextFree(p)) : 'dès ' + U.eur(minPrice(p)), ph = (p.avatar_url || p.cover_url) ? '<span class="mph ph" style="' + U.bg(p.avatar_url || p.cover_url) + '"></span>' : '<span class="mph noi">' + esc(inits(p)) + '</span>';
    return on ? '<span class="mk on">' + ph + '<span class="mtx"><b>' + esc(p.name.split(' ').slice(0, 2).join(' ')) + '</b><em>' + esc(t) + '</em></span><i></i></span>' : '<span class="mk">' + ph + '</span>';
  }
  function refreshMarks() {
    var L = window.L, m = dir.map; if (!L || !m) return;
    var mel = document.getElementById('map'); if (mel && !mel.dataset.dropped) { mel.dataset.dropped = '1'; mel.classList.add('drop'); setTimeout(function () { mel.classList.remove('drop'); }, 1000); }
    (dir.marks || []).forEach(function (x) { x.mk.remove(); });
    var pts = onMap(); if (!pts.some(function (x) { return x.p.slug === dir.sel; })) dir.sel = '';
    if (!dir.sel && pts.length) { var best = pts[0]; if (dir.me) pts.forEach(function (x) { if (U.dist(dir.me, x) < U.dist(dir.me, best)) best = x; }); dir.sel = best.p.slug; }
    dir.marks = pts.map(function (x) {
      var on = x.p.slug === dir.sel, mk = L.marker([x.lat, x.lng], { title: x.p.name, alt: x.p.name, zIndexOffset: on ? 1000 : 0, icon: L.divIcon({ className: 'mkw', html: '<span class="mko" style="transform:translate(' + x.dx + 'px,' + x.dy + 'px)">' + markHtml(x.p, on) + '</span>', iconSize: [0, 0] }) }).addTo(m);
      mk.on('click', function () { dir.sel = x.p.slug; refreshMarks(); markCards(); centerCard(true); });
      return { slug: x.p.slug, mk: mk, lat: x.lat, lng: x.lng };
    });
    return pts;
  }
  function initMap() {
    if (dir.map || dir.mapLoading) return; dir.mapLoading = true;
    leaflet().then(function (L) {
      dir.mapLoading = false; var el = document.getElementById('map'); if (!el || dir.view !== 'map' || dir.map) return;
      var m = L.map(el, { zoomControl: false, attributionControl: false, zoomSnap: 0.5 }); dir.map = m;
      if (AP) L.circle([48.8589, 2.347], { radius: 5300, color: '#5B2A86', weight: 1.5, dashArray: '6 6', fillColor: '#fff', fillOpacity: .7, interactive: false }).addTo(m).bindTooltip('Paris', { permanent: true, direction: 'center', className: 'maplab' });
      else glLayer(L, m).catch(function () { el.classList.add('rast'); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(m); });
      var pts = refreshMarks() || [];
      if (pts.length) m.fitBounds(L.latLngBounds(pts.map(function (x) { return [x.lat, x.lng]; })).pad(0.04), { maxZoom: 14, paddingTopLeft: [24, 130], paddingBottomRight: [24, 215] }); else m.setView([48.8589, 2.347], 11);
      drawDir();
    }).catch(function () { dir.mapLoading = false; var e = document.getElementById('mapmsg'); if (e) e.textContent = 'La carte n’a pas pu se charger. Vérifie ta connexion, ou passe par la liste.'; });
  }
  function locate(btn) {
    var msg = document.getElementById('mapmsg'); btn.disabled = true;
    navigator.geolocation.getCurrentPosition(function (pos) {
      btn.disabled = false; dir.me = { lat: pos.coords.latitude, lng: pos.coords.longitude }; dir.sel = '';
      if (dir.map && window.L) { if (dir.meMk) dir.meMk.remove(); dir.meMk = window.L.marker([dir.me.lat, dir.me.lng], { interactive: false, keyboard: false, zIndexOffset: -500, icon: window.L.divIcon({ className: 'mkw', html: '<span class="mepin"></span>', iconSize: [0, 0] }) }).addTo(dir.map); dir.map.setView([dir.me.lat, dir.me.lng], 13); }
      dir.city = ''; var w = document.getElementById('mapwhere'); if (w) w.textContent = 'Autour de toi'; if (msg) msg.textContent = '';
      refreshMarks(); dir.carKey = ''; drawDir();
    }, function () { btn.disabled = false; if (msg) msg.textContent = 'Localisation refusée ou indisponible. Tu peux déplacer la carte à la main.'; }, { timeout: 10000, maximumAge: 6e5 });
  }
  function markCards() { var car = document.getElementById('car'); if (car) Array.prototype.forEach.call(car.children, function (c) { c.classList.toggle('on', c.dataset.slug === dir.sel); }); }
  function centerCard(smooth) {
    var car = document.getElementById('car'); if (!car) return; var c = Array.prototype.filter.call(car.children, function (x) { return x.dataset.slug === dir.sel; })[0]; if (!c) return;
    dir.carLock = true; clearTimeout(dir.carT); dir.carT = setTimeout(function () { dir.carLock = false; }, 600);
    car.scrollTo({ left: c.offsetLeft - (car.clientWidth - c.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  }
  function focusSel() { var k = (dir.marks || []).filter(function (x) { return x.slug === dir.sel; })[0]; if (k && dir.map) dir.map.panInside([k.lat, k.lng], { paddingTopLeft: [80, 200], paddingBottomRight: [80, 290] }); }
  function cities() { var m = {}, out = []; onMap().forEach(function (x) { var c = x.p.city || ''; if (!c) return; if (!m[c]) { m[c] = { city: c, n: 0, pts: [] }; out.push(m[c]); } m[c].n++; m[c].pts.push(x); }); return out.sort(function (a, c) { return c.n - a.n || a.city.localeCompare(c.city); }); }
  function goCity(name) {
    var L = window.L, m = dir.map, pts = name ? (cities().filter(function (c) { return c.city === name; })[0] || { pts: [] }).pts : onMap(); dir.city = name; dir.cityOpen = false;
    var w = document.getElementById('mapwhere'); if (w) w.textContent = name || 'Partout';
    if (L && m && pts.length) { m.fitBounds(L.latLngBounds(pts.map(function (x) { return [x.lat, x.lng]; })).pad(0.3), { maxZoom: 14, paddingTopLeft: [30, 170], paddingBottomRight: [30, 260] }); if (name) { dir.sel = pts[0].p.slug; refreshMarks(); markCards(); centerCard(true); } }
    drawDir();
  }
  function drawMap(box) {
    drawChips(); if (!dir.busy) loadBusyAll(); initMap();
    var fb = document.getElementById('fbtn2'); if (fb) fb.classList.toggle('dot', nfilters() > 0);
    var cb = document.getElementById('citybox'), bt = document.getElementById('cityb'); if (bt) bt.setAttribute('aria-expanded', !!dir.cityOpen);
    if (cb) cb.innerHTML = dir.cityOpen ? '<div class="lglass citysheet" role="group" aria-label="Choisir un quartier"><button data-cityv="">Toutes les coiffeuses<small>' + onMap().length + '</small></button>' + cities().map(function (c) { return '<button data-cityv="' + esc(c.city) + '">' + esc(c.city) + '<small>' + c.n + '</small></button>'; }).join('') + '</div>' : '';
    if (!dir.map) { box.innerHTML = ''; return; }
    var pts = onMap(), key = pts.map(function (x) { return x.p.slug; }).join('|') + '/' + !!dir.busy + '/' + !!dir.me;
    if (key !== dir.carKey || !document.getElementById('car')) {
      dir.carKey = key;
      var off = dir.list.filter(function (x) { return x.lat == null; }).length, osm = AP ? '' : '<span class="osm"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> · <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · <a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a></span>';
      if (!pts.length) { box.innerHTML = '<div class="lglass pcard" style="margin:0 12px"><span class="grow" style="padding:10px 12px">' + (dir.list.length ? 'Aucune coiffeuse sur la carte avec ces filtres.' : 'Les premières coiffeuses arrivent bientôt sur la carte.') + '</span></div>'; return; }
      box.innerHTML = osm + '<button class="shandle" id="shandle" data-sheet="1" aria-expanded="' + !!dir.sheet + '"><i></i><span>' + (dir.sheet ? 'Revenir à la carte' : 'Voir les ' + pts.length + ' coiffeuse' + (pts.length > 1 ? 's' : '') + ' en liste') + '</span></button><div class="car" id="car">' + pts.map(function (x) {
        var p = x.p, nf = dir.busy ? nextFree(p) : null, km = dir.me ? U.dist(dir.me, x) : null;
        return '<a class="lglass pcard" data-slug="' + esc(p.slug) + '" href="./?c=' + encodeURIComponent(p.slug) + (nf ? '&d=' + U.ymd(nf) : '') + '">' + (p.cover_url ? '<span class="ph pimg" style="' + U.bg(p.cover_url) + '"></span>' : '<span class="pimg noi">' + esc(inits(p)) + '</span>') + '<span class="grow" style="display:flex;flex-direction:column;gap:5px;align-items:flex-start;min-width:0"><span class="ptag">' + esc(dir.busy ? whenL(nf) : 'Chargement…') + '</span><span class="pname">' + esc(p.name) + '</span><span class="mut" style="color:var(--ink2)">' + esc([p.city, km != null ? U.near(km) : ''].filter(Boolean).join(', ')) + '</span></span><span class="fprice in"><small>à partir de</small>' + U.eur(minPrice(p)) + '</span></a>';
      }).join('') + '</div>' + (off ? '<span class="sr">' + off + ' coiffeuse(s) sans quartier reconnu ne figurent pas sur la carte.</span>' : '');
      var car = document.getElementById('car'), tm, sh = document.getElementById('shandle'), ty = null;
      box.classList.toggle('open', !!dir.sheet);
      if (sh) { sh.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true }); sh.addEventListener('touchend', function (e) { if (ty == null) return; var dy = e.changedTouches[0].clientY - ty; ty = null; if ((dy < -24 && !dir.sheet) || (dy > 24 && dir.sheet)) { e.preventDefault(); sheet(); } }); }
      car.addEventListener('scroll', function () {
        if (dir.sheet) return;
        clearTimeout(tm);
        tm = setTimeout(function chk() { if (dir.carLock) { tm = setTimeout(chk, 200); return; } var c = car.children, mid = car.scrollLeft + car.clientWidth / 2, best = 0, bd = 1e9; for (var i = 0; i < c.length; i++) { var d = Math.abs(c[i].offsetLeft + c[i].offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } } var sl = c[best].dataset.slug; if (sl !== dir.sel) { dir.sel = sl; refreshMarks(); markCards(); focusSel(); } }, 110);
      });
      markCards(); centerCard(false);
    } else markCards();
  }
  function sheet() { dir.sheet = !dir.sheet; var bx = document.getElementById('dir'), sh = document.getElementById('shandle'), car = document.getElementById('car'); if (bx) bx.classList.toggle('open', dir.sheet); if (sh && car) { sh.setAttribute('aria-expanded', dir.sheet); sh.lastChild.textContent = dir.sheet ? 'Revenir à la carte' : 'Voir les ' + car.children.length + ' coiffeuse' + (car.children.length > 1 ? 's' : '') + ' en liste'; if (dir.sheet) car.scrollTop = 0; else centerCard(false); } }
  function drawCalc(box) {
    var all = [], idx = {}; dir.list.forEach(function (p) { p.services.forEach(function (s) { var k = U.canon(s.name); if (!idx[k]) { idx[k] = { k: k, name: s.name, offers: [] }; all.push(idx[k]); } idx[k].offers.push({ p: p, s: s }); }); });
    if (!dir.ck || !idx[dir.ck]) { dir.ck = all[0].k; dir.csel = {}; }
    var cur = idx[dir.ck], gs = [], gm = {};
    cur.offers.forEach(function (o) { o.gk = []; (o.s.options || []).forEach(function (g, gi) { var gk = U.canon(g.group), ks = (g.choices || []).map(function (c) { return U.canon(c.label); });
      // deux coiffeuses peuvent nommer le même choix différemment : on regroupe si les réponses se recoupent
      if (!gm[gk]) { var same = gs.filter(function (u) { return ks.length && ks.filter(function (k) { return u.cm[k]; }).length >= Math.min(2, ks.length); })[0]; if (same) gk = same.k; }
      o.gk[gi] = gk; if (!gm[gk]) { gm[gk] = { k: gk, label: g.group, ch: [], cm: {} }; gs.push(gm[gk]); } (g.choices || []).forEach(function (c) { var ck = U.canon(c.label); if (!gm[gk].cm[ck]) { gm[gk].cm[ck] = 1; gm[gk].ch.push({ k: ck, label: c.label }); } }); }); });
    gs.forEach(function (g) { if (!g.ch.some(function (c) { return c.k === dir.csel[g.k]; })) dir.csel[g.k] = g.ch[0] ? g.ch[0].k : ''; });
    var h = '<h2>Quelle coiffure ?</h2><div class="pills" role="group" aria-label="Coiffure">' + all.map(function (c) { return '<button class="pill" data-ck="' + esc(c.k) + '" aria-pressed="' + (c.k === dir.ck) + '">' + esc(c.name) + '</button>'; }).join('') + '</div>';
    gs.forEach(function (g) { h += '<h2>' + esc(g.label) + '</h2><div class="pills" role="group" aria-label="' + esc(g.label) + '">' + g.ch.map(function (c) { return '<button class="pill" data-cg="' + esc(g.k) + '" data-cc="' + esc(c.k) + '" aria-pressed="' + (dir.csel[g.k] === c.k) + '">' + esc(c.label) + '</button>'; }).join('') + '</div>'; });
    var res = cur.offers.map(function (o) {
      var miss = [], ch = (o.s.options || []).map(function (g, gi) { var want = dir.csel[o.gk[gi]], f = -1; (g.choices || []).forEach(function (c, i) { if (f < 0 && U.canon(c.label) === want) f = i; }); if (f < 0) { var w = (gm[o.gk[gi]].ch.filter(function (c) { return c.k === want; })[0] || {}).label; miss.push('« ' + w + ' » non proposé, prix avec « ' + ((g.choices || [])[0] || {}).label + ' »'); f = 0; } return f; });
      var x = U.quote(o.s, ch); return { o: o, ch: ch, x: x, miss: miss };
    }).sort(function (a, b) { return (a.miss.length - b.miss.length) || (a.x.price - b.x.price); });
    var full = res.filter(function (r) { return !r.miss.length; }), pr = (full.length ? full : res).map(function (r) { return r.x.price; }), lo = Math.min.apply(0, pr), hi = Math.max.apply(0, pr);
    h += '<div class="vio" style="margin-top:22px"><div class="mut" style="color:#E4DBEE">' + esc(cur.name) + ((full.length || res.length) > 1 ? ', chez ' + (full.length || res.length) + ' coiffeuses' : '') + '</div><div style="font-family:var(--hb);font-weight:700;font-size:32px;letter-spacing:-.02em">' + (lo === hi ? U.eur(lo) : 'de ' + U.eur(lo).replace(' €', '') + ' à ' + U.eur(hi)) + '</div><div class="mut" style="color:#E4DBEE">Prix total. Tu ne paies qu’un acompte pour réserver, le reste sur place.</div></div><h2>Chez qui ?</h2>';
    res.forEach(function (r) {
      var p = r.o.p, s = r.o.s, d = Math.round(r.x.price * (p.deposit_pct == null ? 30 : p.deposit_pct)) / 100;
      h += '<a class="svc" href="./?c=' + encodeURIComponent(p.slug) + '&s=' + encodeURIComponent(s.id) + (r.ch.length ? '&o=' + r.ch.join(',') : '') + '">' + thumb(s.photo_url || p.cover_url) + '<span class="grow"><span class="b">' + esc(p.name) + '</span><br><span class="mut">' + esc([p.city, 'environ ' + U.dur(r.x.minutes), 'acompte ' + U.eur(d)].filter(Boolean).join(' · ')) + (r.miss.length ? '<br>' + esc(r.miss.join(' ; ')) : '') + '</span></span><span class="big">' + U.eur(r.x.price) + '</span></a>';
    });
    box.innerHTML = h;
  }
  async function loadRdv() {
    var out = []; for (var r of saved()) { try { var b = await S.clientBooking(r.ref, r.phone); if (b) { b.phone = r.phone; out.push(b); } } catch (e) { } }
    out.sort(function (a, b) { return a.starts_at < b.starts_at ? -1 : 1; }); dir.rdv = out; live(); drawDir();
  }
  // Appli iPhone : le prochain rendez-vous confirmé s'affiche dans le Dynamic Island et sur l'écran verrouillé (dans les 8 heures avant).
  // Petites scènes animées du suivi du jour (en route, en préparation, en retard, c'est ton tour).
  function scene(k) {
    var st = function (x, y, c) { return '<path class="sc-st ' + c + '" style="transform-origin:' + x + 'px ' + y + 'px" d="M' + x + ' ' + (y - 7) + 'Q' + x + ' ' + y + ' ' + (x + 7) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y + 7) + 'Q' + x + ' ' + y + ' ' + (x - 7) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y - 7) + 'Z" fill="#D9A441"/>'; };
    var lab = { route: 'Tu es en route', prep: 'Ta coiffeuse se prépare', late: 'Un peu de retard', ready: 'C’est ton tour' }[k], h = '';
    if (k === 'route') h = '<path class="sc-road" d="M-10 90H330" stroke="#150B1F" stroke-opacity=".2" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 12"/>' +
      '<g class="sc-pin"><path d="M252 36a17 17 0 0 1 17 17c0 13-17 31-17 31s-17-18-17-31a17 17 0 0 1 17-17z" fill="#5B2A86"/><circle cx="252" cy="53" r="6.5" fill="#fff"/></g>' +
      '<g class="sc-lines" stroke="#5B2A86" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"><path d="M40 58h22"/><path d="M30 71h18"/><path d="M48 45h14"/></g>' +
      '<g class="sc-hop"><circle cx="106" cy="68" r="20" fill="#D9A441"/><g class="sc-spin"><circle cx="98" cy="60" r="5" fill="#FBF1E0"/></g></g>';
    else if (k === 'prep') { var t = ''; for (var i = 0; i < 7; i++) t += '<rect x="' + (183 + i * 7) + '" y="48" width="3.4" height="19" rx="1.7"/>';
      h = st(66, 36, 'a') + st(262, 30, 'b') + st(246, 82, 'c') +
        '<g class="sc-b1"><rect x="117" y="18" width="6" height="44" rx="3" fill="#150B1F"/><circle cx="110" cy="80" r="9" fill="none" stroke="#5B2A86" stroke-width="5"/></g>' +
        '<g class="sc-b2"><rect x="117" y="18" width="6" height="44" rx="3" fill="#150B1F"/><circle cx="130" cy="80" r="9" fill="none" stroke="#5B2A86" stroke-width="5"/></g><circle cx="120" cy="60" r="3.2" fill="#D9A441"/>' +
        '<g class="sc-comb" fill="#5B2A86"><rect x="178" y="38" width="54" height="11" rx="5.5"/>' + t + '</g>'; }
    else if (k === 'late') h = '<circle cx="118" cy="56" r="29" fill="#fff" stroke="#150B1F" stroke-width="4"/><path class="sc-hr" d="M118 56h13" stroke="#150B1F" stroke-width="4" stroke-linecap="round"/><path class="sc-min" d="M118 56V35" stroke="#5B2A86" stroke-width="4" stroke-linecap="round"/><circle cx="118" cy="56" r="3.4" fill="#D9A441"/>' +
      '<g class="sc-dots" fill="#5B2A86"><circle cx="198" cy="30" r="3.4"/><circle cx="210" cy="30" r="3.4"/><circle cx="222" cy="30" r="3.4"/></g>' +
      '<ellipse class="sc-shd" cx="210" cy="92" rx="18" ry="3.5" fill="#150B1F" fill-opacity=".16"/><g class="sc-bob"><circle cx="210" cy="68" r="19" fill="#D9A441"/><circle cx="202" cy="60" r="4.8" fill="#FBF1E0"/></g>';
    else h = st(98, 40, 'a') + st(226, 34, 'b') + st(238, 78, 'c') + st(84, 78, 'b') +
      '<ellipse class="sc-shd2" cx="160" cy="94" rx="22" ry="4" fill="#150B1F" fill-opacity=".18"/><g class="sc-jump"><circle cx="160" cy="68" r="22" fill="#D9A441"/><circle cx="151" cy="59" r="5.4" fill="#FBF1E0"/></g>';
    return '<svg class="scn" viewBox="0 0 320 110" role="img" aria-label="' + lab + '">' + h + '</svg>';
  }
  function live() {
    var C = window.Capacitor; if (!(window.PERLE || {}).APP || !C) return;
    var P = C.Plugins && C.Plugins.PerleLive, go = function (m, o) { try { var r = P ? P[m](o) : (C.nativePromise ? C.nativePromise('PerleLive', m, o) : null); if (r && r.catch) r.catch(function () { }); } catch (e) { } };
    var now = Date.now(), n = (dir.rdv || []).filter(function (b) { return b.status === 'confirme' && new Date(b.starts_at).getTime() - now < 8 * 36e5 && new Date(b.ends_at).getTime() > now; })[0];
    // Rappels sur le téléphone : la veille et une heure avant chaque rendez-vous confirmé à venir.
    var rem = []; (dir.rdv || []).forEach(function (x) { var t = new Date(x.starts_at).getTime(); if (x.status !== 'confirme' || t < now) return; var hm = U.hm(new Date(t)), chez = 'Chez ' + (x.pro_name || 'ta coiffeuse') + ' à ' + hm + '.'; rem.push({ id: x.ref + '-j', at: t - 864e5, title: 'Demain : ' + (x.service || 'ton rendez-vous'), body: chez }); rem.push({ id: x.ref + '-h', at: t - 36e5, title: 'Dans 1 heure : ' + (x.service || 'ton rendez-vous'), body: chez + ' Ouvre Perle pour dire que tu es en route.' }); });
    go('remind', { items: rem.filter(function (r) { return r.at > now + 5000; }) });
    if (!n) return go('end', {});
    var d = Number(n.pro_delay_min) || 0;
    go('start', { ref: n.ref, title: n.service || 'Rendez-vous', who: n.pro_name || '', note: n.pro_ready ? 'Elle t’attend' : (d ? d + ' min de retard' : (n.client_onway ? 'Tu es en route' : 'Confirmé')), step: 1 + (n.client_onway ? 1 : 0) + (n.pro_ready ? 1 : 0) + (n.pro_ready && now >= new Date(n.starts_at).getTime() + d * 60000 ? 1 : 0), startsAt: new Date(n.starts_at).getTime() + d * 60000 });
  }
  setTimeout(function () { if (!saved().length) live(); }, 2500);
  async function pollRdv() {
    if (slug || dir.view !== 'rdv' || document.hidden || !saved().length || document.querySelector('[data-sure="1"]')) return;
    var out = []; for (var r of saved()) { try { var b = await S.clientBooking(r.ref, r.phone); if (b) { b.phone = r.phone; out.push(b); } } catch (e) { return; } }
    out.sort(function (a, b) { return a.starts_at < b.starts_at ? -1 : 1; });
    var sig = function (l) { return (l || []).map(function (x) { return x.ref + x.status + (x.pro_delay_min || 0) + (x.pro_ready ? 'r' : '') + (x.client_onway ? 'o' : '') + (x.client_late_min || ''); }).join('|'); };
    if (sig(out) !== sig(dir.rdv)) { dir.rdv = out; live(); if (dir.view === 'rdv') drawDir(); }
  }
  setInterval(pollRdv, 20000); document.addEventListener('visibilitychange', pollRdv);
  var STL = { attente: 'Acompte à envoyer', confirme: 'Confirmé', annule: 'Annulé', fait: 'Fait', expire: 'Expiré' };
  function drawDir() {
    var box = document.getElementById('dir'); if (!box) return;
    if (dir.view === 'rdv') {
      if (!dir.rdv) { box.innerHTML = '<p class="mut" style="margin-top:14px">Chargement…</p>'; return; }
      if (!dir.rdv.length) { box.innerHTML = '<div class="photo-card ph" style="height:330px;margin-top:16px;background-image:url(img/bgKnotless.jpg)"><span class="plate glass" style="padding:16px"><b style="font-family:var(--hb);font-size:22px">Rien de prévu pour l’instant</b>' + (cu ? 'Tes rendez-vous s’afficheront ici dès que tu réserves.' : 'Tes rendez-vous pris depuis ce téléphone s’afficheront ici.') + '</span></div><button class="btn" data-view="home">Trouver un créneau' + ARROW + '</button>'; return; }
      var now = Date.now();
      box.innerHTML = '<div style="margin-top:16px">' + dir.rdv.map(function (b) {
        var s = new Date(b.starts_at), stt = (b.status === 'attente' && now - new Date(b.created_at).getTime() > 864e5) ? 'expire' : b.status, can = (stt === 'attente' || stt === 'confirme') && s.getTime() - now >= b.cancel_hours * 36e5, past = s.getTime() < now;
        var h = '<div class="photo-card ph" style="height:200px;' + U.bg(b.cover_url) + (b.cover_url ? '' : ';background:var(--vio)') + '"><span class="when">' + esc(U.dayS(s)) + ', ' + U.hm(s) + '</span><span class="stg glass">' + STL[stt] + '</span><span class="plate glass"><b>' + esc(b.service) + (b.options ? ', ' + esc(b.options) : '') + '</b>' + esc(b.pro_name) + (b.pro_city ? ', ' + esc(b.pro_city) : '') + '</span></div>';
        if (stt === 'attente') { var bl = payLinks(b.pay_info), bt = payText(b.pay_info); h += '<div class="due"><span>Acompte à envoyer</span><b>' + U.eur(b.deposit) + '</b><span>Référence à indiquer : <strong>' + esc(b.ref) + '</strong></span></div>'; bl.forEach(function (u, i) { h += payBtn(u, b.deposit, false, 8).replace('class="btn glass"', i ? 'class="btn dark"' : 'class="btn"').replace(';border-radius:28px', ''); }); if (bt || !bl.length) h += '<p class="due-how">' + esc(bt || 'Écris à ' + b.pro_name + ' pour savoir comment payer.') + '</p>'; h += b.paid_claimed ? '<p class="mut" style="margin-top:10px">Tu as prévenu ' + esc(b.pro_name) + ' de ton envoi. Ta place est confirmée dès réception.</p>' : '<button class="btn dark" style="margin-top:10px" data-paid="' + esc(b.ref) + '" data-phone="' + esc(b.phone) + '">J’ai envoyé l’acompte</button>'; }
        if (stt === 'attente' || stt === 'confirme' || stt === 'fait') { var sn = stt === 'attente' ? 1 : stt === 'confirme' ? 2 : 3; h += '<ol class="trk" aria-label="Où en est ton rendez-vous">' + ['Demande envoyée', 'Acompte', 'Coiffure'].map(function (t, i) { return '<li class="' + (i < sn ? 'ok' : i === sn ? 'now' : '') + '">' + t + '</li>'; }).join('') + '</ol>'; }
        h += '<p class="mut" style="margin-top:10px">' + (stt === 'attente' ? 'Prix ' + U.eur(b.price) + ', dont ' + U.eur(b.price - b.deposit) + ' à régler sur place.' : 'Prix ' + U.eur(b.price) + ', acompte ' + U.eur(b.deposit) + ', reste ' + U.eur(b.price - b.deposit) + '. Référence ' + esc(b.ref) + '.') + ((stt === 'attente' || stt === 'confirme') && !past ? ' L’acompte n’est pas remboursé si tu annules ; si c’est ' + esc(b.pro_name) + ' qui annule, il t’est rendu.' : '') + '</p>';
        if (stt === 'confirme' && s.getTime() > Date.now() - 3 * 3600e3 && s.getTime() < Date.now() + 18 * 3600e3) {
          var pn = esc(b.pro_name), dm = b.pro_delay_min || 0, cb = ' data-ref="' + esc(b.ref) + '" data-phone="' + esc(b.phone) + '"';
          var stp = [['Confirmé', 1], ['Tu es en route', b.client_onway], [pn + ' t’attend', b.pro_ready], ['C’est ton tour', b.pro_ready && Date.now() >= s.getTime() + dm * 60000]], cur = -1; stp.forEach(function (x, i) { if (cur < 0 && !x[1]) cur = i; });
          h += '<div class="livec" aria-live="polite">' + scene(b.pro_ready ? 'ready' : b.client_onway ? 'route' : dm > 0 ? 'late' : 'prep') + '<ol class="trk" aria-label="Suivi du jour" style="margin:0 0 12px">' + stp.map(function (x, i) { return '<li class="' + (x[1] ? 'ok' : i === cur ? 'now' : '') + '">' + x[0] + '</li>'; }).join('') + '</ol>' + (b.pro_ready ? '<p class="lv"><b>' + pn + ' peut te recevoir.</b> Tu peux venir.</p>' : dm > 0 ? '<p class="lv"><b>' + pn + ' a environ ' + dm + ' min de retard.</b> Pour ne pas attendre, arrive plutôt vers ' + U.hm(new Date(s.getTime() + dm * 60000)) + '.</p>' : '<p class="lv"><b>' + pn + ' est à l’heure pour l’instant.</b> Cette ligne se met à jour toute seule si son horaire bouge.</p>') +
            (b.client_onway ? '<p class="mut">Tu as indiqué que tu es en route' + (b.client_eta_min > 0 ? ' : environ ' + b.client_eta_min + ' min de trajet, ' + pn + ' est au courant' : '') + '.</p>' : '<button type="button" class="btn sm dark" data-csig="onway"' + cb + '>Je suis en route</button>') +
            '<div class="dly"><span class="mut">Tu as du retard ?</span>' + [10, 20, 30].map(function (m) { return '<button type="button" data-csig="late" data-min="' + m + '"' + cb + ' aria-pressed="' + (b.client_late_min === m) + '">+' + m + ' min</button>'; }).join('') + '</div></div>';
        }
        var soon = !past && (stt === 'attente' || stt === 'confirme');
        if (soon && b.prep) h += '<p class="note info" style="margin-top:8px;white-space:pre-line"><b>Avant de venir :</b> ' + esc(b.prep) + '</p>';
        if (b.address && stt === 'confirme') h += '<p class="note info" style="margin-top:8px"><b>Adresse :</b> ' + esc(b.address) + ' · <a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(b.address) + '" target="_blank" rel="noopener">Itinéraire</a></p>';
        var rest = Math.round((b.price - b.deposit) * 100) / 100, due = rest > 0 && ((stt === 'confirme' && past) || (stt === 'fait' && now - new Date(b.ends_at || b.starts_at).getTime() < 2 * 864e5));
        if (due) { var rl = payLinks(b.pay_info), rt = payText(b.pay_info); h += '<p class="note info" style="margin-top:8px"><b>Il reste ' + U.eur(rest) + ' à régler.</b> ' + (rl.length ? 'Touche un bouton pour l’envoyer à ' + esc(b.pro_name) + ', ou règle sur place.' : 'À régler sur place' + (rt ? ', ou : ' + esc(rt) : '.')) + '</p>'; rl.forEach(function (u) { h += payBtn(u, rest, false, 8).replace('class="btn glass"', 'class="btn"').replace(';border-radius:28px', ''); }); }
        if (stt === 'expire') h += '<p class="note err" style="margin-top:8px">L’acompte n’a pas été confirmé sous 24 h : le créneau a été libéré. Tu peux réserver à nouveau.</p>';
        if (soon && b.whatsapp) { var mn = ''; try { mn = String(JSON.parse(localStorage.getItem('perle-moi') || '{}').n || '').split(' ')[0]; } catch (e) { } var wn = String(b.whatsapp).replace(/[^0-9]/g, '').replace(/^0/, '33'), wd = U.day(s) + ' à ' + U.hm(s), wl = function (lab, txt) { return '<a class="btn sm ghost" target="_blank" rel="noopener" href="https://wa.me/' + wn + '?text=' + encodeURIComponent(txt) + '">' + lab + '</a>'; }; h += '<div class="acts" style="margin-bottom:8px">' + wl('Envoyer une photo d’inspiration', 'Bonjour, c’est ' + (mn || 'ta cliente') + ' (rendez-vous ' + wd + ', référence ' + b.ref + '). Voici la coiffure que j’aimerais :') + wl('Je voudrais déplacer', 'Bonjour, c’est ' + (mn || 'ta cliente') + ' (rendez-vous ' + wd + ', référence ' + b.ref + '). Est-ce possible de déplacer mon rendez-vous ?') + '</div>'; }
        if (stt === 'fait' && S.addReview) h += b.reviewed ? '<p class="mut" style="margin-top:8px">Ton avis est publié. Merci.</p>' : (dir.revOpen === b.ref ? revForm(b) : '<button class="btn sm" style="margin-top:8px" data-rev="' + esc(b.ref) + '">Laisser un avis</button>');
        h += '<div class="acts" style="margin-bottom:18px">' + (soon ? calBtn({ ref: b.ref, start: b.starts_at, end: b.ends_at, title: b.service + ' chez ' + b.pro_name, where: b.address || b.pro_city || '', desc: 'Référence ' + b.ref + '. Reste ' + U.eur(b.price - b.deposit) + ' à régler.' + (b.prep ? '\nAvant de venir : ' + b.prep : '') + '\nhttps://perleapp.fr/?v=rdv' }, stt === 'attente' ? 'btn sm ghost' : 'btn sm') : '') + ((stt === 'fait' || (stt === 'confirme' && past)) ? '<a class="btn sm" href="./?c=' + encodeURIComponent(b.pro_slug) + (b.service_id ? '&s=' + encodeURIComponent(b.service_id) : '') + '">Réserver à nouveau</a>' : '') + '<a class="btn sm ghost" href="./?c=' + encodeURIComponent(b.pro_slug) + '">Voir la page</a>' + ((stt === 'expire' || stt === 'annule' || stt === 'fait' || past) ? '<button class="btn sm ghost" data-rmrdv="' + esc(b.ref) + '" data-phone="' + esc(b.phone) + '">Retirer de ma liste</button>' : '') + (can ? '<button class="btn sm ghost" data-cancel="' + esc(b.ref) + '" data-phone="' + esc(b.phone) + '">Annuler</button>' : ((stt === 'attente' || stt === 'confirme') && !past ? '<span class="mut" style="align-self:center">Annulation possible jusqu’à ' + b.cancel_hours + ' h avant</span>' : '')) + '</div>';
        return h;
      }).join('') + '</div>'; return;
    }
    if (!dir.list) { box.innerHTML = dir.view === 'map' ? '' : sk(2, 220); return; }
    if (dir.view === 'fav') { var fl = favs().map(function (s) { return dir.list.filter(function (p) { return p.slug === s; })[0]; }).filter(Boolean); box.innerHTML = fl.length ? '<div class="plist" style="margin-top:14px">' + fl.map(function (p) { return prow(PI.heart, esc(p.name), esc(p.city || ''), 'href="./?c=' + encodeURIComponent(p.slug) + '"', 'a'); }).join('') + '</div>' : '<p class="note info" style="margin-top:14px">Aucun favori pour l’instant. Touche le cœur sur la page d’une coiffeuse pour la retrouver ici.</p>'; return; }
    if (!dir.list.length && dir.view !== 'map') { box.innerHTML = '<p class="note info">Les premières coiffeuses arrivent bientôt.</p>'; return; }
    if (dir.view === 'date') return drawDate(box);
    if (dir.view === 'map') return drawMap(box);
    if (dir.view === 'calc') return drawCalc(box);
    if (dir.view === 'ideas') {
      var tiles = []; dir.list.forEach(function (p) { p.services.forEach(function (s) { if (s.photo_url) tiles.push({ p: p, s: s }); }); });
      if (!tiles.length) { box.innerHTML = '<p class="note info">Pas encore de photos de coiffures.</p>'; return; }
      var cols = ['', '']; tiles.forEach(function (t, k) { cols[k % 2] += '<a class="tile ph" href="./?c=' + encodeURIComponent(t.p.slug) + '&s=' + encodeURIComponent(t.s.id) + '" style="height:' + [230, 170, 200][k % 3] + 'px;' + U.bg(t.s.photo_url) + '"><span><b>' + esc(t.s.name) + '</b>' + esc(t.p.name.split(' ')[0]) + ', dès ' + U.eur(t.s.price) + '</span></a>'; });
      box.innerHTML = '<div class="masonry"><div>' + cols[0] + '</div><div>' + cols[1] + '</div></div>'; return;
    }
    if (dir.view === 'filters') return drawFilters(box);
    if (dir.view === 'search') return drawSearch(box);
    return drawHome(box);
  }
  // ----- accueil, recherche, filtres (écrans V_Accueil, V_Recherche, V_Filtres de la maquette) -----
  var TAGL = { femme: 'Femme', homme: 'Homme', enfant: 'Enfant', chez: 'Chez elle ou lui', domicile: 'À domicile', salon: 'En salon' };
  function results(plain) {
    var k = plain ? '' : U.norm(dir.q), f = plain ? { max: null, when: 'all', pour: [], ou: [], sort: 'soon' } : dir.f, fl = f.fav ? favs() : null, n = new Date(), d0 = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
    function has(p, a) { return !a.length || a.some(function (t) { return (p.tags || []).indexOf(t) >= 0; }); }
    var l = dir.list.filter(function (p) { return (dir.cat === 'Tout' || catOf(p).indexOf(dir.cat) >= 0) && (!k || U.norm([p.name, p.city].concat(p.services.map(function (s) { return s.name; })).join(' ')).indexOf(k) >= 0) && (!fl || fl.indexOf(p.slug) >= 0) && (!f.city || p.city === f.city) && (!f.max || minPrice(p) <= f.max) && has(p, f.pour) && has(p, f.ou); })
      .map(function (p) { return { p: p, nf: dir.busy ? nextFree(p) : null, km: dir.me && p.lat != null ? U.dist(dir.me, { lat: Number(p.lat), lng: Number(p.lng) }) : null }; });
    if (dir.busy && f.when !== 'all') l = l.filter(function (x) { return x.nf && x.nf.getTime() < d0 + (f.when === 'today' ? 1 : 7) * 864e5; });
    var big = 1e15;
    return l.sort(function (a, c) { return f.sort === 'price' ? minPrice(a.p) - minPrice(c.p) : f.sort === 'near' && dir.me ? (a.km == null ? big : a.km) - (c.km == null ? big : c.km) : (a.nf ? +a.nf : big) - (c.nf ? +c.nf : big); });
  }
  function inits(p) { return String(p.name || '').split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase(); }
  function cov(p) { return p.cover_url ? U.bg(p.cover_url) : 'background:radial-gradient(circle at 28% 18%,#8A4CC2 0%,#5B2A86 42%,#2A1340 100%)'; }
  function ini(p) { return p.cover_url ? '' : '<span class="ini" aria-hidden="true">' + esc(inits(p)) + '</span>'; }
  function favs() { try { return JSON.parse(localStorage.getItem('perle-fav') || '[]'); } catch (e) { return []; } }
  I.heart = '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.600a5.500 5.500 0 0 0 0-7.800z"/>';
  function nfilters() { var f = dir.f; return (f.city ? 1 : 0) + (f.fav ? 1 : 0) + (f.max ? 1 : 0) + (f.when !== 'all' ? 1 : 0) + f.pour.length + f.ou.length + (f.sort !== 'soon' ? 1 : 0); }
  // carte photo : quartier, nom, prix, puis de petites infos (prochain créneau, nombre de prestations, lieu)
  function pcard(x, hgt) {
    var p = x.p, fv = favs().indexOf(p.slug) >= 0, ou = (p.tags || []).filter(function (t) { return t === 'domicile' || t === 'salon' || t === 'chez'; })[0], chips = [];
    if (dir.busy) chips.push(svg(I.clock, 13, 2.2) + esc(whenS(x.nf)));
    chips.push(svg(I.tagi, 13, 2.2) + p.services.length + ' prestation' + (p.services.length > 1 ? 's' : ''));
    if (x.km != null) chips.push(esc(U.near(x.km))); else if (ou) chips.push(esc({ domicile: 'À domicile', salon: 'En salon', chez: 'Chez elle ou lui' }[ou]));
    return '<div class="pwrap"><a class="photo-card ph fc' + (hgt < 260 ? ' sm' : '') + '" href="./?c=' + encodeURIComponent(p.slug) + (x.nf ? '&d=' + U.ymd(x.nf) : '') + '" style="display:block;text-decoration:none;height:' + hgt + 'px;' + cov(p) + '">' + ini(p) + '<span class="fprice"><small>à partir de</small>' + U.eur(minPrice(p)) + '</span><span class="fcb">' + (p.city ? '<span class="fcity">' + svg(I.pin, 14) + esc(p.city) + '</span>' : '') + '<span class="fname"><b>' + esc(p.name) + '</b></span><span class="fchips">' + chips.map(function (c) { return '<i>' + c + '</i>'; }).join('') + '</span></span></a><button class="heart wb2" data-fav="' + esc(p.slug) + '" aria-pressed="' + fv + '" aria-label="' + (fv ? 'Retirer des favoris : ' : 'Ajouter aux favoris : ') + esc(p.name) + '">' + svg(I.heart, 18) + '</button>' + (hgt < 260 && dir.busy && x.nf ? '<div class="slots" role="group" aria-label="Prochains créneaux chez ' + esc(p.name) + '">' + nextSlots(p, 3).map(function (t) { return '<a href="./?c=' + encodeURIComponent(p.slug) + '&d=' + U.ymd(t) + '&t=' + ('0' + t.getHours()).slice(-2) + ('0' + t.getMinutes()).slice(-2) + '">' + esc(whenS(t)) + '</a>'; }).join('') + '</div>' : '') + '</div>';
  }
  function tabs(id) { var el = document.getElementById(id); if (el) el.innerHTML = '<div class="tabs2" role="group" aria-label="Type de coiffure">' + ['Tout'].concat(cats()).map(function (c) { return '<button data-cat="' + c + '" aria-pressed="' + (dir.cat === c) + '">' + (c === 'Tout' && id === 'stabs' ? 'Toutes' : c) + '</button>'; }).join('') + '</div>'; }
  function drawHome(box) {
    tabs('chips');
    if (!dir.busy) { box.innerHTML = sk(1, 340); return loadBusyAll(); }
    var tip = document.getElementById('tip'), ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone && !AP, hid = false; try { hid = localStorage.getItem('perle-tip') === '1'; } catch (e) { }
    if (tip) tip.innerHTML = ios && !hid ? '<div class="card row" style="margin-top:14px;border-radius:24px;align-items:flex-start"><span class="grow mut" style="color:var(--ink2)"><b style="color:var(--noir)">Garde Perle comme une appli.</b><br>Touche le bouton Partager de Safari, puis « Sur l’écran d’accueil ».</span><button class="round sm" data-tipx="1" aria-label="Fermer">×</button></div>' : '';
    var l = results(true);
    if (!l.length) { box.innerHTML = '<p class="note info">Personne pour ce type de coiffure pour l’instant.</p>'; return; }
    var now = Date.now(), nx = (dir.rdv || []).filter(function (r) { return (r.status === 'confirme' || (r.status === 'attente' && now - new Date(r.created_at).getTime() < 864e5)) && new Date(r.starts_at).getTime() > now; })[0], rv = '';
    if (nx) { var s = new Date(nx.starts_at); rv = '<button class="rdvrow" data-view="rdv"><span class="dsq"><span>' + s.toLocaleDateString('fr-FR', { weekday: 'short' }) + '</span><b>' + s.getDate() + '</b></span><span class="grow"><span class="b" style="font-size:15px">Ton rendez-vous, ' + esc(s.toLocaleDateString('fr-FR', { weekday: 'long' })) + ' à ' + U.hm(s) + '</span><br><span class="mut">' + esc(nx.service) + ' chez ' + esc(nx.pro_name) + '</span></span>' + svg(I.chev, 18) + '</button>'; }
    else { var lastB = (dir.rdv || []).filter(function (r) { return r.pro_slug && (r.status === 'fait' || (r.status === 'confirme' && new Date(r.starts_at).getTime() < now)); }).pop(); if (lastB) rv = '<a class="rdvrow" style="text-decoration:none" href="./?c=' + encodeURIComponent(lastB.pro_slug) + (lastB.service_id ? '&s=' + encodeURIComponent(lastB.service_id) : '') + '"><span class="dsq">' + svg(I.cal, 20) + '</span><span class="grow"><span class="b" style="font-size:15px">Réserver à nouveau</span><br><span class="mut">' + esc(lastB.service) + ' chez ' + esc(lastB.pro_name) + '</span></span>' + svg(I.chev, 18) + '</a>'; }
    var qs = {}, ql = []; dir.list.forEach(function (p) { if (!p.city) return; if (!qs[p.city]) { qs[p.city] = { city: p.city, n: 0, img: '' }; ql.push(qs[p.city]); } qs[p.city].n++; if (!qs[p.city].img) qs[p.city].img = p.cover_url || ''; }); ql.sort(function (a, c) { return c.n - a.n; });
    box.innerHTML = '<div class="feat" id="feat">' + l.slice(0, 8).map(function (x) { return pcard(x, 340); }).join('') + '</div>' + (l.length ? '<button class="mapcta" data-view="map"><span class="mapcta-i">' + svg(I.map, 22) + '</span><span class="grow"><b>Coiffeuses autour de toi</b><span>' + l.length + ' coiffeuse' + (l.length > 1 ? 's' : '') + ' sur la carte, avec leur prochain créneau</span></span><span class="go">' + svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 16, 2.2) + '</span></button>' : '') + (function () { var d1 = new Date(); d1.setHours(24, 0, 0, 0); var n = l.filter(function (x) { return x.nf && x.nf.getTime() < d1.getTime(); }).length; return n ? '<button class="rdvrow" data-today="1"><span class="dsq">' + svg(I.clock, 20) + '</span><span class="grow"><span class="b" style="font-size:15px">Libre aujourd’hui</span><br><span class="mut">' + n + ' coiffeuse' + (n > 1 ? 's ont' : ' a') + ' encore un créneau aujourd’hui</span></span>' + svg(I.chev, 18) + '</button>' : ''; })() + rv +
      (ql.length > 1 ? '<div class="row" style="justify-content:space-between;align-items:baseline;margin:20px 0 12px"><h2 style="margin:0">Par quartier</h2></div><div class="qrow">' + ql.map(function (q) { return '<button data-qcity="' + esc(q.city) + '">' + (q.img ? '<span class="qimg ph" style="' + U.bg(q.img) + '"></span>' : '<span class="qimg noi">' + esc(q.city.charAt(0)) + '</span>') + esc(q.city) + '</button>'; }).join('') + '</div>' : '') +
      (l.length > 1 ? '<button class="btn ghost" style="margin-top:18px" data-view="search">Voir les ' + l.length + ' coiffeuses' + ARROW + '</button>' : '');
    var ft = document.getElementById('feat'); if (ft) ft.scrollLeft = 0;
  }
  function drawSearch(box) {
    if (!dir.busy) loadBusyAll();
    var f = dir.f, near = dir.me && f.sort === 'near', fc = document.getElementById('fcity');
    if (fc && dir.list && fc.options.length < 2) { var seenC = {}; fc.innerHTML = '<option value="">Tous les quartiers</option>' + dir.list.map(function (p) { return p.city; }).filter(function (c) { return c && !seenC[c] && (seenC[c] = 1); }).sort().map(function (c) { return '<option>' + esc(c) + '</option>'; }).join(''); }
    if (fc) fc.value = f.city || ''; var fw = document.getElementById('fwhen'); if (fw) fw.value = f.when; var fp = document.getElementById('fpour'); if (fp) fp.value = f.pour.length === 1 ? f.pour[0] : ''; var fb2 = document.getElementById('fbud'); if (fb2) fb2.value = f.max && [40, 60, 80, 100].indexOf(f.max) >= 0 ? String(f.max) : '';
    tabs('stabs');
    var c2 = document.getElementById('chips2');
    if (c2) c2.innerHTML = '<div class="chips" style="margin-top:14px">' + (AP || !navigator.geolocation ? '' : '<button class="pill" data-near="1" aria-pressed="' + !!near + '">Près de moi</button>') + '<button class="pill" data-view="date" style="gap:7px">' + svg(I.cal, 16) + 'Choisir une date</button>' + (favs().length || f.fav ? '<button class="pill" data-favonly="1" aria-pressed="' + !!f.fav + '" style="gap:7px">' + svg(I.heart, 15) + 'Favoris</button>' : '') + '<button class="pill' + (nfilters() ? ' dot' : '') + '" data-view="filters" id="fbtn" style="gap:7px">' + svg(I.filt, 16) + 'Plus de filtres</button><button class="pill" data-view="calc">Comparer les prix</button></div>';
    if (!dir.busy) { box.innerHTML = sk(3, 220); return; }
    var l = results();
    box.innerHTML = (dir.geoErr ? '<p class="note info">Localisation refusée ou indisponible. Les coiffeuses restent classées par disponibilité.</p>' : '') + '<div class="row" style="justify-content:space-between;margin:16px 0 12px"><h2 style="margin:0">' + l.length + ' coiffeuse' + (l.length > 1 ? 's' : '') + (near ? ' près de toi' : '') + '</h2><span class="seg" role="group" aria-label="Affichage"><button aria-pressed="true" data-view="search">' + svg(I.list, 15, 2.2) + 'Liste</button><button data-view="map">' + svg(I.map, 15, 2.2) + 'Carte</button></span></div>' + (l.length ? l.map(function (x) { return pcard(x, 230); }).join('') : '<p class="note info">Aucun résultat. Essaie un autre mot, ou enlève des filtres.</p>' + (nfilters() || dir.cat !== 'Tout' ? '<button class="btn ghost" style="margin-top:10px" data-fclear="1">Enlever les filtres</button>' : ''));
  }
  function fbar() { var n = results().length; setBar(n + ' coiffeuse' + (n > 1 ? 's' : ''), 'sur ' + dir.list.length, 'Voir', function () { dir.view = 'search'; landing(); window.scrollTo(0, 0); }); }
  function drawFilters(box) {
    if (!dir.busy) loadBusyAll();
    var f = dir.f, pr = dir.list.map(minPrice), lo = Math.floor(Math.min.apply(0, pr) / 5) * 5, hi = Math.ceil(Math.max.apply(0, pr) / 5) * 5;
    function grp(t, items) { return '<div class="fgrp"><span class="flab">' + t + '</span><div class="pills" role="group" aria-label="' + t + '">' + items.join('') + '</div></div>'; }
    function one(k, v, l) { return '<button class="pill fp" data-f="' + k + ':' + v + '" aria-pressed="' + (f[k] === v) + '">' + l + '</button>'; }
    function many(k, v) { return '<button class="pill fp" data-f="' + k + ':' + v + '" aria-pressed="' + (f[k].indexOf(v) >= 0) + '">' + TAGL[v] + '</button>'; }
    box.innerHTML = (hi > lo ? '<div class="fgrp"><span class="row" style="justify-content:space-between;align-items:baseline"><label class="flab" for="fmax" style="margin:0">Budget maximum</label><span class="big" id="fmaxv">' + (f.max ? U.eur(f.max) : 'Sans limite') + '</span></span><input type="range" id="fmax" min="' + lo + '" max="' + hi + '" step="5" value="' + (f.max || hi) + '"></div>' : '') +
      grp('Quand', [one('when', 'all', 'Peu importe'), one('when', 'today', 'Aujourd’hui'), one('when', 'week', 'Cette semaine'), '<button class="pill fp" data-view="date">Choisir une date</button>']) +
      (cats().length ? grp('Type de coiffure', cats().map(function (x) { return '<button class="pill fp" data-cat="' + x + '" aria-pressed="' + (dir.cat === x) + '">' + x + '</button>'; })) : '') +
      grp('Où', ['chez', 'domicile', 'salon'].map(function (v) { return many('ou', v); })) + grp('Pour', ['femme', 'homme', 'enfant'].map(function (v) { return many('pour', v); })) +
      grp('Trier par', [one('sort', 'soon', 'Dispo le plus tôt'), one('sort', 'price', 'Moins chères')].concat(dir.me ? [one('sort', 'near', 'Plus proches')] : []));
    fbar();
  }
  function missing() { app.innerHTML = top() + '<h1>Cette page n’existe pas.</h1><p class="sub">Vérifie le lien que la coiffeuse t’a envoyé.</p>'; setBar(); }

  var SCREENS = { home: home, options: options, slot: slot, me: me, done: done };
  function go(step) { var so = ['home', 'options', 'slot', 'me', 'done']; app.setAttribute('data-dir', so.indexOf(step) < so.indexOf(st.step || 'home') ? 'back' : 'fwd'); st.step = step; try { var own2 = localStorage.getItem('perle-own'), sk2 = 'perle-step-' + slug + '-' + step; if (S.step && slug && step !== 'home' && own2 !== slug && !sessionStorage.getItem(sk2)) { sessionStorage.setItem(sk2, '1'); S.step(slug, step).catch(function () { }); } } catch (e) { } app.classList.add('bkf'); app.setAttribute('data-step', step); document.body.classList.toggle('dark', step === 'done'); SCREENS[step](); anim(); window.scrollTo(0, 0); }
  async function loadBusy() {
    try { st.busy = await S.busy(slug, new Date().toISOString(), new Date(Date.now() + 29 * 864e5).toISOString()) || []; } catch (e) { st.busy = []; }
    if (st.step === 'slot') slot();
  }

  app.addEventListener('change', function (e) {
    var id = e.target.id, v = e.target.value;
    if (id === 'fcat') { dir.cat = v; return drawDir(); }
    if (id === 'fcity') { dir.f.city = v; return drawDir(); }
    if (id === 'fwhen') { if (v === 'date') { dir.view = 'date'; landing(); return window.scrollTo(0, 0); } dir.f.when = v; return drawDir(); }
    if (id === 'fpour') { dir.f.pour = v ? [v] : []; return drawDir(); }
    if (id === 'fbud') { dir.f.max = v ? +v : null; return drawDir(); }
  });
  app.addEventListener('input', function (e) { if (e.target.id === 'fmax') { var v = +e.target.value; dir.f.max = v >= +e.target.max ? null : v; document.getElementById('fmaxv').textContent = dir.f.max ? U.eur(dir.f.max) : 'Sans limite'; fbar(); } });
  app.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.go) return go(b.dataset.go);
    if (b.dataset.coa) { b.disabled = true; return S.oauth(b.dataset.coa, location.origin + location.pathname + (b.dataset.to || '')).then(function () { if ((window.PERLE || {}).APP) b.disabled = false; }).catch(function () { b.disabled = false; }); }
    if (b.dataset.msave) { var mv = function (i) { return String(document.getElementById(i).value || '').trim(); }, mo = {}; try { mo = JSON.parse(localStorage.getItem('perle-moi') || '{}'); } catch (x) { } mo.n = mv('mn'); mo.t = mv('mt'); mo.e = mv('mm'); var mk = document.getElementById('mok'); if (mo.e && !/^\S+@\S+\.\S+$/.test(mo.e)) { mk.textContent = 'Vérifie ton e-mail : il manque quelque chose.'; return; } try { localStorage.setItem('perle-moi', JSON.stringify(mo)); mk.textContent = 'C’est enregistré.'; } catch (x) { mk.textContent = 'Impossible d’enregistrer sur ce téléphone.'; } return; }
    if (b.dataset.mclear) { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.querySelector('b').textContent = 'Touche encore pour confirmer'; return; } try { localStorage.removeItem('perle-moi'); } catch (x) { } dir.view = 'moi'; return landing(); }
    if (b.dataset.fav) { var fs = b.dataset.fav, fa = favs(), fi = fa.indexOf(fs), fon = fi < 0; if (fon) fa.unshift(fs); else fa.splice(fi, 1); try { localStorage.setItem('perle-fav', JSON.stringify(fa.slice(0, 100))); } catch (x) { } if (cu && S.setFav) S.setFav(fs, fon).catch(function () { }); b.outerHTML = favBtn(fs); return; }
    if (b.dataset.rev) { dir.revOpen = b.dataset.rev; dir.revN = 0; return drawDir(); }
    if (b.dataset.star) { dir.revN = +b.dataset.star; Array.prototype.forEach.call(b.parentNode.children, function (x) { x.setAttribute('aria-pressed', +x.dataset.star <= dir.revN); }); return; }
    if (b.dataset.revsend) { var rm = document.getElementById('rvm'); if (!dir.revN) { rm.textContent = 'Choisis d’abord une note, de 1 à 5 étoiles.'; return; } b.disabled = true; var rref = b.dataset.revsend; return S.addReview(rref, b.dataset.phone, dir.revN, document.getElementById('rvt').value).then(function () { (dir.rdv || []).forEach(function (x) { if (x.ref === rref) x.reviewed = true; }); dir.revOpen = null; drawDir(); }).catch(function (er) { b.disabled = false; rm.textContent = /DEJA/.test(String(er && er.message)) ? 'Tu as déjà donné ton avis pour ce rendez-vous.' : 'L’avis n’a pas pu être envoyé. Réessaie dans un instant.'; }); }
    if (b.dataset.alert) { var am = document.getElementById('alm'), ae = String(document.getElementById('ale').value || '').trim(); if (!/^\S+@\S+\.\S+$/.test(ae)) { am.textContent = 'Écris ton e-mail pour être prévenue.'; return; } b.disabled = true; return S.addAlert(slug, ae, pme().n || '').then(function () { am.textContent = 'C’est noté : tu recevras un e-mail dès qu’un créneau se libère.'; }).catch(function () { b.disabled = false; am.textContent = 'L’alerte n’a pas pu être enregistrée. Réessaie dans un instant.'; }); }
    if (b.dataset.delacct) { var dm = document.getElementById('pdm'); if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Touche encore pour supprimer définitivement'; dm.textContent = 'Ton compte, tes favoris et le lien avec tes rendez-vous seront effacés. C’est irréversible.'; return; } b.disabled = true; return S.deleteAccount().then(function (r) { if (r === 'OK') { ['perle-moi', 'perle-rdv', 'perle-fav'].forEach(function (k) { try { localStorage.removeItem(k); } catch (x) { } }); return S.signOut().catch(function () { }).then(function () { cu = null; drawAcct(); }); } b.disabled = false; b.dataset.sure = ''; b.textContent = 'Supprimer mon compte'; dm.textContent = r === 'RDV' ? 'Tu as des rendez-vous à venir en tant que coiffeuse. Annule-les ou attends qu’ils soient passés, puis réessaie.' : 'La suppression n’a pas abouti. Écris-nous à contact@perleapp.fr.'; }).catch(function () { b.disabled = false; dm.textContent = 'La suppression n’a pas abouti. Écris-nous à contact@perleapp.fr.'; }); }
    if (b.dataset.rmrdv) { var rr = b.dataset.rmrdv, rp = b.dataset.phone; try { localStorage.setItem('perle-rdv', JSON.stringify(saved().filter(function (x) { return x.ref !== rr; }))); } catch (x) { } dir.rdv = (dir.rdv || []).filter(function (x) { return x.ref !== rr; }); if (S.hideBooking) S.hideBooking(rr, rp).catch(function () { }); return drawDir(); }
    if (b.dataset.guest) { dir.guest = true; return drawAcct(); }
    if (b.dataset.cout) { return S.signOut().then(function () { cu = null; drawAcct(); }); }
    if (b.dataset.csig) {
      b.disabled = true; var cs = b.dataset, bk = (dir.rdv || []).filter(function (x) { return x.ref === cs.ref; })[0];
      var send = function (mn) { return S.clientSignal(cs.ref, cs.phone, cs.csig, mn).then(function () { (dir.rdv || []).forEach(function (x) { if (x.ref === cs.ref) { if (cs.csig === 'onway') { x.client_onway = true; x.client_eta_min = mn; } else x.client_late_min = +cs.min; } }); live(); drawDir(); }).catch(function () { b.disabled = false; }); };
      if (cs.csig !== 'onway' || !navigator.geolocation || !bk || bk.pro_lat == null || bk.pro_lng == null) return send(+cs.min || 0);
      // « Je suis en route » : la position est lue une seule fois, pour estimer le trajet. Elle n'est ni suivie ni enregistrée.
      b.textContent = 'Calcul du trajet…';
      return new Promise(function (res) { navigator.geolocation.getCurrentPosition(function (p) { var R = Math.PI / 180, a = Math.sin((bk.pro_lat - p.coords.latitude) * R / 2), c = Math.sin((bk.pro_lng - p.coords.longitude) * R / 2), km = 12742 * Math.asin(Math.sqrt(a * a + Math.cos(p.coords.latitude * R) * Math.cos(bk.pro_lat * R) * c * c)); res(Math.max(3, Math.min(90, Math.round(km * 4.5 + 4)))); }, function () { res(0); }, { timeout: 7000, maximumAge: 60000 }); }).then(send);
    }
    if (b.dataset.paid) { b.disabled = true; return S.claimPaid(b.dataset.paid, b.dataset.phone).then(function () { b.outerHTML = '<p class="' + (st.done ? 'soft' : 'mut') + '" style="margin-top:10px"><svg class="okc" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M7.5 12.5l3 3 6-6.5"></path></svg>C’est noté, ta coiffeuse est prévenue. Ta place est confirmée dès réception de l’acompte.</p>'; (dir.rdv || []).forEach(function (x) { if (x.ref === b.dataset.paid) x.paid_claimed = true; }); }).catch(function () { b.disabled = false; }); }
    if (b.dataset.view) { if (dir.view === 'open') { try { localStorage.setItem('perle-vu', '1'); } catch (x) { } } dir.view = b.dataset.view; landing(); return window.scrollTo(0, 0); }
    if (b.dataset.fav) { var fl2 = favs(), fi = fl2.indexOf(b.dataset.fav); fi >= 0 ? fl2.splice(fi, 1) : fl2.push(b.dataset.fav); try { localStorage.setItem('perle-fav', JSON.stringify(fl2.slice(-60))); } catch (x) { } b.setAttribute('aria-pressed', fi < 0); if (dir.f.fav || dir.view === 'search') drawDir(); return; }
    if (b.dataset.favonly) { dir.f.fav = !dir.f.fav; return drawDir(); }
    if (b.dataset.city) { dir.cityOpen = !dir.cityOpen; return drawDir(); }
    if (b.dataset.cityv != null) return goCity(b.dataset.cityv);
    if (b.dataset.qcity) { dir.f.city = b.dataset.qcity; dir.view = 'search'; landing(); return window.scrollTo(0, 0); }
    if (b.dataset.sheet) { sheet(); return; }
    if (b.dataset.today) { dir.f.when = 'today'; dir.view = 'search'; landing(); window.scrollTo(0, 0); return; }
    if (b.dataset.res) { var rs = document.getElementById('chips2'); if (rs) rs.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (b.dataset.tipx) { try { localStorage.setItem('perle-tip', '1'); } catch (x) { } return drawDir(); }
    if (b.dataset.fclear) { dir.f = { city: '', fav: false, max: null, when: 'all', pour: [], ou: [], sort: 'soon' }; dir.cat = 'Tout'; dir.q = ''; var qi = document.getElementById('q'); if (qi) qi.value = ''; return drawDir(); }
    if (b.dataset.f) { var kv = b.dataset.f.split(':'), fk = kv[0], fv = kv[1]; if (fk === 'pour' || fk === 'ou') { var ix = dir.f[fk].indexOf(fv); ix >= 0 ? dir.f[fk].splice(ix, 1) : dir.f[fk].push(fv); } else dir.f[fk] = fv; var yf = window.scrollY; drawDir(); return window.scrollTo(0, yf); }
    if (b.dataset.near) { if (dir.me && dir.f.sort === 'near') { dir.f.sort = 'soon'; return drawDir(); } if (dir.me) { dir.f.sort = 'near'; return drawDir(); } b.disabled = true; return navigator.geolocation.getCurrentPosition(function (pos) { dir.me = { lat: pos.coords.latitude, lng: pos.coords.longitude }; dir.f.sort = 'near'; dir.geoErr = false; drawDir(); }, function () { dir.geoErr = true; drawDir(); }, { timeout: 10000, maximumAge: 6e5 }); }
    if (b.dataset.cat) { dir.cat = (dir.view !== 'home' && dir.cat === b.dataset.cat) ? 'Tout' : b.dataset.cat; if (dir.view === 'map') { dir.sel = ''; refreshMarks(); dir.carKey = ''; } return drawDir(); }
    if (b.dataset.fday) { dir.day = days()[+b.dataset.fday]; return drawDir(); }
    if (b.dataset.mom) { dir.mom = b.dataset.mom; return drawDir(); }
    if (b.dataset.locate) return locate(b);
    if (b.dataset.ck) { dir.ck = b.dataset.ck; dir.csel = {}; return drawDir(); }
    if (b.dataset.cg) { dir.csel[b.dataset.cg] = b.dataset.cc; return drawDir(); }
    if (b.dataset.cancel) {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Confirmer : l’acompte ne sera pas remboursé'; return; }
      b.disabled = true; return S.cancelBooking(b.dataset.cancel, b.dataset.phone).then(loadRdv).catch(function (er) { b.outerHTML = '<span class="mut" style="align-self:center">' + esc(U.msg(er)) + '</span>'; });
    }
    if (b.dataset.tab) { st.tab = b.dataset.tab; return home(); }
    if (b.dataset.svc) return pick(+b.dataset.svc);
    if (b.dataset.g) { st.choices[+b.dataset.g] = +b.dataset.c; st.time = null; var y = window.scrollY; options(); return window.scrollTo(0, y); }
    if (b.dataset.day) { st.day = days()[+b.dataset.day]; st.time = null; st.wantDay = null; var y2 = window.scrollY; slot(); return window.scrollTo(0, y2); }
    if (b.dataset.time) { st.time = new Date(+b.dataset.time); var y3 = window.scrollY; slot(); return window.scrollTo(0, y3); }
  });

  (async function () {
    var stopId = new URLSearchParams(location.search).get('stop');
    if (stopId && S.removeAlert) { try { await S.removeAlert(stopId); } catch (e) { } app.innerHTML = top() + '<h1>C’est noté.</h1><p class="sub">Tu ne recevras plus d’alerte pour cette coiffeuse.</p><a class="btn" style="margin-top:18px" href="./">Aller sur Perle</a>'; return; }
    initAcct();
    if (!slug) return landing();
    try {
      st.pro = await S.getPro(slug);
      if (!st.pro) return missing();
      document.title = 'Réserver chez ' + st.pro.name + ' · Perle';
      try { var own = localStorage.getItem('perle-own'), hk = 'perle-hit-' + slug; if (S.hit && own !== slug && !sessionStorage.getItem(hk)) { sessionStorage.setItem(hk, '1'); S.hit(slug).catch(function () { }); } } catch (e) { }
      st.svcs = await S.services(st.pro.id) || []; try { st.doneN = S.proDone ? (await S.proDone(slug)) || 0 : 0; } catch (e) { st.doneN = 0; } try { st.revs = S.proReviews ? await S.proReviews(slug) : null; } catch (e) { st.revs = null; }
      await loadBusy(); var want = window.PERLE_SVC != null ? window.PERLE_SVC : new URLSearchParams(location.search).get('s'), wi = -1; st.svcs.forEach(function (s, i) { if (want && String(s.id) === String(want)) wi = i; });
      var wd = window.PERLE_DAY != null ? window.PERLE_DAY : new URLSearchParams(location.search).get('d'), dm = /^(\d{4})-(\d\d)-(\d\d)$/.exec(wd || ''); if (dm) st.day = st.wantDay = new Date(+dm[1], +dm[2] - 1, +dm[3]);
      var wt = window.PERLE_T != null ? window.PERLE_T : new URLSearchParams(location.search).get('t'), tm = /^(\d\d)(\d\d)$/.exec(wt || ''); if (tm) st.wantT = +tm[1] * 60 + +tm[2];
      var wo = window.PERLE_OPT != null ? window.PERLE_OPT : new URLSearchParams(location.search).get('o');
      if (wi >= 0) pick(wi, wo ? String(wo).split(',') : null); else go('home');
    } catch (e) { app.innerHTML = top() + '<p class="note err" role="alert">Impossible de charger la page. Vérifie ta connexion et recharge.</p>'; }
  })();
})();
