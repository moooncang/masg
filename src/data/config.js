// ============================================================
// 게임 수치 설정. GPT/작가님이 밸런스를 조정하는 곳.
// 돈 단위는 전부 '동화'. 금화 1 = 은화 10 = 동화 1,000 → 은화 1 = 동화 100
// ============================================================
window.CONFIG = {
  SHOP_DEFAULT_NAME: "골목 시술소",

  // 시간: 하루 09:00 ~ 24:00 (900분). 1x 속도에서 실제 1초 = 게임 5분
  DAY_START_MIN: 9 * 60,
  DAY_END_MIN: 24 * 60,
  MINUTES_PER_SECOND: 5,
  PHASES: [
    { id: "day",     name: "낮",   start: 9 * 60,  spawnMul: 1.0 },
    { id: "evening", name: "저녁", start: 17 * 60, spawnMul: 1.3 },
    { id: "night",   name: "심야", start: 21 * 60, spawnMul: 0.35, reservationOnly: true },
  ],

  START_MONEY: 2000,          // 금 2
  DAILY_UPKEEP: 500,          // 하루 유지비 (은 5)
  START_ROOMS: 2,             // 시술실
  MAX_ROOMS: 4,
  START_SEATS: 3,             // 대기실 의자

  // 손님 생성
  SPAWN_BASE_CHANCE: 0.02,   // 게임 1분마다
  SPAWN_REP_BONUS: 0.3,       // 평판 단계당 가산 배율
  PATIENCE_MIN: 50,           // 게임 분
  PATIENCE_MAX: 90,
  LEAVE_ANGRY_REP: -6,

  // 평판 단계 (수치 기준)
  REP_TIERS: [
    { id: 0, name: "무명",       min: 0 },
    { id: 1, name: "입소문",     min: 150 },
    { id: 2, name: "단골 가게",  min: 450 },
    { id: 3, name: "골목 명소",  min: 900 },
  ],
  RUMOR_INSPECTION_AT: 70,    // 소문이 이 값에 닿으면 감찰 이벤트
  RUMOR_DECAY_PER_DAY: 4,

  // 시술 판정
  GRADE: { S: 85, A: 70, B: 50 },      // 점수 하한
  GRADE_PAY_MUL: { S: 1.5, A: 1.2, B: 1.0, C: 0.6 },
  GRADE_REP: { S: 6, A: 4, B: 2, C: -4 },
  GRADE_XP_MUL: { S: 1.5, A: 1.2, B: 1.0, C: 0.7 },

  // 직원
  FATIGUE_PER_TREATMENT: 14,
  FATIGUE_RECOVER_PER_MIN: 0.25,
  FATIGUE_PENALTY_AT: 75,
  XP_PER_LEVEL: 100,
  HIRE_CANDIDATES: 3,

  // 향유 가격 (상단에서 구매, 1병)
  OIL_PRICE: { calm: 150, warm: 300 },
  OIL_BREW_PER_DAY: 2,        // 레이나가 조향실에 있을 때 하루 생산량

  SAVE_KEY: "masg_save_v1",
};
