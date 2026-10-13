// ============================================================
// 확장/업그레이드. cost 동화. effect 는 sim.js 가 해석하는 키.
//   rooms:+n, seats:+n, soundproof:true, spawnMul:x, patienceMul:x, brewBonus:+n,
//   restMul:x, backdoor:true, nightMul:x, eveningMul:x, still:true, dorm:true, fullRest:true,
//   maxStaff:+n, candidates:+n
// requires: 선행 업그레이드 id / repTier: 필요 평판 단계
// ============================================================
window.UPGRADES = [
  { id: "seats1",     name: "대기실 의자 추가",  cost: 600,   desc: "대기 가능 손님 +2",            effect: { seats: 2 } },
  { id: "sign",       name: "골목 간판",         cost: 1200,  desc: "손님 유입 +20%",               effect: { spawnMul: 1.2 } },
  { id: "tea",        name: "대기실 차 접대",    cost: 1500,  desc: "손님 인내심 +30%",             effect: { patienceMul: 1.3 } },
  { id: "shelf",      name: "향유 선반",         cost: 2000,  desc: "레이나 하루 조향량 +1",        effect: { brewBonus: 1 } },
  { id: "board",      name: "구인 게시판",       cost: 2000,  desc: "매일 구인 후보 3명 → 5명",     effect: { candidates: 2 }, repTier: 1 },
  { id: "room3",      name: "시술 베드 3",       cost: 4000,  desc: "베드 +1",                      effect: { rooms: 1 }, repTier: 1 },
  { id: "soundproof", name: "칸막이 → 방음벽",   cost: 3500,  desc: "소문 상승 -60%. 엿듣기·질투 이벤트가 사라진다", effect: { soundproof: true }, repTier: 1 },
  { id: "backdoor",   name: "뒷문",              cost: 2500,  desc: "체면 있는 손님(상위 직업) 유입. 혈맥 시술 소문 -1", effect: { backdoor: true }, repTier: 1 },
  { id: "book",       name: "예약 장부",         cost: 1800,  desc: "심야 예약 손님 2배",           effect: { nightMul: 2 }, repTier: 1 },
  { id: "seats2",     name: "대기실 확장",       cost: 3000,  desc: "대기 가능 손님 +3",            effect: { seats: 3 }, requires: "seats1", repTier: 1 },
  { id: "still",      name: "조향 증류기",       cost: 8000,  desc: "조향량 +1. 월하향 조향에 필요", effect: { still: true, brewBonus: 1 }, requires: "shelf", repTier: 2 },
  { id: "room4",      name: "시술 베드 4",       cost: 15000, desc: "베드 +1",                      effect: { rooms: 1 }, requires: "room3", repTier: 2 },
  { id: "dorm",       name: "2층 직원 숙소",     cost: 12000, desc: "직원 정원 +2, 고용 직원 일당 -30%, 피로 회복 +50%", effect: { dorm: true, restMul: 1.5, maxStaff: 2 }, repTier: 2 },
  { id: "floor2",     name: "2층 리모델링",      cost: 20000, desc: "직원 정원 +2, 피로 회복 2배, 마감 시 전원 피로 0", effect: { restMul: 2, fullRest: true, maxStaff: 2 }, requires: "dorm", repTier: 2 },
  { id: "lantern",    name: "골목 등불",         cost: 10000, desc: "저녁·심야 유입 +30%",          effect: { eveningMul: 1.3 }, repTier: 2 },
  { id: "room5",      name: "시술 베드 5",       cost: 25000, desc: "베드 +1. 조향실 옆 벽을 튼다", effect: { rooms: 1 }, requires: "room4", repTier: 2 },
  { id: "room6",      name: "시술 베드 6",       cost: 35000, desc: "베드 +1",                      effect: { rooms: 1 }, requires: "room5", repTier: 3 },
  { id: "annex",      name: "별채",              cost: 40000, desc: "직원 정원 +3, 대기 +2",        effect: { maxStaff: 3, seats: 2 }, requires: "floor2", repTier: 3 },
  { id: "room7",      name: "시술 베드 7",       cost: 50000, desc: "베드 +1",                      effect: { rooms: 1 }, requires: "room6", repTier: 3 },
  { id: "room8",      name: "시술 베드 8",       cost: 70000, desc: "베드 +1. 건물이 꽉 찬다",      effect: { rooms: 1 }, requires: "room7", repTier: 3 },
];
// 업적은 src/data/achievements.js
