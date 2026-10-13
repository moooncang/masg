// ============================================================
// 던전(심연구) 파밍 + 아이템 제작
// ============================================================
window.DUNGEON = {
  name: "심연구",
  // 깊이. duration 게임 분. need: 평판 단계 / 직원 최소 레벨. fatigue: 돌아왔을 때 피로.
  depths: [
    { id: 1, name: "1층 · 입구 동굴", duration: 120, repTier: 0, minLevel: 1, fatigue: 30, knotChance: 0.0,  lootRolls: 2, desc: "약초와 온천수. 신참도 간다." },
    { id: 2, name: "2층 · 마력 수맥",  duration: 240, repTier: 1, minLevel: 3, fatigue: 50, knotChance: 0.15, lootRolls: 3, desc: "마력 결정이 맺힌다. 결이 생길 수 있다." },
    { id: 3, name: "3층 · 심연 정원",  duration: 360, repTier: 2, minLevel: 5, fatigue: 70, knotChance: 0.35, lootRolls: 4, desc: "월하 꽃과 용린. 돌아오면 전신에 결." },
  ],
  MAX_PARTY: 3,
  // 깊이별 전리품 표 (weight). 감각이 높으면 희귀 쪽 가중치가 오른다.
  loot: {
    1: [ { id: "herb", w: 6 }, { id: "spring", w: 4 }, { id: "crystal", w: 1 } ],
    2: [ { id: "herb", w: 3 }, { id: "spring", w: 2 }, { id: "crystal", w: 4 }, { id: "silk", w: 2 }, { id: "moonflower", w: 0.5 } ],
    3: [ { id: "crystal", w: 3 }, { id: "silk", w: 2 }, { id: "moonflower", w: 2 }, { id: "scale", w: 2 }, { id: "core", w: 0.7 } ],
  },
  lines: {
    depart: ["횃불을 들고 심연구로 내려갔다.", "입구 경비가 가게 이름을 듣고 고개를 끄덕였다.", "\"다녀오겠습니다!\" 목소리가 골목에 울렸다."],
    return: ["흙투성이로 돌아왔다. 주머니가 묵직하다.", "\"3층은 다음에요…\" 그래도 가방은 찼다.", "입구에서 모험가들과 마주쳤다. 몇 명이 가게 위치를 물었다."],
    knot: ["돌아온 직원의 등에 결이 맺혔다. 마력 수맥 탓이다.", "\"허리가… 사장님, 저 손님으로 받아 주세요.\""],
    empty: ["빈손이다. 수맥이 말라 있었다.", "길을 잃어 입구만 돌다 왔다."],
  },
};

window.MATERIALS = {
  herb:       { id: "herb",       name: "진정초",     desc: "입구 동굴 그늘의 약초. 진정 향유 재료.", sell: 40 },
  spring:     { id: "spring",     name: "온천수",     desc: "지하 온천의 물. 온열 향유·수건 재료.", sell: 50 },
  crystal:    { id: "crystal",    name: "마력 결정",  desc: "수맥에 맺힌 결정. 온열 향유·부적 재료.", sell: 150 },
  silk:       { id: "silk",       name: "동굴 거미줄", desc: "질기고 부드럽다. 시트 재료.", sell: 120 },
  moonflower: { id: "moonflower", name: "월하 꽃",    desc: "심연 정원에서만 핀다. 월하향 재료.", sell: 400 },
  scale:      { id: "scale",      name: "용린 조각",  desc: "용인들이 벗어 둔 비늘. 베드 보강재.", sell: 350 },
  core:       { id: "core",       name: "마력핵 파편", desc: "매우 드물다. 마력 부적의 심.", sell: 900 },
};

// 제작. cost: 재료. result: oil / item / equip. needStill: 증류기 필요
// item(소모품)은 use 효과, equip(설비)은 영구 효과 1회
window.RECIPES = [
  { id: "r_calm",    name: "진정 향유",      cost: { herb: 2 },                       result: { oil: "calm", n: 1 } },
  { id: "r_warm",    name: "온열 향유",      cost: { herb: 1, spring: 1, crystal: 1 }, result: { oil: "warm", n: 1 } },
  { id: "r_moon",    name: "월하향",         cost: { moonflower: 1, crystal: 2 },      result: { oil: "moon", n: 1 }, needStill: true, needOil: "moon" },
  { id: "r_towel",   name: "온열 수건",      cost: { spring: 2 },                      result: { item: "towel", n: 2 } },
  { id: "r_candle",  name: "진정 향초",      cost: { herb: 3, spring: 1 },             result: { item: "candle", n: 1 } },
  { id: "r_charm",   name: "마력 부적",      cost: { crystal: 3, core: 1 },            result: { item: "charm", n: 1 } },
  { id: "r_sheet",   name: "거미줄 시트",    cost: { silk: 4 },                        result: { equip: "sheet" } },
  { id: "r_bed",     name: "용린 베드 보강", cost: { scale: 3, silk: 2 },              result: { equip: "bedplate" } },
  { id: "r_lamp",    name: "마력 등불",      cost: { crystal: 5, core: 1 },            result: { equip: "lamp" } },
  { id: "r_tonic",   name: "회복 강장제",    cost: { herb: 2, crystal: 1 },            result: { item: "tonic", n: 1 } },
];

window.ITEMS = {
  towel:  { id: "towel",  name: "온열 수건",   kind: "item",  desc: "직원 한 명 피로 −40. 즉시 사용.", use: { staffRest: 40 } },
  candle: { id: "candle", name: "진정 향초",   kind: "item",  desc: "오늘 하루 대기 손님 인내심 +40%.", use: { dayPatience: 1.4 } },
  charm:  { id: "charm",  name: "마력 부적",   kind: "item",  desc: "오늘 하루 모든 시술 점수 +8.", use: { dayScore: 8 } },
  tonic:  { id: "tonic",  name: "회복 강장제", kind: "item",  desc: "사장 피로 0. 즉시 사용.", use: { playerRest: 100 } },
  sheet:    { id: "sheet",    name: "거미줄 시트",    kind: "equip", desc: "모든 시술 대금 +8%.",   equip: { payMul: 1.08 } },
  bedplate: { id: "bedplate", name: "용린 베드 보강", kind: "equip", desc: "시술 시간 −10%.",        equip: { durationMul: 0.9 } },
  lamp:     { id: "lamp",     name: "마력 등불",      kind: "equip", desc: "심야 손님 +50%, 소문 −1/일.", equip: { nightMul: 1.5, rumorDecay: 1 } },
};
