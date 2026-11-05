/* data.js — contenu du site + rendu HTML (fonctions pures, sans DOM). Chargé par le navigateur… */
(function (root) {
  'use strict';

  const PROJECTS = [
    { n: 'vq-vae-meshGPT', y: '2026', t: 'pytorch · pyg · trimesh', u: 'https://github.com/vixrino/vq-vae-meshGPT',
      d: 'From-scratch VQ-VAE that tokenizes 3D triangle meshes (MeshGPT-style): GNN encoder, residual quantization, graph decoder.' },
    { n: 'football-analysis', y: '2026', t: 'yolo · siglip · opencv',
      d: 'Match analysis: player and referee detection, team classification, key-point homography for a radar view, trajectory stats.' },
    { n: 'point-transformer', y: '2026', t: 'pytorch · shapenet', u: 'https://github.com/vixrino/point-transformer-shapenet',
      d: 'Point Transformer for 3D point cloud understanding, trained and evaluated on ShapeNet.' },
    { n: 'quantflow-gold', y: '2026', t: 'python · fred · cot', u: 'https://github.com/vixrino/GLD',
      d: 'Free-data stack for systematic gold trading: connectors (Yahoo, FRED, CFTC COT, ETF holdings), structuring and delivery.' },
    { n: 'ai-datacenter', y: '2025', t: 'kubernetes · docker · mlflow',
      d: 'Mini AI cluster for distributed training: GPU/CPU scheduling and automated ML pipelines with Kubeflow / MLflow.' },
    { n: 'where', y: '2025', t: 'swift · xcodegen',
      d: 'iOS exploration app: offline place index, free zones under 15 km, radius computation.' },
  ];

  const STACK = [
    ['ml',     'pytorch · jax · flax · optax · tensorflow · opencv · yolo · transformers'],
    ['data',   'numpy · scipy · pandas'],
    ['code',   'python · c · c++ · cuda · ocaml · java · sql · solidity · javascript'],
    ['infra',  'docker · kubernetes · linux · git'],
    ['spoken', 'french (native) · english C1 (TOEFL 5/6)'],
  ];

  const RESUME_URL = 'Lucas_Teyssier_CV_no_phone.pdf';

  const LINKS = [
    ['github',   'vixrino',               'https://github.com/vixrino'],
    ['linkedin', 'lucas-teyssier1',       'https://www.linkedin.com/in/lucas-teyssier1/'],
    ['x.com',    '@0xD7b5',               'https://x.com/0xD7b5'],
    ['email',    'lteyssier00@gmail.com', 'mailto:lteyssier00@gmail.com'],
    ['resume',   'pdf ↓',                 RESUME_URL],
  ];

  const T = {
    try: 'try',
    about: [
      "Welcome to my 'blog'. I'm Lucas, 22 y/o, I live in Paris — <b>machine learning engineer</b>, dm's open.",
      "I'm currently working on 3D generative models (VQ-VAE / MeshGPT), computer vision, and systematic trading data.",
      'I like taking an idea from a paper all the way to something that actually <i>ships</i>.',
    ],
    help: [
      ['about', 'who I am'], ['projects', 'what I build'], ['skills', 'tech stack'],
      ['contact', 'links & mail'],
      ['experience', 'jobs, publications & achievements'], ['education', 'schools & degrees'],
      ['resume', 'my CV (pdf)'],
      ['coffee', 'the mascot takes a sip'],
      ['wave', 'he waves at you'], ['sleep', 'he takes a nap'],
      ['clear', 'wipe the terminal'],
    ],
    resume: {
      xp: 'experience',
      pub: 'publications',
      edu: 'education',
      lead: 'leadership & achievements',
      extra: 'also',
      jobs: [
        { org: 'Quant Flow', role: 'Data Lead', when: 'feb 2026 – present', where: 'Paris', bullets: [
          'Automated pipelines turning raw market, macroeconomic and alternative data into production-ready trading signals — data release to signal in under 3 min.',
          'Designed and backtested systematic gold trading strategies on 15 years of multi-source data (Sharpe 1.8, max drawdown 9%), with walk-forward validation.',
          'Led a team of 7 across data engineering and research: data quality, signal library, research to production.',
        ] },
        { org: 'Banque de France', role: 'Machine Learning Engineer', when: 'jun 2026 – dec 2026', where: 'Paris', bullets: [
          'Co-developed with Mistral AI an OCR + LLM pipeline processing 150,000+ over-indebtedness files per year.',
          'Designed a schema-driven extraction engine (600+ fields) that handles new document types without code changes.',
          'Built the evaluation framework (annotated benchmarks, field-level F1, CER/WER), raising extraction F1 from 78% to 94% across 12 document types.',
        ] },
        { org: 'MIT CSAIL — Mantis AI', role: 'AI Engineer', when: 'jun 2026 – sep 2026', where: 'Cambridge, USA', bullets: [
          'Clustered financial news by semantic similarity using text embeddings — grouping articles by meaning rather than keyword overlap.',
          'Studied how news cluster dynamics correlate with subsequent stock price movements.',
        ] },
        { org: 'Freelance', role: 'Solidity engineer', when: '1 year', where: 'remote', bullets: [
          '10+ clients — smart contract development and delivery.',
        ] },
      ],
      schools: [
        { org: "ISEP — École d'ingénieurs du numérique", role: 'Master of Engineering — Artificial Intelligence, 3.7 GPA', when: 'sep 2025 – jun 2028', where: 'Paris',
          note: 'deep learning, reinforcement learning, machine learning, computer vision · GRE 340/340 · TOEFL 5/6' },
        { org: 'Tsinghua University', role: 'Generative AI — non-degree program, 4/4 GPA', when: 'jul 2025', where: 'China',
          note: 'LLMs, diffusion models, NLP, generative AI for medicine, LLM agents' },
        { org: 'Université de Bordeaux', role: 'Double BSc — Computer Science & Applied Mathematics, 3.3 GPA', when: 'sep 2023 – may 2025', where: 'Bordeaux',
          note: 'ranked 1/236 · linear algebra, algorithms, C, probability & statistics · tutored 1st-year CS & maths students in programming' },
      ],
      pubs: [
        { org: 'MeshAnyOrder', role: 'M. Balice, D. Lacavalla, <b>L. Teyssier</b>, A. Sevincel, Tonio', when: 'submitted to CVPR 2027', where: 'preprint',
          note: 'Autoregressive mesh generation: a Transformer decoder conditioned on a point cloud encoder predicts each triangle face as 9 quantized coordinates relative to the first vertex of the query face.' },
      ],
      leads: [
        { org: 'Hugging Face × Anthropic Hackathon', role: 'Winner — 1st prize', when: 'jun 2026', where: 'hackathon',
          note: 'Autonomous AI agent automating payroll and end-to-end financial workflows.' },
        { org: 'Artificial Intelligence ISEP Club', role: 'President', when: 'sep 2025 – present', where: 'Paris',
          note: 'AI conferences with Yann LeCun and Arthur Mensch · weekly research paper discussions.' },
        { org: 'UTMB® World Series', role: 'Ultra-trail runner — UTMB index 652', when: '2023 – present', where: 'France',
          note: '32 trail races, incl. a 132 km / 5,200 m D+ ultra (Grands Trails d’Auvergne 100M, 15th, 17h12) · top 10s: Trail en terres d’Oc (6th 2023, 8th 2025).' },
      ],
      more: [
        'Interests: financial markets & trading, competitive programming (Master on Codeforces), chess (top 0.1% on chess.com), cinema, blockchain, football.',
      ],
    },
    notfound: n => `zsh: command not found: ${n}`,
    hintHelp: 'type <span data-run="help">help</span>',
    sip: '*sip*', hi: 'hey there!', nap: 'taking a nap.',
  };

  /* rendu : chaînes pures, sans DOM */
  const row = (l, v) => `<div class="row"><span class="lbl">${l}</span><span class="val">${v}</span></div>`;
  const P   = t => `<p><span class="k">&gt;</span> ${t}</p>`;

  const projectsHTML = () => PROJECTS.map(p => {
    const inner = `<div class="h"><span class="n">${p.n}</span><span class="y">${p.y}</span></div>` +
                  `<div class="d">${p.d}</div><div class="t">${p.t}</div>`;
    return p.u ? `<a class="card" href="${p.u}" target="_blank" rel="noopener">${inner}</a>`
               : `<div class="card">${inner}</div>`;
  }).join('');

  const stackHTML = () => STACK.map(([l, v]) => row(l, v)).join('');
  const linksHTML = () => LINKS.map(([l, r, u]) =>
    `<a href="${u}" target="_blank" rel="noopener"><span>${l}</span><span class="r">${r}</span></a>`).join('');
  const aboutHTML = () => T.about.map(P).join('');
  const helpHTML  = () => T.help.map(([c, d]) => row(`<span data-run="${c}">${c}</span>`, d)).join('');

  const entry = e => `<div class="entry">` +
    `<div class="eh"><span class="eo">${e.org}</span><span class="ew">${e.when} · ${e.where}</span></div>` +
    `<div class="er">${e.role}</div>` +
    (e.note ? `<div class="en">${e.note}</div>` : '') +
    (e.bullets ? `<ul class="eb">${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : '') +
    `</div>`;
  const sec = (title, list) => `<div class="sec">${title}</div>${list.map(entry).join('')}`;

  const experienceHTML = () => {
    const R = T.resume;
    return sec(R.xp, R.jobs) + sec(R.pub, R.pubs) + sec(R.lead, R.leads);
  };
  const educationHTML = () => {
    const R = T.resume;
    return sec(R.edu, R.schools) +
           `<div class="sec">${R.extra}</div>${R.more.map(m => `<p>${m}</p>`).join('')}`;
  };
  const resumeHTML = () =>
    P(`<a href="${RESUME_URL}" target="_blank" rel="noopener">Lucas_Teyssier_CV.pdf ↓</a>`);

  const SITE = { PROJECTS, STACK, LINKS, T, row, P,
                 projectsHTML, stackHTML, linksHTML, aboutHTML, helpHTML,
                 experienceHTML, educationHTML, resumeHTML };

  if (typeof module !== 'undefined' && module.exports) module.exports = SITE;
  else root.SITE = SITE;
})(typeof globalThis !== 'undefined' ? globalThis : this);
