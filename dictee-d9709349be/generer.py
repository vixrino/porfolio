#!/usr/bin/env python3
"""Génère l'audio des dictées avec les voix neuronales Microsoft (edge-tts, gratuit).

    pip install edge-tts lameenc
    python3 generer.py                      # voix par défaut
    python3 generer.py --voix fr-FR-RemyMultilingualNeural

Chaque fichier textes/*.txt = une dictée (1re ligne = titre, le reste = texte).
Le texte est lu morceau par morceau (phrase, point-virgule, deux-points) à un
débit presque naturel, avec un vrai silence entre chaque morceau : c'est le
rythme d'une dictée, sans la voix étirée et robotique d'un débit ralenti.
Seuls les textes nouveaux ou modifiés sont regénérés ; l'audio des textes
supprimés est effacé. Écrit textes.js, lu par index.html.
"""
import argparse
import asyncio
import hashlib
import json
import re
from pathlib import Path

import edge_tts
import lameenc

ICI = Path(__file__).parent
TEXTES = ICI / 'textes'
AUDIO = ICI / 'audio'

# silences (secondes) après chaque type de fin de morceau
PAUSES = {'phrase': 1.6, 'virgule': 1.0, 'paragraphe': 2.4}

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


def morceaux(texte):
    """[(morceau, pause)] : coupe après . ! ? … ; : et entre paragraphes."""
    out = []
    for para in re.split(r'\n\s*\n', a_dire(texte)):
        for m in re.split(r'(?<=[.!?…;:])\s+', para.strip()):
            if not re.search(r'\w', m):       # un « » » ou « ) » isolé : on le recolle
                if out:
                    out[-1][0] += ' ' + m
                continue
            fin = 'phrase' if re.search(r'[.!?…][»)\s]*$', m) else 'virgule'
            out.append([m, fin])
        if out:
            out[-1][1] = 'paragraphe'
    out[-1][1] = 'phrase'
    return [(m, PAUSES[fin]) for m, fin in out]


def silence(secondes):
    # même format que la sortie edge-tts (mp3 24 kHz mono 48 kb/s) : on peut coller les octets
    enc = lameenc.Encoder()
    enc.set_bit_rate(48)
    enc.set_in_sample_rate(24000)
    enc.set_channels(1)
    enc.set_quality(2)
    return enc.encode(bytes(2 * int(24000 * secondes))) + enc.flush()


async def parler(texte, voix, debit, limite):
    async with limite:
        for essai in range(4):
            try:
                son = b''
                async for c in edge_tts.Communicate(texte, voix, rate=debit).stream():
                    if c['type'] == 'audio':
                        son += c['data']
                return son
            except Exception:
                if essai == 3:
                    raise
                await asyncio.sleep(2 * (essai + 1))


async def main(voix, debit):
    AUDIO.mkdir(exist_ok=True)
    dictees, gardes = [], set()
    limite = asyncio.Semaphore(6)
    silences = {s: silence(s) for s in PAUSES.values()}

    for f in sorted(TEXTES.glob('*.txt')):
        titre, _, texte = f.read_text(encoding='utf-8').strip().partition('\n')
        texte = texte.strip()
        parts = morceaux(texte)
        # le hash dans le nom : un texte, une voix ou des pauses modifiés => nouveau fichier
        h = hashlib.sha1(f'{voix}|{debit}|{PAUSES}|{parts}'.encode()).hexdigest()[:8]
        mp3 = AUDIO / f'{f.stem}-{h}.mp3'
        gardes.add(mp3.name)
        if mp3.exists():
            print(f'  = {f.name}')
        else:
            print(f'  + {f.name} ({len(parts)} morceaux) …', flush=True)
            sons = await asyncio.gather(*(parler(m, voix, debit, limite) for m, _ in parts))
            mp3.write_bytes(b''.join(s + silences[p] for s, (_, p) in zip(sons, parts)))
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
    p.add_argument('--voix', default='fr-FR-VivienneMultilingualNeural')
    p.add_argument('--debit', default='-10%', help='vitesse de base, ex. -10%%, +0%%')
    a = p.parse_args()
    asyncio.run(main(a.voix, a.debit))
