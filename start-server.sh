#!/bin/bash
# Launch this website with python - no-cache version
# makes site come up on http://localhost:8000
python3 -c "
import http.server
import socketserver

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

socketserver.TCPServer(('0.0.0.0', 8000), NoCacheHandler).serve_forever()
"
