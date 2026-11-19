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
  var TABS = [['rdv', 'Rendez-vous', I.cal], ['svc', 'Prestations', I.tag], ['hrs', 'Horaires', I.clock], ['pro', 'Ma page', I.page], ['me', 'Compte', I.user]];

  function top() { return '<div class="top">' + ((window.PERLE || {}).APP ? '<a class="round" href="index.html" aria-label="Retour côté cliente"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></a>' : '') + U.logo() + (S.live ? '' : '<span class="badge">Mode essai</span>') + '</div>'; }
  function note() { var m = st.msg; st.msg = null; return m ? '<p class="note ' + m[0] + '" role="' + (m[0] === 'err' ? 'alert' : 'status') + '">' + esc(m[1]) + '</p>' : ''; }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  function link() { if ((window.PERLE || {}).APERCU) return './?c=' + st.pro.slug; var base = (window.PERLE || {}).SITE || location.href.split(/[?#]/)[0].replace(/[^\/]*$/, ''); return (window.PERLE || {}).LIENS_COURTS ? location.origin + '/' + st.pro.slug : base + '?c=' + st.pro.slug; }
  function thumb(u, cls) { return u ? '<span class="thumb ph ' + (cls || '') + '" style="' + U.bg(u) + '"></span>' : '<span class="thumb empty ' + (cls || '') + '">' + svg(I.photo) + '</span>'; }
  function picker(id, u, label) { return '<div class="pick">' + thumb(u) + '<span class="grow mut">' + (u ? 'Photo choisie' : 'Aucune photo') + '</span><label class="btn sm dark" style="margin:0;color:#fff" for="' + id + '">' + (u ? 'Changer' : label) + '</label><input type="file" id="' + id + '" accept="image/*" data-photo="' + id + '"></div>'; }

  // ----- compte -----
  function oab() {
    var pv = st.prov || {}, h = '';
    if (pv.google) h += '<button type="button" class="btn oab" data-act="oa" data-p="google">Continuer avec Google</button>';
    if (pv.apple) h += '<button type="button" class="btn oab dk" data-act="oa" data-p="apple">Continuer avec Apple</button>';
    return h ? h + '<div class="oasep"><span>ou avec ton e-mail</span></div>' : '';
  }
  function auth() {
    document.body.classList.add('dark');
    if (!st.prov && S.providers) { st.prov = {}; S.providers().then(function (x) { st.prov = x || {}; var o = document.getElementById('oa'); if (o && !st.user) o.innerHTML = oab(); }).catch(function () { }); }
    app.innerHTML = '<div class="dark-screen" style="background-image:url(img/bgLocks.jpg)"><div class="top">' + U.logo() + (S.live ? '' : '<span class="badge">Mode essai</span>') + '</div><h1 style="margin-top:210px">Ton espace <span class="hl" style="color:var(--noir)">coiffeuse</span>.</h1><p class="soft" style="font-size:16px;margin:10px 0 0">Crée ta page de réservation et reçois tes rendez-vous avec acompte.</p>' + note() +
      (function () { try { known = !!localStorage.getItem('perle-known'); } catch (e) {} return ''; })() + '<div id="oa">' + oab() + '</div><form id="fa"><label for="em" style="color:#E4DBEE">Ton e-mail</label><input id="em" type="email" autocomplete="email" required style="color:var(--noir)">' +
      '<label for="pw" style="color:#E4DBEE">Ton mot de passe (8 caractères au moins)</label><input id="pw" type="password" autocomplete="current-password" minlength="8" required style="color:var(--noir)">' +
      (known ? '<button class="btn" style="margin-top:18px" data-act="in">Me connecter</button><button class="btn glass" style="margin-top:10px" data-act="up">Créer mon compte</button>' : '<button class="btn" style="margin-top:18px" data-act="up">Créer mon compte</button><button class="btn glass" style="margin-top:10px" data-act="in">J’ai déjà un compte</button>') + '<button type="button" class="lnk" data-act="forgot">Mot de passe oublié ?</button><p class="soft" style="margin-top:12px;font-size:13px">En créant ton compte, tu acceptes les <a href="legal.html#cgu" style="color:inherit">conditions d’utilisation</a> et la <a href="legal.html#confidentialite" style="color:inherit">politique de confidentialité</a>.</p></form>' +
      (S.live ? '' : '<p class="soft" style="margin-top:14px">Mode essai : n’importe quel e-mail fonctionne et tout reste dans ce navigateur.</p>') +
      '<div class="glass"><b>Comment ça marche</b><div class="soft" style="margin-top:6px">1. Tu ajoutes tes photos, tes prestations, tes prix et tes horaires.<br>2. Tu mets ton lien dans ta bio.<br>3. Tes clientes réservent et t’envoient l’acompte. Tu confirmes d’un geste.</div></div></div>';
  }
  // ----- ma page -----
  // moyens de paiement : lien PayPal, lien Revolut et texte libre, rangés dans pay_info
  var RE_PP = /https?:\/\/(?:www\.)?paypal\.(?:me|com\/paypalme)\/([\w.-]+)\S*/i, RE_RV = /https?:\/\/(?:www\.)?revolut\.me\/([\w.-]+)\S*/i;
  function payParts(s) { s = s || ''; var a = s.match(RE_PP), b = s.match(RE_RV); return { pp: a ? a[1] : '', rv: b ? b[1] : '', txt: s.replace(RE_PP, '').replace(RE_RV, '').replace(/\n{2,}/g, '\n').trim() }; }
  function handle(v) { v = String(v || '').trim().replace(/^https?:\/\//i, '').replace(/^(www\.)?(paypal\.(me|com\/paypalme)|revolut\.me)\//i, '').replace(/^@/, '').split(/[\/?#\s]/)[0]; return v; }
  function payInfo() { var a = handle(val('pl')), b = handle(val('rl')), ok = /^[\w.-]{2,40}$/; if ((a && !ok.test(a)) || (b && !ok.test(b))) return null; return [val('pp'), a ? 'https://paypal.me/' + a : '', b ? 'https://revolut.me/' + b : ''].filter(Boolean).join('\n').slice(0, 300); }
  // ----- remplissage par collage : la coiffeuse colle sa bio et ses tarifs -----
  function guessMin(n) {
    n = n.toLowerCase(); var T = [[/knotless|box ?braid|micro|boho|goddess/, 300], [/fulani|tribal|lemonade/, 240], [/twist|vanille|passion|locks? ?(pose|install)|faux locs/, 210], [/crochet|tissage|weave/, 150], [/perruque|lace|wig|closure|frontal/, 90], [/cornrow|natte|tresses? coll|barbe|coupe|fade|d[ée]grad/, 60], [/retwist|reprise|entretien/, 120], [/cils|lash/, 90], [/ongle|nail|gel|vernis/, 75], [/soin|shampo|brushing|d[ée]pose/, 60]];
    for (var i = 0; i < T.length; i++) if (T[i][0].test(n)) return T[i][1]; return 120;
  }
  function parsePaste(t) {
    t = String(t || ''); var out = { svcs: [], f: {} }, m, bio = [], seen = {};
    if ((m = /(?:instagram\.com\/|tiktok\.com\/@|(?:^|[\s(])@)([A-Za-z0-9._]{2,30})/.exec(t))) out.f.pi = m[1].replace(/\.$/, '');
    if ((m = /paypal\.me\/([\w.-]{2,40})/i.exec(t))) out.f.pl = m[1];
    if ((m = /revolut\.me\/([\w.-]{2,40})/i.exec(t))) out.f.rl = m[1];
    if ((m = /wa\.me\/(\+?\d{9,15})/i.exec(t)) || (m = /(?:^|[^\d+])((?:\+33 ?|0)[67](?:[ .]?\d\d){4})(?!\d)/.exec(t))) out.f.pw2 = m[1].replace(/[ .]/g, '');
    if ((m = /📍\s*([^\n|•·—–,;(]{2,40})/.exec(t)) || (m = /\b(Paris\s?\d{1,2}(?:e|er|ème|eme)?|Montreuil|Saint[- ]Denis|Pantin|Aubervilliers|Bobigny|Ivry|Vitry|Créteil|Nanterre|Argenteuil|Sarcelles|Évry|Cergy|Massy|Noisy[- ]le[- ](?:Grand|Sec)|Lyon|Marseille|Lille|Toulouse|Bordeaux|Nantes|Strasbourg|Rennes|Montpellier|Nice)\b/i.exec(t))) out.f.pc = m[1].trim();
    out.tags = []; if (/domicile|me d[ée]place/i.test(t)) out.tags.push('domicile'); if (/chez moi|à mon domicile|a mon domicile/i.test(t)) out.tags.push('chez'); if (/salon|institut/i.test(t)) out.tags.push('salon'); if (/homme|barber|barbe/i.test(t)) out.tags.push('homme'); if (/enfant|kids|fillette/i.test(t)) out.tags.push('enfant'); if (/femme|women/i.test(t)) out.tags.push('femme');
    t.split(/\n+/).forEach(function (line) {
      line = line.trim(); if (!line) return;
      var pm = /(\d{1,4})(?:[.,]\d{1,2})?\s*(?:€|euros?\b|eur\b|e\b)/i.exec(line) || /€\s*(\d{1,4})/.exec(line), price = pm ? parseInt(pm[1], 10) : 0;
      if (pm && price >= 5 && price <= 1500 && !(/📍|paris\s?\d|arrondissement/i.test(line) && !/€|euro/i.test(line))) {
        var name = line.slice(0, pm.index).replace(/^[^A-Za-zÀ-ÿ0-9]+/, '').replace(/[\s\-–—:.·•|>=(]+$/, '').replace(/\s{2,}/g, ' ').slice(0, 60);
        if (name.length < 2) name = line.slice(pm.index + pm[0].length).replace(/^[^A-Za-zÀ-ÿ0-9]+/, '').replace(/\d{1,2}\s*h\s*\d{0,2}.*/i, '').trim().slice(0, 60);
        var k = name.toLowerCase(); if (name.length < 2 || seen[k] || /^(acompte|arrhes|caution|retard|frais|d[ée]placement)/i.test(name)) return; seen[k] = 1;
        var dm = /(\d{1,2})\s*h\s*(\d{2})?(?![a-zà-ÿ])/i.exec(line.slice(pm.index + pm[0].length)) || /(\d{1,2})\s*h\s*(\d{2})?(?![a-zà-ÿ])/i.exec(line.slice(0, pm.index)), min = dm ? (+dm[1]) * 60 + (+dm[2] || 0) : 0;
        out.svcs.push({ name: name.charAt(0).toUpperCase() + name.slice(1), price: price, minutes: min >= 15 && min <= 720 ? min : guessMin(name), guessed: !(min >= 15 && min <= 720) });
      } else if (line.length > 14 && !/https?:|www\.|@|\d{9}|paypal|revolut|whatsapp|📍|\d\d[ .]\d\d[ .]\d\d/i.test(line)) bio.push(line);
    });
    if (bio.length) out.f.pb = bio.slice(0, 2).join(' ').replace(/\s{2,}/g, ' ').slice(0, 400);
    out.svcs = out.svcs.slice(0, 25); return out;
  }
  function imported() { try { return JSON.parse(localStorage.getItem('perle-import') || '[]'); } catch (e) { return []; } }
  function pasteBox(open) {
    if (!open) return '<button type="button" class="pasteb" data-act="paste"><span><b>Remplir avec ma bio et mes tarifs</b><small>Colle le texte de ton profil Instagram ou TikTok : on remplit ta page pour toi.</small></span>' + svg(I.chev, 18) + '</button>';
    return '<div class="pastep"><b>Colle ici ta bio et ta liste de prix</b><p class="mut">Copie le texte de ton profil, ou ta liste de tarifs, puis colle-le dans ce cadre.</p><label for="pt" class="sr">Ta bio et tes tarifs</label><textarea id="pt" rows="7" placeholder="Awa Braids · Paris 19e&#10;Knotless M 80€ 5h&#10;Fulani 70€&#10;paypal.me/awabraids"></textarea><div class="row" style="gap:12px;margin-top:10px"><button type="button" class="btn sm dark" data-act="pastego">Remplir ma page</button><button type="button" class="lnk" data-act="pasteno" style="margin:0">Annuler</button></div><p id="ptm" class="mut" role="status" style="margin:10px 0 0"></p></div>';
  }
  function impBox() {
    var l = imported(); if (!l.length) return '';
    return '<div class="impb"><b>' + l.length + ' prestation' + (l.length > 1 ? 's trouvées' : ' trouvée') + ' dans ton texte</b><ul>' + l.map(function (x) { return '<li><span>' + esc(x.name) + '</span><span>' + U.eur(x.price) + ' · ' + U.dur(x.minutes) + (x.guessed ? ' ?' : '') + '</span></li>'; }).join('') + '</ul><p class="mut">Les durées suivies d’un « ? » sont estimées : corrige-les ensuite en touchant la prestation.</p><div class="row" style="gap:12px;margin-top:10px"><button type="button" class="btn sm dark" data-act="impadd">Ajouter ' + (l.length > 1 ? 'les ' + l.length : 'la prestation') + '</button><button type="button" class="lnk" data-act="impno" style="margin:0">Ignorer</button></div></div>';
  }
  // ----- avis reçus -----
  function pstars(n) { return '<span class="rvs" aria-label="' + n + ' sur 5">' + '★★★★★'.slice(0, n) + '<i>' + '★★★★★'.slice(n) + '</i></span>'; }
  function revBox() {
    if (!S.proReviews) return '';
    var r = st.revs || { n: 0, list: [] }, h = '<h2 class="mp-h" style="margin-top:26px">Tes avis' + (r.n ? ' · ' + String(r.avg).replace('.', ',') + ' sur 5 (' + r.n + ')' : '') + '</h2>';
    if (st.alerts > 0) h += '<p class="note info">' + st.alerts + ' personne' + (st.alerts > 1 ? 's attendent' : ' attend') + ' une place chez toi : elles seront prévenues par e-mail dès qu’un rendez-vous est annulé.</p>';
    if (!r.n) return h + '<p class="mut">Pas encore d’avis. Une cliente peut en laisser un dès que tu marques son rendez-vous comme « fait ».</p>';
    return h + (r.list || []).map(function (x) {
      return '<div class="rv"><div class="rvt">' + pstars(x.rating) + '<b>' + esc(x.name || 'Cliente') + '</b><span class="mut">' + new Date(x.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + '</span></div>' + (x.body ? '<p>' + esc(x.body) + '</p>' : '') +
        '<label for="rr' + x.id + '" class="sr">Ta réponse</label><textarea id="rr' + x.id + '" class="rvta" rows="2" maxlength="600" placeholder="Répondre à cet avis (visible sur ta page)">' + esc(x.reply || '') + '</textarea><button type="button" class="btn sm ghost" style="color:var(--noir);margin-top:8px" data-act="rrep" data-id="' + x.id + '">' + (x.reply ? 'Modifier ma réponse' : 'Répondre') + '</button></div>';
    }).join('');
  }
  function profile(first) {
    var p = st.pro || { name: '', slug: '', city: '', bio: '', whatsapp: '', pay_info: '', deposit_pct: 30, cover_url: '', gallery: [] };
    function tg(t) { return '<label class="chip"><input type="checkbox" data-tag="' + t[0] + '"' + ((p.tags || []).indexOf(t[0]) >= 0 ? ' checked' : '') + '><span>' + t[1] + '</span></label>'; }
    var dep = p.deposit_pct == null ? 30 : p.deposit_pct, g = p.gallery || [], pw = payParts(p.pay_info);
    function row(id, lab, inner) { return '<div class="mp-row"><label for="' + id + '">' + lab + '</label>' + inner + '</div>'; }
    var h = (first ? '<div class="who"><span class="grow">Connectée avec <b>' + esc((st.user && st.user.email) || '') + '</b></span><button type="button" class="lnk" data-act="out">Me déconnecter</button></div>' : '') + note() + '<div id="pbx">' + pasteBox(false) + '</div><form id="fp" class="mp">';
    h += '<p class="mp-hint">' + (first ? 'Voici ta future page. Écris directement dessus.' : 'Ta page, comme ta cliente la voit. Touche un texte pour le changer.') + '</p><div class="mp-sheet">';
    h += '<div class="mp-cov"' + (p.cover_url ? ' style="' + U.bg(p.cover_url) + '"' : '') + '>' + (first ? '' : '<label class="mp-covbtn" for="cover">' + svg(I.photo, 16) + (p.cover_url ? 'Changer la photo' : 'Ajouter une photo de couverture') + '</label><input type="file" id="cover" accept="image/*" data-photo="cover">') + '</div>';
    h += '<div class="mp-head">' + (first ? '<span class="mp-av" aria-hidden="true">' + esc((p.name || 'P').charAt(0).toUpperCase()) + '</span>' : '<label class="mp-av" for="avatar" aria-label="Changer ta photo de profil"' + (p.avatar_url ? ' style="' + U.bg(p.avatar_url) + '"' : '') + '>' + (p.avatar_url ? '' : esc((p.name || '?').charAt(0).toUpperCase())) + '<i>' + svg(I.plus, 13, 2.6) + '</i></label><input type="file" id="avatar" accept="image/*" data-photo="avatar"><a class="mp-see" href="' + esc(link()) + '" target="_blank" rel="noopener">Voir ma page en vrai</a>') + '</div>';
    h += '<input id="pn" class="mp-name" type="text" maxlength="60" required aria-label="Ton nom ou celui de ton activité" placeholder="Ton nom ou ton salon" value="' + esc(p.name) + '">';
    h += '<div class="mp-city"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.200 7-11.500A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/></svg><input id="pc" type="text" maxlength="60" aria-label="Ta ville ou ton quartier" placeholder="Ta ville ou ton quartier" value="' + esc(p.city) + '"></div>';
    h += '<textarea id="pb" class="mp-bio" maxlength="400" rows="3" aria-label="Quelques mots sur toi" placeholder="Quelques mots sur toi : ta spécialité, ton ambiance, depuis quand tu coiffes.">' + esc(p.bio) + '</textarea>';
    h += '<div class="mp-tags"><div class="chips">' + [['femme', 'Femmes'], ['homme', 'Hommes'], ['enfant', 'Enfants']].map(tg).join('') + '</div><div class="chips">' + [['chez', 'Chez moi'], ['domicile', 'À domicile'], ['salon', 'En salon']].map(tg).join('') + '</div></div>';
    if (!first) {
      h += '<div class="mp-ph"><b>Tes photos</b><span>' + g.length + ' sur 8</span></div><div class="gpick">';
      g.forEach(function (u, i) { h += '<span class="ph" style="' + U.bg(u) + '"><button type="button" class="x" data-rm="' + i + '" aria-label="Retirer cette photo">×</button></span>'; });
      if (g.length < 8) h += '<label for="gal" aria-label="Ajouter une photo">' + svg(I.plus, 22) + '</label><input type="file" id="gal" accept="image/*" data-photo="gal" style="position:absolute;opacity:0;width:1px;height:1px">';
      h += '</div>';
    }
    h += '</div><p class="mp-note">Sur la carte, seul ton quartier apparaît.' + (st.pro && p.city && p.lat == null ? ' Le tien n’a pas été trouvé : écris une ville, ou « Paris 19e ».' : '') + '</p>';
    h += '<h2 class="mp-h">Ton lien</h2><div class="pre"><span>perleapp.fr/?c=</span><input id="ps" type="text" maxlength="30" required aria-label="Le nom de ton lien" placeholder="awabraids" value="' + esc(p.slug) + '"></div><p class="mp-note">Minuscules, chiffres et tirets. C’est ce que tu colles dans ta bio.</p>';
    h += '<h2 class="mp-h">Pour te trouver et te joindre</h2><div class="mp-list">' +
      row('pa', 'Adresse exacte', '<input id="pa" type="text" maxlength="200" autocomplete="off" placeholder="12 rue de Crimée, 75019" value="' + esc((st.priv || {}).address || '') + '">') +
      row('pw2', 'WhatsApp', '<input id="pw2" type="tel" maxlength="20" placeholder="06 12 34 56 78" value="' + esc(p.whatsapp) + '">') + row('pi', 'Instagram', '<span class="mp-pre">instagram.com/</span><input id="pi" type="text" maxlength="80" autocapitalize="none" autocomplete="off" placeholder="toncompte" value="' + esc(p.instagram || '') + '">') + '</div><p class="mp-note">Ton adresse n’apparaît qu’une fois l’acompte confirmé, jamais sur ta page. Ton WhatsApp sert au bouton « Prévenir » après une réservation. Ton Instagram s’affiche sur ta page : c’est ce qui rassure une nouvelle cliente.</p>';
    h += '<h2 class="mp-h">L’acompte</h2><div class="mp-dep"><div class="mp-bar" aria-hidden="true"><span id="pdb" style="width:' + esc(dep) + '%"></span></div>' +
      '<div class="mp-split"><span><b id="pde">' + Math.round(80 * dep / 100) + ' €</b>à la réservation</span><span><b id="pdr">' + (80 - Math.round(80 * dep / 100)) + ' €</b>sur place</span></div>' +
      '<input id="pd" type="range" min="0" max="100" step="5" value="' + esc(dep) + '" aria-label="Acompte demandé, en pourcentage du prix" oninput="var v=+this.value,a=Math.round(80*v/100);document.getElementById(\'pdv\').textContent=v+\' %\';document.getElementById(\'pde\').textContent=a+\' €\';document.getElementById(\'pdr\').textContent=(80-a)+\' €\';document.getElementById(\'pdb\').style.width=v+\'%\'">' +
      '<p class="mp-note" style="margin:0">Tu demandes <b id="pdv">' + esc(dep) + ' %</b>, ici sur une coiffure à 80 €.</p></div>';
    h += '<div class="mp-list" style="margin-top:12px">' + row('ph', 'Annulation libre jusqu’à', '<select id="ph">' + [[0, 'la dernière minute'], [24, '24 h avant'], [48, '48 h avant'], [72, '3 jours avant'], [168, '7 jours avant']].map(function (o) { return '<option value="' + o[0] + '"' + ((p.cancel_hours == null ? 48 : p.cancel_hours) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>') + '</div><p class="mp-note">Passé ce délai, elle doit t’écrire. Sans acompte confirmé sous 24 h, le créneau se libère.</p>';
    h += '<h2 class="mp-h">Où elle t’envoie l’argent</h2><div class="mp-list">' +
      row('pl', 'PayPal', '<span class="mp-pre">paypal.me/</span><input id="pl" type="text" maxlength="40" autocapitalize="none" autocomplete="off" placeholder="tonnom" value="' + esc(pw.pp) + '">') +
      row('rl', 'Revolut', '<span class="mp-pre">revolut.me/</span><input id="rl" type="text" maxlength="40" autocapitalize="none" autocomplete="off" placeholder="tonnom" value="' + esc(pw.rv) + '">') +
      '<div class="mp-row mp-col"><label for="pp">Autre moyen</label><textarea id="pp" maxlength="200" rows="2" placeholder="Wero ou Lydia au 06 12 34 56 78">' + esc(pw.txt) + '</textarea></div></div><p class="mp-note">Avec PayPal ou Revolut, elle a un bouton « Payer » qui l’y emmène, montant compris.</p>';
    h += '<button class="btn" style="margin-top:24px">' + (first ? 'Créer ma page' : 'Enregistrer') + '</button></form>' + (first ? '' : '<div class="mespace"></div>');
    return h;
  }
  // ----- prestations -----
  // ----- profil -----
  var known = false;
  function me() {
    var p = st.pro, em = (st.user && st.user.email) || '', n = st.svcs.length, up = st.rdv.filter(function (b) { return new Date(b.ends_at).getTime() >= Date.now() && b.status !== 'annule'; }).length;
    var pic = p.avatar_url || p.cover_url, on = p.published !== false;
    function row(ic, t, s, attr) { return '<button type="button" class="srow" ' + attr + '>' + svg(ic, 22, 1.8) + '<span class="grow"><b>' + t + '</b><span class="mut">' + s + '</span></span>' + svg(I.chev, 18) + '</button>'; }
    var h = note() + '<section class="acct"><div class="acct-id"><span class="acct-av"' + (pic ? ' style="' + U.bg(pic) + '"' : '') + '>' + (pic ? '' : esc((p.name || '?').charAt(0).toUpperCase())) + '</span><div class="grow"><b class="acct-name">' + esc(p.name) + '</b><span class="mut">' + esc(em) + '</span></div></div>' +
      '<div class="acct-link"><div class="grow"><span class="mut">Ton lien de réservation</span><b>' + esc(link().replace(/^https?:\/\//, '')) + '</b></div><button type="button" class="btn sm dark" data-act="copy">Copier</button></div></section>' +
      '<div class="nums"><div><b>' + up + '</b><span>à venir</span></div><div><b>' + n + '</b><span>prestation' + (n > 1 ? 's' : '') + '</span></div><div><b class="live' + (on ? ' on' : '') + '"><i></i>' + (on ? 'En ligne' : 'Masquée') + '</b><span>ta page</span></div></div>' +
      '<div class="slist" style="margin-top:22px">' +
      row(I.lock, 'Mot de passe', 'En choisir un nouveau', 'data-act="pw"') +
      ((st.pw || st.recovery) ? '<form id="fw" class="spw"><label for="np">Nouveau mot de passe (8 caractères au moins)</label><input id="np" type="password" autocomplete="new-password" minlength="8" required><button class="btn" style="margin-top:12px">Enregistrer</button></form>' : '') +
      row(I.page, on ? 'Mettre ma page hors ligne' : 'Remettre ma page en ligne', on ? 'Elle est visible et on peut réserver' : 'Plus personne ne peut la voir ni réserver', 'data-act="pub"') +
      row(I.doc, 'Pas encore déclarée ?', 'Créer sa micro-entreprise est gratuit et se fait en ligne', 'data-act="decl"') +
      row(I.help, 'Aide', 'On te répond sous 24 heures', 'data-act="help"') +
      row(I.doc, 'Conditions et confidentialité', 'Les règles d’utilisation', 'data-act="legal"') +
      '</div>' + revBox() + '<button type="button" class="bye" data-act="out">Me déconnecter<span>' + esc(em) + '</span></button>' + (S.deleteAccount ? '<p style="text-align:center;margin:14px 0 0"><button type="button" class="lnk" style="color:var(--mut);margin:0" data-act="delacct">Supprimer mon compte</button></p><p id="pdm" class="mut" role="status" style="text-align:center;margin:6px 0 0"></p>' : '');
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
  function keepForm() { if (!st.edit) return; st.edit.name = val('sn'); st.edit.price = val('sp'); st.edit.minutes = val('sm'); st.edit.prep = val('sprep'); if (document.getElementById('fs')) st.edit.options = readOpts(); }
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
    var h = note() + impBox();
    if (st.calc) return h + calcul();
    if (st.edit) {
      var s = st.edit;
      return h + '<form id="fs"><h2 style="margin-top:0">' + (s.id ? 'Modifier la prestation' : 'Nouvelle prestation') + '</h2><label>Photo de cette coiffure</label>' + picker('sphoto', s.photo_url, 'Choisir une photo') +
        '<label for="sn">Nom</label><input id="sn" type="text" maxlength="60" required placeholder="Knotless braids" list="snl" value="' + esc(s.name || '') + '">' + dl('snl', NOMS) + '<span class="mut">Si ta coiffure est dans la liste proposée, garde ce nom : les clientes te trouvent plus facilement.</span>' +
        '<div class="grid2"><div><label for="sp">Prix de base, en €</label><input id="sp" type="number" min="0" max="2000" step="1" required value="' + esc(s.price == null ? '' : s.price) + '"></div><div><label for="sm">Durée, en minutes</label><input id="sm" type="number" min="15" max="720" step="15" required value="' + esc(s.minutes || '') + '"></div></div>' +
        '<label for="sprep">Consignes avant le rendez-vous (facultatif)</label><textarea id="sprep" maxlength="300" placeholder="Exemple : cheveux lavés, démêlés et séchés. Mèches non fournies : 3 paquets de X-pression.">' + esc(s.prep || '') + '</textarea><span class="mut">La cliente les voit dès qu’elle réserve : plus besoin de les répéter par message.</span>' +
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
    var buf = st.pro.buffer_min || 0, lead = st.pro.lead_hours || 1, cl = st.pro.closed || [];
    function seg(name, lab, opts, cur) { return '<p class="sect">' + lab + '</p><div class="seg" role="radiogroup" aria-label="' + lab + '">' + opts.map(function (o) { return '<label><input type="radio" name="' + name + '" value="' + o[0] + '"' + (cur === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>'; }).join('') + '</div>'; }
    h += seg('hb', 'Pause entre deux clientes', [[0, 'Aucune'], [15, '15 min'], [30, '30 min'], [60, '1 heure']], buf);
    h += seg('hl', 'On peut réserver jusqu’à', [[1, '1 h avant'], [3, '3 h'], [12, '12 h'], [24, 'la veille']], lead);
    h += '<button class="btn" style="margin-top:22px">Enregistrer</button></form>';
    function fr(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }
    var td = new Date(), ts = td.getFullYear() + '-' + ('0' + (td.getMonth() + 1)).slice(-2) + '-' + ('0' + td.getDate()).slice(-2);
    h += '<h2>Congés et jours fermés</h2><p class="mut">Ces jours-là, aucun créneau n’est proposé. C’est enregistré tout de suite.</p>';
    cl.forEach(function (r, i) { if (r[1] >= ts) h += '<div class="card row" style="margin-bottom:8px;border-radius:22px;padding:10px 12px 10px 16px"><span class="grow b">' + (r[0] === r[1] ? 'Le ' + fr(r[0]) : 'Du ' + fr(r[0]) + ' au ' + fr(r[1])) + '</span><button type="button" class="btn sm ghost" data-act="cldel" data-i="' + i + '">Retirer</button></div>'; });
    h += '<div class="grid2"><div><label for="c0">Du</label><input id="c0" type="date" style="box-sizing:border-box;min-width:0;width:100%;min-height:52px;border-radius:26px;border:1px solid var(--line);background:var(--soft);padding:12px 14px;font-size:16px" min="' + ts + '"></div><div><label for="c1">Au (inclus)</label><input id="c1" type="date" style="box-sizing:border-box;min-width:0;width:100%;min-height:52px;border-radius:26px;border:1px solid var(--line);background:var(--soft);padding:12px 14px;font-size:16px" min="' + ts + '"></div></div><button type="button" class="btn dark" style="margin-top:12px" data-act="cladd">Bloquer ces jours</button>';
    return h + '<div class="mespace"></div>';
  }
  // ----- rendez-vous -----
  function photoFor(b) { var s = st.svcs.filter(function (x) { return x.id === b.service_id; })[0]; return (s && s.photo_url) || st.pro.cover_url || ''; }
  function acts(b, now) {
    var s = new Date(b.starts_at), a = '';
    if (b.status === 'attente') a += '<button class="btn sm" data-st="confirme" data-id="' + esc(b.id) + '">Acompte reçu</button>';
    if (b.status === 'confirme' && s.getTime() < now) a += '<button class="btn sm dark" data-st="fait" data-id="' + esc(b.id) + '">Rendez-vous fait</button>';
    if (b.status === 'confirme' && s.getTime() < now && b.price - b.deposit > 0) a += '<a class="btn sm" href="sms:' + esc(intl(b.client_phone)) + '?&body=' + encodeURIComponent(restMsg(b)) + '">Demander le reste</a>';
    a += '<a class="btn sm ghost" href="tel:' + esc(b.client_phone) + '">Appeler</a>';
    var d0 = new Date(); d0.setHours(0, 0, 0, 0); var lv = '', fn = esc(String(b.client_name || '').split(' ')[0]);
    if (b.status === 'confirme' && s.getTime() >= d0.getTime() && s.getTime() < d0.getTime() + 864e5) {
      var ptk = [['Confirmé', 1], [fn + ' est en route', !!b.client_onway_at], ['Tu es prête', !!b.pro_ready_at], ['C’est son tour', !!b.pro_ready_at && Date.now() >= s.getTime() + (b.pro_delay_min || 0) * 60000]], pcur = -1; ptk.forEach(function (x, i) { if (pcur < 0 && !x[1]) pcur = i; });
      lv = '<div class="livep"><ol class="trk" aria-label="Suivi du jour" style="margin:0 0 12px">' + ptk.map(function (x, i) { return '<li class="' + (x[1] ? 'ok' : i === pcur ? 'now' : '') + '">' + x[0] + '</li>'; }).join('') + '</ol>' + (b.client_onway_at ? '<p class="lv"><b>' + fn + ' est en route.</b>' + (b.client_eta_min > 0 ? ' Arrivée estimée vers ' + new Date(new Date(b.client_onway_at).getTime() + b.client_eta_min * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + '.' : '') + '</p>' : '') + (b.client_late_min > 0 ? '<p class="lv"><b>' + fn + ' annonce environ ' + b.client_late_min + ' min de retard.</b></p>' : '') +
        '<div class="dly"><span class="mut">Ton horaire aujourd’hui, vu par ' + fn + '</span>' + [0, 10, 20, 30].map(function (m) { return '<button type="button" data-sig="late" data-min="' + m + '" data-id="' + esc(b.id) + '" aria-pressed="' + ((b.pro_delay_min || 0) === m) + '">' + (m ? '+' + m + ' min' : 'À l’heure') + '</button>'; }).join('') + '</div>' +
        (b.pro_ready_at ? '<p class="mut" style="margin-top:10px">Tu as prévenu ' + fn + ' que c’est son tour.</p>' : '<button type="button" class="btn sm dark" style="margin-top:10px" data-sig="ready" data-id="' + esc(b.id) + '">J’ai fini, ' + fn + ' peut venir</button>') + '</div>';
    }
    return lv + '<div class="acts">' + a + '</div>';
  }
  // message prêt à envoyer à la cliente pour régler le reste
  function restMsg(b) {
    var rest = Math.round((b.price - b.deposit) * 100) / 100, links = (String(st.pro.pay_info || '').match(/https?:\/\/\S+/g) || []).slice(0, 2).map(function (u) { return /paypal\.(me|com\/paypalme)\/[\w.-]+\/?$/i.test(u) ? u.replace(/\/$/, '') + '/' + rest + 'EUR' : u; });
    return 'Bonjour ' + String(b.client_name || '').split(' ')[0] + ', c’est ' + st.pro.name + '. Il reste ' + U.eur(rest) + ' à régler pour ta coiffure (référence ' + b.ref + '). ' + (links.length ? 'Tu peux payer ici : ' + links.join(' ou ') : 'Tu retrouves ton rendez-vous ici : https://perleapp.fr/?v=rdv') + ' Merci !';
  }
  function intl(p) { return String(p || '').replace(/[^0-9+]/g, '').replace(/^0/, '+33'); }
  // message prêt à envoyer pour proposer à une cliente de revenir
  function backMsg(b) { return 'Bonjour ' + String(b.client_name || '').split(' ')[0] + ', c’est ' + st.pro.name + '. J’espère que tu es contente de ta coiffure ! Quand tu voudras la refaire, tu peux reprendre rendez-vous ici : ' + link() + (b.service_id ? (link().indexOf('?') < 0 ? '?' : '&') + 's=' + b.service_id : ''); }
  function sendLinks(b, lab, txt) { var m = encodeURIComponent(txt); return '<div class="row" style="gap:8px;margin-top:8px"><span class="grow">' + lab + '</span><a class="btn sm ghost" href="sms:' + esc(intl(b.client_phone)) + '?&body=' + m + '">SMS</a><a class="btn sm ghost" href="https://wa.me/' + esc(intl(b.client_phone).replace('+', '')) + '?text=' + m + '" target="_blank" rel="noopener">WhatsApp</a></div>'; }
  function fiche(b) {
    var all = st.rdv.filter(function (x) { return x.client_phone === b.client_phone; }), done = all.filter(function (x) { return x.status === 'fait'; }).length, ann = all.filter(function (x) { return x.status === 'annule'; }).length, n = (st.notes || {})[b.client_phone] || {}, fn = String(b.client_name || '').split(' ')[0], s = new Date(b.starts_at), sv = st.svcs.filter(function (x) { return x.id === b.service_id; })[0];
    var h = (n.flag ? '<p class="note err" style="margin-top:8px"><b>À surveiller.</b> ' + esc(n.note || 'Tu as marqué cette cliente après un rendez-vous manqué.') + '</p>' : (n.note ? '<p class="note info" style="margin-top:8px">' + esc(n.note) + '</p>' : ''));
    h += '<details class="fiche" style="margin-top:8px"><summary class="mut" style="cursor:pointer">Fiche, messages et autres actions : ' + (done ? done + ' coiffure' + (done > 1 ? 's' : '') + ' faite' + (done > 1 ? 's' : '') : 'première venue') + (ann ? ', ' + ann + ' annulation' + (ann > 1 ? 's' : '') : '') + '</summary><textarea maxlength="300" aria-label="Note sur cette cliente" placeholder="Note pour toi seule : cuir chevelu sensible, préfère le matin…" style="margin-top:8px">' + esc(n.note || '') + '</textarea><label class="row" style="gap:8px;margin-top:8px"><input type="checkbox"' + (n.flag ? ' checked' : '') + ' style="width:auto"><span>À surveiller (rendez-vous manqué, retard…)</span></label><button type="button" class="btn sm dark" style="margin-top:10px" data-act="note" data-phone="' + esc(b.client_phone) + '">Enregistrer la fiche</button>';
    if ((b.status === 'attente' || b.status === 'confirme') && new Date(b.ends_at).getTime() > Date.now()) {
      h += '<p class="b" style="margin:16px 0 0">Messages prêts à envoyer</p>';
      if (b.status === 'confirme') h += sendLinks(b, 'Acompte bien reçu', 'Bonjour ' + fn + ', c’est ' + st.pro.name + '. J’ai bien reçu ton acompte de ' + U.eur(b.deposit) + ' : ton rendez-vous du ' + U.day(s) + ' à ' + U.hm(s) + ' est confirmé. À bientôt !');
      h += sendLinks(b, 'Rappel du rendez-vous', 'Bonjour ' + fn + ', c’est ' + st.pro.name + '. Petit rappel : on se voit ' + U.day(s) + ' à ' + U.hm(s) + ' pour ' + b.service_name + '.' + (sv && sv.prep ? ' Avant de venir : ' + sv.prep : '') + ' Il restera ' + U.eur(b.price - b.deposit) + ' à régler. À très vite !');
      h += sendLinks(b, 'J’ai du retard', 'Bonjour ' + fn + ', c’est ' + st.pro.name + '. J’ai environ 15 minutes de retard, désolée ! Je te préviens dès que je suis prête.');
    }
    var x = '', now2 = Date.now();
    if (b.status === 'confirme' && s.getTime() < now2 && b.price - b.deposit > 0) h += sendLinks(b, 'Demander le reste', restMsg(b));
    if ((b.status === 'attente' || b.status === 'confirme') && s.getTime() >= now2) x += '<a class="btn sm ghost" href="' + U.ics({ ref: b.ref, start: b.starts_at, end: b.ends_at, title: b.client_name + ' · ' + b.service_name, where: (st.priv || {}).address || '', desc: b.client_phone + '. ' + b.service_name + (b.options_text ? ', ' + b.options_text : '') + '. Prix ' + U.eur(b.price) + ', acompte ' + U.eur(b.deposit) + ', reste ' + U.eur(b.price - b.deposit) + '.' + (b.note ? '\n« ' + b.note + ' »' : '') }) + '" download="perle-' + esc(b.ref) + '.ics">Mettre dans mon agenda</a>';
    if (b.status === 'attente' || b.status === 'confirme') x += '<button class="btn sm ghost" data-st="annule" data-id="' + esc(b.id) + '">Annuler ce rendez-vous</button>';
    if (x) h += '<div class="acts" style="margin-top:14px">' + x + '</div>';
    return h + '</details>';
  }
  function detail(b) { return '<div class="mut" style="margin-top:10px">' + esc(b.client_phone) + '. Référence ' + esc(b.ref) + '. Acompte ' + U.eur(b.deposit) + ', reste ' + U.eur(b.price - b.deposit) + '.' + (b.note ? '<br>« ' + esc(b.note) + ' »' : '') + '</div>' + (b.status === 'attente' && b.paid_claimed_at ? '<p class="note ok" style="margin-top:8px"><b>' + esc(String(b.client_name || '').split(' ')[0]) + ' dit avoir envoyé l’acompte.</b> Vérifie ton compte, puis confirme.</p>' : ''); }
  function stOf(b, now) { return (b.status === 'attente' && now - new Date(b.created_at).getTime() > 864e5) ? 'expire' : b.status; }
  function rdv() {
    var now = Date.now(), up = st.rdv.filter(function (b) { var e = new Date(b.ends_at).getTime(); return (e >= now || (b.status === 'confirme' && e >= now - 2 * 864e5)) && b.status !== 'annule' && stOf(b, now) !== 'expire'; }), old = st.rdv.filter(function (b) { return up.indexOf(b) < 0; }).reverse();
    var h = note(), t = new Date(), wk = '';
    if (!String(st.pro.pay_info || '').trim()) h += '<p class="note info"><b>Ta page n’est pas encore en ligne.</b> Indique comment recevoir l’acompte : elle sera en ligne dès que c’est enregistré.</p><button type="button" class="btn dark" style="margin:10px 0 14px" data-tab="pro">Indiquer mon moyen de paiement</button>';
    var hrsOk = false; try { hrsOk = !!localStorage.getItem('perle-hrs-' + st.pro.id); } catch (e) {}
    var todo = [[true, 'pro', 'Crée ta page', 'C’est fait, elle est en ligne'], [st.svcs.length > 0, 'svc', 'Ajoute ta première coiffure', 'Avec son prix et sa durée'], [hrsOk, 'hrs', 'Vérifie tes horaires', 'Ce sont des horaires par défaut : mets les tiens'], [!!st.pro.pay_info, 'pro', 'Dis comment recevoir l’acompte', 'Ton PayPal, ton Revolut ou un autre moyen'], [!!(st.pro.cover_url || st.pro.avatar_url), 'pro', 'Mets une photo', 'Une page avec photo donne confiance']], left = todo.filter(function (x) { return !x[0]; }).length;
    var gd = ''; if (left) gd = '<section class="start"><b>Encore ' + left + ' chose' + (left > 1 ? 's' : '') + ' à faire avant de partager ton lien</b><div class="start-bar" role="img" aria-label="' + (todo.length - left) + ' étapes faites sur ' + todo.length + '"><span style="width:' + Math.round(100 * (todo.length - left) / todo.length) + '%"></span></div><p class="start-n">' + (todo.length - left) + ' sur ' + todo.length + ' déjà fait' + (todo.length - left > 1 ? 'es' : 'e') + '</p>' + todo.filter(function (x) { return !x[0]; }).map(function (x) { return '<button type="button" class="start-row' + (x[0] ? ' ok' : '') + '" data-tab="' + x[1] + '"><i aria-hidden="true">' + (x[0] ? '✓' : '') + '</i><span class="grow"><span class="b">' + x[2] + '</span><span class="mut">' + x[3] + '</span></span>' + svg(I.chev, 18) + '</button>'; }).join('') + '</section>';
    if (!up.length) h += gd;
    for (var i = 0; i < 7; i++) { var d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i), has = up.some(function (b) { var s = new Date(b.starts_at); return s.toDateString() === d.toDateString(); }); wk += '<span class="' + (i === 0 ? 'on' : '') + '">' + d.toLocaleDateString('fr-FR', { weekday: 'short' }) + '<b>' + d.getDate() + '</b>' + (has ? '<i></i>' : '') + '</span>'; }
    var wait = up.filter(function (b) { return b.status === 'attente'; }).length, sum = up.reduce(function (a, b) { return a + Number(b.price); }, 0);
    h += '<div class="row" style="gap:10px;margin-top:10px"><span class="stat"><b>' + up.filter(function (b) { return new Date(b.ends_at).getTime() >= now; }).length + '</b><span class="mut">rendez-vous à venir</span></span><span class="stat"><b>' + U.eur(sum) + '</b><span class="mut">' + (wait ? wait + ' acompte' + (wait > 1 ? 's' : '') + ' à recevoir' : 'prévus') + '</span></span></div>';
    var d0 = new Date(), m0 = new Date(d0.getFullYear(), d0.getMonth(), 1).getTime(), m1 = new Date(d0.getFullYear(), d0.getMonth() + 1, 1).getTime();
    var mois = st.rdv.filter(function (b) { var t = new Date(b.starts_at).getTime(); return t >= m0 && t < m1 && (b.status === 'confirme' || b.status === 'fait'); });
    var tot = mois.reduce(function (a, b) { return a + Number(b.price); }, 0), acc = mois.reduce(function (a, b) { return a + Number(b.deposit); }, 0);
    var seen = {}, rev = 0; st.rdv.forEach(function (b) { if (b.status !== 'confirme' && b.status !== 'fait') return; var k = String(b.client_phone || '').replace(/\D/g, ''); if (!k) return; seen[k] = (seen[k] || 0) + 1; if (seen[k] === 2) rev++; });
    var mo = '<div class="vio" style="margin-top:26px"><span class="mut">Ton mois de ' + d0.toLocaleDateString('fr-FR', { month: 'long' }) + '</span><div style="font-family:var(--hb);font-weight:700;font-size:38px;letter-spacing:-.03em;line-height:1.1">' + U.eur(tot) + '</div><div class="mut">' + mois.length + ' rendez-vous confirmé' + (mois.length > 1 ? 's' : '') + ', ' + U.eur(acc) + ' d’acomptes reçus, ' + U.eur(tot - acc) + ' sur place</div>' + (rev ? '<div class="mut" style="margin-top:4px">' + rev + ' cliente' + (rev > 1 ? 's sont revenues' : ' est revenue') + ' chez toi</div>' : '') + (mois.length ? '<a class="btn sm ghost" style="margin-top:12px;color:var(--noir)" download="perle-' + d0.getFullYear() + '-' + ('0' + (d0.getMonth() + 1)).slice(-2) + '.csv" href="data:text/csv;charset=utf-8,' + encodeURIComponent('\ufeffDate;Cliente;Prestation;Prix;Acompte;Reste;Statut\r\n' + mois.map(function (b) { return [new Date(b.starts_at).toLocaleDateString('fr-FR'), b.client_name, b.service_name + (b.options_text ? ' (' + b.options_text + ')' : ''), String(b.price).replace('.', ','), String(b.deposit).replace('.', ','), String(Math.round((b.price - b.deposit) * 100) / 100).replace('.', ','), LAB[b.status]].map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n')) + '">Télécharger le mois (tableur)</a>' : '') + '</div>';
    h += '<h2>À venir et à terminer</h2>';
    if (!up.length) h += '<p class="note info">Pas encore de rendez-vous. Colle ton lien dans ta bio Instagram ou TikTok pour recevoir ta première réservation.</p><button type="button" class="btn dark" style="margin-top:10px" data-act="copy">Copier mon lien</button>';
    up.forEach(function (b, k) {
      var s = new Date(b.starts_at), what = esc(b.service_name) + (b.options_text ? ', ' + esc(b.options_text) : '');
      if (k === 0) h += '<div class="photo-card ph" style="' + U.bg(photoFor(b)) + (photoFor(b) ? '' : ';background:var(--vio)') + '"><span class="when">' + esc(U.dayS(s)) + ', ' + U.hm(s) + '</span><span class="stg glass">' + LAB[stOf(b, Date.now())] + '</span><span class="plate glass"><b>' + esc(b.client_name) + '</b>' + what + ', ' + U.eur(b.price) + '</span></div>' + detail(b) + acts(b, now) + fiche(b) + '<div style="height:14px"></div>';
      else h += '<div class="card" style="margin-bottom:10px;border-radius:28px;padding:10px 14px 12px 10px"><div class="row">' + thumb(photoFor(b)) + '<span class="grow"><span class="b">' + esc(U.day(s)) + ', ' + U.hm(s) + '</span><br><span class="mut">' + esc(b.client_name) + ', ' + what + '</span></span><span class="st ' + esc(stOf(b, Date.now()) === 'expire' ? 'annule' : b.status) + '">' + LAB[stOf(b, Date.now())] + '</span></div>' + detail(b) + acts(b, now) + fiche(b) + '</div>';
    });
    if (up.length && gd) h += gd + '<div style="height:14px"></div>';
    h += '<div class="vio" style="margin-top:8px"><span class="mut">Ton lien de réservation, à mettre dans ta bio</span><div class="b" style="font-size:17px;word-break:break-all;margin:4px 0 12px">' + esc(link().replace(/^https?:\/\//, '')) + '</div>' + (st.views && st.views.m ? '<div class="mut" style="margin:-4px 0 12px">Ta page a été ouverte ' + st.views.w + ' fois ces 7 derniers jours' + (st.views.m > st.views.w ? ', ' + st.views.m + ' fois en 30 jours' : '') + '.' + (st.views.options ? ' Sur 30 jours, ' + st.views.options + ' personne' + (st.views.options > 1 ? 's ont' : ' a') + ' choisi une coiffure et ' + (st.views.done || 0) + ' ' + ((st.views.done || 0) > 1 ? 'ont' : 'a') + ' réservé.' : '') + '</div>' : '') + '<div class="row" style="flex-wrap:wrap;gap:8px"><button class="btn sm" data-act="copy">Copier le lien</button><button class="btn sm ghost" data-act="share" style="color:var(--noir)">Partager</button><button class="btn sm ghost" data-act="qr" style="color:var(--noir)">QR code</button><a class="btn sm ghost" href="' + esc(link()) + '" target="_blank" rel="noopener" style="color:var(--noir)">Voir ma page</a></div><div id="qrbox"></div></div>';
    h += mo;
    if (old.length) { h += '<h2>Passés ou annulés</h2>'; old.slice(0, 20).forEach(function (b) { var s = new Date(b.starts_at); h += '<div class="card row" style="margin-bottom:8px;border-radius:24px;padding:10px 14px 10px 10px">' + thumb(photoFor(b), 'sm') + '<span class="grow"><span class="b">' + esc(b.client_name) + '</span><br><span class="mut">' + esc(U.day(s)) + ', ' + esc(b.service_name) + '</span></span><span class="st ' + esc(stOf(b, Date.now()) === 'expire' ? 'annule' : b.status) + '">' + LAB[stOf(b, Date.now())] + '</span></div>'; if (b.status === 'fait') { var m = encodeURIComponent(backMsg(b)); h += '<div class="acts" style="margin:-2px 0 12px"><a class="btn sm ghost" href="sms:' + esc(intl(b.client_phone)) + '?&body=' + m + '">Proposer de revenir par SMS</a><a class="btn sm ghost" href="https://wa.me/' + esc(intl(b.client_phone).replace('+', '')) + '?text=' + m + '" target="_blank" rel="noopener">Par WhatsApp</a></div>'; } }); }
    return h;
  }

  function render() {
    document.body.classList.remove('dark');
    if (!st.user) return auth();
    if (!st.pro) { app.innerHTML = top() + profile(true); return; }
    if (st.recovery) st.tab = 'me';
    var T = { rdv: ['Bonjour, <span class="hl">' + esc(st.pro.name.split(' ')[0]) + '</span>.', rdv], svc: ['Tes <span class="hl">prestations</span>.', services], hrs: ['Tes <span class="hl">horaires</span>.', hours], pro: ['Ta <span class="hl">page</span>.', function () { return profile(false); }], me: ['Ton <span class="hl">compte</span>.', me] }[st.tab];
    app.innerHTML = top() + '<h1>' + T[0] + '</h1><div style="margin-top:14px">' + T[1]() + '</div>' +
      '<nav class="nav" aria-label="Menu">' + TABS.map(function (t) { return '<button data-tab="' + t[0] + '" aria-selected="' + (st.tab === t[0]) + '" aria-label="' + t[1] + '">' + svg(t[2], 22) + '<span>' + t[1] + '</span></button>'; }).join('') + '</nav>';
  }
  async function poll() {
    if (!st.user || !st.pro || st.tab !== 'rdv' || document.hidden) return; var ae = document.activeElement; if (ae && /^(TEXTAREA|INPUT|SELECT)$/.test(ae.tagName)) return; if (document.querySelector('details.fiche[open]')) return;
    try { var l = await S.myBookings() || [], sig = function (a) { return (a || []).map(function (x) { return x.id + x.status + (x.paid_claimed_at || '') + (x.client_onway_at || '') + (x.client_late_min || '') + (x.pro_delay_min || '') + (x.pro_ready_at || ''); }).join('|'); }; if (sig(l) !== sig(st.rdv)) { var more = l.length > (st.rdv || []).length; st.rdv = l; if (more) st.msg = ['ok', 'Nouvelle réservation reçue.']; render(); } } catch (e) { }
  }
  setInterval(poll, 30000); document.addEventListener('visibilitychange', poll);
  async function refresh() {
    st.user = await S.session(); if (st.user) { try { localStorage.setItem('perle-known', '1'); } catch (e) {} }
    if (st.user) { st.pro = await S.myPro(); if (st.pro) { st.svcs = await S.myServices() || []; st.rdv = await S.myBookings() || []; try { localStorage.setItem('perle-own', st.pro.slug); } catch (e) { } try { st.views = S.myViews ? await S.myViews() : null; } catch (e) { st.views = null; } try { st.priv = await S.myPrivate() || {}; } catch (e) { st.priv = {}; } try { st.revs = S.proReviews ? await S.proReviews(st.pro.slug) : null; } catch (e) { st.revs = null; } try { st.alerts = S.myAlertsCount ? (await S.myAlertsCount()) || 0 : 0; } catch (e) { st.alerts = 0; } st.notes = {}; try { (await S.myNotes() || []).forEach(function (n) { st.notes[n.phone] = n; }); } catch (e) { } } }
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
  app.addEventListener('input', function (e) { if (e.target && e.target.closest && e.target.closest('#fp')) { st.dirty = true; e.target.closest('#fp').classList.add('dirty'); } });
  app.addEventListener('click', async function (e) {
    var b = e.target.closest('button'); if (!b) return;
    try {
      if (b.dataset.tab && st.tab === 'pro' && st.dirty && b.dataset.tab !== 'pro' && document.getElementById('fp')) { st.dirty = false; var dw = document.getElementById('dw'); if (!dw) document.getElementById('fp').insertAdjacentHTML('afterbegin', '<p class="note err" id="dw" role="alert">Tes changements ne sont pas enregistrés. Appuie sur Enregistrer en bas, ou touche encore l’onglet pour quitter sans enregistrer.</p>'); return window.scrollTo(0, 0); }
      if (b.dataset.tab) { st.dirty = false; st.tab = b.dataset.tab; st.edit = null; st.calc = null; render(); return window.scrollTo(0, 0); }
      if (b.dataset.edit) { st.edit = JSON.parse(JSON.stringify(st.svcs[+b.dataset.edit])); return render(); }
      if (b.dataset.rm) { var p = base(); p.gallery = (st.pro.gallery || []).filter(function (_, i) { return i !== +b.dataset.rm; }); st.pro = await S.savePro(p); return render(); }
      if (b.dataset.sig) { b.disabled = true; await S.proSignal(b.dataset.id, b.dataset.sig, +b.dataset.min || 0); st.rdv = await S.myBookings() || []; return render(); }
      if (b.dataset.st) {
        if (b.dataset.st === 'annule' && b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Confirmer l’annulation'; return; }
        await S.setStatus(b.dataset.id, b.dataset.st); st.msg = ['ok', b.dataset.st === 'confirme' ? 'Rendez-vous confirmé. Pense à prévenir ta cliente.' : 'C’est noté.']; return refresh();
      }
      var a = b.dataset.act; if (!a) return;
      if (a === 'cladd' || a === 'cldel') {
        var cl = (st.pro.closed || []).slice();
        if (a === 'cldel') cl.splice(+b.dataset.i, 1);
        else { var c0 = val('c0'), c1 = val('c1') || c0; if (!/^\d{4}-\d\d-\d\d$/.test(c0) || !/^\d{4}-\d\d-\d\d$/.test(c1) || c1 < c0) { st.msg = ['err', 'Choisis une date de début, et une date de fin qui vient après.']; return render(); } cl.push([c0, c1]); cl.sort(); cl = cl.slice(-40); }
        var pc = base(); pc.closed = cl; st.pro = await S.savePro(pc); st.msg = ['ok', a === 'cldel' ? 'Ces jours sont de nouveau ouverts.' : 'C’est bloqué : aucun créneau ne sera proposé ces jours-là.']; return render();
      }
      if (a === 'note') { var bx = b.closest('.fiche'), ph = b.dataset.phone; await S.saveNote({ phone: ph, note: bx.querySelector('textarea').value, flag: bx.querySelector('input').checked }); st.msg = ['ok', 'Fiche cliente enregistrée.']; return refresh(); }
      if (a === 'share') { var su = link(); if (!/^https?:/.test(su)) su = new URL(su, location.href).href; if (navigator.share) { try { await navigator.share({ title: st.pro.name, text: 'Réserve ta coiffure avec ' + st.pro.name, url: su }); } catch (x) { } } else { try { await navigator.clipboard.writeText(su); st.msg = ['ok', 'Lien copié.']; } catch (x) { st.msg = ['info', 'Ton lien : ' + su]; } render(); } return; }
      if (a === 'qr') {
        var qb = document.getElementById('qrbox'); if (qb.innerHTML) { qb.innerHTML = ''; return; }
        if (!window.qrcode) await new Promise(function (ok, ko) { var sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); });
        var qu = link(); if (!/^https?:/.test(qu)) qu = new URL(qu, location.href).href; var qr = window.qrcode(0, 'M'); qr.addData(qu); qr.make(); var src = qr.createDataURL(10, 20);
        qb.innerHTML = '<img src="' + src + '" alt="QR code de ta page de réservation" style="display:block;width:200px;height:200px;border-radius:18px;margin:14px auto 10px;background:#fff"><a class="btn sm ghost" style="color:var(--noir)" href="' + src + '" download="perle-qr-' + esc(st.pro.slug) + '.gif">Enregistrer l’image</a><div class="mut" style="margin-top:8px">À imprimer ou à mettre sur ta carte : la cliente le scanne et arrive sur ta page.</div>'; return;
      }
      if (a === 'in' || a === 'up') {
        e.preventDefault(); var em = val('em'), pw = document.getElementById('pw').value;
        if (!/^\S+@\S+\.\S+$/.test(em) || pw.length < 8) { st.msg = ['err', 'Écris ton e-mail et un mot de passe de 8 caractères au moins.']; return render(); }
        if (a === 'up') { var u = await S.signUp(em, pw); if (!u) { st.msg = ['ok', 'Compte créé. Ouvre l’e-mail de confirmation que tu viens de recevoir, puis connecte-toi ici.']; return render(); } } else await S.signIn(em, pw);
        return refresh();
      }
      if (a === 'out') { await S.signOut(); st.user = st.pro = null; st.tab = 'rdv'; st.pw = st.recovery = false; return render(); }
      if (a === 'oa') { var ob = document.getElementById('oa'); if (ob) ob.querySelectorAll('button').forEach(function (x) { x.disabled = true; }); await S.oauth(b.dataset.p); if ((window.PERLE || {}).APP && ob) ob.querySelectorAll('button').forEach(function (x) { x.disabled = false; }); return; }
      if (a === 'paste' || a === 'pasteno') { document.getElementById('pbx').innerHTML = pasteBox(a === 'paste'); if (a === 'paste') document.getElementById('pt').focus(); return; }
      if (a === 'pastego') {
        var pr = parsePaste(document.getElementById('pt').value), done = [], LB = { pc: 'ville', pb: 'présentation', pi: 'Instagram', pw2: 'WhatsApp', pl: 'PayPal', rl: 'Revolut' };
        Object.keys(pr.f).forEach(function (k) { var el = document.getElementById(k); if (el && !el.value.trim() && pr.f[k]) { el.value = pr.f[k]; el.dispatchEvent(new Event('input', { bubbles: true })); done.push(LB[k]); } });
        var tg = 0; pr.tags.forEach(function (t) { var c = document.querySelector('[data-tag="' + t + '"]'); if (c && !c.checked) { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); tg++; } }); if (tg) done.push('lieu et public');
        if (pr.svcs.length) { try { localStorage.setItem('perle-import', JSON.stringify(pr.svcs)); } catch (x) { } }
        if (!done.length && !pr.svcs.length) { document.getElementById('ptm').textContent = 'Rien de reconnu dans ce texte. Mets une prestation par ligne avec son prix, par exemple « Knotless M 80€ ».'; return; }
        document.getElementById('pbx').innerHTML = '<p class="note ok">' + (done.length ? 'Rempli : ' + esc(done.join(', ')) + '. ' : '') + (pr.svcs.length ? pr.svcs.length + ' prestation' + (pr.svcs.length > 1 ? 's trouvées' : ' trouvée') + ' : enregistre ta page, puis ajoute-' + (pr.svcs.length > 1 ? 'les' : 'la') + ' d’un geste dans l’onglet Prestations. ' : '') + 'Vérifie tout avant d’enregistrer.</p>'; return;
      }
      if (a === 'impno') { try { localStorage.removeItem('perle-import'); } catch (x) { } return render(); }
      if (a === 'impadd') { b.disabled = true; var il = imported(); for (var ii = 0; ii < il.length; ii++) { await S.saveService({ name: il[ii].name, price: il[ii].price, minutes: il[ii].minutes, options: [], prep: '', photo_url: '', position: st.svcs.length + ii }); } try { localStorage.removeItem('perle-import'); } catch (x) { } st.msg = ['ok', il.length + ' prestation' + (il.length > 1 ? 's ajoutées' : ' ajoutée') + '. Touche-en une pour corriger sa durée, ses options ou sa photo.']; return refresh(); }
      if (a === 'rrep') { b.disabled = true; await S.replyReview(b.dataset.id, document.getElementById('rr' + b.dataset.id).value); st.msg = ['ok', 'Ta réponse est en ligne sur ta page.']; return refresh(); }
      if (a === 'delacct') { var pdm = document.getElementById('pdm'); if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Touche encore pour supprimer définitivement'; pdm.textContent = 'Ta page, tes prestations, tes photos et tes rendez-vous seront effacés. C’est irréversible.'; return; } b.disabled = true; var dr = await S.deleteAccount(); if (dr === 'OK') { try { await S.signOut(); } catch (x) { } st.user = st.pro = null; st.tab = 'rdv'; st.msg = ['ok', 'Ton compte est supprimé.']; return render(); } b.disabled = false; b.dataset.sure = ''; b.textContent = 'Supprimer mon compte'; pdm.textContent = dr === 'RDV' ? 'Tu as des rendez-vous à venir. Annule-les ou attends qu’ils soient passés, puis réessaie.' : 'La suppression n’a pas abouti. Écris-nous à contact@perleapp.fr.'; return; }
      if (a === 'forgot') { var fe = val('em'); if (!/^\S+@\S+\.\S+$/.test(fe)) { st.msg = ['err', 'Écris d’abord ton e-mail, puis touche « Mot de passe oublié ? ».']; return render(); } await S.resetPw(fe); st.msg = ['ok', 'Si un compte existe avec cet e-mail, tu vas recevoir un lien pour choisir un nouveau mot de passe. Regarde aussi dans tes indésirables.']; return render(); }
      if (a === 'pw') { st.pw = !st.pw; return render(); }
      if (a === 'copy') { var l = link(); if (!/^https?:/.test(l)) l = new URL(l, location.href).href; try { await navigator.clipboard.writeText(l); st.msg = ['ok', 'Lien copié. Colle-le dans ta bio.']; } catch (x) { st.msg = ['info', 'Ton lien : ' + l]; } return render(); }
      if (a === 'pub' && st.pro.published === false && !String(st.pro.pay_info || '').trim()) { st.msg = ['info', 'Indique d’abord comment recevoir l’acompte (PayPal, Revolut ou autre). Dès que c’est enregistré, ta page passe en ligne.']; st.tab = 'pro'; return render(); }
      if (a === 'decl') { window.open('https://formalites.entreprises.gouv.fr/', '_blank', 'noopener'); return; }
      if (a === 'pub') { var pq = base(); pq.published = st.pro.published === false; st.pro = await S.savePro(pq); st.msg = ['ok', st.pro.published === false ? 'Ta page est hors ligne : plus personne ne peut réserver.' : 'Ta page est de nouveau en ligne.']; return render(); }
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
        var pinf = payInfo(); if (pinf === null) { st.msg = ['err', 'Ton lien PayPal ou Revolut n’est pas reconnu. Écris seulement ton nom d’utilisateur, sans espace.']; return render(); }
        var adr = val('pa');
        st.pro = await S.savePro({ name: val('pn'), slug: slug, city: val('pc'), lat: g ? g.lat : null, lng: g ? g.lng : null, tags: Array.prototype.map.call(document.querySelectorAll('[data-tag]:checked'), function (x) { return x.dataset.tag; }), bio: val('pb'), whatsapp: val('pw2'), instagram: val('pi').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[\/?#\s]/)[0].slice(0, 30), pay_info: pinf, cancel_hours: parseInt(val('ph'), 10) || 0, deposit_pct: Math.max(0, Math.min(100, parseInt(val('pd'), 10) || 0)) });
        if (adr !== ((st.priv || {}).address || '')) { try { st.priv = await S.savePrivate({ address: adr }); } catch (e) { } }
        st.dirty = false;
        st.msg = ['ok', (first ? 'Ta page est créée. Ajoute maintenant tes prestations et tes photos.' : 'C’est enregistré.') + (val('pc') ? (g ? ' Sur la carte, tu es placée au centre de ' + g.label + '. Si ce n’est pas le bon endroit, ajoute le code postal.' : ' Ton quartier n’a pas été trouvé pour la carte : écris une ville avec son code postal, ou « Paris 19e ».') : '')]; if (first) st.tab = 'svc'; return refresh();
      }
      if (f === 'fs') {
        var s = { name: val('sn'), price: parseFloat(val('sp').replace(',', '.')), minutes: parseInt(val('sm'), 10), options: cleanOpts(readOpts()), prep: val('sprep').slice(0, 300), photo_url: st.edit.photo_url || '', position: st.edit.id ? (st.edit.position || 0) : st.svcs.length };
        if (st.edit.id) s.id = st.edit.id;
        if (s.name.length < 2 || !(s.price >= 0) || !(s.minutes >= 15)) { st.msg = ['err', 'Vérifie le nom, le prix et la durée.']; return render(); }
        await S.saveService(s); st.edit = null; st.msg = ['ok', 'Prestation enregistrée.']; return refresh();
      }
      if (f === 'fh') {
        var H = {}; DAYS.forEach(function (d) { if (document.getElementById('on' + d[0]).checked) { var a = val('a' + d[0]), b = val('b' + d[0]); if (a && b && a < b) H[d[0]] = [[a, b]]; } });
        var p = base(); p.hours = H; p.slot_step = parseInt((document.querySelector('input[name="hs"]:checked') || {}).value, 10) || 30; p.buffer_min = parseInt((document.querySelector('input[name="hb"]:checked') || {}).value, 10) || 0; p.lead_hours = parseInt((document.querySelector('input[name="hl"]:checked') || {}).value, 10) || 1;
        st.pro = await S.savePro(p); try { localStorage.setItem('perle-hrs-' + st.pro.id, '1'); } catch (e) {} st.msg = ['ok', 'Horaires enregistrés.']; return refresh();
      }
    } catch (err) { fail(err); }
  });

  (function () { var m = /error_description=([^&]+)/.exec(location.hash + '&' + location.search.slice(1)); if (!m) return; st.msg = ['err', 'La connexion n’a pas abouti. Réessaie, ou connecte-toi avec ton e-mail.']; try { history.replaceState(null, '', location.pathname); } catch (e) { } })();
  if (S.onRecovery) S.onRecovery(function () { st.recovery = true; st.msg = ['info', 'Choisis ton nouveau mot de passe ci-dessous.']; refresh(); });
  refresh().catch(function () { app.innerHTML = top() + '<p class="note err" role="alert">Impossible de charger. Vérifie ta connexion et recharge la page.</p>'; });
})();
