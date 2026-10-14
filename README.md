# 마사지 샵 도트 타이쿤

판타지 교역도시 뒷골목의 작은 시술소를 키우는 경영 시뮬레이션. 빌드 없이 브라우저에서 바로 돈다.

## 실행

- 로컬: `index.html`을 브라우저로 열면 된다 (더블클릭). 모듈이나 fetch를 쓰지 않아서 `file://`로도 동작한다
- GitHub Pages: Settings → Pages → Source "GitHub Actions". `.github/workflows/pages.yml`이 푸시마다 저장소 전체를 그대로 배포한다. 빌드 단계가 없으니 체크아웃 → 업로드 → 배포뿐이다. 주소는 `https://moooncang.github.io/masg/`

## 실제 게임 UI

승인된 도트 시안과 HD 에셋이 실행 화면에 적용되어 있다. [실제 화면·변경 내용·브라우저 테스트](docs/ux/LIVE_IMPLEMENTATION.md)를 참고한다.

## 화면 파이프라인

- 세계는 승인 목업(`docs/ux/previews/v3/game_screen.png`)과 같은 **1672×941**. 모든 자리는 GPT 실측 좌표표 `assets/layout_hd.json`(→ `assets/layout_hd.js`)에서 읽는다
- 캔버스는 오프스크린 1672×941 에 원본 픽셀로 그린 뒤 화면 크기에 맞춰 한 번만 축소한다. HUD·창(`#app`)도 같은 1672×941 좌표계이며 `zoom(--k)` 으로 통째로 맞춘다. 모바일(700px 미만)은 세로 흐름: 세계는 가로 스크롤, 띠는 절반 배율
- 캐릭터는 96×96 ×4 ×7행 시트(`assets/sprites/hd/*_sheet.png`: idle·걷기 3방향·앉기·시술·접수), 눕기 192×96, 머리색 마스크(`*_hair.png`, 일반 손님·직원만 색을 입힘). 원점 규칙: 시트 = 앵커 −(48,96), 눕기 = 앵커 −(0,48)
- 말풍선·이모트·번호판·자물쇠·진행바는 `assets/ui/hd/` 소품을 캔버스가 그린다. 창·버튼·슬롯·도구띠는 모서리 16px 9-slice 스킨을 `src/skin.js` 가 상태별로 잘라 CSS 변수로 등록한다
- 로딩·타이틀 화면(`src/loader.js`): 모든 에셋을 미리 받고 "새 게임 / 이어하기"
- 큰 배경(바닥 낮·밤, 심연구, 로딩 배경)은 WebP. 배포는 `tools/build-dist.sh` 가 만든 `dist/`(약 5.8MB)만 올린다

## 게임 목표

카르벤 상단에서 빌린 개업 자금 **금 250** 을 **30일째 아침**까지 갚는다 (가게 창 → 오늘의 영업). 10·20일째 독촉, 기한 초과 시 이자 25% 로 10일 한 번 연장, 그다음은 폐업. 수치는 `src/data/config.js` 의 `DEBT`.

## 폴더

```
index.html, style.css   진입점·스타일
src/data/               게임 데이터 (수치·인물·메뉴·확장·목표·손님·이벤트·대화)  ← GPT가 채움
src/                    엔진: util / state(저장) / sim(시뮬) / loader(로딩·타이틀) / render(캔버스) / skin(스킨 슬라이스) / ui(HUD·창) / main(배율·루프)
tools/build-dist.sh     배포용 dist 생성 (실행 파일만)
tests/ui-smoke.cjs      브라우저 스모크 테스트 (BASE_URL, CHROMIUM_PATH)
assets/manifest.js      에셋 경로·시트 규격
assets/layout_hd.json   자리 좌표표 (GPT 실측, 1672×941)
assets/sprites|bg|ui    이미지                                           ← GPT가 만듦
docs/GPT_BRIEF.md       GPT가 처음 읽는 문서
docs/GAME_DESIGN.md     시스템 기획 뼈대
docs/ASSET_SPEC.md      이미지 규격·파일명·좌표
docs/LORE.md            세계·인물 설정 (전연령 요약)
```

## 디버그

브라우저 콘솔에서 `Game.Sim.s`가 현재 상태다. `Game.Sim.s.money += 10000`, `Game.Sim.s.rep = 500` 같은 식으로 바꿀 수 있다.
저장은 localStorage `masg_save_v1`. 설정 탭의 "새 게임"으로 지운다.
