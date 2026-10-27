// Relais « Réponse » : la page envoie l'échange transcrit (contexte, questions, réponses), Workers AI (gratuit) répond en streaming.
const ORIGINE = 'https://vixrino.github.io';
const MODELE = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const CONSIGNE = `You help someone answer spoken questions out loud, in English.
RULE 1 — The exchange usually starts with a CONTEXT read aloud (a situation, a text, a case). If the latest message contains no question and no request (no "what", "why", "how", "tell me", "describe", "explain", "do you", "would you"…), it is context: reply with exactly the two letters OK and nothing else.
Example: "You are a nurse in a busy hospital and a patient refuses his medication." → OK
RULE 2 — Questions then come one after another. Each may refer to the context, the earlier questions and your earlier answers: use all of them and stay consistent with what you already said.
Messages come from live speech-to-text, so they may contain recognition errors: infer the intended words.
For a question or request, reply with the answer the person should say, ready to read aloud:
- 4 or 5 short sentences, 70 to 85 words (30 seconds aloud), never more than 95, even for follow-ups like "go on" or "give more detail";
- natural spoken English, first person when the question is about the speaker;
- start directly with the answer, no preamble, no restating the question;
- no questions at all (no rhetorical questions, never ask anything back);
- no lists, no markdown, no emojis.`;
const MAX_MSG = 4000, MAX_CTX = 8000, MAX_TOTAL = 16000;

// garde le contexte (tout jusqu'à la 1re vraie réponse, même lu en plusieurs fois) + les échanges récents qui tiennent
function nettoyer(liste) {
  const msgs = (Array.isArray(liste) ? liste : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m, i) => ({ role: m.role, content: m.content.trim().slice(0, i ? MAX_MSG : MAX_CTX) }));
  if (!msgs.length) return msgs;
  let fin = msgs.findIndex((m) => m.role === 'assistant' && !/^OK\.?$/i.test(m.content));
  if (fin < 0) fin = msgs.length; else fin = Math.max(1, fin - 1);   // la 1re question reste avec sa réponse
  const contexte = msgs.slice(0, fin), reste = msgs.slice(fin);
  let total = contexte.reduce((n, m) => n + m.content.length, 0);
  const garde = [];
  for (let i = reste.length - 1; i >= 0 && total + reste[i].content.length <= MAX_TOTAL; i--) {
    total += reste[i].content.length;
    garde.unshift(reste[i]);
  }
  return [...contexte, ...garde];
}
const CORS = {
  'Access-Control-Allow-Origin': ORIGINE,
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Max-Age': '600',   // évite un aller-retour réseau avant chaque question
};
const reponse = (code, corps) =>
  new Response(JSON.stringify(corps), { status: code, headers: { ...CORS, 'content-type': 'application/json' } });

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (req.method !== 'POST') return reponse(200, { ok: true });
    if (req.headers.get('origin') !== ORIGINE) return reponse(403, { erreur: 'Origin not allowed.' });

    let corps;
    try { corps = await req.json(); } catch { return reponse(400, { erreur: 'Unreadable request.' }); }
    // { messages: [...] } (échange complet) ou { question } (ancienne page)
    const echange = nettoyer(corps.messages ?? [{ role: 'user', content: String(corps.question ?? '') }]);
    const dernier = echange[echange.length - 1];
    if (!dernier || dernier.role !== 'user' || !/[\p{L}\p{N}]/u.test(dernier.content)) return reponse(400, { erreur: 'Empty question.' });

    try {
      const flux = await env.AI.run(MODELE, {
        messages: [{ role: 'system', content: CONSIGNE }, ...echange],
        max_tokens: 300,
        temperature: 0.3,
        stream: true,
      });
      // SSE tel quel : « data: {"response":"…"} » … « data: [DONE] »
      return new Response(flux, { headers: { ...CORS, 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } });
    } catch (e) {
      const m = String(e.message || e);
      if (/4006|daily free allocation/i.test(m)) return reponse(429, { erreur: 'Daily free AI quota used up — it resets at 00:00 UTC.' });
      return reponse(502, { erreur: 'AI unavailable: ' + m });
    }
  },
};
