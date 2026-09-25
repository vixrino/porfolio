#!/usr/bin/env python3
"""Ajoute une dictée d'entraînement : écrit textes/entrainement-N.txt, génère l'audio
(generer.py), puis commit + push du dossier des dictées.

Lancé par le workflow GitHub .github/workflows/dictee.yml quand on clique sur
« Ajouter un texte » dans la page (page → Worker Cloudflare → repository_dispatch).
À la main :  python3 ajouter.py fichier.txt ["Titre facultatif"]
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ICI = Path(__file__).resolve().parent
DEPOT = ICI.parent
TEXTES = ICI / 'textes'
SIGNATURE = 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'


def normaliser(texte):
    texte = texte.replace('\r\n', '\n').replace('\r', '\n').strip()
    return re.sub(r'\n{3,}', '\n\n', texte)


def prochaine():
    """(id du fichier, numéro affiché) : entrainement-<max+1>, « Dictée <nb+1> »."""
    fichiers = list(TEXTES.glob('entrainement-*.txt'))
    nums = [int(m.group(1)) for f in fichiers if (m := re.fullmatch(r'entrainement-(\d+)', f.stem))]
    return f'entrainement-{max(nums, default=0) + 1}', len(fichiers) + 1


def lancer(cmd, cwd):
    print('$', ' '.join(cmd), flush=True)
    subprocess.run(cmd, cwd=cwd, check=True)


def ajouter(texte, titre='', essai=False):
    texte, titre = normaliser(texte), ' '.join(titre.split())
    if len(texte) < 20:
        raise SystemExit('Le texte est vide ou trop court.')
    ident, k = prochaine()
    titre = f'Dictée {k}' + (f' {titre}' if titre else '')
    chemin = TEXTES / f'{ident}.txt'
    chemin.write_text(f'{titre}\n{texte}\n', encoding='utf-8')
    try:
        lancer([sys.executable, 'generer.py'], ICI)
    except subprocess.CalledProcessError:
        chemin.unlink(missing_ok=True)   # pas d'audio : on retire le texte, rien n'est commité
        raise
    if essai:                            # vérifie seulement que la génération marche
        print(f'✓ essai : {titre} ({ident}) généré, rien publié')
        return
    lancer(['git', 'add', '--', ICI.name], DEPOT)
    lancer(['git', 'commit', '-m', f'Add dictation {titre}\n\n{SIGNATURE}', '--', ICI.name], DEPOT)
    lancer(['git', 'push', 'origin', 'HEAD:main'], DEPOT)
    print(f'✓ {titre} ({ident})')


if __name__ == '__main__':
    if len(sys.argv) > 1:
        ajouter(Path(sys.argv[1]).read_text(encoding='utf-8'), ' '.join(sys.argv[2:]))
    else:                                # dans GitHub Actions : le texte vient de l'événement
        p = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())['client_payload']
        ajouter(str(p.get('texte', '')), str(p.get('titre', ''))[:120], essai=p.get('essai') is True)
