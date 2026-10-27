// Relais « Réponse » : la page envoie la question transcrite, Workers AI (gratuit) répond en streaming.
const ORIGINE = 'https://vixrino.github.io';
const MODELE = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const CONSIGNE = `You help someone answer spoken questions out loud, in English.
The question comes from live speech-to-text, so it may contain recognition errors: infer the intended question.
Reply with the answer the person should say, ready to read aloud:
- about 75 words (30 seconds of speech), natural spoken English, first person when the question is about the speaker;
- start directly with the answer, no preamble, no restating the question;
- no lists, no markdown, no emojis.`;
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

    let question;
    try { ({ question = '' } = await req.json()); } catch { return reponse(400, { erreur: 'Unreadable request.' }); }
    question = String(question).trim().slice(0, 1500);
    if (!/[\p{L}\p{N}]/u.test(question)) return reponse(400, { erreur: 'Empty question.' });

    try {
      const flux = await env.AI.run(MODELE, {
        messages: [{ role: 'system', content: CONSIGNE }, { role: 'user', content: question }],
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
