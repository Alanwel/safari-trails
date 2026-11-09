#!/usr/bin/env python3
"""
A tiny static server with SPA fallback.

`python3 -m http.server` answers 404 for /admin, because there is no file
called "admin" — but a single-page app routes entirely in the browser, so any
unknown path must return index.html and let the router take over.

    python3 scripts/spa-server.py [--port 4173] [--root web/dist]
"""
import argparse
import http.server
import os
import socketserver


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?")[0]
        if path != "/" and not os.path.exists("." + path):
            self.path = "/index.html"
        return super().do_GET()

    def log_message(self, *args):
        pass


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--root", default="web/dist")
    args = parser.parse_args()

    os.chdir(args.root)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", args.port), SPAHandler) as server:
        print(f"serving {args.root} on http://127.0.0.1:{args.port}")
        server.serve_forever()


if __name__ == "__main__":
    main()
