// Espace de la coiffeuse : compte, page, prestations, horaires, rendez-vous.
(function () {
  var S = Perle.store, U = Perle.U, esc = U.esc;
  var app = document.getElementById('app');
  var st = { user: null, pro: null, recovery: /type=recovery/.test(location.hash), pw: false, tab: 'rdv', svcs: [], rdv: [], edit: null, calc: null, msg: null };
  var DAYS = [['1', 'Lundi'], ['2', 'Mardi'], ['3', 'Mercredi'], ['4', 'Jeudi'], ['5', 'Vendredi'], ['6', 'Samedi'], ['0', 'Dimanche']];
  var LAB = { attente: 'Acompte attendu', confirme: 'Confirmé', annule: 'Annulé', fait: 'Fait', expire: 'Expiré, créneau libéré' };
  function svg(p, s, w) { return '<svg aria-hidden="true" width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }
  var I = {
    cal: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>', tag: '<path d="M4 4h7l9 9-7 7-9-9z"/><circle cx="8.500" cy="8.500" r="1.500"/>',
    clock: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.500-4 5-5 8-5s6.500 1 8 5"/>',
    photo: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>', plus: '<path d="M12 5v14M5 12h14"/>', arrow: '<path d="M7 17L17 7M9 7h8v8"/>',
    page: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h3"/>', chev: '<path d="M9 6l6 6-6 6"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1"/><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>', help: '<circle cx="12" cy="12" r="8.500"/><path d="M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.700.400-1 1-1 1.700"/><path d="M12 17h.01"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>', out: '<path d="M10 5H6v14h4"/><path d="M14 8l4 4-4 4M18 12H10"/>', star: '<path d="M12 4l2.400 5 5.400.700-4 3.800 1 5.400L12 16.300 7.200 18.900l1-5.400-4-3.800 5.400-.700z"/>'
  };
  var TABS = [['rdv', 'Rendez-vous', I.cal], ['svc', 'Prestations', I.tag], ['hrs', 'Horaires', I.clock], ['pro', 'Ma page', I.page], ['me', 'Profil', I.user]];

  function top() { return '<div class="top">' + U.logo() + (S.live ? '' : '<span class="badge">Mode essai</span>') + '</div>'; }
  function note() { var m = st.msg; st.msg = null; return m ? '<p class="note ' + m[0] + '" role="' + (m[0] === 'err' ? 'alert' : 'status') + '">' + esc(m[1]) + '</p>' : ''; }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  function link() { if ((window.PERLE || {}).APERCU) return './?c=' + st.pro.slug; var base = location.href.split(/[?#]/)[0].replace(/[^\/]*$/, ''); return (window.PERLE || {}).LIENS_COURTS ? location.origin + '/' + st.pro.slug : base + '?c=' + st.pro.slug; }
  function thumb(u, cls) { return u ? '<span class="thumb ph ' + (cls || '') + '" style="' + U.bg(u) + '"></span>' : '<span class="thumb empty ' + (cls || '') + '">' + svg(I.photo) + '</span>'; }
  function picker(id, u, label) { return '<div class="pick">' + thumb(u) + '<span class="grow mut">' + (u ? 'Photo choisie' : 'Aucune photo') + '</span><label class="btn sm dark" style="margin:0;color:#fff" for="' + id + '">' + (u ? 'Changer' : label) + '</label><input type="file" id="' + id + '" accept="image/*" data-photo="' + id + '"></div>'; }

  // ----- compte -----
  function auth() {
    document.body.classList.add('dark');
    app.innerHTML = '<div class="dark-screen" style="background-image:url(img/bgLocks.jpg)"><div class="top">' + U.logo() + (S.live ? '' : '<span class="badge">Mode essai</span>') + '</div><h1 style="margin-top:210px">Ton espace <span class="hl" style="color:var(--noir)">coiffeuse</span>.</h1><p class="soft" style="font-size:16px;margin:10px 0 0">Crée ta page de réservation et reçois tes rendez-vous avec acompte.</p>' + note() +
      '<form id="fa"><label for="em" style="color:#E4DBEE">Ton e-mail</label><input id="em" type="email" autocomplete="email" required style="color:var(--noir)">' +
      '<label for="pw" style="color:#E4DBEE">Ton mot de passe (8 caractères au moins)</label><input id="pw" type="password" autocomplete="current-password" minlength="8" required style="color:var(--noir)">' +
      '<button class="btn" style="margin-top:18px" data-act="in">Me connecter</button><button class="btn glass" style="margin-top:10px;border-radius:28px" data-act="up">Créer mon compte</button><button type="button" class="lnk" data-act="forgot">Mot de passe oublié ?</button><p class="soft" style="margin-top:12px;font-size:13px">En créant ton compte, tu acceptes les <a href="legal.html#cgu" style="color:inherit">conditions d’utilisation</a> et la <a href="legal.html#confidentialite" style="color:inherit">politique de confidentialité</a>.</p></form>' +
      (S.live ? '' : '<p class="soft" style="margin-top:14px">Mode essai : n’importe quel e-mail fonctionne et tout reste dans ce navigateur.</p>') +
      '<div class="glass"><b>Comment ça marche</b><div class="soft" style="margin-top:6px">1. Tu ajoutes tes photos, tes prestations, tes prix et tes horaires.<br>2. Tu mets ton lien dans ta bio.<br>3. Tes clientes réservent et t’envoient l’acompte. Tu confirmes d’un geste.</div></div></div>';
  }
  // ----- ma page -----
  function profile(first) {
    var p = st.pro || { name: '', slug: '', city: '', bio: '', whatsapp: '', pay_info: '', deposit_pct: 30, cover_url: '', gallery: [] };
    function tg(t) { return '<label class="chip"><input type="checkbox" data-tag="' + t[0] + '"' + ((p.tags || []).indexOf(t[0]) >= 0 ? ' checked' : '') + '><span>' + t[1] + '</span></label>'; }
    function sec(n, t, s) { return '<div class="fsec"><span class="fnum">' + n + '</span><div><b>' + t + '</b><span class="mut">' + s + '</span></div></div>'; }
    var dep = p.deposit_pct == null ? 30 : p.deposit_pct, g = p.gallery || [];
    var h = (first ? '<div class="who"><span class="grow">Connectée avec <b>' + esc((st.user && st.user.email) || '') + '</b></span><button type="button" class="lnk" data-act="out">Changer de compte</button></div><h1>Ta <span class="hl">page</span>.</h1><p class="sub">Ces informations s’affichent sur ton lien de réservation.</p>' : '') + note() + '<form id="fp">';
    if (!first) {
      h += '<div class="vit"><div class="vit-cov"' + (p.cover_url ? ' style="' + U.bg(p.cover_url) + '"' : '') + '>' + (p.cover_url ? '' : '<span class="pearl" aria-hidden="true"></span>') +
        '<label class="vit-edit" for="cover">' + svg(I.photo, 16) + (p.cover_url ? 'Changer la couverture' : 'Ajouter une couverture') + '</label><input type="file" id="cover" accept="image/*" data-photo="cover"></div>' +
        '<div class="vit-id"><label class="vit-av" for="avatar" aria-label="Changer ta photo de profil"' + (p.avatar_url ? ' style="' + U.bg(p.avatar_url) + '"' : '') + '>' + (p.avatar_url ? '' : esc((p.name || '?').charAt(0).toUpperCase())) + '<i>' + svg(I.plus, 14, 2.6) + '</i></label><input type="file" id="avatar" accept="image/*" data-photo="avatar">' +
        '<div class="grow"><b class="vit-name">' + esc(p.name) + '</b><span class="mut">' + esc(p.city || 'Ville à renseigner') + '</span></div><a class="vit-see" href="' + esc(link()) + '">Voir ' + svg(I.arrow, 14, 2.4) + '</a></div></div>' +
        sec('1', 'Tes photos', g.length + ' sur 8 · elles donnent envie de réserver') + '<div class="gpick">';
      g.forEach(function (u, i) { h += '<span class="ph" style="' + U.bg(u) + '"><button type="button" class="x" data-rm="' + i + '" aria-label="Retirer cette photo">×</button></span>'; });
      if (g.length < 8) h += '<label for="gal" aria-label="Ajouter une photo">' + svg(I.plus, 22) + '</label><input type="file" id="gal" accept="image/*" data-photo="gal" style="position:absolute;opacity:0;width:1px;height:1px">';
      h += '</div>';
    }
    var k = first ? 0 : 1;
    h += sec(k + 1, 'Ton identité', 'Ce que la cliente lit en premier') +
      '<label for="pn">Ton nom ou celui de ton activité</label><input id="pn" type="text" maxlength="60" required value="' + esc(p.name) + '">' +
      '<label for="ps">Le nom de ton lien</label><div class="pre"><span>perleapp.fr/?c=</span><input id="ps" type="text" maxlength="30" required placeholder="awabraids" value="' + esc(p.slug) + '"></div><span class="mut">Lettres minuscules, chiffres et tirets, 3 caractères au moins.</span>' +
      '<label for="pc">Ta ville ou ton quartier</label><input id="pc" type="text" maxlength="60" placeholder="Paris 19e, ou 93200 Saint-Denis" value="' + esc(p.city) + '"><span class="mut">Sert à t’afficher sur la carte : seul ton quartier est montré, jamais ton adresse.' + (st.pro && p.city && p.lat == null ? ' Ton quartier n’a pas été trouvé : écris une ville, ou « Paris 19e ».' : '') + '</span>' +
      '<label for="pb">Quelques mots sur toi (facultatif)</label><textarea id="pb" maxlength="400">' + esc(p.bio) + '</textarea>' +
      '<label for="pw2">Ton numéro WhatsApp (facultatif)</label><input id="pw2" type="tel" maxlength="20" placeholder="06 12 34 56 78" value="' + esc(p.whatsapp) + '">' +
      sec(k + 2, 'Qui tu coiffes, et où', 'Sert aux filtres de recherche des clientes') +
      '<div class="chips">' + [['femme', 'Femmes'], ['homme', 'Hommes'], ['enfant', 'Enfants']].map(tg).join('') + '</div><div class="chips">' + [['chez', 'Chez moi'], ['domicile', 'À domicile'], ['salon', 'En salon']].map(tg).join('') + '</div>' +
      sec(k + 3, 'Acompte et annulation', 'Ce qui te protège des lapins') +
      '<div class="dep"><div class="dep-top"><span class="mut">Acompte demandé</span><b id="pdv">' + esc(dep) + ' %</b></div><input id="pd" type="range" min="0" max="100" step="5" value="' + esc(dep) + '" aria-label="Acompte demandé, en pourcentage du prix" oninput="document.getElementById(\'pdv\').textContent=this.value+\' %\';document.getElementById(\'pde\').textContent=Math.round(80*this.value/100)+\' €\'"><div class="dep-ex">Sur une coiffure à 80 €, la cliente verse <b id="pde">' + Math.round(80 * dep / 100) + ' €</b> pour bloquer son créneau.</div></div>' +
      '<label for="ph">La cliente peut annuler seule jusqu’à</label><select id="ph">' + [[0, 'la dernière minute'], [24, '24 heures avant'], [48, '48 heures avant'], [72, '3 jours avant'], [168, '7 jours avant']].map(function (o) { return '<option value="' + o[0] + '"' + ((p.cancel_hours == null ? 48 : p.cancel_hours) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select><span class="mut">Passé ce délai, elle doit t’écrire. Un rendez-vous dont l’acompte n’est pas confirmé sous 24 h libère son créneau.</span>' +
      '<label for="pp">Comment la cliente te paie l’acompte</label><textarea id="pp" maxlength="300" placeholder="Exemple : Lydia ou Wero au 06 12 34 56 78, ou ton lien PayPal. Indique la référence du rendez-vous.">' + esc(p.pay_info) + '</textarea><span class="mut">Si tu colles un lien, la cliente voit un bouton « Payer ».</span>' +
      '<button class="btn" style="margin-top:22px">' + (first ? 'Créer ma page' : 'Enregistrer') + '</button></form>' + (first ? '' : '<div class="mespace"></div>');
    return h;
  }
  // ----- prestations -----
  // ----- profil -----
  function me() {
    var p = st.pro, em = (st.user && st.user.email) || '', n = st.svcs.length, up = st.rdv.filter(function (b) { return new Date(b.ends_at).getTime() >= Date.now() && b.status !== 'annule'; }).length;
    var pic = p.avatar_url || p.cover_url, on = p.published !== false;
    function row(ic, t, s, attr) { return '<button type="button" class="srow" ' + attr + '>' + svg(ic, 22, 1.8) + '<span class="grow"><b>' + t + '</b><span class="mut">' + s + '</span></span>' + svg(I.chev, 18) + '</button>'; }
    var h = note() + '<section class="pass"><span class="pearl" aria-hidden="true"></span>' +
      '<div class="pass-top"><span class="kick">Espace coiffeuse</span><span class="stamp">Découverte</span></div>' +
      '<div class="pass-id"><span class="pass-av"' + (pic ? ' style="' + U.bg(pic) + '"' : '') + '>' + (pic ? '' : esc((p.name || '?').charAt(0).toUpperCase())) + '</span><div class="grow"><b class="pass-name">' + esc(p.name) + '</b><span class="pass-mail">' + esc(em) + '</span></div></div>' +
      '<div class="pass-cut" aria-hidden="true"></div>' +
      '<div class="pass-link"><div class="grow"><span class="kick">Ton lien de réservation</span><b class="pass-url">' + esc(link().replace(/^https?:\/\//, '')) + '</b></div><button type="button" class="pass-copy" data-act="copy">Copier</button></div></section>' +
      '<div class="nums"><div><b>' + up + '</b><span>à venir</span></div><div><b>' + n + '</b><span>prestation' + (n > 1 ? 's' : '') + '</span></div><div><b class="live' + (on ? ' on' : '') + '"><i></i>' + (on ? 'En ligne' : 'Masquée') + '</b><span>ta page</span></div></div>' +
      '<p class="sect">Mon compte</p><div class="slist">' +
      row(I.page, 'Ma page', 'Photos, ville, acompte, annulation', 'data-tab="pro"') +
      row(I.lock, 'Mot de passe', 'En choisir un nouveau', 'data-act="pw"') +
      ((st.pw || st.recovery) ? '<form id="fw" class="spw"><label for="np">Nouveau mot de passe (8 caractères au moins)</label><input id="np" type="password" autocomplete="new-password" minlength="8" required><button class="btn" style="margin-top:12px">Enregistrer</button></form>' : '') +
      '</div><p class="sect">Perle</p><div class="slist">' +
      row(I.help, 'Aide', 'On te répond sous 24 heures', 'data-act="help"') +
      row(I.doc, 'Conditions et confidentialité', 'Les règles d’utilisation', 'data-act="legal"') +
      '</div><button type="button" class="bye" data-act="out">Me déconnecter<span>' + esc(em) + '</span></button>';
    return h + '<div class="mespace"></div>';
  }
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
  function readOpts() {
    var out = []; document.querySelectorAll('[data-grp]').forEach(function (g) {
      var ch = []; g.querySelectorAll('[data-ch]').forEach(function (r) { var l = r.querySelector('.ol').value.trim().slice(0, 30); if (l) ch.push({ label: l, plus: parseFloat(String(r.querySelector('.op').value).replace(',', '.')) || 0, minutes: parseInt(r.querySelector('.om').value, 10) || 0 }); });
      out.push({ group: g.querySelector('.og').value.trim().slice(0, 40), choices: ch });
    }); return out;
  }
  function cleanOpts(o) { return (o || []).filter(function (g) { return g.group && g.choices.length; }).slice(0, 5); }
  function keepForm() { if (!st.edit) return; st.edit.name = val('sn'); st.edit.price = val('sp'); st.edit.minutes = val('sm'); if (document.getElementById('fs')) st.edit.options = readOpts(); }
  function optEditor(o) {
    var h = '<label>Options qui changent le prix (facultatif)</label><span class="mut">Exemple : un groupe « Taille » avec S, M (+10 €) et L (+25 €). Le premier choix est celui de base.</span>';
    (o || []).forEach(function (g, gi) {
      h += '<div class="card ogrp" data-grp="' + gi + '"><div class="row"><input class="og grow" type="text" maxlength="40" list="ogl" placeholder="Nom du groupe, par exemple Taille" aria-label="Nom du groupe d’options" value="' + esc(g.group || '') + '"><button type="button" class="round sm" data-act="rmg" data-g="' + gi + '" aria-label="Supprimer ce groupe">×</button></div><div class="ohead"><span>Choix</span><span>+ €</span><span>+ min</span><span></span></div>';
      (g.choices || []).forEach(function (c, ci) { h += '<div class="orow" data-ch="' + ci + '"><input class="ol" type="text" maxlength="30" list="oll" placeholder="M" aria-label="Nom du choix" value="' + esc(c.label || '') + '"><input class="op" type="number" min="0" max="999" step="1" placeholder="0" aria-label="Supplément en euros" value="' + (Number(c.plus) || '') + '"><input class="om" type="number" min="-240" max="480" step="15" placeholder="0" aria-label="Minutes en plus" value="' + (Number(c.minutes) || '') + '"><button type="button" class="round sm" data-act="rmc" data-g="' + gi + '" data-c="' + ci + '" aria-label="Supprimer ce choix">×</button></div>'; });
      h += '<button type="button" class="btn sm ghost" style="margin-top:8px" data-act="addc" data-g="' + gi + '">Ajouter un choix</button></div>';
    });
    if ((o || []).length < 5) h += '<button type="button" class="btn sm ghost" style="margin-top:10px" data-act="addg">' + svg(I.plus, 16, 2.4) + 'Ajouter un groupe d’options</button>';
    return h;
  }
  // ----- ton vrai prix (écran Calculateur de la maquette) -----
  var TAUX = 21.2, CIBLE = 15;
  function calcul() {
    var c = st.calc, net = c.prix * (1 - TAUX / 100) - c.frais, hr = net / c.heures, conseil = Math.ceil((CIBLE * c.heures + c.frais) / (1 - TAUX / 100));
    function e2(x) { return (Math.round(x * 100) / 100).toFixed(2).replace('.', ','); }
    function row(l, k, v) { return '<div class="crow"><span>' + l + '</span><span><button type="button" class="cbtn" data-act="cstep" data-k="' + k + '" data-d="-1" aria-label="Diminuer : ' + l + '">−</button><span class="cval">' + v + '</span><button type="button" class="cbtn plus" data-act="cstep" data-k="' + k + '" data-d="1" aria-label="Augmenter : ' + l + '">+</button></span></div>'; }
    return '<h2 style="margin-top:0">Tu gagnes combien, vraiment ?</h2><div class="vio" aria-live="polite"><span class="mut" style="color:#E4DBEE">Il te reste ' + e2(net) + ' € après frais et cotisations, soit</span><div style="font-family:var(--hb);font-weight:700;font-size:35px;letter-spacing:-.03em;line-height:1.1;color:' + (hr < 12 ? '#FFB59E' : '#9BE8C0') + '">' + e2(hr) + ' € de l’heure</div><div style="font-size:14px;margin-top:6px">Pour gagner ' + CIBLE + ' € de l’heure, facture environ <b style="color:var(--or);white-space:nowrap">' + conseil + ' €</b>.</div></div>' +
      '<div style="margin-top:8px">' + row('Prix facturé', 'prix', c.prix + ' €') + row('Durée', 'heures', String(c.heures).replace('.', ',') + ' h') + row('Mèches et matériel', 'frais', c.frais + ' €') + '<div class="crow" style="border:0"><span>Cotisations en micro-entreprise</span><span class="cval">' + String(TAUX).replace('.', ',') + ' %</span></div></div>' +
      '<p class="mut">Mets tes vrais chiffres. Taux des prestations de services en micro-entreprise en 2026, donné à titre indicatif : à vérifier sur le site de l’Urssaf.</p>' +
      (st.edit ? '<button type="button" class="btn" style="margin-top:14px" data-act="cuse">Garder ' + c.prix + ' € pour cette prestation</button><button type="button" class="btn ghost" style="margin-top:10px" data-act="cback">Revenir sans changer</button>' : '<button type="button" class="btn" style="margin-top:14px" data-act="cback">Mettre à jour mes prix</button>');
  }
  var NOMS = ['Knotless braids', 'Box braids', 'Fulani braids', 'Cornrows', 'Nattes collées', 'Vanilles', 'Passion twists', 'Départ de locks', 'Retwist locks', 'Faux locs', 'Crochet braids', 'Pose de perruque', 'Tissage', 'Dégradé', 'Coupe et barbe', 'Extensions de cils'];
  function dl(id, a) { return '<datalist id="' + id + '">' + a.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>'; }
  function services() {
    var h = note();
    if (st.calc) return h + calcul();
    if (st.edit) {
      var s = st.edit;
      return h + '<form id="fs"><h2 style="margin-top:0">' + (s.id ? 'Modifier la prestation' : 'Nouvelle prestation') + '</h2><label>Photo de cette coiffure</label>' + picker('sphoto', s.photo_url, 'Choisir une photo') +
        '<label for="sn">Nom</label><input id="sn" type="text" maxlength="60" required placeholder="Knotless braids" list="snl" value="' + esc(s.name || '') + '">' + dl('snl', NOMS) + '<span class="mut">Si ta coiffure est dans la liste proposée, garde ce nom : les clientes te trouvent plus facilement.</span>' +
        '<div class="grid2"><div><label for="sp">Prix de base, en €</label><input id="sp" type="number" min="0" max="2000" step="1" required value="' + esc(s.price == null ? '' : s.price) + '"></div><div><label for="sm">Durée, en minutes</label><input id="sm" type="number" min="15" max="720" step="15" required value="' + esc(s.minutes || '') + '"></div></div>' +
        '<button type="button" class="link" style="margin-top:10px" data-act="calcfrom">Combien je gagne vraiment avec ce prix ?</button>' +
        optEditor(s.options) + dl('ogl', ['Taille des tresses', 'Longueur', 'Mèches']) + dl('oll', ['S', 'M', 'L', 'Épaules', 'Milieu du dos', 'Taille', 'Fournies', 'Non fournies']) +
        '<button class="btn" style="margin-top:18px">Enregistrer</button><button type="button" class="btn ghost" style="margin-top:10px" data-act="cancel">Annuler</button>' + (s.id ? '<button type="button" class="btn ghost" style="margin-top:10px;color:var(--err)" data-act="del">Supprimer cette prestation</button>' : '') + '</form>';
    }
    if (!st.svcs.length) h += '<p class="note info">Ajoute ta première prestation pour que tes clientes puissent réserver.</p>';
    st.svcs.forEach(function (s, i) {
      h += '<button class="svc" data-edit="' + i + '">' + thumb(s.photo_url) + '<span class="grow"><span class="b">' + esc(s.name) + '</span><br><span class="mut">' + U.dur(s.minutes) + ((s.options || []).length ? ', ' + s.options.length + ' option' + (s.options.length > 1 ? 's' : '') : '') + '</span></span><span class="big">' + U.eur(s.price) + '</span></button>';
    });
    return h + '<button class="btn dark" data-act="new">' + svg(I.plus, 18, 2.4) + 'Ajouter une prestation</button><button class="btn ghost" style="margin-top:10px" data-act="calc">Calculer mon vrai prix</button>';
  }
  // ----- horaires -----
  function hours() {
    var H = st.pro.hours || {}, tot = 0, nb = 0, step = st.pro.slot_step || 30;
    DAYS.forEach(function (d) { var r = (H[d[0]] || [])[0]; if (r) { nb++; var x = r[0].split(':'), y = r[1].split(':'); tot += (+y[0] * 60 + +y[1]) - (+x[0] * 60 + +x[1]); } });
    var hh = Math.round(tot / 6) / 10;
    var h = note() + '<div class="hsum"><div><b>' + String(hh).replace('.', ',') + '<small>h</small></b><span>ouvertes par semaine</span></div><div class="hweek" aria-hidden="true">' + DAYS.map(function (d) { return '<i class="' + ((H[d[0]] || [])[0] ? 'on' : '') + '">' + d[1].charAt(0) + '</i>'; }).join('') + '</div></div><form id="fh"><div class="slist">';
    DAYS.forEach(function (d) {
      var r = (H[d[0]] || [])[0];
      h += '<div class="hrow"><label class="sw"><input type="checkbox" id="on' + d[0] + '"' + (r ? ' checked' : '') + '><i></i><span>' + d[1] + '</span></label><div class="htimes"><input type="time" id="a' + d[0] + '" aria-label="' + d[1] + ', début" value="' + (r ? r[0] : '09:00') + '"><span aria-hidden="true">→</span><input type="time" id="b' + d[0] + '" aria-label="' + d[1] + ', fin" value="' + (r ? r[1] : '18:00') + '"></div><span class="hoff">Fermé</span></div>';
    });
    h += '</div><p class="sect">Un créneau proposé toutes les</p><div class="seg" role="radiogroup" aria-label="Durée entre deux créneaux">' + [15, 30, 60].map(function (n) { return '<label><input type="radio" name="hs" value="' + n + '"' + (step === n ? ' checked' : '') + '><span>' + (n === 60 ? '1 heure' : n + ' min') + '</span></label>'; }).join('') + '</div>';
    return h + '<button class="btn" style="margin-top:22px">Enregistrer</button></form><div class="mespace"></div>';
  }
  // ----- rendez-vous -----
  function photoFor(b) { var s = st.svcs.filter(function (x) { return x.id === b.service_id; })[0]; return (s && s.photo_url) || st.pro.cover_url || ''; }
  function acts(b, now) {
    var s = new Date(b.starts_at), a = '';
    if (b.status === 'attente') a += '<button class="btn sm" data-st="confirme" data-id="' + esc(b.id) + '">Acompte reçu</button>';
    if (b.status === 'confirme' && s.getTime() < now) a += '<button class="btn sm dark" data-st="fait" data-id="' + esc(b.id) + '">Rendez-vous fait</button>';
    if (b.status === 'attente' || b.status === 'confirme') a += '<button class="btn sm ghost" data-st="annule" data-id="' + esc(b.id) + '">Annuler</button>';
    a += '<a class="btn sm ghost" href="tel:' + esc(b.client_phone) + '">Appeler</a>';
    return '<div class="acts">' + a + '</div>';
  }
  function detail(b) { return '<div class="mut" style="margin-top:8px">' + esc(b.client_phone) + ' · référence ' + esc(b.ref) + ' · acompte ' + U.eur(b.deposit) + ', reste ' + U.eur(b.price - b.deposit) + (b.note ? '<br>« ' + esc(b.note) + ' »' : '') + '</div>'; }
  function stOf(b, now) { return (b.status === 'attente' && now - new Date(b.created_at).getTime() > 864e5) ? 'expire' : b.status; }
  function rdv() {
    var now = Date.now(), up = st.rdv.filter(function (b) { return new Date(b.ends_at).getTime() >= now && b.status !== 'annule' && stOf(b, now) !== 'expire'; }), old = st.rdv.filter(function (b) { return up.indexOf(b) < 0; }).reverse();
    var h = note(), t = new Date(), wk = '';
    for (var i = 0; i < 7; i++) { var d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i), has = up.some(function (b) { var s = new Date(b.starts_at); return s.toDateString() === d.toDateString(); }); wk += '<span class="' + (i === 0 ? 'on' : '') + '">' + d.toLocaleDateString('fr-FR', { weekday: 'short' }) + '<b>' + d.getDate() + '</b>' + (has ? '<i></i>' : '') + '</span>'; }
    h += '<div class="week" aria-hidden="true">' + wk + '</div>';
    var wait = up.filter(function (b) { return b.status === 'attente'; }).length, sum = up.reduce(function (a, b) { return a + Number(b.price); }, 0);
    h += '<div class="row" style="gap:10px;margin-top:10px"><span class="stat"><b>' + up.length + '</b><span class="mut">rendez-vous à venir</span></span><span class="stat"><b>' + U.eur(sum) + '</b><span class="mut">' + (wait ? wait + ' acompte' + (wait > 1 ? 's' : '') + ' à recevoir' : 'prévus') + '</span></span></div>';
    var d0 = new Date(), m0 = new Date(d0.getFullYear(), d0.getMonth(), 1).getTime(), m1 = new Date(d0.getFullYear(), d0.getMonth() + 1, 1).getTime();
    var mois = st.rdv.filter(function (b) { var t = new Date(b.starts_at).getTime(); return t >= m0 && t < m1 && (b.status === 'confirme' || b.status === 'fait'); });
    var tot = mois.reduce(function (a, b) { return a + Number(b.price); }, 0), acc = mois.reduce(function (a, b) { return a + Number(b.deposit); }, 0);
    h += '<div class="vio" style="margin-top:10px"><span class="mut">Ton mois de ' + d0.toLocaleDateString('fr-FR', { month: 'long' }) + '</span><div style="font-family:var(--hb);font-weight:700;font-size:38px;letter-spacing:-.03em;line-height:1.1">' + U.eur(tot) + '</div><div class="mut">' + mois.length + ' rendez-vous confirmé' + (mois.length > 1 ? 's' : '') + ' · ' + U.eur(acc) + ' d’acomptes reçus · ' + U.eur(tot - acc) + ' sur place</div></div>';
    h += '<h2>À venir</h2>';
    if (!up.length) h += '<p class="note info">Pas encore de rendez-vous. Partage ton lien pour recevoir ta première réservation.</p>';
    up.forEach(function (b, k) {
      var s = new Date(b.starts_at), what = esc(b.service_name) + (b.options_text ? ', ' + esc(b.options_text) : '');
      if (k === 0) h += '<div class="photo-card ph" style="' + U.bg(photoFor(b)) + (photoFor(b) ? '' : ';background:var(--vio)') + '"><span class="when">' + esc(U.dayS(s)) + ', ' + U.hm(s) + '</span><span class="stg glass">' + LAB[stOf(b, Date.now())] + '</span><span class="plate glass"><b>' + esc(b.client_name) + '</b>' + what + ', ' + U.eur(b.price) + '</span></div>' + detail(b) + acts(b, now) + '<div style="height:14px"></div>';
      else h += '<div class="card" style="margin-bottom:10px;border-radius:28px;padding:10px 14px 12px 10px"><div class="row">' + thumb(photoFor(b)) + '<span class="grow"><span class="b">' + esc(U.day(s)) + ', ' + U.hm(s) + '</span><br><span class="mut">' + esc(b.client_name) + ', ' + what + '</span></span><span class="st ' + esc(stOf(b, Date.now()) === 'expire' ? 'annule' : b.status) + '">' + LAB[stOf(b, Date.now())] + '</span></div>' + detail(b) + acts(b, now) + '</div>';
    });
    h += '<div class="vio" style="margin-top:8px"><span class="mut">Ton lien de réservation, à mettre dans ta bio</span><div class="b" style="font-size:17px;word-break:break-all;margin:4px 0 12px">' + esc(link().replace(/^https?:\/\//, '')) + '</div><div class="row"><button class="btn sm" data-act="copy">Copier le lien</button><a class="btn sm ghost" href="' + esc(link()) + '" target="_blank" rel="noopener" style="color:var(--noir)">Voir ma page</a></div></div>';
    if (old.length) { h += '<h2>Passés ou annulés</h2>'; old.slice(0, 20).forEach(function (b) { var s = new Date(b.starts_at); h += '<div class="card row" style="margin-bottom:8px;border-radius:24px;padding:10px 14px 10px 10px">' + thumb(photoFor(b), 'sm') + '<span class="grow"><span class="b">' + esc(b.client_name) + '</span><br><span class="mut">' + esc(U.day(s)) + ', ' + esc(b.service_name) + '</span></span><span class="st ' + esc(stOf(b, Date.now()) === 'expire' ? 'annule' : b.status) + '">' + LAB[stOf(b, Date.now())] + '</span></div>'; }); }
    return h;
  }

  function render() {
    document.body.classList.remove('dark');
    if (!st.user) return auth();
    if (!st.pro) { app.innerHTML = top() + profile(true); return; }
    if (st.recovery) st.tab = 'me';
    var T = { rdv: ['Bonjour, <span class="hl">' + esc(st.pro.name.split(' ')[0]) + '</span>.', rdv], svc: ['Tes <span class="hl">prestations</span>.', services], hrs: ['Tes <span class="hl">horaires</span>.', hours], pro: ['Ta <span class="hl">page</span>.', function () { return profile(false); }], me: ['Ton <span class="hl">profil</span>.', me] }[st.tab];
    app.innerHTML = top() + '<h1>' + T[0] + '</h1><div style="margin-top:14px">' + T[1]() + '</div>' +
      '<nav class="nav" aria-label="Menu">' + TABS.map(function (t) { return '<button data-tab="' + t[0] + '" aria-selected="' + (st.tab === t[0]) + '" aria-label="' + t[1] + '">' + svg(t[2], 22) + '<span>' + t[1] + '</span></button>'; }).join('') + '</nav>';
  }
  async function refresh() {
    st.user = await S.session();
    if (st.user) { st.pro = await S.myPro(); if (st.pro) { st.svcs = await S.myServices() || []; st.rdv = await S.myBookings() || []; } }
    render();
  }
  function fail(e) { st.msg = ['err', e && e.code === '23505' ? 'Ce lien est déjà pris. Choisis-en un autre.' : (e && e.message === 'PHOTO' ? 'Cette photo n’a pas pu être lue. Essaie avec une autre.' : (e && e.message && /Invalid login|invalid/i.test(e.message) ? 'E-mail ou mot de passe incorrect.' : (e && e.message && /registered|exists/i.test(e.message) ? 'Un compte existe déjà avec cet e-mail. Connecte-toi.' : 'Ça n’a pas marché. Vérifie ta connexion et réessaie.')))]; render(); }
  function base() { return { name: st.pro.name, slug: st.pro.slug }; }

  app.addEventListener('change', async function (e) {
    var k = e.target.dataset && e.target.dataset.photo, f = e.target.files && e.target.files[0]; if (!k || !f) return;
    try {
      var url = await S.upload(await U.shrink(f, S.live ? 1400 : 900));
      if (k === 'sphoto') { keepForm(); st.edit.photo_url = url; return render(); }
      var p = base(); if (k === 'cover') p.cover_url = url; else if (k === 'avatar') p.avatar_url = url; else p.gallery = (st.pro.gallery || []).concat([url]).slice(0, 8);
      st.pro = await S.savePro(p); st.msg = ['ok', 'Photo enregistrée.']; render();
    } catch (err) { fail(err); }
  });
  app.addEventListener('click', async function (e) {
    var b = e.target.closest('button'); if (!b) return;
    try {
      if (b.dataset.tab) { st.tab = b.dataset.tab; st.edit = null; st.calc = null; render(); return window.scrollTo(0, 0); }
      if (b.dataset.edit) { st.edit = JSON.parse(JSON.stringify(st.svcs[+b.dataset.edit])); return render(); }
      if (b.dataset.rm) { var p = base(); p.gallery = (st.pro.gallery || []).filter(function (_, i) { return i !== +b.dataset.rm; }); st.pro = await S.savePro(p); return render(); }
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
      if (a === 'out') { await S.signOut(); st.user = st.pro = null; st.tab = 'rdv'; st.pw = st.recovery = false; return render(); }
      if (a === 'forgot') { var fe = val('em'); if (!/^\S+@\S+\.\S+$/.test(fe)) { st.msg = ['err', 'Écris d’abord ton e-mail, puis touche « Mot de passe oublié ? ».']; return render(); } await S.resetPw(fe); st.msg = ['ok', 'Si un compte existe avec cet e-mail, tu vas recevoir un lien pour choisir un nouveau mot de passe. Regarde aussi dans tes indésirables.']; return render(); }
      if (a === 'pw') { st.pw = !st.pw; return render(); }
      if (a === 'copy') { var l = link(); if (!/^https?:/.test(l)) l = new URL(l, location.href).href; try { await navigator.clipboard.writeText(l); st.msg = ['ok', 'Lien copié. Colle-le dans ta bio.']; } catch (x) { st.msg = ['info', 'Ton lien : ' + l]; } return render(); }
      if (a === 'help') { location.href = 'mailto:contact@perleapp.fr?subject=' + encodeURIComponent('Aide Perle'); return; }
      if (a === 'legal') { location.href = 'legal.html'; return; }
      if (a === 'new') { st.edit = { name: '', price: null, minutes: 120, options: [], photo_url: '' }; return render(); }
      if (a === 'cancel') { st.edit = null; return render(); }
      if (a === 'calc') { var f0 = st.svcs[0]; st.calc = { prix: f0 ? Math.max(5, Math.round(Number(f0.price) / 5) * 5) : 60, heures: f0 ? Math.max(.5, Math.round(f0.minutes / 30) / 2) : 6, frais: 15 }; render(); return window.scrollTo(0, 0); }
      if (a === 'calcfrom') { keepForm(); st.calc = { prix: Math.max(5, Math.round((parseFloat(String(st.edit.price).replace(',', '.')) || 60) / 5) * 5), heures: Math.max(.5, Math.round((parseInt(st.edit.minutes, 10) || 360) / 30) / 2), frais: 15 }; render(); return window.scrollTo(0, 0); }
      if (a === 'cstep') { var K = { prix: [5, 5], heures: [.5, .5], frais: [5, 0] }[b.dataset.k]; st.calc[b.dataset.k] = Math.max(K[1], Math.round((st.calc[b.dataset.k] + K[0] * +b.dataset.d) * 10) / 10); var y = window.scrollY; render(); return window.scrollTo(0, y); }
      if (a === 'cuse') { st.edit.price = st.calc.prix; st.calc = null; render(); return window.scrollTo(0, 0); }
      if (a === 'cback') { st.calc = null; render(); return window.scrollTo(0, 0); }
      if (a === 'addg') { keepForm(); st.edit.options.push({ group: '', choices: [{ label: '', plus: 0, minutes: 0 }, { label: '', plus: 0, minutes: 0 }] }); return render(); }
      if (a === 'addc') { keepForm(); st.edit.options[+b.dataset.g].choices.push({ label: '', plus: 0, minutes: 0 }); return render(); }
      if (a === 'rmg') { keepForm(); st.edit.options.splice(+b.dataset.g, 1); return render(); }
      if (a === 'rmc') { keepForm(); st.edit.options[+b.dataset.g].choices.splice(+b.dataset.c, 1); return render(); }
      if (a === 'del') { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Confirmer la suppression'; return; } await S.deleteService(st.edit.id); st.edit = null; st.msg = ['ok', 'Prestation supprimée.']; return refresh(); }
      if (a === 'copy') { try { await navigator.clipboard.writeText(link()); b.textContent = 'Lien copié'; } catch (x) { b.textContent = link(); } return; }
    } catch (err) { fail(err); }
  });
  app.addEventListener('submit', async function (e) {
    e.preventDefault(); var f = e.target.id;
    try {
      if (f === 'fw') { var np = document.getElementById('np').value; if (np.length < 8) { st.msg = ['err', 'Choisis un mot de passe de 8 caractères au moins.']; return render(); } await S.setPw(np); st.pw = st.recovery = false; if (location.hash) history.replaceState(null, '', location.pathname + location.search); st.msg = ['ok', 'Ton mot de passe est changé.']; return render(); }
      if (f === 'fp') {
        var slug = U.slug(val('ps')); if (slug.length < 3 || val('pn').length < 2) { st.msg = ['err', 'Écris ton nom et un lien de 3 caractères au moins.']; return render(); }
        var first = !st.pro;
        var g = await U.geo(val('pc'));
        st.pro = await S.savePro({ name: val('pn'), slug: slug, city: val('pc'), lat: g ? g.lat : null, lng: g ? g.lng : null, tags: Array.prototype.map.call(document.querySelectorAll('[data-tag]:checked'), function (x) { return x.dataset.tag; }), bio: val('pb'), whatsapp: val('pw2'), pay_info: val('pp'), cancel_hours: parseInt(val('ph'), 10) || 0, deposit_pct: Math.max(0, Math.min(100, parseInt(val('pd'), 10) || 0)) });
        st.msg = ['ok', (first ? 'Ta page est créée. Ajoute maintenant tes prestations et tes photos.' : 'C’est enregistré.') + (val('pc') ? (g ? ' Sur la carte, tu es placée au centre de ' + g.label + '. Si ce n’est pas le bon endroit, ajoute le code postal.' : ' Ton quartier n’a pas été trouvé pour la carte : écris une ville avec son code postal, ou « Paris 19e ».') : '')]; if (first) st.tab = 'svc'; return refresh();
      }
      if (f === 'fs') {
        var s = { name: val('sn'), price: parseFloat(val('sp').replace(',', '.')), minutes: parseInt(val('sm'), 10), options: cleanOpts(readOpts()), photo_url: st.edit.photo_url || '', position: st.edit.id ? (st.edit.position || 0) : st.svcs.length };
        if (st.edit.id) s.id = st.edit.id;
        if (s.name.length < 2 || !(s.price >= 0) || !(s.minutes >= 15)) { st.msg = ['err', 'Vérifie le nom, le prix et la durée.']; return render(); }
        await S.saveService(s); st.edit = null; st.msg = ['ok', 'Prestation enregistrée.']; return refresh();
      }
      if (f === 'fh') {
        var H = {}; DAYS.forEach(function (d) { if (document.getElementById('on' + d[0]).checked) { var a = val('a' + d[0]), b = val('b' + d[0]); if (a && b && a < b) H[d[0]] = [[a, b]]; } });
        var p = base(); p.hours = H; p.slot_step = parseInt((document.querySelector('input[name="hs"]:checked') || {}).value, 10) || 30;
        st.pro = await S.savePro(p); st.msg = ['ok', 'Horaires enregistrés.']; return refresh();
      }
    } catch (err) { fail(err); }
  });

  if (S.onRecovery) S.onRecovery(function () { st.recovery = true; st.msg = ['info', 'Choisis ton nouveau mot de passe ci-dessous.']; refresh(); });
  refresh().catch(function () { app.innerHTML = top() + '<p class="note err" role="alert">Impossible de charger. Vérifie ta connexion et recharge la page.</p>'; });
})();
