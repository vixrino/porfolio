/* script.js — terminal interactif ; le contenu vit dans data.js */
(() => {
  'use strict';

  const { PROJECTS, T, P,
          projectsHTML, stackHTML, linksHTML, aboutHTML, helpHTML, resumeHTML } = window.SITE;

  const $ = s => document.querySelector(s);
  const out = $('#out'), live = $('#live'), input = $('#cin');
  let hist = [], hi = -1;

  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function emit(cmd, html) {
    const b = document.createElement('div');
    b.className = 'block';
    b.innerHTML = `<div class="cmd"><span class="ps">[lucas ~]</span><span class="op">::</span>${esc(cmd)}</div>` +
                  (html ? `<div class="res">${html}</div>` : '');
    live.appendChild(b);
    out.scrollTop = out.scrollHeight;
  }

  const CMDS = {
    help:     () => helpHTML(),
    about:    () => aboutHTML(),
    projects: () => `<div class="grid">${projectsHTML()}</div>`,
    skills:   () => stackHTML(),
    contact:  () => `<div class="links">${linksHTML()}</div>`,
    resume:   () => resumeHTML(),
    coffee: () => { window.mascot?.act('sip');   return P(`<span class="ok">${T.sip}</span> ☕`); },
    wave:   () => { window.mascot?.act('wave');  return P(`<span class="ok">👋</span> ${T.hi}`); },
    sleep:  () => { window.mascot?.act('sleep'); return P(`<span class="ok">zzz…</span> ${T.nap}`); },
    ls:     () => PROJECTS.map(p => p.n).join('  ') + '  about.md  stack.txt  links.md',
    whoami: () => 'lucas',
    date:   () => new Date().toString(),
    sudo:   () => `<span class="err">lucas is not in the sudoers file. This incident has been reported.</span>`,
    clear:  () => null,
  };
  CMDS.exit = CMDS.clear; CMDS.ll = CMDS.ls;

  function run(raw) {
    const cmd = raw.trim();
    if (!cmd) { emit(''); return; }
    hist.unshift(cmd); hi = -1;

    const [name, ...args] = cmd.split(/\s+/);
    const key = name.toLowerCase();

    if (key === 'clear' || key === 'exit') { live.innerHTML = ''; return; }

    if (key === 'cat') {
      const f = (args[0] || '').replace(/\.(md|txt)$/, '');
      const map = { about: 'about', stack: 'skills', skills: 'skills', links: 'contact' };
      return emit(cmd, map[f] ? CMDS[map[f]]()
        : `<span class="err">cat: ${esc(args[0] || '')}: No such file or directory</span>`);
    }
    if (key === 'echo') return emit(cmd, P(esc(args.join(' '))));

    if (CMDS[key]) return emit(cmd, CMDS[key]());
    emit(cmd, `<span class="err">${esc(T.notfound(name))}</span> — ${T.hintHelp}`);
  }

  /* saisie */
  const setCaretEnd = () => { const n = input.value.length; requestAnimationFrame(() => input.setSelectionRange(n, n)); };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = input.value; input.value = ''; hi = -1; run(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hist.length) { hi = Math.min(hi + 1, hist.length - 1); input.value = hist[hi]; setCaretEnd(); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      hi = Math.max(hi - 1, -1); input.value = hi < 0 ? '' : hist[hi]; setCaretEnd();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const q = input.value.trim();
      const m = q ? Object.keys(CMDS).filter(c => c.startsWith(q)) : [];
      if (m.length === 1) { input.value = m[0]; setCaretEnd(); }
      else if (m.length > 1) emit(input.value, m.join('  '));
    } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault(); live.innerHTML = '';
    } else if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault(); input.value = '';
    }
  });

  const focus = () => input.focus({ preventScroll: true });
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-run]');
    if (t) { const c = t.dataset.run; if (c === 'clear') live.innerHTML = ''; else run(c); focus(); return; }
    if (e.target.closest('a')) return;
    if (String(window.getSelection() || '').length) return;   // l'utilisateur sélectionne du texte
    focus();
  });

  /* Contenu déjà statique dans index.html : on ne remplit que les blocs vides. */
  const fill = (sel, html) => { const el = $(sel); if (el && !el.children.length) el.innerHTML = html; };
  fill('#about', aboutHTML());
  fill('#proj-grid', projectsHTML());
  fill('#stack', stackHTML());
  fill('#links', linksHTML());

  focus();
  setTimeout(() => window.mascot?.act('sip'), 4600);   // après qu'il se soit installé
})();
