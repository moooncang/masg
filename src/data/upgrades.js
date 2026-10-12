// ============================================================
// 확장/업그레이드. cost 동화. effect 는 sim.js 가 해석하는 키.
//   rooms:+n, seats:+n, soundproof:true, spawnMul:x, patienceMul:x, brewBonus:+n, signboard:true
// requires: 선행 업그레이드 id / repTier: 필요 평판 단계
// ============================================================
window.UPGRADES = [
  { id: "seats1",     name: "대기실 의자 추가",  cost: 600,   desc: "대기 가능 손님 +2",            effect: { seats: 2 } },
  { id: "sign",       name: "골목 간판",         cost: 1200,  desc: "손님 유입 +20%",               effect: { spawnMul: 1.2 } },
  { id: "room3",      name: "시술실 3호",        cost: 4000,  desc: "시술실 +1",                    effect: { rooms: 1 }, repTier: 1 },
  { id: "soundproof", name: "칸막이 → 방음벽",   cost: 3500,  desc: "소문 상승 -60%. 대신 오해·질투 이벤트가 줄어든다", effect: { soundproof: true }, repTier: 1 },
  { id: "shelf",      name: "향유 선반",         cost: 2000,  desc: "레이나 하루 조향량 +1",        effect: { brewBonus: 1 } },
  { id: "tea",        name: "대기실 차 접대",    cost: 1500,  desc: "손님 인내심 +30%",             effect: { patienceMul: 1.3 } },
  { id: "room4",      name: "시술실 4호",        cost: 9000,  desc: "시술실 +1",                    effect: { rooms: 1 }, requires: "room3", repTier: 2 },
  { id: "floor2",     name: "2층 리모델링",      cost: 12000, desc: "직원 피로 회복 2배",           effect: { restMul: 2 }, repTier: 2 },
];
