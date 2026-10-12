// ============================================================
// 등록 인물. 코드 A~E 는 이미지·파일명·대사 전부를 잇는 키.
// GPT: 외형/대사/이벤트 텍스트는 여기와 events.js 를 채운다.
// 능력치는 1~10. technique 손기술 / sense 감각(결 찾기) / stamina 체력 / charm 친절
// ============================================================
window.CHARACTERS = {
  player: {
    id: "player", code: "P", name: "사장", race: "인간", role: "owner",
    title: "시술사",
    stats: { technique: 5, sense: 6, stamina: 5, charm: 4 },
    desc: "결을 손으로 짚어 푸는 드문 시술사. 골목 안쪽 2층 건물에 가게를 열었다.",
    hair: "#5a4634", skin: "#f0c8a0", cloth: "#6b6b7a",
  },
  A: {
    id: "A", code: "A", name: "레이나", race: "엘프", age: 27, role: "staff",
    title: "조향사 겸 접수",
    stats: { technique: 3, sense: 7, stamina: 4, charm: 7 },
    wage: 0, // 창업 멤버
    desc: "점잖고 나른한 잔소리꾼. 향유를 만들고 장부를 본다. 제 몸은 늘 뒷전.",
    quirk: "조향실에 두면 향유를 만들고, 접수대에 두면 손님 인내심이 오른다.",
    hair: "#f1e2a8", skin: "#f6dcc2", cloth: "#3f7a4e",
    line_hire: "",
    line_idle: ["사장님, 장부 먼저 보세요.", "향유가 두 병 남았어요. 느긋하게 말씀드리는 겁니다."],
  },
  B: {
    id: "B", code: "B", name: "네르", race: "묘인족", age: 21, role: "staff",
    title: "견습 시술사",
    stats: { technique: 2, sense: 5, stamina: 7, charm: 6 },
    wage: 0,
    desc: "활발하고 덜렁댄다. 결의 위치는 감으로 알지만 아직 풀지는 못한다. 다락에 산다.",
    quirk: "성장이 빠르다. 보조 배치 시 시술 점수에 보너스.",
    hair: "#e8873a", skin: "#f6dcc2", cloth: "#7a5a3a",
    line_idle: ["사장님! 저 오늘 세 명이나 봤어요!", "꼬리는… 건드리지 마세요. 진짜로요."],
  },
  C: {
    id: "C", code: "C", name: "세르피나", race: "인간", age: 29, role: "vip",
    title: "왕립기사단 파견대 부단장",
    unlock: { repTier: 1, rumorAtLeast: 40 }, // 감찰 명목으로 첫 방문
    prefer: { menu: "knot_vein", part: "허벅지" },
    desc: "엄격하고 원칙적. 수상한 시술소를 감찰한다는 명목으로 처음 온다.",
    hook: "감찰 → 기사단 지정 시술소. 관계가 오르면 근무 후 혼자 온다.",
    hair: "#8a3a2a", skin: "#f0c8a0", cloth: "#243a6b",
    line_first: "감찰이다. 영업 허가증과 장부를 보이도록.",
    line_idle: ["…시술사. 어깨만. 그 이상은 필요 없다."],
  },
  D: {
    id: "D", code: "D", name: "이브레아", race: "인간", age: 25, role: "vip",
    title: "마탑 분원 연구원",
    unlock: { repTier: 1 },
    prefer: { menu: "knot_surface", part: "목" },
    desc: "시니컬한 연구광. 사장의 손을 연구 대상으로 본다. 시술 중 메모하고 측정한다.",
    hook: "측정 데이터 퀘스트. 핑계가 바닥나도 온다.",
    hair: "#1e1a24", skin: "#f6dcc2", cloth: "#6a4a9a",
    line_first: "네 손, 측정해 보고 싶어. 비용은 낼게.",
    line_idle: ["다시 해 봐. 수치가 흔들렸어."],
  },
  E: {
    id: "E", code: "E", name: "카샤", race: "다크엘프", age: 34, role: "vip",
    title: "카르벤 상단 주인",
    unlock: { repTier: 2 },
    prefer: { menu: "knot_vein", part: "목덜미" },
    desc: "여유롭고 도발적. 모든 걸 거래로 계산한다. 향유 재료 거래처이기도 하다.",
    hook: "전속 계약 제안(수입 상승, 자유 하락). 재료 납품가가 관계에 따라 변한다.",
    hair: "#dcdcea", skin: "#7a4a32", cloth: "#9a2a2a",
    line_first: "사장니임. 소문이 운하까지 왔어요. 값은 얼마든지.",
    line_idle: ["계산은 나중에 하죠. 오늘은 그냥."],
  },
};

// 관계 단계 (0~100)
window.RELATION_TIERS = [
  { name: "낯섦", min: 0 },
  { name: "안면", min: 20 },
  { name: "신뢰", min: 45 },
  { name: "각별", min: 75 },
];
