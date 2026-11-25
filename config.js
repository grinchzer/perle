// Réglages du site. Tant que ces deux lignes sont vides, le site marche en « mode essai » :
// tout est enregistré seulement dans le navigateur, rien n'est partagé avec personne.
// Pour le vrai site : colle ici l'adresse et la clé « publishable » de ton projet Supabase.
window.PERLE = {
  SUPABASE_URL: 'https://cftcwvunonsuaacqhuxe.supabase.co',
  SUPABASE_KEY: 'sb_publishable_45_K_epzRxy3mu0al-XLwQ_pYkHgHkI',
  // true seulement sur Netlify : les liens deviennent ton-site/awabraids au lieu de ton-site/?c=awabraids
  LIENS_COURTS: false,
  // true seulement quand l'acompte sera payé dans l'appli (Stripe Connect) : affiche alors les 1,99 € de frais de service
  PAIEMENT_APPLI: false,
  // true jusqu'au lancement : sur le site, « Je réserve » mène à la préinscription (attente.html) au lieu de la recherche
  PREINSCRIPTIONS: true
};
