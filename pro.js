// Espace de la coiffeuse : compte, profil, prestations, horaires, rendez-vous.
(function () {
  var S = Perle.store, U = Perle.U, esc = U.esc;
  var app = document.getElementById('app');
  var st = { user: null, pro: null, tab: 'rdv', svcs: [], rdv: [], edit: null, msg: null };
  var DAYS = [['1', 'Lundi'], ['2', 'Mardi'], ['3', 'Mercredi'], ['4', 'Jeudi'], ['5', 'Vendredi'], ['6', 'Samedi'], ['0', 'Dimanche']];
  var LAB = { attente: 'Acompte attendu', confirme: 'Confirmé', annule: 'Annulé', fait: 'Fait' };

  function top() { return '<div class="top"><a class="logo" href="./">perle</a>' + (S.live ? '' : '<span class="badge">Mode essai</span>') + '</div>'; }
  function note() { var m = st.msg; st.msg = null; return m ? '<p class="note ' + m[0] + '" role="' + (m[0] === 'err' ? 'alert' : 'status') + '">' + esc(m[1]) + '</p>' : ''; }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  function link() { var base = location.href.split(/[?#]/)[0].replace(/[^\/]*$/, ''); return (window.PERLE || {}).LIENS_COURTS ? location.origin + '/' + st.pro.slug : base + '?c=' + st.pro.slug; }

  // ----- compte -----
  function auth() {
    app.innerHTML = top() + '<h1>Ton espace <span class="hl">coiffeuse</span>.</h1><p class="sub">Crée ta page de réservation et reçois tes rendez-vous avec acompte.</p>' + note() +
      '<form id="fa"><label for="em">Ton e-mail</label><input id="em" type="email" autocomplete="email" required>' +
      '<label for="pw">Ton mot de passe (8 caractères au moins)</label><input id="pw" type="password" autocomplete="current-password" minlength="8" required>' +
      '<button class="btn" style="margin-top:18px" data-act="in">Me connecter</button><button class="btn ghost" style="margin-top:10px" data-act="up">Créer mon compte</button></form>' +
      (S.live ? '' : '<p class="note info">Mode essai : n’importe quel e-mail fonctionne et tout reste dans ce navigateur.</p>');
  }
  // ----- profil -----
  function profile(first) {
    var p = st.pro || { name: '', slug: '', city: '', bio: '', whatsapp: '', pay_info: '', deposit_pct: 30 };
    return (first ? '<h1>Ta <span class="hl">page</span>.</h1><p class="sub">Ces informations s’affichent sur ton lien de réservation.</p>' : '') + note() +
      '<form id="fp"><label for="pn">Ton nom ou celui de ton activité</label><input id="pn" type="text" maxlength="60" required value="' + esc(p.name) + '">' +
      '<label for="ps">Le nom de ton lien</label><input id="ps" type="text" maxlength="30" required pattern="[a-z0-9-]{3,30}" placeholder="awabraids" value="' + esc(p.slug) + '"><span class="mut">Lettres minuscules, chiffres et tirets, 3 caractères au moins.</span>' +
      '<label for="pc">Ta ville ou ton quartier</label><input id="pc" type="text" maxlength="60" placeholder="Paris 19e" value="' + esc(p.city) + '">' +
      '<label for="pb">Quelques mots sur toi (facultatif)</label><textarea id="pb" maxlength="400">' + esc(p.bio) + '</textarea>' +
      '<label for="pw2">Ton numéro WhatsApp (facultatif)</label><input id="pw2" type="tel" maxlength="20" placeholder="06 12 34 56 78" value="' + esc(p.whatsapp) + '">' +
      '<label for="pd">Acompte demandé, en % du prix</label><input id="pd" type="number" min="0" max="100" step="5" value="' + esc(p.deposit_pct) + '">' +
      '<label for="pp">Comment la cliente te paie l’acompte</label><textarea id="pp" maxlength="300" placeholder="Exemple : Lydia ou Wero au 06 12 34 56 78, ou ton lien PayPal. Indique la référence du rendez-vous.">' + esc(p.pay_info) + '</textarea><span class="mut">Si tu colles un lien, la cliente voit un bouton « Payer ».</span>' +
      '<button class="btn" style="margin-top:18px">' + (first ? 'Créer ma page' : 'Enregistrer') + '</button></form>';
  }
  // ----- prestations -----
  function optText(o) { return (o || []).map(function (g) { return g.group + ': ' + (g.choices || []).map(function (c) { var s = c.label; if (Number(c.plus)) s += ' +' + c.plus; if (Number(c.minutes)) s += ' ' + (c.minutes > 0 ? '+' : '') + c.minutes + 'min'; return s; }).join(', '); }).join('\n'); }
  function optParse(t) {
    return String(t || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var i = l.indexOf(':'); if (i < 1) return null;
      var ch = l.slice(i + 1).split(',').map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) {
        var plus = 0, min = 0;
        x = x.replace(/([+-]\s*\d+)\s*min\b/i, function (_, n) { min = parseInt(n.replace(/\s/g, ''), 10); return ''; });
        x = x.replace(/\+\s*(\d+(?:[.,]\d+)?)\s*€?/, function (_, n) { plus = parseFloat(n.replace(',', '.')); return ''; });
        return { label: x.trim().slice(0, 30), plus: plus, minutes: min };
      }).filter(function (c) { return c.label; });
      return ch.length ? { group: l.slice(0, i).trim().slice(0, 40), choices: ch.slice(0, 8) } : null;
    }).filter(Boolean).slice(0, 5);
  }
  function services() {
    var h = note();
    if (st.edit) {
      var s = st.edit;
      return h + '<form id="fs"><h2>' + (s.id ? 'Modifier la prestation' : 'Nouvelle prestation') + '</h2><label for="sn">Nom</label><input id="sn" type="text" maxlength="60" required placeholder="Knotless braids" value="' + esc(s.name || '') + '">' +
        '<div class="grid2"><div><label for="sp">Prix de base, en €</label><input id="sp" type="number" min="0" max="2000" step="1" required value="' + esc(s.price == null ? '' : s.price) + '"></div><div><label for="sm">Durée, en minutes</label><input id="sm" type="number" min="15" max="720" step="15" required value="' + esc(s.minutes || '') + '"></div></div>' +
        '<label for="so">Options (facultatif), une ligne par choix à faire</label><textarea id="so" style="min-height:120px" placeholder="Taille: S, M +10, L +25&#10;Longueur: Épaules, Milieu du dos +15 +60min">' + esc(optText(s.options)) + '</textarea><span class="mut">Après chaque option : « +10 » ajoute 10 € au prix, « +60min » ajoute une heure. La première option est celle de base.</span>' +
        '<button class="btn" style="margin-top:18px">Enregistrer</button><button type="button" class="btn ghost" style="margin-top:10px" data-act="cancel">Annuler</button>' + (s.id ? '<button type="button" class="btn ghost" style="margin-top:10px;color:var(--err)" data-act="del">Supprimer cette prestation</button>' : '') + '</form>';
    }
    if (!st.svcs.length) h += '<p class="note info">Ajoute ta première prestation pour que tes clientes puissent réserver.</p>';
    st.svcs.forEach(function (s, i) {
      h += '<button class="svc" data-edit="' + i + '"><span class="grow"><span class="b">' + esc(s.name) + '</span><br><span class="mut">' + U.dur(s.minutes) + ((s.options || []).length ? ', ' + s.options.length + ' option' + (s.options.length > 1 ? 's' : '') : '') + '</span></span><span class="big">' + U.eur(s.price) + '</span></button>';
    });
    return h + '<button class="btn dark" data-act="new">Ajouter une prestation</button>';
  }
  // ----- horaires -----
  function hours() {
    var H = st.pro.hours || {}, h = note() + '<form id="fh"><h2>Tes jours et heures de travail</h2>';
    DAYS.forEach(function (d) {
      var r = (H[d[0]] || [])[0];
      h += '<div class="hours"><label class="check" style="margin:0;color:inherit"><input type="checkbox" id="on' + d[0] + '"' + (r ? ' checked' : '') + '>' + d[1].slice(0, 3) + '.</label><input type="time" id="a' + d[0] + '" aria-label="' + d[1] + ', début" value="' + (r ? r[0] : '09:00') + '"><input type="time" id="b' + d[0] + '" aria-label="' + d[1] + ', fin" value="' + (r ? r[1] : '18:00') + '"></div>';
    });
    h += '<label for="hs">Un créneau proposé toutes les</label><select id="hs">' + [15, 30, 60].map(function (n) { return '<option value="' + n + '"' + (st.pro.slot_step === n ? ' selected' : '') + '>' + n + ' minutes</option>'; }).join('') + '</select>';
    return h + '<button class="btn" style="margin-top:18px">Enregistrer</button></form>';
  }
  // ----- rendez-vous -----
  function rdv() {
    var now = Date.now(), up = st.rdv.filter(function (b) { return new Date(b.ends_at).getTime() >= now && b.status !== 'annule'; }), old = st.rdv.filter(function (b) { return up.indexOf(b) < 0; }).reverse();
    var h = note() + '<div class="vio"><span class="mut">Ton lien de réservation, à mettre dans ta bio</span><div class="b" style="font-size:18px;word-break:break-all;margin:4px 0 12px">' + esc(link().replace(/^https?:\/\//, '')) + '</div><div class="row"><button class="btn sm" data-act="copy">Copier le lien</button><a class="btn sm ghost" href="' + esc(link()) + '" target="_blank" rel="noopener" style="color:var(--noir)">Voir ma page</a></div></div>';
    h += '<h2>À venir</h2>';
    if (!up.length) h += '<p class="note info">Pas encore de rendez-vous. Partage ton lien pour recevoir ta première réservation.</p>';
    function card(b) {
      var s = new Date(b.starts_at), c = '<div class="card" style="margin-bottom:10px"><div class="row"><span class="grow"><span class="b">' + esc(U.day(s)) + ', ' + U.hm(s) + '</span><br><span class="mut">' + esc(b.service_name) + (b.options_text ? ', ' + esc(b.options_text) : '') + '</span></span><span class="st ' + esc(b.status) + '">' + LAB[b.status] + '</span></div>';
      c += '<div class="line" style="margin-top:8px"><span>' + esc(b.client_name) + ', <a class="link" href="tel:' + esc(b.client_phone) + '">' + esc(b.client_phone) + '</a></span><span class="b">' + U.eur(b.price) + '</span></div><div class="mut">Référence ' + esc(b.ref) + ', acompte de ' + U.eur(b.deposit) + ', reste ' + U.eur(b.price - b.deposit) + '</div>';
      if (b.note) c += '<div class="mut" style="margin-top:6px">« ' + esc(b.note) + ' »</div>';
      var a = '';
      if (b.status === 'attente') a += '<button class="btn sm" data-st="confirme" data-id="' + esc(b.id) + '">Acompte reçu</button>';
      if (b.status === 'confirme' && s.getTime() < now) a += '<button class="btn sm dark" data-st="fait" data-id="' + esc(b.id) + '">Rendez-vous fait</button>';
      if (b.status === 'attente' || b.status === 'confirme') a += '<button class="btn sm ghost" data-st="annule" data-id="' + esc(b.id) + '">Annuler</button>';
      return c + (a ? '<div class="acts">' + a + '</div>' : '') + '</div>';
    }
    up.forEach(function (b) { h += card(b); });
    if (old.length) { h += '<h2>Passés ou annulés</h2>'; old.slice(0, 20).forEach(function (b) { h += card(b); }); }
    return h;
  }

  function render() {
    if (!st.user) return auth();
    if (!st.pro) { app.innerHTML = top() + profile(true); return; }
    var T = [['rdv', 'Rendez-vous'], ['svc', 'Prestations'], ['hrs', 'Horaires'], ['pro', 'Ma page']];
    var h = top() + '<h1>Bonjour, <span class="hl">' + esc(st.pro.name.split(' ')[0]) + '</span>.</h1><div class="tabs" role="tablist">' + T.map(function (t) { return '<button class="tab" role="tab" aria-selected="' + (st.tab === t[0]) + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    h += '<div style="margin-top:14px">' + ({ rdv: rdv, svc: services, hrs: hours, pro: function () { return profile(false) + '<button class="btn ghost" style="margin-top:10px" data-act="out">Me déconnecter</button>'; } })[st.tab]() + '</div>';
    app.innerHTML = h;
  }
  async function refresh() {
    st.user = await S.session();
    if (st.user) { st.pro = await S.myPro(); if (st.pro) { st.svcs = await S.myServices() || []; st.rdv = await S.myBookings() || []; } }
    render();
  }
  function fail(e) { st.msg = ['err', e && e.code === '23505' ? 'Ce lien est déjà pris. Choisis-en un autre.' : (e && e.message && /Invalid login|invalid/i.test(e.message) ? 'E-mail ou mot de passe incorrect.' : (e && e.message && /registered|exists/i.test(e.message) ? 'Un compte existe déjà avec cet e-mail. Connecte-toi.' : 'Ça n’a pas marché. Vérifie ta connexion et réessaie.'))]; render(); }

  app.addEventListener('click', async function (e) {
    var b = e.target.closest('button'); if (!b) return;
    try {
      if (b.dataset.tab) { st.tab = b.dataset.tab; st.edit = null; return render(); }
      if (b.dataset.edit) { st.edit = JSON.parse(JSON.stringify(st.svcs[+b.dataset.edit])); return render(); }
      if (b.dataset.st) {
        if (b.dataset.st === 'annule' && b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Confirmer l’annulation'; return; }
        await S.setStatus(b.dataset.id, b.dataset.st); st.msg = ['ok', b.dataset.st === 'confirme' ? 'Rendez-vous confirmé. Pense à prévenir ta cliente.' : 'C’est noté.']; return refresh();
      }
      var a = b.dataset.act; if (!a) return;
      if (a === 'in' || a === 'up') {
        e.preventDefault(); var em = val('em'), pw = document.getElementById('pw').value;
        if (!/^\S+@\S+\.\S+$/.test(em) || pw.length < 8) { st.msg = ['err', 'Écris ton e-mail et un mot de passe de 8 caractères au moins.']; return render(); }
        if (a === 'up') { var u = await S.signUp(em, pw); if (!u) { st.msg = ['ok', 'Compte créé. Ouvre l’e-mail de confirmation que tu viens de recevoir, puis connecte-toi ici.']; return render(); } } else await S.signIn(em, pw);
        return refresh();
      }
      if (a === 'out') { await S.signOut(); st.user = st.pro = null; return render(); }
      if (a === 'new') { st.edit = { name: '', price: null, minutes: 120, options: [] }; return render(); }
      if (a === 'cancel') { st.edit = null; return render(); }
      if (a === 'del') { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Confirmer la suppression'; return; } await S.deleteService(st.edit.id); st.edit = null; st.msg = ['ok', 'Prestation supprimée.']; return refresh(); }
      if (a === 'copy') { try { await navigator.clipboard.writeText(link()); b.textContent = 'Lien copié'; } catch (x) { b.textContent = link(); } return; }
    } catch (err) { fail(err); }
  });
  app.addEventListener('submit', async function (e) {
    e.preventDefault(); var f = e.target.id;
    try {
      if (f === 'fp') {
        var slug = U.slug(val('ps')); if (slug.length < 3 || val('pn').length < 2) { st.msg = ['err', 'Écris ton nom et un lien de 3 caractères au moins.']; return render(); }
        var first = !st.pro;
        st.pro = await S.savePro({ name: val('pn'), slug: slug, city: val('pc'), bio: val('pb'), whatsapp: val('pw2'), pay_info: val('pp'), deposit_pct: Math.max(0, Math.min(100, parseInt(val('pd'), 10) || 0)) });
        st.msg = ['ok', first ? 'Ta page est créée. Ajoute maintenant tes prestations.' : 'C’est enregistré.']; if (first) st.tab = 'svc'; return refresh();
      }
      if (f === 'fs') {
        var s = { name: val('sn'), price: parseFloat(val('sp').replace(',', '.')), minutes: parseInt(val('sm'), 10), options: optParse(document.getElementById('so').value), position: st.edit.id ? (st.edit.position || 0) : st.svcs.length };
        if (st.edit.id) s.id = st.edit.id;
        if (s.name.length < 2 || !(s.price >= 0) || !(s.minutes >= 15)) { st.msg = ['err', 'Vérifie le nom, le prix et la durée.']; return render(); }
        await S.saveService(s); st.edit = null; st.msg = ['ok', 'Prestation enregistrée.']; return refresh();
      }
      if (f === 'fh') {
        var H = {}; DAYS.forEach(function (d) { if (document.getElementById('on' + d[0]).checked) { var a = val('a' + d[0]), b = val('b' + d[0]); if (a && b && a < b) H[d[0]] = [[a, b]]; } });
        st.pro = await S.savePro({ name: st.pro.name, slug: st.pro.slug, hours: H, slot_step: parseInt(val('hs'), 10) || 30 });
        st.msg = ['ok', 'Horaires enregistrés.']; return refresh();
      }
    } catch (err) { fail(err); }
  });

  refresh().catch(function () { app.innerHTML = top() + '<p class="note err" role="alert">Impossible de charger. Vérifie ta connexion et recharge la page.</p>'; });
})();
