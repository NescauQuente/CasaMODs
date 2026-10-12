"""Mock CasaOS for testing the Idle Hide mod.

Serves a page shaped like the CasaOS dashboard (tests/mock.html: the top bar
with its settings dropdown, the widget column, the apps, the footer) and
injects the mods exactly like CasaMOD's run.sh does: every folder at the root
of the second argument with a mod.css or mod.js, served at /mod/.

Usage: python server.py <port> <folder with the mods>
"""
import os, sys, urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8772
DIST = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "..")
TYPES = {".css": "text/css", ".js": "application/javascript", ".png": "image/png", ".json": "application/json",
         ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml"}


def page():
    mods = sorted(d for d in os.listdir(DIST) if os.path.isdir(os.path.join(DIST, d)))
    css = "".join('<link href="/mod/%s/mod.css" rel="stylesheet">\n' % m for m in mods if os.path.exists(os.path.join(DIST, m, "mod.css")))
    js = "".join('<script type="text/javascript" src="mod/%s/mod.js"></script>\n' % m for m in mods if os.path.exists(os.path.join(DIST, m, "mod.js")))
    html = open(os.path.join(HERE, "mock.html"), encoding="utf-8").read()
    # Same injection points as CasaMOD's run.sh
    html = html.replace("<title>", "\n<!-- CasaMOD css -->\n" + css + "<title>", 1)
    html = html.replace("</body>", "\n<!-- CasaMOD js -->\n" + js + "</body>", 1)
    return html.encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, code, body, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path in ("/", "/index.html"):
            return self.send(200, page(), "text/html; charset=utf-8")
        if u.path.startswith("/mod/"):
            f = os.path.normpath(os.path.join(DIST, urllib.parse.unquote(u.path[5:])))
            if not f.startswith(os.path.normpath(DIST)) or not os.path.isfile(f):
                return self.send(404, b"not found", "text/plain")
            return self.send(200, open(f, "rb").read(), TYPES.get(os.path.splitext(f)[1].lower(), "application/octet-stream"))
        return self.send(404, b"not found", "text/plain")


class Server(ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True


Server(("127.0.0.1", PORT), Handler).serve_forever()
