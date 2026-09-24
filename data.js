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
    ['ml',     'pytorch · tensorflow · opencv · yolo · transformers'],
    ['code',   'python · c · java · sql · solidity · javascript'],
    ['infra',  'docker · kubernetes · linux · git'],
    ['spoken', 'french (native) · english C1 (TOEFL 6/6)'],
  ];

  const LINKS = [
    ['github',   'vixrino',               'https://github.com/vixrino'],
    ['linkedin', 'lucas-teyssier1',       'https://www.linkedin.com/in/lucas-teyssier1/'],
    ['x.com',    '@0xD7b5',               'https://x.com/0xD7b5'],
    ['email',    'lteyssier00@gmail.com', 'mailto:lteyssier00@gmail.com'],
    // lien CV masqué pour l'instant, à remettre plus tard :
    // ['resume',   'pdf ↓',                 'https://drive.google.com/file/d/1dLGs8BBRj7FMytEljTqYT_BTELYIJx03/view'],
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
      ['contact', 'links & mail'], ['resume', 'education & experience'],
      ['coffee', 'the mascot takes a sip'],
      ['wave', 'he waves at you'], ['sleep', 'he takes a nap'],
      ['clear', 'wipe the terminal'],
    ],
    resume: {
      xp: 'experience',
      edu: 'education',
      extra: 'also',
      jobs: [
        { org: 'Banque de France', role: 'Machine Learning Engineer — intern', when: 'may 2026 – sep 2026', where: 'Paris', bullets: [
          'Industrialized an OCR pipeline for the automated analysis of 150,000+ over-indebtedness case files.',
          'Built representative datasets and automated tests to evaluate the models.',
          'Fine-grained error analysis (CER/WER, post-processing) to make critical field extraction reliable.',
          'Improved robustness and scalability: load testing, business validation, documentation.',
        ] },
        { org: 'Freelance', role: 'Solidity engineer', when: '1 year', where: 'remote', bullets: [
          '10+ clients — smart contract development and delivery.',
        ] },
      ],
      schools: [
        { org: "ISEP — École d'ingénieurs du numérique", role: 'Engineering degree (Dipl. Ing.) — Computer Science', when: 'sep 2025 – may 2028', where: 'Paris',
          note: 'algorithms, probability, statistics, cybersecurity, OOP, quantum physics' },
        { org: 'Tsinghua University', role: 'Generative AI — non-degree program, 4/4 GPA', when: 'jul 2025', where: 'China',
          note: 'LLMs, diffusion models, NLP, generative AI for medicine, LLM agents' },
        { org: 'Université de Bordeaux', role: 'Double BSc — Computer Science & Applied Mathematics', when: 'sep 2023 – may 2025', where: 'Bordeaux',
          note: 'graduated with honours (top 10%) · tutored 1st-year CS & maths students in programming' },
      ],
      more: [
        'Languages: French (native), English C1 (TOEFL 6/6).',
        'Interests: competitive programming, blockchain, football.',
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

  const resumeHTML = () => {
    const R = T.resume;
    const entry = e => `<div class="entry">` +
      `<div class="eh"><span class="eo">${e.org}</span><span class="ew">${e.when} · ${e.where}</span></div>` +
      `<div class="er">${e.role}</div>` +
      (e.note ? `<div class="en">${e.note}</div>` : '') +
      (e.bullets ? `<ul class="eb">${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : '') +
      `</div>`;
    return `<div class="sec">${R.xp}</div>${R.jobs.map(entry).join('')}` +
           `<div class="sec">${R.edu}</div>${R.schools.map(entry).join('')}` +
           `<div class="sec">${R.extra}</div>${R.more.map(m => `<p>${m}</p>`).join('')}`;
  };

  const SITE = { PROJECTS, STACK, LINKS, T, row, P,
                 projectsHTML, stackHTML, linksHTML, aboutHTML, helpHTML, resumeHTML };

  if (typeof module !== 'undefined' && module.exports) module.exports = SITE;
  else root.SITE = SITE;
})(typeof globalThis !== 'undefined' ? globalThis : this);
