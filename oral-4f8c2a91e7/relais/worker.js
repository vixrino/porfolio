// Relais « Réponse » : la page envoie l'échange transcrit (contexte, questions, réponses), Workers AI (gratuit) répond en streaming.
const ORIGINE = 'https://vixrino.github.io';
const MODELE = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const CONSIGNE = `You help someone answer spoken questions out loud, in English.
RULE 1 — The exchange usually starts with a CONTEXT read aloud (a situation, a text, a case). If the latest message contains no question and no request (no "what", "why", "how", "tell me", "describe", "explain", "do you", "would you"…), it is context: reply with exactly the two letters OK and nothing else.
Example: "You are a nurse in a busy hospital and a patient refuses his medication." → OK
RULE 2 — Questions then come one after another. Each may refer to the context, the earlier questions and your earlier answers: use all of them and stay consistent with what you already said.
Messages come from live speech-to-text, so they may contain recognition errors: infer the intended words.
For a question or request, reply with the answer the person should say, ready to read aloud:
- about 75 words (30 seconds of speech), natural spoken English, first person when the question is about the speaker;
- start directly with the answer, no preamble, no restating the question;
- no lists, no markdown, no emojis.`;
const MAX_MSG = 4000, MAX_TOTAL = 16000;

// garde le contexte (1er message) + les échanges les plus récents qui tiennent dans la limite
function nettoyer(liste) {
  const msgs = (Array.isArray(liste) ? liste : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_MSG) }));
  if (!msgs.length) return msgs;
  const [premier, ...reste] = msgs;
  let total = premier.content.length;
  const garde = [];
  for (let i = reste.length - 1; i >= 0 && total + reste[i].content.length <= MAX_TOTAL; i--) {
    total += reste[i].content.length;
    garde.unshift(reste[i]);
  }
  return [premier, ...garde];
}
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
        max_tokens: 220,
        temperature: 0.4,
        stream: true,
      });
      // SSE tel quel : « data: {"response":"…"} » … « data: [DONE] »
      return new Response(flux, { headers: { ...CORS, 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } });
    } catch (e) {
      return reponse(502, { erreur: 'AI unavailable: ' + (e.message || e) });
    }
  },
};
