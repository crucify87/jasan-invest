"""저장소 루트에서 정적 웹앱 실행: python scripts/serve.py"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import argparse

parser = argparse.ArgumentParser(description="자산과투자사이 개발 서버")
parser.add_argument("--port", type=int, default=8000)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
handler = partial(SimpleHTTPRequestHandler, directory=str(root))
server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
print(f"앱 열기: http://localhost:{args.port}/apps/web/")
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
