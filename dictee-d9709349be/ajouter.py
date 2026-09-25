#!/usr/bin/env python3
"""Petit outil local pour ajouter une dictée d'entraînement (sans dépendance).

    python3 ajouter.py              # http://127.0.0.1:8001
    python3 ajouter.py --port 8002
    python3 ajouter.py --essai      # à blanc : n'écrit rien, ne génère rien, ne pousse rien

On colle le texte (ou on charge un .txt, .md, .docx), on ajoute un sous-titre si
on veut, et « Ajouter la dictée » : écrit textes/entrainement-N.txt, lance
generer.py (avec le même Python, qui doit avoir edge-tts et lameenc), puis
git add de ce dossier seulement, commit et push sur main.
Le plus simple : double-cliquer sur ajouter.command.
"""
import argparse
import io
import json
import re
import subprocess
import sys
import threading
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote
from xml.etree import ElementTree

ICI = Path(__file__).resolve().parent
DEPOT = ICI.parent
TEXTES = ICI / 'textes'
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
SIGNATURE = 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
VERROU = threading.Lock()
ESSAI = False


def normaliser(texte):
    texte = texte.replace('\r\n', '\n').replace('\r', '\n').strip()
    return re.sub(r'\n{3,}', '\n\n', texte)


def lire_docx(donnees):
    """Texte des paragraphes de word/document.xml, séparés par une ligne vide."""
    try:
        with zipfile.ZipFile(io.BytesIO(donnees)) as z:
            racine = ElementTree.fromstring(z.read('word/document.xml'))
    except (zipfile.BadZipFile, KeyError, ElementTree.ParseError):
        raise ValueError("Ce fichier .docx n'est pas lisible.")
    paras = []
    for p in racine.iter(W + 'p'):
        morceaux = []
        for el in p.iter():
            if el.tag == W + 't':
                morceaux.append(el.text or '')
            elif el.tag == W + 'tab':
                morceaux.append('\t')
            elif el.tag in (W + 'br', W + 'cr'):
                morceaux.append('\n')
        ligne = ''.join(morceaux).strip()
        if ligne:
            paras.append(ligne)
    return '\n\n'.join(paras)


def lire_fichier(nom, donnees):
    if nom.lower().endswith('.docx'):
        return lire_docx(donnees)
    for codage in ('utf-8-sig', 'cp1252'):
        try:
            return donnees.decode(codage)
        except UnicodeDecodeError:
            pass
    return donnees.decode('latin-1')


def entrainements():
    return sorted(TEXTES.glob('entrainement-*.txt'))


def liste_dictees():
    """Titres dans l'ordre du site : entrainement-4, autres entraînements, annales."""
    def cle(f):
        return (f.stem != 'entrainement-4', not f.stem.startswith('entrainement'), f.stem)
    out = []
    for f in sorted(TEXTES.glob('*.txt'), key=cle):
        titre = f.read_text(encoding='utf-8').split('\n', 1)[0].strip()
        out.append({'id': f.stem, 'titre': titre})
    return out


def prochaine():
    nums = [int(m.group(1)) for f in entrainements()
            if (m := re.fullmatch(r'entrainement-(\d+)', f.stem))]
    return f'entrainement-{max(nums, default=0) + 1}', len(entrainements()) + 1


def lancer(cmd, cwd, etapes):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    sortie = (r.stdout + r.stderr).strip()
    etapes.append({'cmd': ' '.join(cmd[:4]), 'ok': r.returncode == 0, 'sortie': sortie[-1500:]})
    if r.returncode:
        raise RuntimeError(f'Échec de « {" ".join(cmd[:4])} » :\n{sortie[-1500:]}')


def ajouter(texte, sous_titre):
    texte = normaliser(texte)
    sous_titre = ' '.join(sous_titre.split())
    if len(texte) < 20:
        raise ValueError('Le texte est vide ou trop court.')
    ident, k = prochaine()
    titre = f'Dictée {k}' + (f' {sous_titre}' if sous_titre else '')
    chemin = TEXTES / f'{ident}.txt'
    rapport = {'id': ident, 'titre': titre, 'chemin': str(chemin.relative_to(DEPOT)),
               'caracteres': len(texte), 'essai': ESSAI, 'etapes': []}
    if ESSAI:
        rapport['etapes'] = [{'cmd': c, 'ok': True, 'sortie': '(à blanc : non exécuté)'} for c in
                             (f'écrire {rapport["chemin"]}', 'generer.py',
                              f'git add {ICI.name}', f'git commit -m "Add dictation {titre}"',
                              'git push origin main')]
        return rapport
    if chemin.exists():
        raise ValueError(f'{chemin.name} existe déjà.')
    chemin.write_text(f'{titre}\n{texte}\n', encoding='utf-8')
    etapes = rapport['etapes']
    etapes.append({'cmd': f'écrire {rapport["chemin"]}', 'ok': True, 'sortie': ''})
    try:
        lancer([sys.executable, 'generer.py'], ICI, etapes)
    except Exception:
        chemin.unlink(missing_ok=True)   # pas d'audio : on retire le texte, rien n'est commité
        raise
    lancer(['git', 'add', '--', ICI.name], DEPOT, etapes)
    lancer(['git', 'commit', '-m', f'Add dictation {titre}\n\n{SIGNATURE}', '--', ICI.name], DEPOT, etapes)
    lancer(['git', 'push', 'origin', 'main'], DEPOT, etapes)
    return rapport


class Gestion(BaseHTTPRequestHandler):
    def repondre(self, code, corps, type_='application/json; charset=utf-8'):
        if not isinstance(corps, bytes):
            corps = json.dumps(corps, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', type_)
        self.send_header('Content-Length', str(len(corps)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(corps)

    def do_GET(self):
        if self.path == '/':
            self.repondre(200, PAGE.replace('{ESSAI}', 'true' if ESSAI else 'false').encode(),
                          'text/html; charset=utf-8')
        elif self.path == '/dictees':
            self.repondre(200, liste_dictees())
        else:
            self.repondre(404, {'erreur': 'introuvable'})

    def do_POST(self):
        donnees = self.rfile.read(int(self.headers.get('Content-Length') or 0))
        try:
            if self.path.startswith('/lire'):
                nom = unquote(self.headers.get('X-Nom-Fichier', ''))
                self.repondre(200, {'texte': normaliser(lire_fichier(nom, donnees))})
            elif self.path == '/ajouter':
                req = json.loads(donnees or b'{}')
                if not VERROU.acquire(blocking=False):
                    return self.repondre(409, {'erreur': 'Un ajout est déjà en cours.'})
                try:
                    self.repondre(200, ajouter(req.get('texte', ''), req.get('sous_titre', '')))
                finally:
                    VERROU.release()
            else:
                self.repondre(404, {'erreur': 'introuvable'})
        except Exception as e:
            self.repondre(400, {'erreur': str(e) or e.__class__.__name__})

    def log_message(self, fmt, *args):
        sys.stderr.write('  ' + fmt % args + '\n')


PAGE = r'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ajouter une dictée</title>
<style>
:root{--fond:#f6f6f3;--carte:#fff;--bord:#e2e2dc;--texte:#1d1d1b;--doux:#6b6b66;--accent:#2f5bd3;--ok:#2e7d4f;--err:#c0392b}
@media (prefers-color-scheme:dark){:root{--fond:#161615;--carte:#1f1f1d;--bord:#34342f;--texte:#ecece8;--doux:#9a9a93;--accent:#7a9bff;--ok:#6cc596;--err:#ff7a6b}}
*{box-sizing:border-box}
body{margin:0;background:var(--fond);color:var(--texte);font:16px/1.5 system-ui,-apple-system,sans-serif}
main{max-width:820px;margin:0 auto;padding:32px 16px 64px}
h1{font-size:1.5rem;margin:0 0 4px}h2{font-size:1.05rem;margin:0 0 12px}
.sous{color:var(--doux);margin:0 0 24px}
.carte{background:var(--carte);border:1px solid var(--bord);border-radius:14px;padding:20px;margin-bottom:20px}
label{display:block;font-weight:600;margin:0 0 6px}
input[type=text],textarea{width:100%;font:inherit;color:inherit;background:var(--fond);border:1px solid var(--bord);border-radius:10px;padding:10px 12px}
textarea{min-height:340px;resize:vertical;line-height:1.6}
input:focus,textarea:focus{outline:2px solid var(--accent);outline-offset:-1px}
.ligne{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:14px 0}
.aide{color:var(--doux);font-size:.9rem}
button{font:inherit;font-weight:600;background:var(--accent);color:#fff;border:0;border-radius:10px;padding:11px 20px;cursor:pointer}
button:disabled{opacity:.55;cursor:wait}
#apercu{font-weight:600}
#etat{white-space:pre-wrap;margin-top:14px}
#etat.err{color:var(--err)}#etat.ok{color:var(--ok)}
.roue{display:inline-block;width:14px;height:14px;border:2px solid var(--bord);border-top-color:var(--accent);border-radius:50%;animation:t .8s linear infinite;vertical-align:-2px;margin-right:8px}
@keyframes t{to{transform:rotate(360deg)}}
ol{margin:0;padding-left:22px}li{margin:3px 0}li .id{color:var(--doux);font-size:.85rem;margin-left:6px}
li.neuf{color:var(--accent);font-weight:600}
.essai{background:#f5c542;color:#1d1d1b;border-radius:8px;padding:2px 8px;font-size:.8rem;font-weight:700;margin-left:8px;vertical-align:3px}
</style></head><body><main>
<h1>Ajouter une dictée<span class="essai" id="badge" hidden>À BLANC</span></h1>
<p class="sous">Collez le texte ou chargez un fichier, relisez, puis ajoutez : l’audio est généré et le site mis à jour.</p>
<section class="carte">
  <label for="st">Sous-titre (facultatif)</label>
  <input type="text" id="st" placeholder="ex. La mémoire">
  <p class="aide">Titre : <span id="apercu">…</span></p>
  <div class="ligne">
    <label for="fic" style="margin:0">Fichier</label>
    <input type="file" id="fic" accept=".txt,.md,.docx,text/plain,text/markdown">
    <span class="aide">.txt, .md ou .docx — remplit le texte ci-dessous</span>
  </div>
  <label for="tx">Texte</label>
  <textarea id="tx" placeholder="Collez ici le texte de la dictée. Laissez une ligne vide entre les paragraphes."></textarea>
  <p class="aide" id="compte">0 caractère</p>
  <div class="ligne"><button id="go">Ajouter la dictée</button></div>
  <div id="etat"></div>
</section>
<section class="carte"><h2>Dictées existantes</h2><ol id="liste"></ol></section>
</main><script>
const ESSAI={ESSAI}, $=id=>document.getElementById(id);
let nbEntr=0, nouveau=null;
if(ESSAI) $('badge').hidden=false;
function apercu(){const s=$('st').value.trim().replace(/\s+/g,' ');$('apercu').textContent='Dictée '+(nbEntr+1)+(s?' '+s:'')}
function compte(){const n=$('tx').value.trim().length;$('compte').textContent=n+' caractère'+(n>1?'s':'')}
function etat(t,c,roue){const e=$('etat');e.className=c||'';e.textContent=t;if(roue)e.insertAdjacentHTML('afterbegin','<span class="roue"></span>')}
async function liste(){
  const d=await (await fetch('/dictees')).json();
  nbEntr=d.filter(x=>x.id.startsWith('entrainement')).length;
  $('liste').innerHTML='';
  for(const x of d){const li=document.createElement('li');li.textContent=x.titre;
    const s=document.createElement('span');s.className='id';s.textContent=x.id;li.append(s);
    if(x.id===nouveau)li.className='neuf';$('liste').append(li)}
  apercu();
}
$('st').oninput=apercu; $('tx').oninput=compte;
$('fic').onchange=async()=>{
  const f=$('fic').files[0]; if(!f) return;
  etat('Lecture de '+f.name+'…','',true);
  try{const r=await fetch('/lire',{method:'POST',headers:{'X-Nom-Fichier':encodeURIComponent(f.name)},body:await f.arrayBuffer()});
    const j=await r.json(); if(!r.ok) throw new Error(j.erreur);
    $('tx').value=j.texte; compte(); etat(f.name+' chargé : relisez le texte avant d’ajouter.','ok');
  }catch(e){etat('Impossible de lire le fichier : '+e.message,'err')}
};
$('go').onclick=async()=>{
  const texte=$('tx').value.trim();
  if(texte.length<20){etat('Le texte est vide ou trop court.','err');return}
  if(!confirm('Ajouter « '+$('apercu').textContent+' » et publier sur le site ?'))return;
  $('go').disabled=true; const t0=Date.now();
  const minuteur=setInterval(()=>etat('Génération de l’audio et publication… '+Math.round((Date.now()-t0)/1000)+' s (environ 20 à 40 s)','',true),1000);
  etat('Génération de l’audio et publication…','',true);
  try{const r=await fetch('/ajouter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({texte,sous_titre:$('st').value})});
    const j=await r.json(); clearInterval(minuteur); if(!r.ok) throw new Error(j.erreur);
    const lignes=j.etapes.map(e=>(e.ok?'✓ ':'✗ ')+e.cmd).join('\n');
    etat((j.essai?'À blanc — rien n’a été écrit ni publié.\n':'Ajoutée et publiée ! Le site se met à jour d’ici une minute ou deux.\n')
      +'« '+j.titre+' » → '+j.chemin+' ('+j.caracteres+' caractères)\n'+lignes,'ok');
    if(!j.essai){nouveau=j.id;$('tx').value='';$('st').value='';$('fic').value='';compte()}
    await liste();
  }catch(e){clearInterval(minuteur);etat('Erreur : '+e.message,'err')}
  finally{$('go').disabled=false}
};
liste(); compte();
</script></body></html>'''


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--port', type=int, default=8001)
    ap.add_argument('--essai', action='store_true', help="à blanc : n'écrit, ne génère et ne pousse rien")
    args = ap.parse_args()
    ESSAI = args.essai
    serveur = ThreadingHTTPServer(('127.0.0.1', args.port), Gestion)
    print(f'Ajout de dictées : http://127.0.0.1:{args.port}' + ('  (à blanc)' if ESSAI else ''))
    print('Ctrl+C pour arrêter.')
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        pass
