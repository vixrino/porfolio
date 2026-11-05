#!/usr/bin/env node
/* Injecte data.js dans index.html en HTML statique : `node build.js` après chaque édition. */
'use strict';
const fs = require('fs');
const path = require('path');

const SITE = require('./data.js');
const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');

const blocks = {
  about:       SITE.aboutHTML(),
  'proj-grid': SITE.projectsHTML(),
  experience:  SITE.experienceHTML(),
  education:   SITE.educationHTML(),
  stack:       SITE.stackHTML(),
  links:       SITE.linksHTML(),
};

let n = 0;
for (const [id, content] of Object.entries(blocks)) {
  // du <div id=x ...> jusqu'au commentaire de fin correspondant
  const re = new RegExp(`(<div [^>]*id="${id}"[^>]*>)[\\s\\S]*?(<!-- /${id} -->)`);
  if (!re.test(html)) { console.error(`✗ marqueur introuvable pour #${id}`); process.exit(1); }
  html = html.replace(re, `$1${content}$2`);
  n++;
}

// cache-busting : ?v=<empreinte du fichier> pour que le navigateur recharge CSS/JS à chaque mise à jour
const crypto = require('crypto');
for (const f of ['styles.css', 'data.js', 'scene.js', 'script.js']) {
  const v = crypto.createHash('sha1').update(fs.readFileSync(path.join(__dirname, f))).digest('hex').slice(0, 8);
  html = html.replace(new RegExp(`(["'])${f.replace('.', '\\.')}(\\?v=[0-9a-f]+)?\\1`), `$1${f}?v=${v}$1`);
}

fs.writeFileSync(file, html);
console.log(`✓ index.html : ${n} blocs régénérés depuis data.js`);
