// ============================================================
// 확장/업그레이드. cost 동화. effect 는 sim.js 가 해석하는 키.
//   rooms:+n, seats:+n, soundproof:true, spawnMul:x, patienceMul:x, brewBonus:+n,
//   restMul:x, backdoor:true, nightMul:x, still:true, dorm:true
// requires: 선행 업그레이드 id / repTier: 필요 평판 단계
// ============================================================
window.UPGRADES = [
  { id: "seats1",     name: "대기실 의자 추가",  cost: 600,   desc: "대기 가능 손님 +2",            effect: { seats: 2 } },
  { id: "sign",       name: "골목 간판",         cost: 1200,  desc: "손님 유입 +20%",               effect: { spawnMul: 1.2 } },
  { id: "tea",        name: "대기실 차 접대",    cost: 1500,  desc: "손님 인내심 +30%",             effect: { patienceMul: 1.3 } },
  { id: "shelf",      name: "향유 선반",         cost: 2000,  desc: "레이나 하루 조향량 +1",        effect: { brewBonus: 1 } },
  { id: "room3",      name: "시술실 3호",        cost: 4000,  desc: "시술실 +1",                    effect: { rooms: 1 }, repTier: 1 },
  { id: "soundproof", name: "칸막이 → 방음벽",   cost: 3500,  desc: "소문 상승 -60%. 엿듣기·질투 이벤트가 사라진다", effect: { soundproof: true }, repTier: 1 },
  { id: "backdoor",   name: "뒷문",              cost: 2500,  desc: "체면 있는 손님(상위 직업) 유입. 혈맥 시술 소문 -1", effect: { backdoor: true }, repTier: 1 },
  { id: "book",       name: "예약 장부",         cost: 1800,  desc: "심야 예약 손님 2배",           effect: { nightMul: 2 }, repTier: 1 },
  { id: "seats2",     name: "대기실 확장",       cost: 3000,  desc: "대기 가능 손님 +3",            effect: { seats: 3 }, requires: "seats1", repTier: 1 },
  { id: "still",      name: "조향 증류기",       cost: 8000,  desc: "조향량 +1. 월하향 조향에 필요", effect: { still: true, brewBonus: 1 }, requires: "shelf", repTier: 2 },
  { id: "room4",      name: "시술실 4호",        cost: 15000,  desc: "시술실 +1",                    effect: { rooms: 1 }, requires: "room3", repTier: 2 },
  { id: "dorm",       name: "2층 직원 숙소",     cost: 12000,  desc: "고용 직원 일당 -30%, 피로 회복 +50%", effect: { dorm: true, restMul: 1.5 }, repTier: 2 },
  { id: "floor2",     name: "2층 리모델링",      cost: 20000, desc: "직원 피로 회복 2배, 마감 시 전원 피로 0", effect: { restMul: 2, fullRest: true }, requires: "dorm", repTier: 2 },
  { id: "lantern",    name: "골목 등불",         cost: 10000,  desc: "저녁·심야 유입 +30%",          effect: { eveningMul: 1.3 }, repTier: 2 },
];

// 목표(마일스톤). 달성하면 보상. when 은 sim.js 가 해석.
window.MILESTONES = [
  { id: "m_first",   name: "첫 손님",            when: { served: 1 },        reward: { money: 300 },  text: "첫 손님이 다녀갔다." },
  { id: "m_s",       name: "첫 S등급",           when: { bestGrade: "S" },   reward: { rep: 20 },     text: "손끝이 맞아떨어진 날." },
  { id: "m_10",      name: "시술 10회",          when: { served: 10 },       reward: { money: 800 } },
  { id: "m_tier1",   name: "입소문",             when: { repTier: 1 },       reward: { money: 1500 }, text: "골목에서 가게 이름이 오르내린다." },
  { id: "m_regular", name: "단골 3명",           when: { regulars: 3 },      reward: { rep: 30 } },
  { id: "m_hire",    name: "첫 고용",            when: { hired: 1 },         reward: { money: 1000 } },
  { id: "m_50",      name: "시술 50회",          when: { served: 50 },       reward: { money: 3000 } },
  { id: "m_tier2",   name: "단골 가게",          when: { repTier: 2 },       reward: { money: 5000 }, text: "저녁이면 자리가 찬다." },
  { id: "m_rooms3",  name: "시술실 3칸",         when: { rooms: 3 },         reward: { rep: 40 } },
  { id: "m_vip3",    name: "엘리트 손님 셋",     when: { vips: 3 },          reward: { money: 5000 } },
  { id: "m_trust",   name: "누군가의 신뢰",      when: { relationAny: 45 },  reward: { rep: 50 } },
  { id: "m_200",     name: "시술 200회",         when: { served: 200 },      reward: { money: 10000 } },
  { id: "m_tier3",   name: "골목 명소",          when: { repTier: 3 },       reward: { money: 20000 }, text: "의회 서기가 예약을 잡는다." },
  { id: "m_rooms4",  name: "시술실 4칸",         when: { rooms: 4 },         reward: { rep: 80 } },
  { id: "m_special", name: "각별한 사이",        when: { relationAny: 75 },  reward: { rep: 100 } },
  { id: "m_regular15", name: "단골 15명",       when: { regulars: 15 },     reward: { money: 8000 }, text: "골목이 가게 이름으로 길을 가르쳐 준다." },
  { id: "m_500",     name: "시술 500회",         when: { served: 500 },      reward: { money: 30000 } },
  { id: "m_trustall", name: "다섯 사람의 신뢰",  when: { relationAll: 45 },  reward: { rep: 150 }, text: "칸막이 너머 소문보다 가게 안 사람들이 먼저였다." },
  { id: "m_staff6",  name: "직원 여섯",          when: { staff: 6 },         reward: { money: 5000 } },
];
