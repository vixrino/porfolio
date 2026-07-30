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

fs.writeFileSync(file, html);
console.log(`✓ index.html : ${n} blocs régénérés depuis data.js`);
