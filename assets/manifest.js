// ============================================================
// 에셋 매니페스트. 파일이 있으면 로드해서 쓰고, 없으면 엔진이 색 블록으로 대체한다.
// 실제 화면은 HD 경로를 사용한다. 셀 순서와 원본 규격은 assets/production.json 참고.
// ============================================================
window.ASSETS = {
  // 캐릭터 워킹 스프라이트: 64x96, 가로 4프레임(대기/걷기/대기/걷기), 한 줄
  sprites: {
    P: "assets/sprites/hd/char_P.png",
    A: "assets/sprites/hd/char_A.png",
    B: "assets/sprites/hd/char_B.png",
    C: "assets/sprites/hd/char_C.png",
    D: "assets/sprites/hd/char_D.png",
    E: "assets/sprites/hd/char_E.png",
    human_f: "assets/sprites/hd/cust_human_f.png",
    human_m: "assets/sprites/hd/cust_human_m.png",
    elf_f: "assets/sprites/hd/cust_elf_f.png",
    elf_m: "assets/sprites/hd/cust_elf_m.png",
    beast_f: "assets/sprites/hd/cust_beast_f.png",
    beast_m: "assets/sprites/hd/cust_beast_m.png",
    dwarf_f: "assets/sprites/hd/cust_dwarf_f.png",
    dwarf_m: "assets/sprites/hd/cust_dwarf_m.png",
    dragon_f: "assets/sprites/hd/cust_dragon_f.png",
    dragon_m: "assets/sprites/hd/cust_dragon_m.png",
  },
  // 초상화: 128x128, 상황 코드. 2 평소 / 3 기쁨 / 5 당황 / 7 분노 / 10 지침
  portraits: {
    A: "assets/sprites/hd/face_A_2.png",
    B: "assets/sprites/hd/face_B_2.png",
    C: "assets/sprites/hd/face_C_2.png",
    D: "assets/sprites/hd/face_D_2.png",
    E: "assets/sprites/hd/face_E_2.png",
  },
  portraitMoods: {
    codes: ["A", "B", "C", "D", "E"],
    moods: [3, 5, 7, 10],
    path: (c, m) => `assets/sprites/hd/face_${c}_${m}.png`,
  },
  // 배경: 1672x941 → 논리 좌표 384x216 평면도 타일맵 (1층 전체). 없으면 엔진이 방 구획을 그린다
  bg: {
    floor1: "assets/bg/hd/floor1.png",
    floor1_night: "assets/bg/hd/floor1_night.png",
    abyss: "assets/bg/hd/abyss_entrance.png",
  },
  // UI 아틀라스. 셀 순서는 docs/GPT_ASSET_ORDER.md 5장. 없으면 엔진이 코드로 그린 임시 스킨을 쓴다
  ui: {
    currency: "assets/ui/hd/currency.png", // 192x64: 금/은/동
    menu: "assets/ui/hd/menu.png", // 512x64: 가게/직원/확장/향유/탐사/관계/업적/설정
    materials: "assets/ui/hd/materials.png", // 448x64: herb/spring/crystal/silk/moonflower/scale/core
    products: "assets/ui/hd/products.png", // 640x64: calm/warm/moon/towel/candle/charm/tonic/sheet/bedplate/lamp
    products_large: "assets/ui/hd/products_large.png", // 1280x128 같은 순서
    status: "assets/ui/hd/status.png", // 448x64: 피로/탐사/출장/잠금/설치/평판/소문
    stats: "assets/ui/hd/stats.png", // 256x64: 손기술/감각/체력/친절
    window_frame: "assets/ui/window_frame.png", // 24x24 9-slice
    window_title: "assets/ui/window_title.png", // 24x16 horizontal 3-slice
    button: "assets/ui/button.png", // 96x24: 기본/포커스/누름/비활성
    button_primary: "assets/ui/button_primary.png",
    slot: "assets/ui/slot.png", // 96x24: 기본/선택/빈/잠금
    bar: "assets/ui/bar.png", // 48x8: 홈/긍정/손실
    scroll: "assets/ui/scroll.png", // 16x32 세로: 트랙/손잡이
    tab: "assets/ui/tab.png", // 48x16: 비활성/활성
    toolbar_cell: "assets/ui/toolbar_cell.png", // 64x32: 기본/선택
    hud_frame: "assets/ui/hud_frame.png", // 24x24 9-slice
    portrait_frame: "assets/ui/portrait_frame.png", // 72x72 9-slice
    medal: "assets/ui/hd/medal.png", // 384x64: 가게/평판/확장/향유/던전/관계
    medal_hidden: "assets/ui/hd/medal_hidden.png", // 64x64
    cursor: "assets/ui/hd/cursor.png", // 64x64
    dungeon_map: "assets/ui/hd/dungeon_map.png", // 1086x1448
  },
  font: { galmuri: "assets/font/Galmuri11.woff2" },
};
