// ============================================================
// 시술 메뉴. price 동화 / duration 게임 분 / difficulty 1~6
// depth: surface 표층 / vein 혈맥.  '심결'은 메뉴에 없다(관계 이벤트 전용, 원칙).
// unlockTier: 필요한 평판 단계.  oil: 필요한 향유 종류(없으면 null)
// ============================================================
window.MENU = [
  { id: "muscle",       name: "근육풀이",     price: 200,  duration: 30, difficulty: 1, depth: "surface", unlockTier: 0, oil: null,   rumor: 0 },
  { id: "oil",          name: "향유 시술",    price: 500,  duration: 45, difficulty: 2, depth: "surface", unlockTier: 0, oil: "calm", rumor: 1 },
  { id: "knot_surface", name: "결풀이·표층",  price: 800,  duration: 45, difficulty: 3, depth: "surface", unlockTier: 1, oil: null,   rumor: 1 },
  { id: "knot_vein",    name: "결풀이·혈맥",  price: 2000, duration: 60, difficulty: 5, depth: "vein",    unlockTier: 2, oil: "warm", rumor: 3, reservation: true },
];

// 향유 종류 (레이나 조향)
window.OILS = {
  calm: { id: "calm", name: "진정 향유", bonus: 8,  desc: "긴장을 낮춘다. 향유 시술 기본." },
  warm: { id: "warm", name: "온열 향유", bonus: 14, desc: "혈맥을 연다. 결풀이·혈맥에 필요." },
  moon: { id: "moon", name: "월하향",    bonus: 25, desc: "선반에 없다. 레이나만 안다.", hidden: true },
};
