/* scene.js — salon en dot-matrix + mascotte pixel art, sur deux canvas */
(() => {
  'use strict';

  const box    = document.getElementById('scene');
  const roomCv = document.getElementById('room');
  const sprCv  = document.getElementById('sprite');
  if (!box || !roomCv || !sprCv) return;
  const roomCx = roomCv.getContext('2d');
  const sprCx  = sprCv.getContext('2d');

  let W = 0, H = 0, DPR = 1;
  const CELL = 7;           // espacement des points (px CSS)
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Le canapé, en coordonnées normalisées — sert aussi à poser la mascotte */
  const COUCH = { x: .265, y: .34, w: .45, h: .50 };

  /* la pièce */
  /* Pièce peinte en gris dans un canvas basse résolution : 1 pixel = 1 point. */

  const BAYER = [
    [ 0, 8, 2,10],
    [12, 4,14, 6],
    [ 3,11, 1, 9],
    [15, 7,13, 5],
  ].map(r => r.map(v => (v + .5) / 16));

  function paintRoom2(g, gw, gh) {
    const X = n => n * gw, Y = n => n * gh;
    const rect = (x, y, w, h, v) => { g.fillStyle = `rgba(255,255,255,${v})`; g.fillRect(X(x), Y(y), X(w), Y(h)); };
    const cx = 1 / gw, cy = 1 / gh;                    // une cellule
    const outline = (x, y, w, h, v = 1) => {
      rect(x, y, w, cy, v); rect(x, y + h - cy, w, cy, v);
      rect(x, y, cx, h, v); rect(x + w - cx, y, cx, h, v);
    };
    const box2 = (x, y, w, h, fill = .28, edge = 1) => { rect(x, y, w, h, fill); outline(x, y, w, h, edge); };
    const HOR = .70;                                    // ligne d'horizon (mur/sol)

    g.clearRect(0, 0, gw, gh);

    /* sol */
    rect(0, HOR, 1, cy * 1.2, .95);
    rect(0, HOR, 1, 1 - HOR, .06);
    g.strokeStyle = 'rgba(255,255,255,.30)'; g.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      g.beginPath(); g.moveTo(X(-.25 + i * .25), Y(1)); g.lineTo(X(.05 + i * .16), Y(HOR)); g.stroke();
    }

    /* fenêtre (gauche) */
    const wx = .045, wy = .07, ww = .225, wh = .44;
    box2(wx, wy, ww, wh, .10, 1);                       // cadre + ciel
    rect(wx + ww / 2 - cx, wy, cx * 2, wh, .95);        // meneau vertical
    rect(wx, wy + wh * .46, ww, cy * 1.2, .95);         // meneau horizontal
    for (let i = 0; i < 6; i++) {                       // skyline
      const bx = wx + .018 + i * .035, bh = wh * (.12 + ((i * 5) % 3) * .09);
      rect(bx, wy + wh - bh - cy, .024, bh, .40);
      rect(bx + .007, wy + wh - bh + cy * 2, .008, cy * 2, .95);
    }
    g.fillStyle = 'rgba(255,255,255,1)';                // lune
    g.beginPath(); g.arc(X(wx + ww * .78), Y(wy + wh * .17), Math.max(gw * .011, 1.6), 0, 7); g.fill();
    rect(wx - .052, wy - .035, .028, wh + .10, .30);    // rideaux
    rect(wx + ww + .024, wy - .035, .028, wh + .10, .30);
    rect(wx - .07, wy - .05, ww + .15, cy * 1.2, .95);  // tringle

    /* cadres au mur */
    box2(.325, .085, .075, .155, .12, .9);
    box2(.425, .130, .055, .110, .12, .9);

    /* lampadaire (droite) */
    rect(.905, .265, cx * 1.6, HOR - .265, .9);
    rect(.868, HOR - cy * 2, .078, cy * 2.4, .9);
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.beginPath(); g.moveTo(X(.868), Y(.270)); g.lineTo(X(.888), Y(.170)); g.lineTo(X(.926), Y(.170)); g.lineTo(X(.946), Y(.270)); g.closePath(); g.fill();
    const gr = g.createRadialGradient(X(.907), Y(.34), 0, X(.907), Y(.34), X(.24));
    gr.addColorStop(0, 'rgba(255,255,255,.38)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(X(.62), 0, X(.42), Y(.95));

    /* plante en pot (entre canapé et lampe) */
    box2(.755, .585, .055, .115, .30, .95);
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      g.beginPath(); g.moveTo(X(.782), Y(.590));
      g.quadraticCurveTo(X(.735 + i * .026), Y(.500 - i * .014), X(.742 + i * .022), Y(.400 + (i % 2) * .055));
      g.stroke();
    }

    /* tapis */
    g.fillStyle = 'rgba(255,255,255,.13)';
    g.beginPath(); g.ellipse(X(.46), Y(.895), X(.33), Y(.080), 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1;
    g.beginPath(); g.ellipse(X(.46), Y(.895), X(.33), Y(.080), 0, 0, 7); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.40)';
    g.beginPath(); g.ellipse(X(.46), Y(.895), X(.24), Y(.052), 0, 0, 7); g.stroke();

    /* CANAPÉ */
    const c = COUCH, seat = c.y + c.h * .50;
    box2(c.x + .022, c.y, c.w - .044, seat - c.y + .03, .14, 1);          // dossier
    outline(c.x + .048, c.y + .035, (c.w - .13) / 2, (seat - c.y) - .05, .55);
    outline(c.x + .066 + (c.w - .13) / 2, c.y + .035, (c.w - .13) / 2, (seat - c.y) - .05, .55);
    box2(c.x, c.y + c.h * .24, .052, c.h * .62, .34, 1);                  // accoudoirs
    box2(c.x + c.w - .052, c.y + c.h * .24, .052, c.h * .62, .34, 1);
    box2(c.x + .008, seat, c.w - .016, c.h * .36, .36, 1);                // assise
    rect(c.x + .008, seat + c.h * .12, c.w - .016, 1 / gh, .8);           // pli du coussin
    rect(c.x + .050, c.y + c.h * .86, .016, c.h * .16, .85);              // pieds
    rect(c.x + c.w - .066, c.y + c.h * .86, .016, c.h * .16, .85);
    box2(c.x + .034, c.y + c.h * .18, .060, c.h * .28, .45, 1);           // coussin
  }

  function renderRoom() {
    const gw = Math.ceil(W / CELL), gh = Math.ceil(H / CELL);
    const off = document.createElement('canvas');
    off.width = gw; off.height = gh;
    const g = off.getContext('2d');
    paintRoom2(g, gw, gh);
    const data = g.getImageData(0, 0, gw, gh).data;

    roomCx.setTransform(DPR, 0, 0, DPR, 0, 0);
    roomCx.clearRect(0, 0, W, H);
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = (y * gw + x) * 4;
        // luminance pondérée par l'alpha
        const a = data[i + 3] / 255;
        const v = (data[i] / 255) * a;
        if (v <= .05) continue;
        const th = BAYER[y & 3][x & 3] * .45;      // tramage : les zones sombres se raréfient
        if (v < th) continue;
        roomCx.fillStyle = `rgba(238,240,236,${(.40 + v * .58).toFixed(3)})`;
        const r = CELL * (.12 + .30 * v);
        roomCx.beginPath();
        roomCx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, r, 0, 7);
        roomCx.fill();
      }
    }
  }

  /* la mascotte */
  /* Grille virtuelle 44 × 36. Silhouette définie par spans -> contour auto. */

  const PAL = {
    D: '#1b3d27',  // contour
    G: '#6cc25c',  // corps
    L: '#9ce089',  // clair
    S: '#4a9445',  // ombre
    K: '#0a0f0a',  // œil
    W: '#f4f1e6',  // blanc
    F: '#1b3d27',  // lunettes
    M: '#efe9dc',  // tasse
    m: '#bdb6a6',  // tasse ombre
    O: '#2b2724',  // contour céramique (neutre — pas le vert du personnage)
    P: '#2a1a12',  // bord de la flaque
    R: '#8fa9c4',  // chiffon
    C: '#3a2418',  // café
    B: '#3b4fa8',  // accent (bouquin / coussin)
  };

  const GW = 44, GH = 36;

  /* Silhouette = spans [x0,x1] par ligne ; le contour en est déduit. */
  function buildSil(legs) {
    const s = Array.from({ length: GH }, () => []);
    const put = (r, a, b) => { if (s[r]) s[r].push([a, b]); };
    for (let r = 0; r <= 2; r++) { put(r, 10, 13); put(r, 26, 29); }   // oreilles
    put(3, 10, 29);
    for (let r = 4; r <= 16; r++) put(r, 9, 30);                        // tête
    put(17, 10, 29);
    put(18, 8, 31);                                                     // épaules
    for (let r = 19; r <= 27; r++) put(r, 6, 33);                       // corps
    put(28, 7, 32);
    for (const [a, b, top, bot] of legs) for (let r = top; r <= bot; r++) put(r, a, b);
    return s;
  }

  const SIL_SIT  = buildSil([[8, 16, 29, 31], [24, 32, 29, 31]]);
  const SIL_WALK = [
    buildSil([[6, 14, 29, 32], [25, 33, 29, 30]]),   // patte gauche en avant
    buildSil([[10, 18, 29, 30], [23, 31, 29, 32]]),  // patte droite en avant
  ];

  /* Rasterise quelques ellipses en spans : plus simple à retoucher que des pixels. */
  function silFromBlobs(blobs) {
    const g = Array.from({ length: GH }, () => []);
    for (let r = 0; r < GH; r++) {
      const raw = [];
      for (const b of blobs) {
        const dy = (r + .5 - b.cy) / b.ry;
        if (Math.abs(dy) >= 1) continue;
        const half = b.rx * Math.sqrt(1 - dy * dy);
        raw.push([Math.round(b.cx - half), Math.round(b.cx + half)]);
      }
      raw.sort((a, b) => a[0] - b[0]);
      for (const sp of raw) {
        const last = g[r][g[r].length - 1];
        if (last && sp[0] <= last[1] + 1) last[1] = Math.max(last[1], sp[1]);
        else g[r].push([sp[0], sp[1]]);
      }
    }
    return g;
  }

  /* pose intermédiaire : il s'affaisse sur le flanc, tête basse à gauche */
  const SIL_SLUMP = silFromBlobs([
    { cx:  8, cy: 10.5, rx: 2.6, ry: 3.6 },   // oreille arrière
    { cx: 15, cy:  9.5, rx: 2.6, ry: 3.6 },   // oreille avant
    { cx: 13, cy: 18,   rx: 9.5, ry: 8.5 },   // tête
    { cx: 26, cy: 24,   rx: 11,  ry: 8   },   // corps
    { cx: 34, cy: 29,   rx: 4.5, ry: 2.8 },   // patte tendue
  ]);

  /* mascotte affaissée : yeux clos, museau qui glisse vers le coussin */
  function drawSlump(cx, ox, oy, s, st) {
    const px = (x, y, w, h, c) => { cx.fillStyle = c; cx.fillRect(ox + x * s, oy + y * s, w * s, h * s); };
    fillSil(px, SIL_SLUMP);
    px(9, 10, 2, 1, PAL.L); px(16, 9, 2, 1, PAL.L);        // intérieur des oreilles
    px(21, 22, 11, 5, PAL.L);                               // ventre
    px(6, 20, 11, 4, PAL.L);                                // museau
    px(10, 21, 2, 2, PAL.D);                                // truffe
    px(6, 17, 4, 1, PAL.K); px(13, 16, 4, 1, PAL.K);        // yeux fermés
    const gl = (x, y) => { px(x, y - 3, 7, 1, PAL.F); px(x, y + 3, 7, 1, PAL.F); px(x, y - 3, 1, 7, PAL.F); px(x + 6, y - 3, 1, 7, PAL.F); };
    gl(4, 17); gl(11, 16);
    px(31, 28, 4, 1, PAL.L);                                // coussinet
  }

  /* pose couchée sur le flanc : tête à gauche, pattes repliées à droite */
  const SIL_LIE = (() => {
    const g = Array.from({ length: GH }, () => []);
    const put = (r0, r1, a, b) => { for (let r = r0; r <= r1; r++) if (g[r]) g[r].push([a, b]); };
    put(12, 14,  5,  8); put(12, 14, 12, 15);      // oreilles
    put(15, 15,  6, 15);
    put(16, 16,  4, 17);
    put(17, 29,  2, 19);                            // tête
    put(30, 30,  4, 17);
    put(31, 31,  6, 15);
    put(18, 18, 22, 33);                            // corps allongé
    put(19, 19, 20, 35);
    put(20, 30, 18, 36);
    put(31, 31, 20, 34);
    put(20, 24, 36, 41);                            // pattes tendues
    put(26, 31, 36, 41);
    return g;
  })();

  /* remplissage commun : contour foncé + intérieur clair, déduits des spans */
  function fillSil(px, SIL) {
    for (let r = 0; r < GH; r++) for (const [a, b] of SIL[r]) px(a, r, b - a + 1, 1, PAL.D);
    for (let r = 0; r < GH; r++) {
      const prev = SIL[r - 1] || [], next = SIL[r + 1] || [];
      for (const [a, b] of SIL[r]) {
        const inner = [a + 1, b - 1];
        if (inner[1] < inner[0]) continue;
        const covered = prev.some(p => p[0] <= inner[0] && p[1] >= inner[1]) &&
                        next.some(p => p[0] <= inner[0] && p[1] >= inner[1]);
        if (!covered) continue;
        px(inner[0], r, inner[1] - inner[0] + 1, 1, PAL.G);
      }
    }
  }

  /* mascotte endormie, allongée : yeux fermés, museau posé, respiration lente */
  function drawLying(cx, ox, oy, s, st) {
    const px = (x, y, w, h, c) => { cx.fillStyle = c; cx.fillRect(ox + x * s, oy + y * s, w * s, h * s); };
    fillSil(px, SIL_LIE);

    px(6, 13, 2, 1, PAL.L); px(13, 13, 2, 1, PAL.L);      // intérieur des oreilles
    px(21, 23, 13, 6, PAL.L);                              // ventre
    px(19, 20, 2, 10, PAL.S);                              // ombre sous le dos
    px(4, 24, 11, 5, PAL.L);                               // museau posé
    px(8, 25, 2, 2, PAL.D);                                // truffe
    px(7, 28, 4, 1, PAL.D);                                // bouche

    if (st.wide) {                                          // il vient d'ouvrir les yeux
      px(5, 19, 4, 4, PAL.K); px(11, 19, 4, 4, PAL.K);
      px(6, 20, 1, 1, PAL.W); px(12, 20, 1, 1, PAL.W);
    } else {
      px(5, 21, 4, 1, PAL.K); px(11, 21, 4, 1, PAL.K);      // yeux fermés
    }
    const gl = x => { px(x, 18, 7, 1, PAL.F); px(x, 24, 7, 1, PAL.F); px(x, 18, 1, 7, PAL.F); px(x + 6, 18, 1, 7, PAL.F); };
    gl(3); gl(10);                                          // lunettes gardées sur le nez
    px(9, 20, 1, 1, PAL.F);                                 // pont
    px(37, 21, 4, 1, PAL.L); px(37, 28, 4, 1, PAL.L);      // coussinets
  }

  function drawMascot(cx, ox, oy, s, st, SIL) {
    const px = (x, y, w, h, c) => { cx.fillStyle = c; cx.fillRect(ox + x * s, oy + y * s, w * s, h * s); };

    fillSil(px, SIL);

    /* ombrage corps + ventre clair */
    px(7, 21, 3, 7, PAL.S);
    px(31, 21, 3, 7, PAL.S);
    px(13, 22, 14, 6, PAL.L);
    px(11, 1, 2, 1, PAL.L); px(27, 1, 2, 1, PAL.L);      // intérieur oreilles

    /* museau */
    px(15, 12, 10, 5, PAL.L);
    px(19, 12, 2, 2, PAL.D);                              // truffe
    px(18, 15, 4, 1, PAL.D);                              // bouche
    if (st.drink) {                                       // bouche ouverte + déglutition
      const g = Math.sin(st.t * 16) > 0 ? 1 : 0;
      px(17, 14, 6, 3 + g, PAL.D); px(18, 15, 4, 1 + g, PAL.C);
    } else if (st.smile) {
      px(17, 15, 6, 1, PAL.D); px(16, 14, 1, 1, PAL.D); px(23, 14, 1, 1, PAL.D);
    }
    if (st.yawn) {                                        // bâillement : bouche ronde
      px(17, 14, 6, 4, PAL.D); px(18, 15, 4, 2, PAL.C);
    }

    /* yeux : la paupière descend selon st.lid (0 ouvert → 1 fermé) */
    const lid = Math.max(0, Math.min(1, st.lid || 0));
    if (lid >= .95) {                                     // fermé : un simple trait
      px(13, 9, 5, 1, PAL.K); px(22, 9, 5, 1, PAL.K);
    } else if (st.wide) {                                 // réveil en sursaut
      px(13, 6, 5, 7, PAL.K); px(22, 6, 5, 7, PAL.K);
      px(15, 8, 2, 2, PAL.W); px(24, 8, 2, 2, PAL.W);
    } else {
      const h = Math.max(1, Math.round(5 * (1 - lid)));   // hauteur d'œil visible
      const y = 7 + (5 - h);                              // la paupière vient du haut
      px(13, y, 5, h, PAL.K); px(22, y, 5, h, PAL.K);
      if (lid < .35) { px(16, y + 1, 1, 1, PAL.W); px(25, y + 1, 1, 1, PAL.W); }
    }
    // montures
    const gl = (x) => { px(x, 6, 8, 1, PAL.F); px(x, 12, 8, 1, PAL.F); px(x, 6, 1, 7, PAL.F); px(x + 7, 6, 1, 7, PAL.F); };
    gl(12); gl(21);
    px(20, 12, 1, 1, PAL.G);                              // respiration entre les verres
    px(20, 8, 1, 1, PAL.F);                               // pont
    px(9, 7, 3, 1, PAL.F); px(29, 7, 3, 1, PAL.F);        // branches

    /* bras droit (viewer gauche) — salut / repos */
    if (st.wave) {
      px(3, 14, 4, 3, PAL.D); px(4, 15, 3, 1, PAL.G);
      px(2, 11, 4, 4, PAL.D); px(3, 12, 2, 2, PAL.G);
      px(5, 17, 3, 3, PAL.D); px(6, 18, 2, 1, PAL.G);
    } else {
      px(4, 21, 4, 6, PAL.D); px(5, 22, 3, 4, PAL.G);
    }

    /* bras gauche + tasse — sauf s'il l'a posée pour s'allonger */
    if (!st.nomug) {
      const { mx, my, rot, level } = mugPose(st);
      px(mx - 2, my + 1, 5, 4, PAL.D); px(mx - 1, my + 2, 3, 2, PAL.G);   // avant-bras
      if (rot) {
        cx.save();
        cx.translate(ox + (mx + 4) * s, oy + (my + 5) * s);
        cx.rotate(rot);
        drawMug(cx, -4 * s, -5 * s, s, level);
        cx.restore();
      } else {
        drawMug(cx, ox + mx * s, oy + my * s, s, level);
      }
    }

    /* il transporte un chiffon (aller-retour vers la tache) */
    if (st.carry === 'rag' && !st.wipe) {
      px(32, 21, 4, 4, PAL.D); px(33, 22, 2, 2, PAL.G);
      px(34, 24, 8, 3, PAL.O); px(35, 25, 6, 1, PAL.R);
    }

    /* nettoyage : il se penche, bras tendu, chiffon qui va et vient */
    if (st.wipe > 0) {
      const sw = Math.round(Math.sin(st.t * 11) * 7);
      px(29, 20, 6, 4, PAL.D); px(30, 21, 4, 2, PAL.G);          // épaule
      const ax = 31 + Math.round(sw * .5);
      px(ax, 23, 4, 6, PAL.D); px(ax + 1, 24, 2, 4, PAL.G);      // avant-bras vers le sol
      px(30 + sw, 29, 10, 2, PAL.O);                             // chiffon posé au sol
      px(31 + sw, 29, 8, 1, PAL.R);
      if (st.wipe > .55) { px(28 + sw, 27, 1, 1, PAL.W); px(41 + sw, 28, 1, 1, PAL.W); }
    }

    /* pattes : petits coussinets clairs (pose assise seulement) */
    if (!st.walking) { px(10, 30, 5, 1, PAL.L); px(26, 30, 5, 1, PAL.L); }

  }

  /* Position de la tasse tenue, partagée par le sprite et la fumée. */
  function mugPose(st) {
    const p = st.sipP || 0;                               // 0 = genoux, 1 = au museau
    return {
      mx: 34 - Math.round(p * 11),
      my: 20 + Math.round((st.drowsy || 0) * 2) - Math.round(p * 7),
      rot: -p * .72,                                      // elle s'incline vers la bouche
      level: st.level === undefined ? 1 : st.level,       // 1 = pleine, 0 = vide
    };
  }

  /* la tasse, dessinable n'importe où (dans sa main ou posée sur le canapé) */
  function drawMug(cx, x, y, s, level = 1) {
    const px = (a, b, w, h, c) => { cx.fillStyle = c; cx.fillRect(x + a * s, y + b * s, w * s, h * s); };
    px(0, 0, 8, 8, PAL.O);                                // contour
    px(1, 1, 6, 6, PAL.M);
    const cy = 1 + Math.round((1 - level) * 3);           // le niveau baisse à mesure
    if (level > .05) px(1, cy, 6, 1, PAL.C);              // surface du café
    px(1, 6, 6, 1, PAL.m);
    px(8, 2, 2, 1, PAL.O); px(9, 3, 1, 2, PAL.O); px(8, 5, 2, 1, PAL.O);   // anse
  }

  /* la tasse renversée sur le flanc + le café répandu qui s'étale */
  function drawSpill(cx, x, y, s, spread, alpha) {
    cx.save();
    cx.globalAlpha = alpha;
    const px = (a, b, w, h, c) => { cx.fillStyle = c; cx.fillRect(x + a * s, y + b * s, w * s, h * s); };

    // flaque : basse et étalée, contour en escalier
    const w = Math.round(2 + spread * 20);
    if (w <= 2) { cx.restore(); return; }
    px(-w + 4, 6, w, 2, PAL.C);                            // corps de la flaque
    px(-w + 1, 7, w + 4, 1, PAL.C);                        // langue basse
    px(-w + 6, 5, w - 6, 1, PAL.C);
    px(-w, 8, w + 8, 1, PAL.P);                            // ombre au sol
    if (spread > .5)  px(-w - 2, 7, 3, 1, PAL.C);
    if (spread > .8) { px(-w - 5, 7, 3, 1, PAL.C); px(-w + 3, 4, 4, 1, PAL.C); }
    px(-w + 8, 6, 3, 1, PAL.m);                            // reflet
    // la tasse, couchée : ouverture à gauche, anse en haut
    px(4, -2, 4, 1, PAL.O); px(4, -2, 1, 2, PAL.O); px(7, -2, 1, 2, PAL.O);   // anse
    px(0, 0, 11, 7, PAL.O);                                // contour
    px(3, 1, 7, 5, PAL.M);                                 // flanc de la tasse
    px(1, 1, 2, 5, PAL.C);                                 // intérieur : le café coule
    px(9, 1, 1, 5, PAL.m);                                 // fond, à droite
    px(3, 5, 7, 1, PAL.m);
    cx.restore();
  }

  /* le « ! » du réveil en sursaut */
  function drawBang(cx, x, y, s, a) {
    cx.save();
    cx.globalAlpha = a;
    cx.fillStyle = PAL.W;
    cx.fillRect(x, y, 2 * s, 6 * s);
    cx.fillRect(x, y + 7 * s, 2 * s, 2 * s);
    cx.restore();
  }

  /* zzz : trois « z » en pixels qui montent, dessinés en repère écran */
  function drawZzz(cx, x, y, s, t) {
    const zed = (zx, zy, k, a) => {
      cx.fillStyle = `rgba(244,241,230,${a.toFixed(2)})`;
      cx.fillRect(zx, zy, 4 * k * s, k * s);
      cx.fillRect(zx + 3 * k * s, zy + k * s, k * s, k * s);
      cx.fillRect(zx + 2 * k * s, zy + 2 * k * s, k * s, k * s);
      cx.fillRect(zx + k * s, zy + 3 * k * s, k * s, k * s);
      cx.fillRect(zx, zy + 4 * k * s, 4 * k * s, k * s);
    };
    for (let i = 0; i < 3; i++) {
      const life = (t * .5 + i * .9) % 2.7;
      const k = Math.max(.6, 2 - life * .45);
      zed(x + life * 2.2 * s, y - life * 4.6 * s, k, Math.max(0, 1 - life / 2.7));
    }
  }

  /* fumée : pixels qui montent depuis la tasse */
  function drawSteam(cx, ox, oy, s, st) {
    if (st.sleep || st.level < .05) return;
    const { mx, my } = mugPose(st);
    const baseY = my - 1, baseX = mx + 2;
    for (let w = 0; w < 3; w++) {
      for (let i = 0; i < 5; i++) {
        const life = (st.t * .5 + i * 1.2 + w * .7) % 6;
        const y = baseY - life * 1.6;
        const x = baseX + w * 2 + Math.round(Math.sin(life * 1.1 + w) * 1.4);
        const a = Math.max(0, 1 - life / 6) * .95;
        cx.fillStyle = `rgba(238,240,236,${a.toFixed(3)})`;
        cx.fillRect(ox + x * s, oy + Math.round(y) * s, s * 1.4, s * 1.4);
      }
    }
  }

  /* état et boucle */
  
  const state = { t: 0, blink: false, sip: false, wave: false, sleep: false, walking: false,
                  lid: 0, wide: false, yawn: false, drowsy: 0, wipe: 0, carry: 'mug',
                  sipP: 0, drink: false, smile: false, level: 1 };
  const M = { x: 0, y: 0, facing: 1, step: 0, sitT: 0 };
  let action = null, actionT0 = 0, actionUntil = 0, nextBlink = 6, last = 0, placed = false;

  /* Assoupissement : il pique du nez, puis s'endort ; toute interaction le réveille. */
  const DROWSY_AT = 20, SLEEP_AT = 40;     // secondes d'inactivité
  let idleSince = 0, wideUntil = 0, nextYawn = Infinity, yawnFrom = 0, yawnUntil = 0;
  let lieHold = 0;                          // il reste couché le temps d'émerger
  let sipLevel0 = 1;                        // niveau de café avant la gorgée en cours
  let shockUntil = 0;                       // fenêtre pendant laquelle il a les mains en l'air
  let lie = 0;                             // 0 = assis, 1 = allongé sur le canapé
  /* la tasse : dans sa patte, en chute libre, puis renversée par terre */
  const mug = { st: 'hand', t0: 0, x: 0, y: 0, x0: 0, y0: 0, rot: 0, spillT: 0, fade: 1, clean: 0 };
  let lastLie = 0, landT = -9, lastPose = 0, poseT = -9, joltT = -9, cleanAt = 0;

  /* éclaboussures : quelques gouttes soumises à la gravité */
  const drops = [];
  function splash(n, x, y, vx, vy, spread) {
    for (let i = 0; i < n; i++) {
      drops.push({
        x, y,
        vx: vx + (Math.random() - .5) * spread,
        vy: vy + (Math.random() - .5) * spread * .8,
        life: .5 + Math.random() * .5,
      });
    }
    if (drops.length > 24) drops.splice(0, drops.length - 24);
  }
  function stepDrops(dt, ground, s) {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.vy += 900 * dt * (s / 6);                      // gravité, à l'échelle du sprite
      d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt;
      if (d.y > ground) { d.y = ground; d.vy = 0; d.vx *= .4; d.life -= dt * 3; }
      if (d.life <= 0) drops.splice(i, 1);
    }
  }
  function drawDrops(cx, s) {
    cx.fillStyle = PAL.C;
    for (const d of drops) cx.fillRect(Math.round(d.x), Math.round(d.y), s, s);
  }

  function wake(hard) {
    const t = state.t;
    const wasAsleep = state.drowsy > .8 || action === 'sleep' || lie > .5;
    if (action === 'sleep') action = null;                // on interrompt la sieste
    idleSince = t;
    nextYawn = Infinity; yawnFrom = 0; yawnUntil = 0;

    if (wasAsleep) {
      // 1) il sursaute et ouvre les yeux, 2) il se redresse, 3) il s'étire en bâillant
      // s'il est vraiment couché, il émerge un instant avant de se redresser ;
      // surpris en pleine chute, il se rattrape tout de suite.
      lieHold = lie > .8 ? t + .5 : 0;
      wideUntil = t + 1.7;
      yawnFrom = t + 1.2; yawnUntil = t + 2.05;
      if (mug.st === 'spill') cleanAt = t + .01;      // le scénario enchaîne (sitwait inclus)
    } else if (hard) {
      wideUntil = t + .5;
    }
  }

  const SPEED = 38;          // en cellules de sprite par seconde

  function layout() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, box.clientWidth); H = Math.max(1, box.clientHeight);
    for (const cv of [roomCv, sprCv]) {
      cv.width = Math.floor(W * DPR); cv.height = Math.floor(H * DPR);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
    }
    renderRoom();
    placed = false;          // repositionne la mascotte à la nouvelle échelle
  }

  /* repères de placement, recalculés à chaque frame (le panneau peut changer) */
  /* Repères de placement, recalculés à chaque frame (le panneau peut changer) */
  function marks() {
    const s = Math.max(2, Math.round((H * .46) / GH));
    return {
      s,
      seatX:  Math.round((COUCH.x + COUCH.w / 2) * W - (GW * s) / 2),
      seatY:  Math.round((COUCH.y + COUCH.h * .64) * H - 31 * s),
      floorY: Math.round(.84 * H - 31 * s),
      offX:   -(GW + 8) * s,                         // hors cadre, à gauche
    };
  }

  /* File d'actions : chaque handler renvoie true quand l'étape est finie. */
  const ACTIONS = {
    walk: (a, dt, m) => {                            // marcher jusqu'à une abscisse
      M.y = m.floorY;
      return walkTo(a.to(m), dt, m.s);
    },
    jump: (a, dt, m) => {                            // sauter sur le canapé
      const p = (state.t - a.t0) / .34;
      state.walking = false;
      if (p < .18) { M.y = m.floorY + m.s * .5; return false; }        // il se ramasse
      const q = Math.min(1, (p - .18) / .82);
      M.x = Math.round(a.x0 + (m.seatX - a.x0) * q);
      M.y = Math.round(m.floorY + (m.seatY - m.floorY) * q - Math.sin(q * Math.PI) * 7 * m.s);
      if (q >= 1) { M.y = m.seatY; landT = state.t; }
      return q >= 1;
    },
    wait: (a, dt, m) => {                            // il patiente (souvent hors cadre)
      M.y = m.floorY;
      state.walking = false;
      return state.t - a.t0 > a.dur;
    },
    sitwait: (a, dt, m) => {                         // il patiente, assis
      M.x = m.seatX; M.y = m.seatY;
      state.walking = false;
      return state.t - a.t0 > a.dur;
    },
    wipe: (a, dt, m) => {                            // essuyer la tache
      M.y = m.floorY;
      state.walking = false;
      const p = (state.t - a.t0) / a.dur;
      state.wipe = Math.max(0, Math.min(1, p));
      mug.clean = state.wipe;
      if (p < 1) return false;
      state.wipe = 0; mug.clean = 0;
      return true;
    },
    shock: (a, dt, m) => {                           // il découvre la tasse : temps d'arrêt + « ! »
      M.x = m.seatX; M.y = m.seatY;
      state.walking = false;
      joltT = a.t0; shockUntil = a.t0 + a.dur;
      return state.t - a.t0 > a.dur;
    },
    carry: (a) => { state.carry = a.what; if (a.what === 'mug') { mug.st = 'hand'; state.level = 1; } return true; },
    drop:  () => { mug.st = 'gone'; return true; },
    face:  (a) => { M.facing = a.dir; return true; },
    hud:   (a) => { setHud(a.txt); return true; },
  };

  let queue = [];
  const play = (...acts) => { queue = acts; };

  /* scénarios */
  const boot = () => [
    { k: 'hud', txt: HUD.walk },
    { k: 'walk', to: m => m.seatX },
    { k: 'jump' },
  ];

  /* Réveil : étirement, chiffon, essuyage, tasse propre, retour au canapé. */
  const cleanup = () => [
    { k: 'sitwait', dur: 2.2 },                      // il se redresse et s'étire
    { k: 'hud', txt: HUD.oops },
    { k: 'shock', dur: .9 },                         // et découvre le carnage
    { k: 'hud', txt: HUD.fetch },
    { k: 'walk', to: m => m.offX },                  // il sort chercher de quoi nettoyer
    { k: 'wait', dur: .9 },
    { k: 'carry', what: 'rag' },
    { k: 'hud', txt: HUD.back },
    { k: 'walk', to: () => mug.x - 43 * marks().s },
    { k: 'face', dir: 1 },
    { k: 'hud', txt: HUD.clean },
    { k: 'wipe', dur: 2.4 },
    { k: 'drop' },                                   // il embarque la tasse sale
    { k: 'hud', txt: HUD.refill },
    { k: 'walk', to: m => m.offX },
    { k: 'wait', dur: 1.1 },
    { k: 'carry', what: 'mug' },                     // tasse propre et pleine
    { k: 'hud', txt: HUD.walk },
    { k: 'walk', to: m => m.seatX },
    { k: 'jump' },
  ];

  function step(dt, m) {
    if (!placed) {                                   // premier placement / resize
      placed = true;
      if (queue.length && queue[0].k !== 'sitwait') { M.x = m.offX; M.y = m.floorY; M.facing = 1; }
      else { M.x = m.seatX; M.y = m.seatY; }
    }

    if (state.sleep) { state.walking = false; return; }        // il dort : rien ne bouge

    if (!queue.length) {                             // au repos : assis sur le canapé
      M.x = m.seatX; M.y = m.seatY; M.facing = 1;
      state.walking = false;
      if (cleanAt && state.t > cleanAt && mug.st === 'spill') { cleanAt = 0; play(...cleanup()); }
      return;
    }

    const a = queue[0];
    if (a.t0 === undefined) { a.t0 = state.t; a.x0 = M.x; }
    if (ACTIONS[a.k](a, dt, m)) {
      queue.shift();
      if (!queue.length) { M.sitT = state.t; idleSince = state.t; setHud(HUD.sit); }
    }
  }

  /* déplacement horizontal ; renvoie true à l'arrivée */
  function walkTo(tx, dt, s) {
    const v = SPEED * s * dt;
    const d = tx - M.x;
    if (Math.abs(d) <= v) { M.x = tx; state.walking = false; return true; }
    M.facing = d > 0 ? 1 : -1;
    M.x += Math.sign(d) * v;
    M.step += dt;
    state.walking = true;
    return false;
  }

  /* boucle de rendu */
  function frame(now) {
    const t = now / 1000;
    const dt = Math.min(.05, last ? t - last : 0);
    last = t; state.t = t;

    /* niveau d'assoupissement : 0 éveillé → 1 endormi (uniquement assis) */
    const idle = t - idleSince;
    const seated = !queue.length && !action;          // assis, rien en cours
    const d = seated ? Math.max(0, Math.min(1, (idle - DROWSY_AT) / (SLEEP_AT - DROWSY_AT))) : 0;
    state.drowsy = d;

    // bâillements pendant la phase de somnolence
    if (seated && d > 0 && d < 1) {
      if (nextYawn === Infinity) nextYawn = t + 1.5;
      if (t > nextYawn) { yawnFrom = t; yawnUntil = t + .8; nextYawn = t + 6 + Math.random() * 5; }
    }
    state.yawn = t > yawnFrom && t < yawnUntil;

    // clignement : de plus en plus lent et appuyé à mesure qu'il fatigue
    if (t > nextBlink) {
      state.blink = true;
      if (t > nextBlink + .13 + d * .5) {
        state.blink = false;
        nextBlink = t + (2.5 + Math.random() * 4) * (1 - d * .55);
      }
    }
    state.wide = t < wideUntil;
    // action ponctuelle (sip / wave / sleep)
    if (action && t > actionUntil) { action = null; idleSince = t; setHud(HUD.sit); }
    /* Gorgée : lever, boire, reposer ; le niveau de café baisse. */
    if (action === 'sip') {
      const p = (t - actionT0) / (actionUntil - actionT0);
      state.sipP = p < .25 ? p / .25 : p < .75 ? 1 : Math.max(0, (1 - p) / .25);
      state.drink = p >= .3 && p < .72;
      state.smile = p >= .78;
      if (state.drink) state.level = Math.max(.12, sipLevel0 - (p - .3) / .42 * .22);
    } else {
      state.sipP = 0; state.drink = false;
      state.smile = state.smile && t < actionUntil + .5;
    }
    state.sip = action === 'sip';
    state.wave = action === 'wave';
    state.sleep = action === 'sleep' || (seated && d >= 1);
    // paupière : fermée si sommeil/clignement, sinon à moitié selon la fatigue
    state.lid = state.sleep ? 1 : state.blink ? 1 : state.drink ? .45 : Math.min(.8, d * .75);
    if (state.wide) state.lid = 0;

    // le HUD raconte ce qui se passe
    if (!action && (seated || state.sleep)) {
      const label = state.sleep ? HUD.asleep : d > .35 ? HUD.drowsy : HUD.sit;
      if (hudTxt !== label) setHud(label);
    }

    const m = marks(); const s = m.s;
    step(dt, m);

    /* lie : 0 assis → 1 couché, accéléré puis amorti. */
    const target = (state.sleep || t < lieHold) ? 1 : 0;
    const rate = target > lie ? 1 / .95 : 1 / .75;        // il tombe plus lentement qu'il se relève
    lie = Math.max(0, Math.min(1, lie + Math.sign(target - lie) * dt * rate));
    const e = lie < .88 ? Math.pow(lie / .88, 1.75) * .94        // accélération
                        : .94 + ((lie - .88) / .12) * .06;       // amorti final
    if (lie >= 1 && lastLie < 1) landT = t;              // instant de l'atterrissage
    lastLie = lie;
    const sinceLand = t - landT;
    const settle = (lie >= 1 && sinceLand < .35)          // amorti dans le coussin
      ? Math.round(Math.sin(sinceLand / .35 * Math.PI) * 1.5) * s * .5 : 0;

    /* Un tour et quart : elle retombe pile sur le flanc, sans saut visuel. */
    const seatLine0 = Math.round(M.y) + 31 * s;
    const groundY = Math.round((COUCH.y + COUCH.h) * H) - 8 * s;     // devant le canapé
    const FALL = .62, BOUNCE = .2;

    if (mug.st === 'hand' && lie > .04) {                 // elle lui échappe des pattes
      mug.st = 'fall'; mug.t0 = t;
      mug.x0 = Math.round(M.x) + 34 * s; mug.y0 = seatLine0 - 11 * s;
      mug.x = mug.x0; mug.y = mug.y0; mug.fade = 1;
      splash(5, mug.x0 + 4 * s, mug.y0, -12 * s, -26 * s, 30 * s);   // premières éclaboussures
    }
    if (mug.st === 'fall') {
      const p = Math.min(1, (t - mug.t0) / FALL);
      const landX = mug.x0 + 12 * s;
      mug.x = mug.x0 + (landX - mug.x0) * p;
      // petit sursaut vers le haut au départ, puis chute qui accélère
      mug.y = mug.y0 + (groundY - mug.y0) * p * p - Math.sin(p * Math.PI) * 4 * s;
      mug.rot = -(Math.PI * 2.5) * (1 - Math.pow(1 - p, 1.7));
      if (Math.random() < .35) splash(1, mug.x + 4 * s, mug.y + 4 * s, -6 * s, -4 * s, 14 * s);
      if (p >= 1) {                                       // impact
        mug.st = 'bounce'; mug.t0 = t;
        splash(11, mug.x + 3 * s, groundY + 6 * s, -20 * s, -30 * s, 80 * s);
      }
    }
    if (mug.st === 'bounce') {                            // elle rebondit une fois, à plat
      const p = Math.min(1, (t - mug.t0) / BOUNCE);
      mug.y = groundY - Math.sin(p * Math.PI) * 2.5 * s;
      mug.x += 3 * s * dt;
      if (p >= 1) { mug.y = groundY; mug.st = 'spill'; mug.spillT = t; }
    }
    stepDrops(dt, groundY + 7 * s, s);
    state.nomug = mug.st !== 'hand' || state.carry !== 'mug';

    // respiration (assis) / rebond de marche
    const breathe = 1.6 - state.drowsy * 1.1;            // le souffle ralentit
    const bob = reduce ? 0
      : state.walking ? (Math.floor(M.step * 9) % 2) * -s
      : Math.round(Math.sin(t * breathe) * .5 + .5) * s * .5 + Math.round(state.drowsy * 2) * s * .5;

    const sil = state.walking ? SIL_WALK[Math.floor(M.step * 6) % 2] : SIL_SIT;

    sprCx.setTransform(DPR, 0, 0, DPR, 0, 0);
    sprCx.clearRect(0, 0, W, H);
    sprCx.imageSmoothingEnabled = false;

    // hors cadre : rien à peindre (les allers-retours en coulisses sont gratuits)
    const visible = onScreen && M.x + GW * s > 0 && M.x < W;

    const ox = Math.round(M.x), oy = Math.round(M.y + bob);
    /* tasse : en vol, ou renversée par terre ; zzz au-dessus de sa tête */
    if (!onScreen) { requestAnimationFrame(frame); return; }
    if (mug.st === 'fall') {
      sprCx.save();
      sprCx.translate(mug.x + 4 * s, mug.y + 4 * s);
      sprCx.rotate(mug.rot);                              // elle tourne en tombant
      drawMug(sprCx, -4 * s, -4 * s, s);
      sprCx.restore();
    } else if (mug.st === 'bounce') {
      drawSpill(sprCx, mug.x, mug.y, s, 0, 1);            // déjà sur le flanc, pas de flaque
    } else if (mug.st === 'spill' && mug.clean < 1) {
      drawSpill(sprCx, mug.x, mug.y, s, Math.min(1, (t - mug.spillT) / .9) * (1 - mug.clean), Math.max(0, mug.fade));
    }
    /* Trois poses dessinées, pas de rotation : assis → affaissé → couché. */
    const jiggle = Math.round(Math.sin(Math.min(1, (t - poseT) / .12) * Math.PI) * 1.4) * s * .5;
    const pose = e < .34 ? 0 : e < .66 ? 1 : 2;
    if (pose !== lastPose) { lastPose = pose; poseT = t; }

    const jolt = t - joltT < .3 ? -Math.round(Math.sin((t - joltT) / .3 * Math.PI) * 3) * s * .5 : 0;
    if (!visible) { requestAnimationFrame(frame); return; }
    sprCx.save();
    sprCx.translate(ox, oy + settle + jolt + (pose ? jiggle : 0));
    if (pose === 0) {
      if (e <= .02 && M.facing < 0) { sprCx.translate(GW * s, 0); sprCx.scale(-1, 1); }
      drawMascot(sprCx, 0, 0, s, state, sil);
      if (!state.nomug) drawSteam(sprCx, 0, 0, s, state);
    } else if (pose === 1) {
      drawSlump(sprCx, 0, 0, s, state);
    } else {
      drawLying(sprCx, 0, 0, s, state);
    }
    sprCx.restore();

    drawDrops(sprCx, s);
    if (state.sleep && pose === 2) drawZzz(sprCx, ox + 6 * s, oy + 4 * s, s, t);
    if (t - joltT < .55) drawBang(sprCx, ox + (pose === 2 ? 8 : 20) * s, oy + (pose === 2 ? -6 : -10) * s, s, 1 - (t - joltT) / .55);

    requestAnimationFrame(frame);
  }

  /* HUD */
  const HUD = {
    sit:    'idle — sipping coffee',
    drowsy: 'getting sleepy…',
    asleep: 'asleep — zzz',
    walk:   'walking home…',
    clean:  'wiping up the coffee…',
    oops:   'oh no. the coffee.',
    fetch:  'gone to get a rag…',
    back:   'back with a rag',
    refill: 'gone for a fresh cup…',
    sip:  'sipping…  ☕',
    wave: 'waving at you 👋',
    sleep:'afk — sleeping',
  };
  let hudTxt = '';
  function setHud(txt) {
    hudTxt = txt;
    const el = document.getElementById('hud-txt');
    if (el) el.textContent = txt;
  }

  /* fait défiler le terminal jusqu'à la scène pour qu'on voie l'animation */
  function reveal() {
    const r = box.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      box.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  /* API publique, appelée par le terminal */
  window.mascot = {
    act(kind) {
      const dur = { sip: 2.4, wave: 1.8, sleep: 6.5 }[kind] || 1.5;
      if (kind !== 'sleep') wake(true);
      if (kind === 'sip') sipLevel0 = state.level;
      action = kind; actionT0 = state.t; actionUntil = state.t + dur;
      setHud(HUD[kind] || '…');
      reveal();
    },
  };

  for (const evt of ['keydown', 'pointerdown']) {
    window.addEventListener(evt, () => wake(false), { passive: true });
  }

  /* Panneau hors écran : l'animation avance, mais on ne peint plus. */
  let onScreen = true;
  if (window.IntersectionObserver) {
    new IntersectionObserver(es => { onScreen = es[0].isIntersecting; },
                             { rootMargin: '80px' }).observe(box);
  }

  const relayout = () => { clearTimeout(relayout._t); relayout._t = setTimeout(layout, 100); };
  window.addEventListener('resize', relayout);
  if (window.ResizeObserver) new ResizeObserver(relayout).observe(box);
  layout();
  play(...boot());
  requestAnimationFrame(frame);
})();
