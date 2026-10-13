# 제작 원본

승인 시안은 참고로만 사용하고 별도로 생성한 제작 시트17장이다.
개별 게임용 출력은 상위 폴더와 각 `hd/`에 있으며, 이 원본을 게임에 통째로 붙이지 않는다.

- `portrait_A~E`: 각5표정 제작 시트
- `customers_f/m`, `customers_f/m_gray`: 종족5×4포즈 시트
- `staff_variants`: C/D/E 작업복4포즈
- `icons`, `product_details`: 일반 아이콘 및 별도 상세 제작품
- `floor_day/night`, `abyss`, `dungeon`: 사람·UI 없는 배경
- `seasonal`: 계절 소품12개

[atlas-rects.json](atlas-rects.json)은 제작 시트의 측정 좌표다.
주연 제작 원본은 기존 `../sprites/hd/characters.png`에 보존했다.
원본에는 반투명 경계가 있을 수 있다. 이진 알파와 정렬을 검수한 최종 파일은 [production.json](../production.json)의149개 출력이다.
