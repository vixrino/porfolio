#!/bin/bash
# Double-cliquer pour ouvrir l'outil d'ajout de dictées (http://127.0.0.1:8001).
cd "$(dirname "$0")" || exit 1
VENV="$HOME/.dictee-venv"
if [ ! -x "$VENV/bin/python" ]; then
  echo "Première utilisation : création de $VENV…"
  python3 -m venv "$VENV" || { echo "Échec de la création du venv."; read -r; exit 1; }
fi
"$VENV/bin/python" -c 'import edge_tts, lameenc' 2>/dev/null || \
  "$VENV/bin/python" -m pip install --quiet --upgrade edge-tts lameenc || { echo "Échec de l'installation."; read -r; exit 1; }
(sleep 1.5 && open "http://127.0.0.1:8001") &
exec "$VENV/bin/python" ajouter.py "$@"
