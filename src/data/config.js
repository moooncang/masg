// ============================================================
// 게임 수치 설정. GPT/작가님이 밸런스를 조정하는 곳.
// 돈 단위는 전부 '동화'. 금화 1 = 은화 10 = 동화 1,000 → 은화 1 = 동화 100
// ============================================================
window.CONFIG = {
  SHOP_DEFAULT_NAME: "골목 시술소",

  // 시간: 하루 09:00 ~ 24:00 (900분). 1x 속도에서 실제 1초 = 게임 1분 (하루 15분, 4x 면 약 4분)
  DAY_START_MIN: 9 * 60,
  DAY_END_MIN: 24 * 60,
  MINUTES_PER_SECOND: 1,
  PHASES: [
    { id: "day",     name: "낮",   start: 9 * 60,  spawnMul: 1.0 },
    { id: "evening", name: "저녁", start: 17 * 60, spawnMul: 1.3 },
    { id: "night",   name: "심야", start: 21 * 60, spawnMul: 0.35, reservationOnly: true },
  ],

  START_MONEY: 2000,          // 금 2
  DAILY_UPKEEP: 800,          // 하루 기본 유지비 (은 8)
  UPKEEP_PER_ROOM: 400,       // 시술실당 유지비
  UPKEEP_PER_TIER: 1500,      // 평판 단계당 (명소가 되면 의회세가 붙는다)
  START_ROOMS: 2,             // 시술 베드
  MAX_ROOMS: 8,
  START_MAX_STAFF: 5,         // 직원 정원 (사장 포함). 숙소 확장으로 늘어난다
  START_SEATS: 3,             // 대기실 의자

  // 손님 생성
  SPAWN_BASE_CHANCE: 0.011,    // 게임 1분마다 (기본 하루 10명 안팎)
  SPAWN_REP_BONUS: 0.3,       // 평판 단계당 가산 배율
  PATIENCE_MIN: 50,           // 게임 분
  PATIENCE_MAX: 90,
  LEAVE_ANGRY_REP: -6,

  // 단골
  REGULAR_CHANCE: 0.15,       // S/A 등급 일반 손님이 단골이 될 확률
  REGULAR_MAX: 30,
  REGULAR_SPAWN_RATIO: 0.3,   // 손님 생성 시 단골이 올 비율
  REGULAR_TIP: 0.15,

  // 평판 단계 (수치 기준)
  REP_TIERS: [
    { id: 0, name: "무명",       min: 0 },
    { id: 1, name: "입소문",     min: 150 },
    { id: 2, name: "단골 가게",  min: 450 },
    { id: 3, name: "골목 명소",  min: 900 },
  ],
  RUMOR_INSPECTION_AT: 70,    // 소문이 이 값에 닿으면 감찰 이벤트
  RUMOR_DECAY_PER_DAY: 5,
  OVERHEAR_CHANCE: 0.3,       // 방음 없이 혈맥 시술 시 대기 손님이 엿들을 확률
  JEALOUSY_CHANCE: 0.15,      // 사장이 VIP 시술 시 직원 질투 확률

  // 시술 판정
  GRADE: { S: 85, A: 70, B: 50 },      // 점수 하한
  GRADE_PAY_MUL: { S: 1.5, A: 1.2, B: 1.0, C: 0.6 },
  GRADE_REP: { S: 4, A: 3, B: 1, C: -4 },
  GRADE_XP_MUL: { S: 1.5, A: 1.2, B: 1.0, C: 0.7 },
  VIP_TIP: 0.3,               // 엘리트 손님 추가 지불

  // 직원
  FATIGUE_PER_TREATMENT: 14,
  FATIGUE_RECOVER_PER_MIN: 0.25,
  FATIGUE_PENALTY_AT: 75,
  XP_PER_LEVEL: 100,
  HIRE_CANDIDATES: 3,

  // 향유 가격 (상단에서 구매, 1병)
  OIL_PRICE: { calm: 150, warm: 300 },
  OIL_BREW_PER_DAY: 2,        // 레이나가 조향실에 있을 때 하루 생산량
  MOON_BREW_EVERY: 3,         // 월하향 해금 후 며칠에 1병

  // 관계
  TALK_PER_DAY: 1,            // 인물당 하루 대화 횟수
  GIFT_RELATION: 3,           // 향유 선물 시 관계 상승
  OUTCALL_MIN_REL: 20,        // 출장 가능 관계
  OUTCALL_DURATION: 120,      // 게임 분
  OUTCALL_PAY: 3000,
  OUTCALL_RELATION: 4,
  OUTCALL_LAST_START: 20 * 60, // 이 시각 이후엔 출장 불가

  // 엘리트 훅
  CONTRACT_DAILY: 1000,       // 카샤 전속 계약 일당
  CONTRACT_RUMOR: 2,          // 계약 중 하루 소문 상승
  D_QUEST_COUNT: 5,           // 이브레아 측정 퀘스트에 필요한 시술 횟수

  // 엘리트 영입
  RECRUIT_MIN_REL: 75,
  ELITE_WAGE: 800,

  // 게임 목표: 카르벤 상단에서 빌린 개업 자금. dueDay 째 아침까지 total 을 갚아야 한다.
  // milestones: 중간 독촉 (해당 날 아침에 갚은 액수가 모자라면 경고). 기한을 못 지키면 한 번은 연장(이자 extendRate, extendDays).
  DEBT: { total: 250000, dueDay: 30, milestones: [{ day: 10, amount: 40000 }, { day: 20, amount: 120000 }], extendRate: 0.25, extendDays: 10, payUnits: [1000, 5000, 10000] },

  SAVE_KEY: "masg_save_v1",
  SAVE_VERSION: 4,
};
