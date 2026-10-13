#!/usr/bin/env bash
# 배포용 dist/ 를 만든다. 실행에 필요한 파일만 복사한다 (HD 원본·소스 시트·문서·테스트 제외).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist && mkdir -p dist
cp index.html style.css .nojekyll dist/
cp -r src dist/src
mkdir -p dist/assets/sprites/hd dist/assets/bg dist/assets/ui dist/assets/font
cp assets/manifest.js dist/assets/
cp assets/sprites/*.png dist/assets/sprites/
cp assets/sprites/hd/face_*.png dist/assets/sprites/hd/
cp assets/bg/*.png dist/assets/bg/
for f in assets/ui/*.png; do case "$f" in *reference_screen*) ;; *) cp "$f" dist/assets/ui/;; esac; done
cp assets/font/Galmuri11.woff2 assets/font/OFL.md dist/assets/font/
echo "dist size:"; du -sh dist; find dist -type f | wc -l
