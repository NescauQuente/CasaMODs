"""Mock CasaOS for testing CasaMOD mods.

Serves a page shaped like the CasaOS dashboard (same layering, settings
dropdown markup and widget sidebar), injects the mods exactly like CasaMOD's
run.sh does, and fakes the two API routes the mods use:

  GET /v1/folder?path=…          (Authorization: <token>)
  GET /v1/file?path=…&token=…    (with HTTP Range support)

/DATA/Media/Music maps to ./music and, with a fixtures folder, /DATA/Media/Pictures
to its pictures/ folder; the folders above them list what they hold (to browse
from /DATA). /DATA/AppData/casamod/mod/wallpapers (served
at /mod/wallpapers/) is the wallpapers/ folder of the second argument (the
folder whose mods are injected) plus, when a third argument names a fixtures
folder, its wallpapers/ folder.

Usage: python server.py <port> <folder with the mods> [<fixtures folder>]
"""
import json, os, re, sys, urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "dist")
FIXTURES = sys.argv[3] if len(sys.argv) > 3 else None
WALL_VROOT = "/DATA/AppData/casamod/mod/wallpapers"
WALL_ROOTS = [os.path.join(DIST, "wallpapers")] + ([os.path.join(FIXTURES, "wallpapers")] if FIXTURES else [])
TYPES = {".css": "text/css", ".js": "application/javascript", ".jpg": "image/jpeg", ".png": "image/png", ".gif": "image/gif",
         ".json": "application/json", ".html": "text/html; charset=utf-8", ".webm": "video/webm", ".mp4": "video/mp4",
         ".svg": "image/svg+xml", ".wav": "audio/wav"}
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8770
TOKEN = "test-token"
ROOTS = {"/DATA/Media/Music": os.path.join(HERE, "music")}
if FIXTURES:
    ROOTS["/DATA/Media/Pictures"] = os.path.join(FIXTURES, "pictures")


def to_local(vpath):
    vpath = os.path.normpath(vpath).replace("\\", "/")
    for vroot, lroot in ROOTS.items():
        if vpath == vroot or vpath.startswith(vroot + "/"):
            return os.path.join(lroot, vpath[len(vroot):].lstrip("/"))
    return None


def above(vpath):
    """The folders above the mapped ones (/, /DATA, /DATA/Media): their subfolders."""
    vpath = "/" + os.path.normpath(vpath).replace("\\", "/").strip("/")
    prefix = vpath.rstrip("/") + "/"
    subs = {r[len(prefix):].split("/")[0] for r in list(ROOTS) + [WALL_VROOT] if r.startswith(prefix)}
    return {name: None for name in subs} if subs else None


def wall_local(sub):
    """A path under the wallpapers folder, looked up in dist then in the fixtures."""
    for root in WALL_ROOTS:
        p = os.path.normpath(os.path.join(root, sub))
        if p.startswith(os.path.normpath(root)) and os.path.exists(p):
            return p
    return None


def listing(vpath):
    vpath = os.path.normpath(vpath).replace("\\", "/")
    if vpath == WALL_VROOT or vpath.startswith(WALL_VROOT + "/"):
        sub = vpath[len(WALL_VROOT):].lstrip("/")
        dirs = [os.path.normpath(os.path.join(r, sub)) for r in WALL_ROOTS if os.path.isdir(os.path.join(r, sub))]
        if not dirs:
            return None
        names = {}
        for d in dirs:
            for name in os.listdir(d):
                names.setdefault(name, os.path.join(d, name))
        return names
    local = to_local(vpath)
    if not local or not os.path.isdir(local):
        return above(vpath)
    return {name: os.path.join(local, name) for name in os.listdir(local)}


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

    def send(self, code, body, ctype="application/json", extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if not getattr(self, "head_only", False):
            self.wfile.write(body)

    def send_file(self, f, ctype):
        data = open(f, "rb").read()
        rng = self.headers.get("Range")
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)", rng)
            start = int(m.group(1) or 0)
            end = int(m.group(2)) if m.group(2) else len(data) - 1
            end = min(end, len(data) - 1)
            return self.send(206, data[start:end + 1], ctype, {"Content-Range": "bytes %d-%d/%d" % (start, end, len(data)), "Accept-Ranges": "bytes"})
        return self.send(200, data, ctype, {"Accept-Ranges": "bytes"})

    def do_HEAD(self):
        self.head_only = True
        self.do_GET()

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        if u.path in ("/", "/index.html"):
            return self.send(200, page(), "text/html; charset=utf-8")
        if u.path.startswith("/mod/"):
            sub = urllib.parse.unquote(u.path[5:])
            f = wall_local(sub[len("wallpapers/"):]) if sub.startswith("wallpapers/") else os.path.normpath(os.path.join(DIST, sub))
            if not f or not f.startswith(os.path.normpath(DIST if not sub.startswith("wallpapers/") else os.path.dirname(f))) or not os.path.isfile(f):
                return self.send(404, b"not found", "text/plain")
            return self.send_file(f, TYPES.get(os.path.splitext(f)[1].lower(), "application/octet-stream"))
        if u.path == "/v1/folder":
            if self.headers.get("Authorization") != TOKEN:
                return self.send(401, b'{"message":"unauthorized"}')
            names = listing(q.get("path", [""])[0])
            if names is None:
                return self.send(500, json.dumps({"success": 500, "message": "service error"}).encode())
            vbase = q["path"][0].rstrip("/")
            content = []
            for name, p in sorted(names.items()):
                is_dir = p is None or os.path.isdir(p)
                content.append({"name": name, "path": vbase + "/" + name, "is_dir": is_dir,
                                "size": 0 if is_dir else os.path.getsize(p)})
            body = {"success": 200, "message": "ok", "data": {"content": content, "total": len(content), "index": 1, "size": 100000}}
            return self.send(200, json.dumps(body).encode())
        if u.path == "/v1/file":
            if q.get("token", [""])[0] != TOKEN:
                return self.send(401, b'{"message":"unauthorized"}')
            local = to_local(q.get("path", [""])[0])
            if not local or not os.path.isfile(local):
                return self.send(404, b"not found", "text/plain")
            return self.send_file(local, TYPES.get(os.path.splitext(local)[1].lower(), "application/octet-stream"))
        return self.send(404, b"not found", "text/plain")


class Server(ThreadingHTTPServer):
    # Chrome opens several connections at once (the mods load their scripts in
    # parallel); the default backlog of 5 makes it refuse some under load
    request_queue_size = 128
    daemon_threads = True


Server(("127.0.0.1", PORT), Handler).serve_forever()
