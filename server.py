from http.server import SimpleHTTPRequestHandler, HTTPServer
import os

class CustomHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        if self.path.endswith(".js"):
            self.send_header("Content-Type", "application/javascript")
        super().end_headers()

if __name__ == '__main__':
    PORT = 8000
    with HTTPServer(("", PORT), CustomHandler) as httpd:
        print(f"Serving on http://localhost:{PORT}")
        httpd.serve_forever()