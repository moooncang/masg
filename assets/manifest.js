// ============================================================
// 에셋 매니페스트 — HD 세계(1672×941) 기준. docs/GPT_ASSET_ORDER.md 2차 발주 계약을 그대로 읽는다.
// 셀 규칙: 캐릭터 시트 96×96 ×4프레임 ×7행 / 눕기 192×96 ×2행 / 아이콘 64px 셀 / 프레임 9-slice 모서리 16px
// ============================================================
window.ASSETS = {
  world: [1672, 941],
  sheet: { cell: 96, cols: 4, rows: { idle: 0, walk_down: 1, walk_up: 2, walk_side: 3, sit: 4, work: 5, recept: 6 }, frames: { idle: 2, walk_down: 4, walk_up: 4, walk_side: 4, sit: 2, work: 2, recept: 2 }, fps: { idle: 2, walk_down: 8, walk_up: 8, walk_side: 8, sit: 1, work: 3, recept: 1 } },
  lie: { w: 192, h: 96, frames: 2, fps: 1 },
  sheetCodes: ["P", "A", "B", "C", "D", "E", "C_staff", "D_staff", "E_staff", "cust_human_f", "cust_human_m", "cust_elf_f", "cust_elf_m", "cust_beast_f", "cust_beast_m", "cust_dwarf_f", "cust_dwarf_m", "cust_dragon_f", "cust_dragon_m"],
  lieCodes: ["C", "D", "E", "cust_human_f", "cust_human_m", "cust_elf_f", "cust_elf_m", "cust_beast_f", "cust_beast_m", "cust_dwarf_f", "cust_dwarf_m", "cust_dragon_f", "cust_dragon_m"],
  hairCodes: ["cust_human_f", "cust_human_m", "cust_elf_f", "cust_elf_m", "cust_beast_f", "cust_beast_m", "cust_dwarf_f", "cust_dwarf_m", "cust_dragon_f", "cust_dragon_m"],
  sheetPath: (c) => `assets/sprites/hd/${c}_sheet.png`,
  liePath: (c) => `assets/sprites/hd/${c}_lie.png`,
  hairPath: (c) => `assets/sprites/hd/${c}_hair.png`,
  shadow: "assets/sprites/hd/shadow.png",
  // 초상: 목록용 128, 대화·관계용 반신 256
  portraits: { A: "assets/sprites/hd/face_A_2.png", B: "assets/sprites/hd/face_B_2.png", C: "assets/sprites/hd/face_C_2.png", D: "assets/sprites/hd/face_D_2.png", E: "assets/sprites/hd/face_E_2.png" },
  portrait: (code, mood) => `assets/sprites/hd/face_${code}_${mood || 2}.png`,
  bust: (code, mood) => `assets/sprites/hd/bust_${code}_${mood || 2}.png`,
  bg: { floor1: "assets/bg/hd/floor1.webp", floor1_night: "assets/bg/hd/floor1_night.webp", outer: "assets/bg/hd/outer.png", abyss: "assets/bg/hd/abyss_entrance.webp" },
  loading: { bg: "assets/ui/hd/loading_bg.webp", bg_day: "assets/ui/hd/loading_bg_day.webp", logo: "assets/ui/hd/logo.png", lantern: "assets/ui/hd/loading_lantern.png", bar: "assets/ui/hd/loading_bar.png", button: "assets/ui/hd/title_button.png" },
  // 화면 소품 (캔버스가 그린다)
  props: { bubble: "assets/ui/hd/bubble.png", emotes: "assets/ui/hd/emotes.png", plate: "assets/ui/hd/plate.png", lock: "assets/ui/hd/lock.png", bar_round: "assets/ui/hd/bar_round.png", ring: "assets/ui/hd/shadow_ring.png" },
  emote: { heart: 0, anger: 1, sweat: 2, note: 3, zzz: 4, question: 5, sparkle: 6, coin: 7 },
  // UI 아틀라스 (64px 셀)와 스킨
  ui: {
    currency: "assets/ui/hd/currency.png", menu: "assets/ui/hd/menu.png", materials: "assets/ui/hd/materials.png",
    products: "assets/ui/hd/products.png", products_large: "assets/ui/hd/products_large.png",
    status: "assets/ui/hd/status.png", stats: "assets/ui/hd/stats.png", medal: "assets/ui/hd/medal.png", medal_hidden: "assets/ui/hd/medal_hidden.png",
    hud_frame: "assets/ui/hd/hud_frame.png", window_frame: "assets/ui/hd/window_frame.png", window_title: "assets/ui/hd/window_title.png", chip: "assets/ui/hd/chip.png",
    button: "assets/ui/hd/button.png", button_primary: "assets/ui/hd/button_primary.png", slot: "assets/ui/hd/slot.png", tab: "assets/ui/hd/tab.png",
    toolbar_cell: "assets/ui/hd/toolbar_cell.png", scroll: "assets/ui/hd/scroll.png", map: "assets/ui/hd/map.png",
  },
  uiCells: { currency: 3, menu: 8, materials: 7, products: 10, products_large: 10, status: 7, stats: 4, medal: 6, medal_hidden: 1 },
  uiCell: { products_large: 128 },   // 기본 64
  font: { galmuri: "assets/font/Galmuri11.woff2" },
};
