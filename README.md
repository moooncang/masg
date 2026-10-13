# 골목 시술소 — 마사지 샵 도트 타이쿤

판타지 교역도시 뒷골목의 작은 시술소를 키우는 경영 시뮬레이션. 빌드 없이 브라우저에서 바로 돈다.

## 실행

- 로컬: `index.html`을 브라우저로 열면 된다 (더블클릭). 모듈이나 fetch를 쓰지 않아서 `file://`로도 동작한다
- GitHub Pages: Settings → Pages → Source "GitHub Actions". `.github/workflows/pages.yml`이 푸시마다 저장소 전체를 그대로 배포한다. 빌드 단계가 없으니 체크아웃 → 업로드 → 배포뿐이다. 주소는 `https://moooncang.github.io/masg/`

## 폴더

```
index.html, style.css   진입점·스타일
src/data/               게임 데이터 (수치·인물·메뉴·확장·손님·이벤트)  ← GPT가 채움
src/                    엔진: util / state(저장) / sim(시뮬) / render(캔버스) / ui(패널) / main(루프)
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
