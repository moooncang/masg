# 마사지 샵 도트 타이쿤

판타지 교역도시 뒷골목의 작은 시술소를 키우는 경영 시뮬레이션. 빌드 없이 브라우저에서 바로 돈다.

## 실행

- 로컬: `index.html`을 브라우저로 열면 된다 (더블클릭). 모듈이나 fetch를 쓰지 않아서 `file://`로도 동작한다
- GitHub Pages: Settings → Pages → Source "GitHub Actions". `.github/workflows/pages.yml`이 푸시마다 저장소 전체를 그대로 배포한다. 빌드 단계가 없으니 체크아웃 → 업로드 → 배포뿐이다. 주소는 `https://moooncang.github.io/masg/`

## 실제 게임 UI

승인된 도트 시안과 HD 에셋이 실행 화면에 적용되어 있다. [실제 화면·변경 내용·브라우저 테스트](docs/ux/LIVE_IMPLEMENTATION.md)를 참고한다.

## 화면 파이프라인

- 세계는 384×216 논리 픽셀. 화면 크기에 따라 정수 배율(1~6×)로만 확대한다. 소수 배율·블러 없음
- 실행 시 읽는 에셋은 전부 네이티브 도트(`assets/sprites|bg|ui`의 원본 픽셀 파일 + `assets/sprites/hd/face_*`). HD 원본과 소스 시트는 제작용이며 배포에서 제외된다
- UI 창·버튼·슬롯은 `assets/ui/*.png` 9-slice 아틀라스를 `src/skin.js`가 상태별로 잘라 CSS 변수로 등록한다
- 글꼴 Galmuri11, 11px의 정수배만 쓴다
- 배포는 `tools/build-dist.sh`가 만든 `dist/`(약 1.5MB)만 올린다

## 폴더

```
index.html, style.css   진입점·스타일
src/data/               게임 데이터 (수치·인물·메뉴·확장·목표·손님·이벤트·대화)  ← GPT가 채움
src/                    엔진: util / state(저장) / sim(시뮬) / render(캔버스) / skin(아틀라스 슬라이스) / ui(HUD·창) / main(배율·루프)
tools/build-dist.sh     배포용 dist 생성 (실행 파일만)
tests/ui-smoke.cjs      브라우저 스모크 테스트 (BASE_URL, CHROMIUM_PATH)
assets/manifest.js      에셋 경로 목록. 파일이 없으면 색 블록으로 대체
assets/sprites|bg|ui    이미지                                           ← GPT가 만듦
docs/GPT_BRIEF.md       GPT가 처음 읽는 문서
docs/GAME_DESIGN.md     시스템 기획 뼈대
docs/ASSET_SPEC.md      이미지 규격·파일명·좌표
docs/LORE.md            세계·인물 설정 (전연령 요약)
```

## 디버그

브라우저 콘솔에서 `Game.Sim.s`가 현재 상태다. `Game.Sim.s.money += 10000`, `Game.Sim.s.rep = 500` 같은 식으로 바꿀 수 있다.
저장은 localStorage `masg_save_v1`. 설정 탭의 "새 게임"으로 지운다.
