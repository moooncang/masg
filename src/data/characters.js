// ============================================================
// 엘리트 인물 5인. 코드 A~E 는 이미지·파일명·대사 전부를 잇는 키.
// A·B = 엘리트 직원(창업 멤버), C·D·E = 엘리트 손님(VIP)
// 능력치는 1~10. technique 손기술 / sense 감각(결 찾기) / stamina 체력 / charm 친절
// GPT: 외형/대사/이벤트 텍스트는 여기와 dialogues.js, events.js 를 채운다.
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
    id: "A", code: "A", name: "레이나", race: "엘프", age: 27, role: "staff", elite: true,
    title: "조향사 겸 접수",
    stats: { technique: 3, sense: 7, stamina: 4, charm: 7 },
    wage: 0,
    traits: ["조향사"],
    desc: "점잖고 나른한 잔소리꾼. 향유를 만들고 장부를 본다. 제 몸은 늘 뒷전.",
    quirk: "조향실: 매일 향유 생산. 접수대: 손님 유입 +15%, VIP 등장 확률 +50%.",
    hook: "관계 45: 폐점 후 자기 시술. 관계 75: 금지 배합 '월하향'.",
    hair: "#f1e2a8", skin: "#f6dcc2", cloth: "#3f7a4e",
    line_idle: ["사장님, 장부 먼저 보세요.", "향유가 두 병 남았어요. 느긋하게 말씀드리는 겁니다."],
  },
  B: {
    id: "B", code: "B", name: "네르", race: "묘인족", age: 21, role: "staff", elite: true,
    title: "견습 시술사",
    stats: { technique: 2, sense: 5, stamina: 7, charm: 6 },
    wage: 0,
    traits: ["성장기"],
    desc: "활발하고 덜렁댄다. 결의 위치는 감으로 알지만 아직 풀지는 못한다. 다락에 산다.",
    quirk: "경험치 1.5배. 대기 중이면 다른 직원 시술에 +4 보조.",
    hook: "관계 45: 꼬리 뿌리의 결. 관계 75 + Lv.5: 정식 시술사.",
    hair: "#e8873a", skin: "#f6dcc2", cloth: "#7a5a3a",
    line_idle: ["사장님! 저 오늘 세 명이나 봤어요!", "꼬리는… 건드리지 마세요. 진짜로요."],
  },
  C: {
    id: "C", code: "C", name: "세르피나", race: "인간", age: 29, role: "vip", elite: true,
    title: "왕립기사단 파견대 부단장",
    unlock: { repTier: 1, rumorAtLeast: 20 },
    prefer: { menu: "knot_vein", part: "허벅지" },
    place: "주둔지",
    desc: "엄격하고 원칙적. 수상한 시술소를 감찰한다는 명목으로 처음 온다.",
    hook: "관계 45: 기사단 지정 시술소 (기사단 손님 유입, 소문 감소 2배).",
    hair: "#8a3a2a", skin: "#f0c8a0", cloth: "#243a6b",
    line_idle: ["…시술사. 어깨만. 그 이상은 필요 없다.", "부하들에겐 말하지 마라."],
  },
  D: {
    id: "D", code: "D", name: "이브레아", race: "인간", age: 25, role: "vip", elite: true,
    title: "마탑 분원 연구원",
    unlock: { repTier: 1 },
    prefer: { menu: "knot_surface", part: "목" },
    place: "마탑 분원",
    desc: "시니컬한 연구광. 사장의 손을 연구 대상으로 본다. 시술 중 메모하고 측정한다.",
    hook: "측정 퀘스트: 시술 5회 → 보상. 관계 75: 측정 마도구.",
    hair: "#1e1a24", skin: "#f6dcc2", cloth: "#6a4a9a",
    line_idle: ["다시 해 봐. 수치가 흔들렸어.", "기록용이야. 다른 뜻은 없어."],
  },
  E: {
    id: "E", code: "E", name: "카샤", race: "다크엘프", age: 34, role: "vip", elite: true,
    title: "카르벤 상단 주인",
    unlock: { repTier: 2 },
    prefer: { menu: "knot_vein", part: "목덜미" },
    place: "운하변 저택",
    desc: "여유롭고 도발적. 모든 걸 거래로 계산한다. 향유 재료 거래처이기도 하다.",
    hook: "관계 45: 전속 계약 제안 (일당 금1, 소문↑, 다른 VIP 발길↓). 관계 45: 재료 20% 할인.",
    hair: "#dcdcea", skin: "#7a4a32", cloth: "#9a2a2a",
    line_idle: ["계산은 나중에 하죠. 오늘은 그냥.", "사장니임, 값을 올려도 돼요. 제가 낼 테니."],
  },
};

// 관계 단계 (0~100)
window.RELATION_TIERS = [
  { name: "낯섦", min: 0 },
  { name: "안면", min: 20 },
  { name: "신뢰", min: 45 },
  { name: "각별", min: 75 },
];

// 구인 특성. 일반 직원은 1개를 무작위로 받는다.
window.TRAITS = {
  "조향사":   { desc: "향유를 만든다 (레이나 전용)" },
  "성장기":   { desc: "경험치 1.5배 (네르 전용)", xpMul: 1.5 },
  "성실":     { desc: "피로 누적 -30%", fatigueMul: 0.7 },
  "눈썰미":   { desc: "시술 점수 +4", scoreBonus: 4 },
  "수다쟁이": { desc: "친절 +1, 시술마다 소문 +0.5", charmBonus: 1, rumorAdd: 0.5 },
  "야행성":   { desc: "심야 시술 점수 +10, 낮 -3", nightBonus: 10, dayPenalty: 3 },
  "손이 큼":  { desc: "대금 +10%, 향유 소모 2배", payMul: 1.1, oilMul: 2 },
};
