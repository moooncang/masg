// ============================================================
// 에셋 매니페스트. 실행 시 읽는 파일은 전부 네이티브 도트(원본 픽셀)다.
// HD 원본(assets/*/hd, assets/source)은 제작용이며 배포에서 제외된다 (tools/build-dist.sh).
// 셀 순서는 docs/GPT_ASSET_ORDER.md 5장.
// ============================================================
window.ASSETS = {
  // 워킹 스프라이트 64×24 (16×24 ×4프레임)
  sprites: {
    P: "assets/sprites/char_P.png", A: "assets/sprites/char_A.png", B: "assets/sprites/char_B.png",
    C: "assets/sprites/char_C.png", D: "assets/sprites/char_D.png", E: "assets/sprites/char_E.png",
    human_f: "assets/sprites/cust_human_f.png", human_m: "assets/sprites/cust_human_m.png",
    elf_f: "assets/sprites/cust_elf_f.png", elf_m: "assets/sprites/cust_elf_m.png",
    beast_f: "assets/sprites/cust_beast_f.png", beast_m: "assets/sprites/cust_beast_m.png",
    dwarf_f: "assets/sprites/cust_dwarf_f.png", dwarf_m: "assets/sprites/cust_dwarf_m.png",
    dragon_f: "assets/sprites/cust_dragon_f.png", dragon_m: "assets/sprites/cust_dragon_m.png",
  },
  // 영입 후 직원 복장
  staffSprites: { C: "assets/sprites/char_C_staff.png", D: "assets/sprites/char_D_staff.png", E: "assets/sprites/char_E_staff.png" },
  // 초상화 64×64 (목록용) / 128×128 (대화·이벤트 큰 초상). 상황 2 평소 / 3 기쁨 / 5 당황 / 7 분노 / 10 지침
  portraits: { A: "assets/sprites/face_A_2.png", B: "assets/sprites/face_B_2.png", C: "assets/sprites/face_C_2.png", D: "assets/sprites/face_D_2.png", E: "assets/sprites/face_E_2.png" },
  portrait: (code, mood) => `assets/sprites/face_${code}_${mood || 2}.png`,
  portraitHd: (code, mood) => `assets/sprites/hd/face_${code}_${mood || 2}.png`,
  // 배경 384×216
  bg: { floor1: "assets/bg/floor1.png", floor1_night: "assets/bg/floor1_night.png", abyss: "assets/bg/abyss_entrance.png" },
  // UI 아틀라스 (16px 셀, products_large 는 32px)
  ui: {
    currency: "assets/ui/currency.png", menu: "assets/ui/menu.png", materials: "assets/ui/materials.png",
    products: "assets/ui/products.png", products_large: "assets/ui/products_large.png",
    status: "assets/ui/status.png", stats: "assets/ui/stats.png",
    window_frame: "assets/ui/window_frame.png", window_title: "assets/ui/window_title.png",
    button: "assets/ui/button.png", button_primary: "assets/ui/button_primary.png", slot: "assets/ui/slot.png",
    bar: "assets/ui/bar.png", scroll: "assets/ui/scroll.png", tab: "assets/ui/tab.png", toolbar_cell: "assets/ui/toolbar_cell.png",
    hud_frame: "assets/ui/hud_frame.png", portrait_frame: "assets/ui/portrait_frame.png",
    medal: "assets/ui/medal.png", medal_hidden: "assets/ui/medal_hidden.png", cursor: "assets/ui/cursor.png", dungeon_map: "assets/ui/dungeon_map.png",
  },
  uiCells: { currency: 3, menu: 8, materials: 7, products: 10, products_large: 10, status: 7, stats: 4, medal: 6, medal_hidden: 1 },
  font: { galmuri: "assets/font/Galmuri11.woff2" },
};
