#!/usr/bin/env bash
# 배포용 dist/ 를 만든다. 실행에 필요한 파일만 복사한다 (원본 PNG 배경·소스 시트·참고 이미지·문서·테스트 제외).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist && mkdir -p dist
cp index.html style.css .nojekyll dist/
cp -r src dist/src
mkdir -p dist/assets/sprites/hd dist/assets/bg/hd dist/assets/ui/hd dist/assets/font
cp assets/manifest.js assets/layout_hd.js dist/assets/
# 캐릭터: 시트·눕기·머리색 마스크·그림자·초상 128·반신 256
cp assets/sprites/hd/*_sheet.png assets/sprites/hd/*_lie.png assets/sprites/hd/*_hair.png assets/sprites/hd/shadow.png assets/sprites/hd/face_*.png assets/sprites/hd/bust_*.png dist/assets/sprites/hd/
# 배경: 큰 그림은 webp, 바깥 타일은 png
cp assets/bg/hd/floor1.webp assets/bg/hd/floor1_night.webp assets/bg/hd/abyss_entrance.webp assets/bg/hd/outer.png dist/assets/bg/hd/
# UI: 로딩 배경은 webp, 나머지 png
for f in assets/ui/hd/*.png; do case "$f" in *loading_bg*|*dungeon_map*|*seasonal_props*|*cursor*) ;; *) cp "$f" dist/assets/ui/hd/;; esac; done
cp assets/ui/hd/loading_bg.webp assets/ui/hd/loading_bg_day.webp dist/assets/ui/hd/
cp assets/font/Galmuri11.woff2 assets/font/OFL.md dist/assets/font/
echo "dist size:"; du -sh dist; find dist -type f | wc -l
