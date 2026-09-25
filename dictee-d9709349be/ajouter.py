#!/usr/bin/env python3
"""Ajoute une dictée d'entraînement : écrit textes/entrainement-<horodatage>.txt, génère
l'audio (generer.py), puis commit + push du dossier des dictées.

Lancé par le workflow GitHub .github/workflows/dictee.yml quand on clique sur
« Ajouter un texte » dans la page (page → Worker Cloudflare → repository_dispatch).
À la main :  python3 ajouter.py fichier.txt ["Titre facultatif"]

Le fichier ne contient que le sous-titre : « Dictée N » est calculé par generer.py
d'après la position dans la liste (pas de doublon ni de trou après une suppression).
"""
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

ICI = Path(__file__).resolve().parent
DEPOT = ICI.parent
TEXTES = ICI / 'textes'
SIGNATURE = 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'


def propre(s):
    # un emoji coupé en deux par le navigateur laisse un demi-caractère : on le retire
    return s.encode('utf-8', 'ignore').decode()


def normaliser(texte):
    texte = propre(texte).replace('\r\n', '\n').replace('\r', '\n').strip()
    return re.sub(r'\n{3,}', '\n\n', texte)


def sous_titre(titre):
    titre = ' '.join(propre(titre).split())[:120]
    # « Dictée 9 … » tapé à la main : le numéro est calculé ailleurs (mais « Dictées de … » reste intact)
    titre = re.sub(r'^dict[ée]e(?:\s*\d+)?(?:\s*[:·—-])?(?=\s|$)\s*', '', titre, flags=re.I)
    return titre[:1].upper() + titre[1:]


def lancer(cmd, cwd):
    print('$', ' '.join(cmd), flush=True)
    subprocess.run(cmd, cwd=cwd, check=True)


def ecrire(texte, titre):
    """Écrit le texte et génère l'audio ; renvoie le chemin du .txt."""
    # horodatage : un id jamais réutilisé, même après une suppression (les « déjà faite » y sont liés)
    chemin = TEXTES / f'entrainement-{int(time.time())}.txt'
    while chemin.exists():
        time.sleep(1)
        chemin = TEXTES / f'entrainement-{int(time.time())}.txt'
    chemin.write_text(f'{titre}\n{texte}\n', encoding='utf-8')
    try:
        lancer([sys.executable, 'generer.py'], ICI)
    except BaseException:
        chemin.unlink(missing_ok=True)   # pas d'audio : on retire le texte, rien n'est commité
        raise
    return chemin


def ajouter(texte, titre='', essai=False):
    texte, titre = normaliser(texte), sous_titre(titre)
    if len(texte) < 20 or not re.search(r'[^\W_]', texte):
        raise SystemExit('Le texte est vide, trop court ou sans aucun mot.')
    if essai:                            # vérifie seulement que la génération marche
        print(f'✓ essai : {ecrire(texte, titre).stem} généré, rien publié')
        return
    for tentative in range(4):
        chemin = ecrire(texte, titre)
        lancer(['git', 'add', '--', ICI.name], DEPOT)
        lancer(['git', 'commit', '-m', f'Add dictation {titre or chemin.stem}\n\n{SIGNATURE}', '--', ICI.name], DEPOT)
        try:
            lancer(['git', 'push', 'origin', 'HEAD:main'], DEPOT)
            print(f'✓ {chemin.stem} publié')
            return
        except subprocess.CalledProcessError:
            # main a bougé pendant la génération (autre ajout, push local) : on repart de la
            # dernière version et on refait tout, textes.js compris (un rebase y ferait conflit)
            print(f'push refusé (tentative {tentative + 1}), on recommence depuis origin/main', flush=True)
            lancer(['git', 'fetch', 'origin', 'main'], DEPOT)
            lancer(['git', 'reset', '--hard', 'origin/main'], DEPOT)
    raise SystemExit('Impossible de publier : main change trop souvent, réessaie.')


if __name__ == '__main__':
    if len(sys.argv) > 1:
        ajouter(Path(sys.argv[1]).read_text(encoding='utf-8'), ' '.join(sys.argv[2:]))
    else:                                # dans GitHub Actions : le texte vient de l'événement
        p = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())['client_payload']
        ajouter(str(p.get('texte', '')), str(p.get('titre', '')), essai=p.get('essai') is True)
