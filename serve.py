#!/usr/bin/env python3
"""Petit serveur de dev : sert le dossier courant en interdisant tout cache.
Évite d'avoir à faire un rechargement forcé après chaque modification.
    python3 serve.py [port]      # défaut : 8000
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, *a):
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f'http://localhost:{port}  (Ctrl-C pour arrêter)')
ThreadingHTTPServer(('127.0.0.1', port), NoCache).serve_forever()
