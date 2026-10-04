"""HTML에서 참조하는 로컬 파일과 루트 진입 경로를 확인합니다."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit

root = Path(__file__).resolve().parent.parent
class References(HTMLParser):
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        ref = values.get("src") if tag == "script" else values.get("href") if tag == "link" else None
        if ref and not urlsplit(ref).scheme:
            target = root / "apps/web" / urlsplit(ref).path
            assert target.is_file(), f"참조 파일 누락: {ref}"
            print(f"OK: {target.relative_to(root)}")

References().feed((root / "apps/web/index.html").read_text(encoding="utf-8"))
assert "url=./apps/web/" in (root / "index.html").read_text(encoding="utf-8")
print("OK: 루트 진입 경로")
