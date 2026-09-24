#!/usr/bin/env python3
"""Génère l'audio des dictées avec les voix neuronales Microsoft (edge-tts, gratuit).

    pip install edge-tts
    python3 generer.py                      # voix par défaut
    python3 generer.py --voix fr-FR-HenriNeural

Chaque fichier textes/*.txt = une dictée (1re ligne = titre, le reste = texte).
Seuls les textes nouveaux ou modifiés sont regénérés ; l'audio des textes
supprimés est effacé. Écrit textes.js, lu par index.html.
"""
import argparse
import asyncio
import hashlib
import json
from pathlib import Path

import edge_tts

ICI = Path(__file__).parent
TEXTES = ICI / 'textes'
AUDIO = ICI / 'audio'


# ce que la voix lit mal : corrigé pour l'audio seulement, le texte affiché ne change pas
PRONONCIATION = {
    'XVIIIᵉ': 'dix-huitième', 'XIXᵉ': 'dix-neuvième',
    "l'an III": "l'an trois", "l'an I,": "l'an un,",
    'Louis XVIII': 'Louis dix-huit', 'Charles X,': 'Charles dix,',
    'Énéide, I, 630': 'Énéide, chant un, vers 630',
    '9 h »': '9 heures »', 'atroce[s]': 'atroces', '[...]': '',
}


def a_dire(texte):
    for mal, bien in PRONONCIATION.items():
        texte = texte.replace(mal, bien)
    return texte


async def main(voix, debit):
    AUDIO.mkdir(exist_ok=True)
    dictees, gardes = [], set()

    for f in sorted(TEXTES.glob('*.txt')):
        titre, _, texte = f.read_text(encoding='utf-8').strip().partition('\n')
        texte = texte.strip()
        # le hash dans le nom : un texte ou une voix modifiés => nouveau fichier
        h = hashlib.sha1(f'{voix}|{debit}|{a_dire(texte)}'.encode()).hexdigest()[:8]
        mp3 = AUDIO / f'{f.stem}-{h}.mp3'
        gardes.add(mp3.name)
        if mp3.exists():
            print(f'  = {f.name}')
        else:
            print(f'  + {f.name} …', flush=True)
            await edge_tts.Communicate(a_dire(texte), voix, rate=debit).save(str(mp3))
        dictees.append({'id': f.stem, 'titre': titre.strip(), 'texte': texte,
                        'audio': f'audio/{mp3.name}'})

    for vieux in AUDIO.glob('*.mp3'):
        if vieux.name not in gardes:
            vieux.unlink()
            print(f'  - {vieux.name}')

    js = 'window.DICTEES = ' + json.dumps(dictees, ensure_ascii=False, indent=1) + ';\n'
    (ICI / 'textes.js').write_text(js, encoding='utf-8')
    print(f'✓ {len(dictees)} dictée(s) → textes.js')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--voix', default='fr-FR-DeniseNeural')
    p.add_argument('--debit', default='-25%', help='vitesse de base, ex. -10%%, +0%%')
    a = p.parse_args()
    asyncio.run(main(a.voix, a.debit))
