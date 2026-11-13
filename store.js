// Données : Supabase si config.js est rempli, sinon mode essai dans le navigateur.
(function () {
  var C = window.PERLE || {};
  var LIVE = !!(C.SUPABASE_URL && C.SUPABASE_KEY && window.supabase);

  // ---------- outils communs ----------
  var U = {
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    eur: function (v) { var r = Math.round(Number(v) * 100) / 100; return (r % 1 === 0 ? String(r) : r.toFixed(2).replace('.', ',')) + ' €'; },
    dur: function (m) { var h = Math.floor(m / 60), r = m % 60; return h ? (h + ' h' + (r ? ' ' + (r < 10 ? '0' : '') + r : '')) : r + ' min'; },
    hm: function (d) { var m = d.getMinutes(); return d.getHours() + ' h' + (m ? ' ' + (m < 10 ? '0' : '') + m : ''); },
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
    slug: function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30); },
    MSG: { PRIS: 'Ce créneau vient d’être pris. Choisis-en un autre.', HORAIRES: 'Ce créneau n’est plus dans les horaires. Choisis-en un autre.', DATE: 'Ce créneau est trop proche ou trop loin. Choisis-en un autre.', TEL: 'Vérifie ton numéro de téléphone.', NOM: 'Écris ton prénom.', TROP: 'Tu as déjà deux réservations en attente d’acompte ici.', PRO: 'Cette page n’existe plus.', PRESTATION: 'Cette prestation n’est plus proposée.', OPTION: 'Cette option n’est plus proposée.' },
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
      busy: async function (slug, from, to) { return ok(await sb.rpc('busy', { p_slug: slug, p_from: from, p_to: to })); },
      book: async function (b) { return ok(await sb.rpc('book', { p_slug: b.slug, p_service: b.service, p_choices: b.choices, p_start: b.start, p_name: b.name, p_phone: b.phone, p_note: b.note || '' })); },
      session: async function () { var s = await sb.auth.getSession(); return s.data.session ? s.data.session.user : null; },
      signUp: async function (email, pw) { var d = ok(await sb.auth.signUp({ email: email, password: pw })); return d.session ? d.user : null; },
      signIn: async function (email, pw) { return ok(await sb.auth.signInWithPassword({ email: email, password: pw })).user; },
      signOut: async function () { await sb.auth.signOut(); },
      myPro: async function () { var id = await uid(); if (!id) return null; return ok(await sb.from('pros').select('*').eq('id', id).maybeSingle()); },
      savePro: async function (f) { var id = await uid(); f.id = id; return ok(await sb.from('pros').upsert(f).select().single()); },
      myServices: async function () { var id = await uid(); return ok(await sb.from('services').select('*').eq('pro_id', id).order('position').order('created_at')); },
      saveService: async function (s) { var id = await uid(); s.pro_id = id; return ok(await sb.from('services').upsert(s).select().single()); },
      deleteService: async function (sid) { ok(await sb.from('services').delete().eq('id', sid)); },
      myBookings: async function () { var id = await uid(); return ok(await sb.from('bookings').select('*').eq('pro_id', id).gte('ends_at', new Date(Date.now() - 30 * 864e5).toISOString()).order('starts_at')); },
      setStatus: async function (bid, st) { ok(await sb.from('bookings').update({ status: st }).eq('id', bid)); }
    };
  }

  // ---------- mode essai (dans ce navigateur seulement) ----------
  function local() {
    var K = 'perle-essai-v1';
    function load() { try { var d = JSON.parse(localStorage.getItem(K)); if (d && d.pros) return d; } catch (e) { } return seed(); }
    var mem = null;
    function db() { if (!mem) mem = load(); return mem; }
    function save() { try { localStorage.setItem(K, JSON.stringify(mem)); } catch (e) { } }
    function id() { return 'x' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
    function seed() {
      var H = { '2': [['09:00', '18:00']], '3': [['09:00', '18:00']], '4': [['09:00', '18:00']], '5': [['09:00', '19:00']], '6': [['09:00', '19:00']] };
      return {
        user: null, users: {},
        pros: [{ id: 'demo', slug: 'awabraids', name: 'Awa Braids Studio', city: 'Paris 19e', bio: 'Tresses et locks, chez moi ou à domicile. Exemple fictif pour essayer.', whatsapp: '', pay_info: 'Lydia ou Wero au 06 00 00 00 00, en indiquant ta référence.', deposit_pct: 30, slot_step: 30, hours: H, published: true }],
        services: [
          { id: 's1', pro_id: 'demo', name: 'Knotless braids', minutes: 240, price: 80, active: true, position: 0, options: [{ group: 'Taille des tresses', choices: [{ label: 'S', plus: 0, minutes: 60 }, { label: 'M', plus: 10, minutes: 0 }, { label: 'L', plus: 25, minutes: -30 }] }, { group: 'Longueur', choices: [{ label: 'Épaules', plus: 0 }, { label: 'Milieu du dos', plus: 15, minutes: 60 }, { label: 'Taille', plus: 30, minutes: 90 }] }] },
          { id: 's2', pro_id: 'demo', name: 'Twists homme', minutes: 120, price: 45, active: true, position: 1, options: [] },
          { id: 's3', pro_id: 'demo', name: 'Retwist locks', minutes: 90, price: 60, active: true, position: 2, options: [] }
        ],
        bookings: []
      };
    }
    function err(c) { return new Error(c); }
    function me() { return db().user; }
    return {
      live: false,
      getPro: async function (slug) { return db().pros.filter(function (p) { return p.slug === slug && p.published; })[0] || null; },
      services: async function (proId) { return db().services.filter(function (s) { return s.pro_id === proId && s.active; }).sort(function (a, b) { return a.position - b.position; }); },
      busy: async function (slug, from, to) { var p = db().pros.filter(function (x) { return x.slug === slug; })[0]; if (!p) return []; return db().bookings.filter(function (b) { return b.pro_id === p.id && b.status !== 'annule' && b.ends_at > from && b.starts_at < to; }).map(function (b) { return { starts_at: b.starts_at, ends_at: b.ends_at }; }); },
      book: async function (b) {
        var d = db(), p = d.pros.filter(function (x) { return x.slug === b.slug; })[0]; if (!p) throw err('PRO');
        var s = d.services.filter(function (x) { return x.id === b.service && x.pro_id === p.id; })[0]; if (!s) throw err('PRESTATION');
        var name = String(b.name || '').trim(), phone = String(b.phone || '').replace(/[^0-9+]/g, '');
        if (name.length < 2) throw err('NOM'); if (phone.length < 9 || phone.length > 15) throw err('TEL');
        var q = U.quote(s, b.choices), st = new Date(b.start), en = new Date(st.getTime() + q.minutes * 6e4);
        if (st.getTime() < Date.now() + 36e5) throw err('DATE');
        if (d.bookings.some(function (x) { return x.pro_id === p.id && x.status !== 'annule' && x.ends_at > st.toISOString() && x.starts_at < en.toISOString(); })) throw err('PRIS');
        var r = { id: id(), ref: Math.random().toString(16).slice(2, 8).toUpperCase(), pro_id: p.id, service_id: s.id, service_name: s.name, options_text: q.text, starts_at: st.toISOString(), ends_at: en.toISOString(), price: q.price, deposit: Math.round(q.price * p.deposit_pct) / 100, client_name: name, client_phone: phone, note: String(b.note || '').slice(0, 300), status: 'attente', created_at: new Date().toISOString() };
        d.bookings.push(r); save();
        return { ref: r.ref, price: r.price, deposit: r.deposit, starts_at: r.starts_at, ends_at: r.ends_at, service: r.service_name, options: r.options_text };
      },
      session: async function () { return me(); },
      signUp: async function (email) { var d = db(); if (!d.users[email]) d.users[email] = id(); d.user = { id: d.users[email], email: email }; save(); return d.user; },
      signIn: async function (email) { var d = db(); if (!d.users[email]) d.users[email] = id(); d.user = { id: d.users[email], email: email }; save(); return d.user; },
      signOut: async function () { db().user = null; save(); },
      myPro: async function () { var u = me(); if (!u) return null; return db().pros.filter(function (p) { return p.id === u.id; })[0] || null; },
      savePro: async function (f) { var d = db(), u = me(); if (d.pros.some(function (p) { return p.slug === f.slug && p.id !== u.id; })) { var e = err('SLUG'); e.code = '23505'; throw e; } var p = d.pros.filter(function (x) { return x.id === u.id; })[0]; if (!p) { p = { id: u.id, published: true, deposit_pct: 30, slot_step: 30, hours: { '2': [['09:00', '18:00']], '3': [['09:00', '18:00']], '4': [['09:00', '18:00']], '5': [['09:00', '18:00']], '6': [['09:00', '18:00']] }, whatsapp: '', pay_info: '', bio: '', city: '' }; d.pros.push(p); } for (var k in f) p[k] = f[k]; p.id = u.id; save(); return p; },
      myServices: async function () { var u = me(); return db().services.filter(function (s) { return s.pro_id === u.id; }).sort(function (a, b) { return a.position - b.position; }); },
      saveService: async function (s) { var d = db(), u = me(); s.pro_id = u.id; if (!s.id) { s.id = id(); s.active = s.active !== false; d.services.push(s); } else { var o = d.services.filter(function (x) { return x.id === s.id; })[0]; for (var k in s) o[k] = s[k]; } save(); return s; },
      deleteService: async function (sid) { var d = db(); d.services = d.services.filter(function (s) { return s.id !== sid; }); save(); },
      myBookings: async function () { var u = me(); return db().bookings.filter(function (b) { return b.pro_id === u.id; }).sort(function (a, b) { return a.starts_at < b.starts_at ? -1 : 1; }); },
      setStatus: async function (bid, st) { var b = db().bookings.filter(function (x) { return x.id === bid; })[0]; if (b) { b.status = st; save(); } }
    };
  }

  window.Perle = { U: U, store: LIVE ? live() : local() };
})();
