// Données : Supabase si config.js est rempli, sinon mode essai dans le navigateur.
(function () {
  var C = window.PERLE || {};
  // ?demo=1 ouvre le mode essai (coiffeuses d'exemple) même quand la vraie base est branchée ; ?demo=0 en sort
  var DEMO = false; try { if (/[?&]demo=1/.test(location.search)) sessionStorage.setItem('perle-demo', '1'); if (/[?&]demo=0/.test(location.search)) sessionStorage.removeItem('perle-demo'); DEMO = sessionStorage.getItem('perle-demo') === '1'; } catch (e) { }
  var LIVE = !DEMO && !!(C.SUPABASE_URL && C.SUPABASE_KEY && window.supabase);

  // ---------- outils communs ----------
  var U = {
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    eur: function (v) { var r = Math.round(Number(v) * 100) / 100; return (r % 1 === 0 ? String(r) : r.toFixed(2).replace('.', ',')) + ' €'; },
    // fichier d'agenda (.ics) avec un rappel la veille et deux heures avant
    ics: function (o) {
      function z(d) { return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); }
      function t(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/[,;]/g, function (c) { return '\\' + c; }).replace(/\r?\n/g, '\\n'); }
      var l = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Perle//FR', 'BEGIN:VEVENT', 'UID:' + o.ref + '@perleapp.fr', 'DTSTAMP:' + z(Date.now()), 'DTSTART:' + z(o.start), 'DTEND:' + z(o.end), 'SUMMARY:' + t(o.title), 'LOCATION:' + t(o.where), 'DESCRIPTION:' + t(o.desc), 'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + t(o.title), 'END:VALARM', 'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:' + t(o.title), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
      return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(l.join('\r\n'));
    },
    dur: function (m) { var h = Math.floor(m / 60), r = m % 60; return h ? (h + ' h' + (r ? ' ' + (r < 10 ? '0' : '') + r : '')) : r + ' min'; },
    hm: function (d) { var m = d.getMinutes(); return d.getHours() + ' h' + (m ? ' ' + (m < 10 ? '0' : '') + m : ''); },
    dayS: function (d) { return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }); },
    day: function (d) { return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); },
    // prix, durée et texte d'une prestation selon les options choisies (un numéro par groupe)
    quote: function (svc, choices) {
      var price = Number(svc.price), minutes = Number(svc.minutes), txt = [];
      (svc.options || []).forEach(function (g, i) {
        var ch = (g.choices || [])[(choices && choices[i]) || 0]; if (!ch) return;
        price += Number(ch.plus || 0); minutes += Number(ch.minutes || 0); txt.push(ch.label);
      });
      return { price: price, minutes: minutes, text: txt.join(', ') };
    },
    bg: function (u) { return u ? "background-image:url('" + String(u).replace(/['()\\\s]/g, encodeURIComponent) + "')" : ''; },
    // réduit une photo choisie sur le téléphone avant de l'envoyer
    shrink: function (file, max) { return new Promise(function (res, rej) { var im = new Image(), u = URL.createObjectURL(file); im.onload = function () { var k = Math.min(1, (max || 1200) / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(function (b) { b ? res(b) : rej(new Error('PHOTO')); }, 'image/jpeg', 0.82); }; im.onerror = function () { rej(new Error('PHOTO')); }; im.src = u; }); },
    logo: function (href) { return '<a class="logo" href="' + (href || './') + '" aria-label="Perle, accueil"><svg viewBox="0 0 100 100" width="34" height="34" aria-hidden="true"><rect x="0" y="0" width="100" height="100" rx="24" fill="#5B2A86"></rect><circle cx="50" cy="38" r="26" fill="#D9A441"></circle><circle cx="40.9" cy="28.9" r="5.700" fill="#FFFFFF" fill-opacity="0.850"></circle><circle cx="50" cy="52" r="13" fill="#FFFFFF"></circle><path d="M24 88 Q24 68 50 68 Q76 68 76 88 Z" fill="#FFFFFF"></path></svg><span>perle</span></a>'; },
    ymd: function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); },
    // créneaux libres d'une coiffeuse un jour donné, pour une durée en minutes
    slots: function (pro, need, d, busy) {
      var out = [], ranges = (pro.hours || {})[String(d.getDay())] || [], step = pro.slot_step || 30, min = Date.now() + Math.max(1, pro.lead_hours || 1) * 36e5, buf = (pro.buffer_min || 0) * 6e4;
      var ds = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      if ((pro.closed || []).some(function (r) { return ds >= r[0] && ds <= r[1]; })) return out;
      ranges.forEach(function (r) {
        var a = r[0].split(':'), b = r[1].split(':');
        var open = new Date(d.getFullYear(), d.getMonth(), d.getDate(), +a[0], +a[1]), close = new Date(d.getFullYear(), d.getMonth(), d.getDate(), +b[0], +b[1]);
        for (var t = open.getTime(); t + need * 6e4 <= close.getTime(); t += step * 6e4) {
          if (t < min) continue;
          var e = t + need * 6e4;
          if ((busy || []).some(function (x) { return new Date(x.ends_at).getTime() + buf > t && new Date(x.starts_at).getTime() - buf < e; })) continue;
          out.push(new Date(t));
        }
      });
      return out;
    },
    // distance en km entre deux points
    dist: function (a, b) { var r = Math.PI / 180, x = (b.lng - a.lng) * r * Math.cos((a.lat + b.lat) / 2 * r), y = (b.lat - a.lat) * r; return Math.sqrt(x * x + y * y) * 6371; },
    // les coiffeuses sont placées au centre de leur quartier : on ne donne donc qu'un ordre de grandeur
    near: function (k) { return k < 1.5 ? 'dans ton quartier' : 'à environ ' + Math.round(k) + ' km'; },
    // nom simplifié pour reconnaître la même coiffure ou la même option écrite de deux façons
    canon: function (s) {
      var t = ' ' + U.norm(s) + ' ';
      [[' mi dos ', ' milieu dos '], [' mid back ', ' milieu dos '], [' small ', ' s '], [' medium ', ' m '], [' large ', ' l '], [' petites? ', ' s '], [' moyen(ne)?s? ', ' m '], [' gross?e?s? ', ' l '], [' locs ', ' lock '], [' twist ', ' twists ']].forEach(function (r) { t = t.replace(new RegExp(r[0], 'g'), r[1]); });
      var w = t.trim().split(' ').filter(function (x) { return x && !/^(braids?|tresses?|de|des|du|la|le|les|en|a|aux|et)$/.test(x); }).map(function (x) { return x.length > 3 ? x.replace(/s$/, '') : x; });
      return w.join(' ') || U.norm(s);
    },
    // centre approximatif des arrondissements de Paris (jamais une adresse)
    PARIS: [[48.8625, 2.3364], [48.8682, 2.3428], [48.8630, 2.3601], [48.8543, 2.3576], [48.8445, 2.3497], [48.8491, 2.3329], [48.8562, 2.3122], [48.8728, 2.3126], [48.8771, 2.3379], [48.8760, 2.3608], [48.8590, 2.3800], [48.8400, 2.3880], [48.8283, 2.3623], [48.8292, 2.3266], [48.8401, 2.2929], [48.8603, 2.2620], [48.8873, 2.3067], [48.8925, 2.3444], [48.8871, 2.3848], [48.8634, 2.4011]],
    geoParis: function (city) { var t = U.norm(city), m = t.match(/\b750?([0-2][0-9])\b/) || t.match(/paris\s*(\d{1,2})\s*(e|eme|er|e arrondissement)?\b/), n = m ? parseInt(m[1], 10) : 0; return n >= 1 && n <= 20 ? { lat: U.PARIS[n - 1][0], lng: U.PARIS[n - 1][1], label: 'Paris ' + n + (n === 1 ? 'er' : 'e') } : null; },
    // position d'une ville ou d'un quartier : table de Paris, sinon service public de géocodage (ville seulement)
    geo: async function (city) {
      if (!String(city || '').trim()) return null;
      var p = U.geoParis(city); if (p) return p;
      try {
        var ct = new AbortController(), tm = setTimeout(function () { ct.abort(); }, 6000);
        var r = await fetch('https://data.geopf.fr/geocodage/search?limit=1&type=municipality&q=' + encodeURIComponent(city), { signal: ct.signal }); clearTimeout(tm);
        var j = await r.json(), f = j && j.features && j.features[0], c = f && f.geometry && f.geometry.coordinates;
        if (c && isFinite(c[0]) && isFinite(c[1])) return { lat: Math.round(c[1] * 1e4) / 1e4, lng: Math.round(c[0] * 1e4) / 1e4, label: String((f.properties || {}).label || city) + ((f.properties || {}).postcode ? ' (' + f.properties.postcode + ')' : '') };
      } catch (e) { }
      return null;
    },
    norm: function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); },
    slug: function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30); },
    MSG: { TARD: 'Le délai d’annulation est dépassé. Écris directement à ta coiffeuse.', STATUT: 'Ce rendez-vous ne peut plus être annulé.', INTROUVABLE: 'Rendez-vous introuvable.', PRIS: 'Ce créneau vient d’être pris. Choisis-en un autre.', FERME: 'Ta coiffeuse est en congé ce jour-là. Choisis un autre jour.', HORAIRES: 'Ce créneau n’est plus dans les horaires. Choisis-en un autre.', DATE: 'Ce créneau est trop proche ou trop loin. Choisis-en un autre.', TEL: 'Vérifie ton numéro de téléphone.', NOM: 'Écris ton prénom.', TROP: 'Tu as déjà deux réservations en attente d’acompte ici.', PRO: 'Cette page n’existe plus.', PRESTATION: 'Cette prestation n’est plus proposée.', OPTION: 'Cette option n’est plus proposée.' },
    msg: function (e) { var m = (e && e.message) || ''; for (var k in U.MSG) if (m.indexOf(k) >= 0) return U.MSG[k]; return 'Ça n’a pas marché. Vérifie ta connexion et réessaie.'; }
  };

  // ---------- Supabase ----------
  function live() {
    var sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY);
    function ok(r) { if (r.error) { var e = new Error(r.error.message || 'ERREUR'); e.code = r.error.code; throw e; } return r.data; }
    async function uid() { var s = await sb.auth.getSession(); return s.data.session ? s.data.session.user.id : null; }
    return {
      live: true,
      getPro: async function (slug) { return ok(await sb.from('pros').select('*').eq('slug', slug).maybeSingle()); },
      services: async function (proId) { return ok(await sb.from('services').select('*').eq('pro_id', proId).eq('active', true).order('position').order('created_at')); },
      listPros: async function () { var p = ok(await sb.from('pros').select('id,slug,name,city,cover_url,avatar_url,tags,hours,slot_step,deposit_pct,lat,lng,buffer_min,lead_hours,closed').eq('published', true).order('created_at').limit(60)) || []; if (!p.length) return []; var sv = ok(await sb.from('services').select('id,pro_id,name,price,minutes,options,photo_url,position').eq('active', true).in('pro_id', p.map(function (x) { return x.id; }))) || []; p.forEach(function (x) { x.services = sv.filter(function (y) { return y.pro_id === x.id; }).sort(function (a, b) { return a.position - b.position; }); }); return p.filter(function (x) { return x.services.length; }); },
      busy: async function (slug, from, to) { return ok(await sb.rpc('busy', { p_slug: slug, p_from: from, p_to: to })); },
      busyAll: async function (from, to) { var out = {}; (ok(await sb.rpc('busy_all', { p_from: from, p_to: to })) || []).forEach(function (r) { (out[r.slug] = out[r.slug] || []).push({ starts_at: r.starts_at, ends_at: r.ends_at }); }); return out; },
      bookingEmail: async function (ref, phone, email) { return ok(await sb.rpc('booking_email', { p_ref: ref, p_phone: phone, p_email: email })); },
      book: async function (b) { return ok(await sb.rpc('book', { p_slug: b.slug, p_service: b.service, p_choices: b.choices, p_start: b.start, p_name: b.name, p_phone: b.phone, p_note: b.note || '' })); },
      clientBooking: async function (ref, phone) { return ok(await sb.rpc('client_booking', { p_ref: ref, p_phone: phone })); },
      cancelBooking: async function (ref, phone) { return ok(await sb.rpc('cancel_booking', { p_ref: ref, p_phone: phone })); },
      session: async function () { var s = await sb.auth.getSession(); return s.data.session ? s.data.session.user : null; },
      signUp: async function (email, pw) { var d = ok(await sb.auth.signUp({ email: email, password: pw, options: { emailRedirectTo: location.origin + location.pathname } })); return d.session ? d.user : null; },
      signIn: async function (email, pw) { return ok(await sb.auth.signInWithPassword({ email: email, password: pw })).user; },
      signOut: async function () { await sb.auth.signOut(); },
      resetPw: async function (email) { ok(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })); },
      setPw: async function (pw) { ok(await sb.auth.updateUser({ password: pw })); },
      onRecovery: function (cb) { sb.auth.onAuthStateChange(function (ev) { if (ev === 'PASSWORD_RECOVERY') cb(); }); },
      myPro: async function () { var id = await uid(); if (!id) return null; return ok(await sb.from('pros').select('*').eq('id', id).maybeSingle()); },
      savePro: async function (f) { var id = await uid(); f.id = id; return ok(await sb.from('pros').upsert(f).select().single()); },
      myPrivate: async function () { var id = await uid(); if (!id) return {}; return ok(await sb.from('pro_private').select('address').eq('id', id).maybeSingle()) || {}; },
      savePrivate: async function (f) { var id = await uid(); return ok(await sb.from('pro_private').upsert({ id: id, address: String(f.address || '').slice(0, 200) }).select().single()); },
      myServices: async function () { var id = await uid(); return ok(await sb.from('services').select('*').eq('pro_id', id).order('position').order('created_at')); },
      saveService: async function (s) { var id = await uid(); s.pro_id = id; return ok(await sb.from('services').upsert(s).select().single()); },
      deleteService: async function (sid) { ok(await sb.from('services').delete().eq('id', sid)); },
      myBookings: async function () { var id = await uid(); return ok(await sb.from('bookings').select('*').eq('pro_id', id).gte('ends_at', new Date(Date.now() - 365 * 864e5).toISOString()).order('starts_at').limit(1000)); },
      myNotes: async function () { var id = await uid(); return ok(await sb.from('client_notes').select('phone,note,flag').eq('pro_id', id)) || []; },
      saveNote: async function (n) { var id = await uid(); return ok(await sb.from('client_notes').upsert({ pro_id: id, phone: n.phone, note: String(n.note || '').slice(0, 300), flag: !!n.flag }).select().single()); },
      setStatus: async function (bid, st) { ok(await sb.from('bookings').update({ status: st }).eq('id', bid)); },
      upload: async function (blob) { var id = await uid(), path = id + '/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.jpg'; ok(await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })); return sb.storage.from('photos').getPublicUrl(path).data.publicUrl; }
    };
  }

  // ---------- mode essai (dans ce navigateur seulement) ----------
  function local() {
    var K = 'perle-essai-v4';
    function place(d) { var ex = extra(); ex.pros.forEach(function (p) { if (!d.pros.some(function (q) { return q.id === p.id || q.slug === p.slug; })) { d.pros.push(p); ex.services.forEach(function (sv) { if (sv.pro_id === p.id) d.services.push(sv); }); } }); d.pros.forEach(function (p) { if (!p.tags && (p.id === 'demo' || p.id === 'demo2')) p.tags = p.id === 'demo' ? ['femme', 'homme', 'enfant', 'chez', 'domicile'] : ['femme', 'homme', 'chez']; if (p.lat == null) { var g = U.geoParis(p.city); if (g) { p.lat = g.lat; p.lng = g.lng; } } }); return d; }
    function load() { try { var d = JSON.parse(localStorage.getItem(K)); if (d && d.pros) return place(d); } catch (e) { } return place(seed()); }
    var mem = null;
    function db() { if (!mem) mem = load(); return mem; }
    function save() { try { localStorage.setItem(K, JSON.stringify(mem)); } catch (e) { } }
    function id() { return 'x' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
    // coiffeuses d'exemple supplémentaires du mode essai (fictives), ajoutées aussi aux essais déjà commencés
    function extra() {
      function hrs(days, a, b) { var h = {}; days.forEach(function (d) { h[d] = [[a, b]]; }); return h; }
      var B = { whatsapp: '', deposit_pct: 30, slot_step: 30, published: true, gallery: [], avatar_url: '' }, P = [
        { id: 'demo3', slug: 'tressesbyfatou', name: 'Tresses by Fatou', city: 'Paris 18e', cover_url: 'img/fFulani.jpg', tags: ['femme', 'enfant', 'chez'], hours: hrs(['3', '4', '5', '6', '0'], '10:00', '19:00'), gallery: ['img/fKnotless.jpg', 'img/bgKnotless.jpg'] },
        { id: 'demo4', slug: 'bintabraids', name: 'Binta Braids', city: 'Pantin', lat: 48.8966, lng: 2.4017, cover_url: 'img/fPerles.jpg', tags: ['femme', 'homme', 'domicile'], hours: hrs(['1', '2', '3', '4', '5'], '09:00', '17:00') },
        { id: 'demo5', slug: 'lashbynaomi', name: 'Lash by Naomi', city: 'Paris 11e', cover_url: 'img/fCils.jpg', tags: ['femme', 'salon'], hours: hrs(['2', '3', '4', '5', '6'], '11:00', '20:00') },
        { id: 'demo6', slug: 'koficuts', name: 'Kofi Cuts', city: 'Paris 10e', cover_url: '', tags: ['homme', 'enfant', 'salon'], hours: hrs(['0', '1', '2', '3', '4', '5', '6'], '10:00', '20:00') },
        { id: 'demo7', slug: 'siraperruques', name: 'Sira Perruques', city: 'Montreuil', lat: 48.8637, lng: 2.4494, cover_url: 'img/fLace.jpg', tags: ['femme', 'chez', 'domicile'], hours: hrs(['4', '5', '6'], '09:00', '18:00') }
      ].map(function (p) { for (var k in B) if (p[k] == null) p[k] = B[k]; p.bio = 'Exemple fictif pour essayer.'; p.pay_info = 'Wero au 06 00 00 00 00, en indiquant ta référence.'; return p; });
      var LG = { group: 'Longueur', choices: [{ label: 'Épaules', plus: 0 }, { label: 'Milieu du dos', plus: 15, minutes: 60 }, { label: 'Taille', plus: 35, minutes: 90 }] };
      var S2 = [
        ['demo3', 'Fulani braids', 210, 70, 'img/fFulani.jpg'], ['demo3', 'Knotless braids', 270, 90, 'img/fKnotless.jpg', [{ group: 'Taille des tresses', choices: [{ label: 'S', plus: 0, minutes: 60 }, { label: 'M', plus: 10, minutes: 0 }, { label: 'L', plus: 20, minutes: -30 }] }, LG]], ['demo3', 'Vanilles', 150, 55, 'img/bgKnotless.jpg'],
        ['demo4', 'Fulani braids', 240, 85, 'img/fPerles.jpg'], ['demo4', 'Cornrows', 90, 40, ''], ['demo4', 'Knotless braids', 300, 95, 'img/fKnotless.jpg', [LG]],
        ['demo5', 'Extensions de cils', 90, 60, 'img/fCils.jpg'], ['demo5', 'Remplissage de cils', 60, 35, ''],
        ['demo6', 'Dégradé', 30, 20, ''], ['demo6', 'Coupe et barbe', 45, 30, ''], ['demo6', 'Retwist locks', 75, 50, ''],
        ['demo7', 'Pose de perruque lace', 120, 70, 'img/fLace.jpg'], ['demo7', 'Tissage', 150, 80, '']
      ].map(function (a, i) { return { id: 'x' + (i + 1), pro_id: a[0], name: a[1], minutes: a[2], price: a[3], photo_url: a[4], options: a[5] || [], active: true, position: i }; });
      return { pros: P, services: S2 };
    }
    function seed() {
      var H = { '2': [['09:00', '18:00']], '3': [['09:00', '18:00']], '4': [['09:00', '18:00']], '5': [['09:00', '19:00']], '6': [['09:00', '19:00']] };
      return {
        user: null, users: {},
        pros: [{ id: 'demo', slug: 'awabraids', name: 'Awa Braids Studio', city: 'Paris 19e', bio: 'Tresses et locks, chez moi ou à domicile. Exemple fictif pour essayer.', whatsapp: '', pay_info: 'Lydia ou Wero au 06 00 00 00 00, en indiquant ta référence.', cover_url: 'img/bgLocks.jpg', gallery: ['img/fKnotless.jpg', 'img/fFulani.jpg', 'img/fLocks.jpg', 'img/fPerles.jpg', 'img/fDetail.jpg', 'img/bgKnotless.jpg'], tags: ['femme', 'homme', 'enfant', 'chez', 'domicile'], deposit_pct: 30, slot_step: 30, hours: H, published: true },
          { id: 'demo2', slug: 'mayalocks', name: 'Maya Locks', city: 'Paris 20e', bio: 'Locks et retwist. Exemple fictif pour essayer.', whatsapp: '', pay_info: 'Wero au 06 00 00 00 00, en indiquant ta référence.', cover_url: 'img/fDetail.jpg', gallery: ['img/fLocks.jpg'], tags: ['femme', 'homme', 'chez'], deposit_pct: 30, slot_step: 30, hours: H, published: true }],
        services: [
          { id: 's4', pro_id: 'demo2', photo_url: 'img/fLocks.jpg', name: 'Retwist locks', minutes: 90, price: 60, active: true, position: 0, options: [] },
          { id: 's5', pro_id: 'demo2', photo_url: 'img/fLace.jpg', name: 'Départ de locks', minutes: 180, price: 110, active: true, position: 1, options: [] },
          { id: 's1', pro_id: 'demo', photo_url: 'img/fKnotless.jpg', name: 'Knotless braids', minutes: 240, price: 80, active: true, position: 0, options: [{ group: 'Taille des tresses', choices: [{ label: 'S', plus: 0, minutes: 60 }, { label: 'M', plus: 10, minutes: 0 }, { label: 'L', plus: 25, minutes: -30 }] }, { group: 'Longueur', choices: [{ label: 'Épaules', plus: 0 }, { label: 'Milieu du dos', plus: 15, minutes: 60 }, { label: 'Taille', plus: 30, minutes: 90 }] }] },
          { id: 's2', pro_id: 'demo', photo_url: 'img/fPerles.jpg', name: 'Fulani braids', minutes: 210, price: 75, active: true, position: 1, options: [] },
          { id: 's3', pro_id: 'demo', photo_url: 'img/fLocks.jpg', name: 'Retwist locks', minutes: 90, price: 60, active: true, position: 2, options: [] }
        ],
        bookings: []
      };
    }
    function err(c) { return new Error(c); }
    function holds(b) { return b.status === 'confirme' || b.status === 'fait' || (b.status === 'attente' && Date.now() - new Date(b.created_at).getTime() < 864e5); }
    function me() { return db().user; }
    return {
      live: false,
      getPro: async function (slug) { return db().pros.filter(function (p) { return p.slug === slug && p.published; })[0] || null; },
      services: async function (proId) { return db().services.filter(function (s) { return s.pro_id === proId && s.active; }).sort(function (a, b) { return a.position - b.position; }); },
      bookingEmail: async function () { return true; },
      listPros: async function () { var d = db(); return d.pros.filter(function (p) { return p.published; }).map(function (p) { return { id: p.id, slug: p.slug, name: p.name, city: p.city, cover_url: p.cover_url, avatar_url: p.avatar_url || '', tags: p.tags || [], hours: p.hours, slot_step: p.slot_step, deposit_pct: p.deposit_pct, lat: p.lat, lng: p.lng, buffer_min: p.buffer_min, lead_hours: p.lead_hours, closed: p.closed, services: d.services.filter(function (y) { return y.pro_id === p.id && y.active; }).sort(function (a, b) { return a.position - b.position; }) }; }).filter(function (x) { return x.services.length; }); },
      busy: async function (slug, from, to) { var p = db().pros.filter(function (x) { return x.slug === slug; })[0]; if (!p) return []; return db().bookings.filter(function (b) { return b.pro_id === p.id && holds(b) && b.ends_at > from && b.starts_at < to; }).map(function (b) { return { starts_at: b.starts_at, ends_at: b.ends_at }; }); },
      busyAll: async function (from, to) { var d = db(), out = {}; d.pros.forEach(function (p) { out[p.slug] = d.bookings.filter(function (b) { return b.pro_id === p.id && holds(b) && b.ends_at > from && b.starts_at < to; }).map(function (b) { return { starts_at: b.starts_at, ends_at: b.ends_at }; }); }); return out; },
      book: async function (b) {
        var d = db(), p = d.pros.filter(function (x) { return x.slug === b.slug; })[0]; if (!p) throw err('PRO');
        var s = d.services.filter(function (x) { return x.id === b.service && x.pro_id === p.id; })[0]; if (!s) throw err('PRESTATION');
        var name = String(b.name || '').trim(), phone = String(b.phone || '').replace(/[^0-9+]/g, '');
        if (name.length < 2) throw err('NOM'); if (phone.length < 9 || phone.length > 15) throw err('TEL');
        var q = U.quote(s, b.choices), st = new Date(b.start), en = new Date(st.getTime() + q.minutes * 6e4);
        if (st.getTime() < Date.now() + 36e5) throw err('DATE');
        if (d.bookings.some(function (x) { return x.pro_id === p.id && holds(x) && x.ends_at > st.toISOString() && x.starts_at < en.toISOString(); })) throw err('PRIS');
        var r = { id: id(), ref: Math.random().toString(16).slice(2, 8).toUpperCase(), pro_id: p.id, service_id: s.id, service_name: s.name, options_text: q.text, starts_at: st.toISOString(), ends_at: en.toISOString(), price: q.price, deposit: Math.round(q.price * p.deposit_pct) / 100, client_name: name, client_phone: phone, note: String(b.note || '').slice(0, 300), status: 'attente', created_at: new Date().toISOString() };
        d.bookings.push(r); save();
        return { ref: r.ref, price: r.price, deposit: r.deposit, starts_at: r.starts_at, ends_at: r.ends_at, service: r.service_name, options: r.options_text };
      },
      clientBooking: async function (ref, phone) { var d = db(), ph = String(phone || '').replace(/[^0-9+]/g, ''), b = d.bookings.filter(function (x) { return x.ref === String(ref).toUpperCase().trim() && x.client_phone === ph; })[0]; if (!b) return null; var p = d.pros.filter(function (x) { return x.id === b.pro_id; })[0] || {}; return { ref: b.ref, status: b.status, starts_at: b.starts_at, ends_at: b.ends_at, created_at: b.created_at, service: b.service_name, options: b.options_text, price: b.price, deposit: b.deposit, pro_name: p.name, pro_slug: p.slug, pro_city: p.city, cover_url: p.cover_url, pay_info: p.pay_info, cancel_hours: p.cancel_hours == null ? 48 : p.cancel_hours, service_id: b.service_id, prep: (d.services.filter(function (x) { return x.id === b.service_id; })[0] || {}).prep || '', address: (b.status === 'confirme' || b.status === 'fait') ? ((d.priv || {})[p.id] || '') : '' }; },
      cancelBooking: async function (ref, phone) { var d = db(), ph = String(phone || '').replace(/[^0-9+]/g, ''), b = d.bookings.filter(function (x) { return x.ref === String(ref).toUpperCase().trim() && x.client_phone === ph; })[0]; if (!b) throw err('INTROUVABLE'); if (b.status !== 'attente' && b.status !== 'confirme') throw err('STATUT'); var p = d.pros.filter(function (x) { return x.id === b.pro_id; })[0] || {}; if (new Date(b.starts_at).getTime() - Date.now() < (p.cancel_hours == null ? 48 : p.cancel_hours) * 36e5) throw err('TARD'); b.status = 'annule'; save(); return 'annule'; },
      session: async function () { return me(); },
      signUp: async function (email) { var d = db(); if (!d.users[email]) d.users[email] = id(); d.user = { id: d.users[email], email: email }; save(); return d.user; },
      signIn: async function (email) { var d = db(); if (!d.users[email]) d.users[email] = id(); d.user = { id: d.users[email], email: email }; save(); return d.user; },
      signOut: async function () { db().user = null; save(); },
      resetPw: async function () { }, setPw: async function () { }, onRecovery: function () { },
      myPro: async function () { var u = me(); if (!u) return null; return db().pros.filter(function (p) { return p.id === u.id; })[0] || null; },
      savePro: async function (f) { var d = db(), u = me(); if (d.pros.some(function (p) { return p.slug === f.slug && p.id !== u.id; })) { var e = err('SLUG'); e.code = '23505'; throw e; } var p = d.pros.filter(function (x) { return x.id === u.id; })[0]; if (!p) { p = { id: u.id, published: true, deposit_pct: 30, cancel_hours: 48, slot_step: 30, hours: { '2': [['09:00', '18:00']], '3': [['09:00', '18:00']], '4': [['09:00', '18:00']], '5': [['09:00', '18:00']], '6': [['09:00', '18:00']] }, whatsapp: '', pay_info: '', bio: '', city: '', cover_url: '', avatar_url: '', tags: [], gallery: [] }; d.pros.push(p); } for (var k in f) p[k] = f[k]; p.id = u.id; save(); return p; },
      myPrivate: async function () { var d = db(), u = me(); return { address: (d.priv || {})[u.id] || '' }; },
      savePrivate: async function (f) { var d = db(), u = me(); d.priv = d.priv || {}; d.priv[u.id] = String(f.address || '').slice(0, 200); save(); return { address: d.priv[u.id] }; },
      myServices: async function () { var u = me(); return db().services.filter(function (s) { return s.pro_id === u.id; }).sort(function (a, b) { return a.position - b.position; }); },
      saveService: async function (s) { var d = db(), u = me(); s.pro_id = u.id; if (!s.id) { s.id = id(); s.active = s.active !== false; d.services.push(s); } else { var o = d.services.filter(function (x) { return x.id === s.id; })[0]; for (var k in s) o[k] = s[k]; } save(); return s; },
      deleteService: async function (sid) { var d = db(); d.services = d.services.filter(function (s) { return s.id !== sid; }); save(); },
      myNotes: async function () { var d = db(), u = me(); return ((d.notes || {})[u.id] || []); },
      saveNote: async function (n) { var d = db(), u = me(); d.notes = d.notes || {}; var l = (d.notes[u.id] = (d.notes[u.id] || []).filter(function (x) { return x.phone !== n.phone; })); l.push({ phone: n.phone, note: String(n.note || '').slice(0, 300), flag: !!n.flag }); save(); return n; },
      myBookings: async function () { var u = me(); return db().bookings.filter(function (b) { return b.pro_id === u.id; }).sort(function (a, b) { return a.starts_at < b.starts_at ? -1 : 1; }); },
      setStatus: async function (bid, st) { var b = db().bookings.filter(function (x) { return x.id === bid; })[0]; if (b) { b.status = st; save(); } },
      upload: function (blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(blob); }); }
    };
  }

  window.Perle = { U: U, store: LIVE ? live() : local() };

  // Mode aperçu : tout se passe dans une seule page, sans changer d'adresse (pour l'aperçu dans Claude).
  if (C.APERCU) {
    window.Perle.open = function (page, slug) {
      var old = document.getElementById('app'), fresh = old.cloneNode(false); fresh.innerHTML = '<p class="mut">Chargement…</p>'; old.parentNode.replaceChild(fresh, old);
      var bar = document.getElementById('bar'); if (bar) bar.hidden = true;
      document.body.classList.remove('dark'); window.PERLE_SLUG = slug || ''; window.scrollTo(0, 0);
      var k = page === 'pro' ? 'pro' : 'book'; if (window.PerleRun && window.PerleRun[k]) return window.PerleRun[k]();
      var sc = document.createElement('script'); sc.src = (page === 'pro' ? 'pro.js' : 'book.js') + '?v=' + Date.now(); document.body.appendChild(sc);
    };
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]'); if (!a) return; var h = a.getAttribute('href');
      if (/^https?:|^tel:|^mailto:/.test(h)) return;
      e.preventDefault();
      if (/pro\.html/.test(h)) return window.Perle.open('pro');
      var m = h.match(/[?&]c=([^&#]+)/), m2 = h.match(/[?&]s=([^&#]+)/), m3 = h.match(/[?&]v=([^&#]+)/), m4 = h.match(/[?&]d=([^&#]+)/), m5 = h.match(/[?&]o=([^&#]+)/), m6 = h.match(/[?&]t=([^&#]+)/); window.PERLE_T = m6 ? decodeURIComponent(m6[1]) : ''; window.PERLE_SVC = m2 ? decodeURIComponent(m2[1]) : ''; window.PERLE_DAY = m4 ? decodeURIComponent(m4[1]) : ''; window.PERLE_OPT = m5 ? decodeURIComponent(m5[1]) : ''; window.PERLE_VIEW = m3 ? decodeURIComponent(m3[1]) : 'home'; window.Perle.open('book', m ? decodeURIComponent(m[1]) : '');
    }, true);
  }

})();
