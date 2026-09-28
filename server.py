from __future__ import annotations
import json, mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse
from generator import GENERATED, ROOT, generate

HOST, PORT = "127.0.0.1", 8765

class Handler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        body = json.dumps(payload).encode(); self.send_response(status); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
    def _file(self, path):
        if not path.exists() or not path.is_file(): self.send_error(404); return
        data = path.read_bytes(); self.send_response(200); self.send_header("Content-Type", mimetypes.guess_type(path.name)[0] or "application/octet-stream"); self.send_header("Content-Length", str(len(data)))
        if path.suffix == ".zip": self.send_header("Content-Disposition", f'attachment; filename="{path.name}"')
        self.end_headers(); self.wfile.write(data)
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health": self._json(200, {"status": "ok", "service": "MRMG First Line"}); return
        if parsed.path.startswith("/downloads/"):
            candidate = (GENERATED / Path(unquote(parsed.path.removeprefix("/downloads/")))).resolve()
            if GENERATED.resolve() not in candidate.parents: self.send_error(403); return
            self._file(candidate); return
        if parsed.path == "/": self._file(ROOT / "static/index.html"); return
        if parsed.path in {"/styles.css", "/app.js"}: self._file(ROOT / "static" / parsed.path.removeprefix("/")); return
        if parsed.path.startswith("/static/"):
            candidate = (ROOT / "static" / Path(unquote(parsed.path.removeprefix("/static/")))).resolve()
            if (ROOT / "static").resolve() not in candidate.parents: self.send_error(403); return
            self._file(candidate); return
        self.send_error(404)
    def do_POST(self):
        if self.path != "/api/generate": self.send_error(404); return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 30_000_000: raise ValueError("Payload is too large")
            result = generate(json.loads(self.rfile.read(length))); relative = result["package"].relative_to(GENERATED)
            score = result["result"]["score"]
            score_text = "No MIC calculation required" if score is None else f"MIC {score:.2f}"
            self._json(200, {"filename": result["package"].name, "download": "/downloads/" + str(relative), "summary": f"{result['result']['tier']} · {score_text} · {result['primary'].suffix.upper().removeprefix('.')} primary document · verified ZIP"})
        except Exception as exc: self._json(400, {"error": str(exc)})
    def log_message(self, fmt, *args): print(f"[{self.log_date_time_string()}] {fmt % args}")

if __name__ == "__main__":
    GENERATED.mkdir(exist_ok=True); print(f"MRMG First Line running at http://{HOST}:{PORT}"); ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
