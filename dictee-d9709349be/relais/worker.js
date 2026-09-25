// Relais « Ajouter un texte » : la page (publique) ne peut pas contenir de token GitHub,
// alors elle envoie le texte ici ; ce Worker déclenche le workflow .github/workflows/dictee.yml.
const ORIGINE = 'https://vixrino.github.io';
const DEPOT = 'vixrino/porfolio';
const CORS = {
  'Access-Control-Allow-Origin': ORIGINE,
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'content-type',
};
const reponse = (code, corps) =>
  new Response(JSON.stringify(corps), { status: code, headers: { ...CORS, 'content-type': 'application/json' } });

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (req.method !== 'POST') return reponse(200, { ok: true });
    if (req.headers.get('origin') !== ORIGINE) return reponse(403, { erreur: 'Origine refusée.' });

    let texte, titre;
    try { ({ texte = '', titre = '' } = await req.json()); } catch { return reponse(400, { erreur: 'Requête illisible.' }); }
    // Array.from : couper par caractères, pas au milieu d'un emoji
    texte = String(texte).trim(); titre = Array.from(String(titre).trim()).slice(0, 120).join('');
    if (texte.length < 20 || !/[\p{L}\p{N}]/u.test(texte)) return reponse(400, { erreur: 'Le texte est vide, trop court ou sans aucun mot.' });
    if (texte.length > 20000) return reponse(413, { erreur: 'Texte trop long (20 000 caractères max).' });

    const r = await fetch(`https://api.github.com/repos/${DEPOT}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'dictee-relais',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ event_type: 'ajouter-dictee', client_payload: { texte, titre } }),
    });
    if (r.status !== 204) return reponse(502, { erreur: `GitHub a refusé (${r.status}).` });
    return reponse(202, { ok: true });
  },
};
