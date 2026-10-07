"""Cloudflare Pages에 올릴 공개 파일만 dist에 복사합니다."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parent.parent
dest=root/'dist'
if dest.exists(): shutil.rmtree(dest)
shutil.copytree(root/'apps/web',dest)
print('Cloudflare Pages output: dist')
