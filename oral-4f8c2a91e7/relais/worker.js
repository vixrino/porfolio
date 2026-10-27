// Relais « Réponse » : la page envoie l'échange transcrit (contexte, questions, réponses), Workers AI (gratuit) répond en streaming.
const ORIGINE = 'https://vixrino.github.io';
const MODELE = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const NOVA = '@cf/deepgram/nova-3';                     // transcription sans la Dictée iOS (qui fait du bruit)
const WHISPER = '@cf/openai/whisper-large-v3-turbo';
const MAX_AUDIO = 3_000_000;
const CONSIGNE = `You help someone answer spoken questions out loud, in English, during an oral exchange.
The exchange usually starts with a CONTEXT (a situation, a role, a text or a case), then questions one after another.
Messages come from live speech-to-text and may contain recognition errors: infer the intended words.
Answer the latest question using the whole exchange (context, earlier questions, your earlier answers) and stay consistent with what you already said.
Reply with what the person should say aloud:
- 4 or 5 short sentences, 70 to 85 words (30 seconds aloud), never fewer than 60 and never more than 95, even for follow-ups like "go on" or "give more detail";
- natural spoken English, first person when the question is about the speaker;
- start directly with the answer, no preamble, no restating the question;
- statements only: no question marks, no rhetorical questions;
- no lists, no markdown, no emojis.`;
// tri séparé, bien plus fiable que de demander « OK » dans la même consigne
const TRI = `You classify the LAST message of a spoken oral exchange (speech-to-text, may contain errors).
C = it only describes a situation, a role, a text, a case or facts, and asks nothing. Examples: "You are the manager of a bakery and sales dropped." / "Imagine you work in a startup and your team missed a deadline." / "Also the bakery has been in your family for three generations."
Q = it asks or requests something, even without a question word or question mark. Examples: "Your biggest weakness as a manager." / "Tell me about your plans." / "And the second idea." / "You are a nurse, what do you say to the patient?"
Reply with one letter only: C or Q.`;
const SSE_OK = 'data: {"response":"OK"}\n\ndata: [DONE]\n\n';
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

// WAV envoyé par la page → texte (Whisper)
async function transcrire(req, env) {
  const octets = new Uint8Array(await req.arrayBuffer());
  if (octets.length < 1000) return reponse(200, { text: '' });
  if (octets.length > MAX_AUDIO) return reponse(413, { erreur: 'Audio too long.' });
  let bin = '';
  for (let i = 0; i < octets.length; i += 0x8000) bin += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  try {
    let t;
    try {   // Deepgram Nova-3 : ~0,4 s
      const r = await env.AI.run(NOVA, { audio: { body: new Blob([octets]).stream(), contentType: 'audio/wav' }, language: 'en' });
      t = r?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    } catch (e) {
      if (/4006|daily free allocation/i.test(String(e.message || e))) throw e;
    }
    if (t == null) t = (await env.AI.run(WHISPER, { audio: btoa(bin), language: 'en' }))?.text;   // secours, plus lent
    return reponse(200, { text: String(t || '').trim() });
  } catch (e) {
    const m = String(e.message || e);
    if (/4006|daily free allocation/i.test(m)) return reponse(429, { erreur: 'Daily free AI quota used up — it resets at 00:00 UTC.' });
    return reponse(502, { erreur: 'Transcription unavailable: ' + m });
  }
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (req.method !== 'POST') return reponse(200, { ok: true });
    if (req.headers.get('origin') !== ORIGINE) return reponse(403, { erreur: 'Origin not allowed.' });
    if (new URL(req.url).pathname === '/stt') return transcrire(req, env);

    let corps;
    try { corps = await req.json(); } catch { return reponse(400, { erreur: 'Unreadable request.' }); }
    // { messages: [...] } (échange complet) ou { question } (ancienne page)
    const echange = nettoyer(corps.messages ?? [{ role: 'user', content: String(corps.question ?? '') }]);
    const dernier = echange[echange.length - 1];
    if (!dernier || dernier.role !== 'user' || !/[\p{L}\p{N}]/u.test(dernier.content)) return reponse(400, { erreur: 'Empty question.' });

    try {
      // les deux appels partent ensemble : le tri (1 lettre) n'ajoute pas de délai à la réponse
      const tri = env.AI.run(MODELE, {
        messages: [{ role: 'system', content: TRI }, { role: 'user', content: dernier.content }],
        max_tokens: 2, temperature: 0,
      }).then((r) => /^\s*C/i.test(r?.response ?? r?.choices?.[0]?.message?.content ?? ''), () => false);
      const flux = await env.AI.run(MODELE, {
        messages: [{ role: 'system', content: CONSIGNE }, ...echange],
        max_tokens: 300,
        temperature: 0.3,
        stream: true,
      });
      if (await tri) {   // simple contexte : on jette la réponse, la page affiche « Context saved »
        flux.cancel?.().catch?.(() => {});
        return new Response(SSE_OK, { headers: { ...CORS, 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } });
      }
      // SSE tel quel : « data: {"response":"…"} » … « data: [DONE] »
      return new Response(flux, { headers: { ...CORS, 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } });
    } catch (e) {
      const m = String(e.message || e);
      if (/4006|daily free allocation/i.test(m)) return reponse(429, { erreur: 'Daily free AI quota used up — it resets at 00:00 UTC.' });
      return reponse(502, { erreur: 'AI unavailable: ' + m });
    }
  },
};
