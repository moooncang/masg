// ============================================================
// 에셋 매니페스트. 파일이 있으면 로드해서 쓰고, 없으면 엔진이 색 블록으로 대체한다.
// GPT: 이미지를 만들면 여기 경로에 맞춰 넣기만 하면 된다. 규격은 docs/ASSET_SPEC.md
// ============================================================
window.ASSETS = {
  // 캐릭터 워킹 스프라이트: 16x24, 가로 4프레임(아래/왼/오른/위 중 1방향 4프레임), 한 줄
  sprites: {
    P: "assets/sprites/char_P.png",
    A: "assets/sprites/char_A.png",
    B: "assets/sprites/char_B.png",
    C: "assets/sprites/char_C.png",
    D: "assets/sprites/char_D.png",
    E: "assets/sprites/char_E.png",
    human_f: "assets/sprites/cust_human_f.png",
    human_m: "assets/sprites/cust_human_m.png",
    elf_f: "assets/sprites/cust_elf_f.png",
    elf_m: "assets/sprites/cust_elf_m.png",
    beast_f: "assets/sprites/cust_beast_f.png",
    beast_m: "assets/sprites/cust_beast_m.png",
    dwarf_f: "assets/sprites/cust_dwarf_f.png",
    dwarf_m: "assets/sprites/cust_dwarf_m.png",
    dragon_f: "assets/sprites/cust_dragon_f.png",
    dragon_m: "assets/sprites/cust_dragon_m.png",
  },
  // 초상화: 64x64, 상황 코드 1~10 (챗봇과 동일). 지금은 2(평소)만 쓴다
  portraits: {
    A: "assets/sprites/face_A_2.png",
    B: "assets/sprites/face_B_2.png",
    C: "assets/sprites/face_C_2.png",
    D: "assets/sprites/face_D_2.png",
    E: "assets/sprites/face_E_2.png",
  },
  // 배경: 384x216 평면도 타일맵 (1층 전체). 없으면 엔진이 방 구획을 그린다
  bg: {
    floor1: "assets/bg/floor1.png",
    floor1_night: "assets/bg/floor1_night.png",
  },
  ui: {
    icons: "assets/ui/icons.png", // 16x16 아이콘 시트 (동전/하트/향유병/결/시계)
  },
};
