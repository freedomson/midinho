#!/usr/bin/env python2
# -*- coding: utf-8 -*-

from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
import json
import subprocess
import re
import time

HOST = "127.0.0.1"
PORT = 8081

MODEL_RE = re.compile(r'^[a-zA-Z0-9._:/-]+$')


def run_ollama(model):
    cmd = ["ollama", "run", model]

    p = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    out, err = p.communicate("")
    return p.returncode, out, err


def stop_ollama(model):
    cmd = ["ollama", "stop", model]

    p = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    out, err = p.communicate()
    return p.returncode, out, err


def get_free_memory_mb():
    try:
        p = subprocess.Popen(
            ["free", "-b"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        out, err = p.communicate()
        if p.returncode != 0:
            return 0

        for line in out.splitlines():
            line = line.strip()
            if line.lower().startswith("mem:"):
                numbers = re.findall(r'[\d.]+', line)
                if len(numbers) < 2:
                    return 0

                available_bytes = int(float(numbers[-1]))
                return available_bytes / (1024 * 1024)

        return 0
    except Exception:
        return 0


class Handler(BaseHTTPRequestHandler):

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def _json(self, code, obj):
        body = json.dumps(obj)

        self.send_response(code)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else ""

        try:
            payload = json.loads(raw) if raw else {}
        except Exception:
            return self._json(400, {"error": "invalid_json"})

        # =========================
        # LOAD MODEL
        # =========================
        if self.path == "/load-model":
            model = payload.get("model", "")
            if (not model) or (not isinstance(model, basestring)) or (not MODEL_RE.match(model)):
                return self._json(400, {"error": "invalid_model_name"})

            start = time.time()
            rc, out, err = run_ollama(model)
            dur_ms = int((time.time() - start) * 1000)

            return self._json(200 if rc == 0 else 500, {
                "model": model,
                "exit_code": rc,
                "duration_ms": dur_ms,
                "stdout": out,
                "stderr": err
            })

        # =========================
        # STOP MODEL (NEW)
        # =========================
        if self.path == "/stop-model":
            model = payload.get("model", "")
            if (not model) or (not isinstance(model, basestring)) or (not MODEL_RE.match(model)):
                return self._json(400, {"error": "invalid_model_name"})

            start = time.time()
            rc, out, err = stop_ollama(model)
            dur_ms = int((time.time() - start) * 1000)

            return self._json(200 if rc == 0 else 500, {
                "model": model,
                "exit_code": rc,
                "duration_ms": dur_ms,
                "stdout": out,
                "stderr": err
            })

        return self._json(404, {"error": "not_found"})

    def do_GET(self):
        if self.path != "/free-memory":
            return self._json(404, {"error": "not_found"})

        free_mb = get_free_memory_mb()

        return self._json(200, {
            "free_mb": free_mb
        })


def main():
    httpd = HTTPServer((HOST, PORT), Handler)
    print("Python server listening on http://%s:%d" % (HOST, PORT))
    httpd.serve_forever()


if __name__ == "__main__":
    main()
