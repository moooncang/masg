// ============================================================
// 이벤트. 개점 시 무작위 하루 이벤트 + 조건 이벤트.
// GPT: 텍스트를 채우고 새 이벤트를 추가한다. effect 키는 sim.js 참조.
//   effect: { spawnMul:x, rumor:+n, rep:+n, money:+n, relation:{code:+n} }
// ============================================================
window.DAILY_EVENTS = [
  { id: "expedition", name: "대원정 귀환", chance: 0.08, minTier: 0,
    text: "심연구에서 원정대가 돌아왔다. 골목이 결을 단 사람들로 북적인다.",
    effect: { spawnMul: 2.0 } },
  { id: "rain", name: "장마", chance: 0.10, minTier: 0,
    text: "비가 종일 내린다. 손님 발길이 뜸하다.",
    effect: { spawnMul: 0.6 } },
  { id: "festival", name: "축제", chance: 0.05, minTier: 1,
    text: "성문구에서 축제가 열렸다. 외지인이 몰린다.",
    effect: { spawnMul: 1.5, rumor: 3 } },
  { id: "rival", name: "경쟁 시술소", chance: 0.05, minTier: 1,
    text: "건너편에 새 시술소가 문을 열었다. 손님 일부가 그쪽으로 간다.",
    effect: { spawnMul: 0.75 } },
  { id: "tower_accident", name: "마탑 실험 사고", chance: 0.04, minTier: 1,
    text: "첨탑구에서 실험 사고. 결이 심하게 맺힌 마법사들이 찾아온다.",
    effect: { spawnMul: 1.3, veinBias: 2 } },
];

// 조건 이벤트 (sim.js 가 조건을 체크해 1회 발동)
window.STORY_EVENTS = [
  { id: "inspection", once: false,
    when: { rumorAtLeast: 70 },
    title: "위생 감찰",
    text: "의회에서 감찰관이 나왔다. 칸막이 너머 소문이 여기까지 닿은 모양이다.\n장부를 보이고 하루 영업을 멈춘다.",
    effect: { rumor: -50, rep: -30, closeToday: true } },
  { id: "C_first", once: true,
    when: { vipUnlocked: "C" },
    title: "감찰",
    text: "제복 차림의 여자가 문을 열었다. 왕립기사단 파견대 부단장, 세르피나.\n\"감찰이다. 영업 허가증과 장부를 보이도록.\"",
    effect: { relation: { C: 5 } } },
  { id: "D_first", once: true,
    when: { vipUnlocked: "D" },
    title: "측정",
    text: "안경 쓴 연구원이 측정 마도구를 꺼냈다. 마탑 분원의 이브레아.\n\"네 손, 측정해 보고 싶어. 비용은 낼게.\"",
    effect: { relation: { D: 5 } } },
  { id: "E_first", once: true,
    when: { vipUnlocked: "E" },
    title: "큰손",
    text: "붉은 드레스의 다크엘프가 부채를 접었다. 카르벤 상단의 카샤.\n\"사장니임. 소문이 운하까지 왔어요.\"",
    effect: { relation: { E: 5 } } },
  { id: "A_rest", once: true,
    when: { relationAtLeast: { A: 45 } },
    title: "폐점 후",
    text: "레이나가 손목을 주무르다 사장과 눈이 마주쳤다.\n\"…저는 괜찮습니다. 장부나 보세요.\"\n(GPT: 이 이벤트의 선택지와 결과를 기획한다)",
    effect: {} },
  { id: "B_tail", once: true,
    when: { relationAtLeast: { B: 45 } },
    title: "꼬리 뿌리",
    text: "네르의 꼬리가 의자 다리에 걸려 있다. 본인은 모르는 눈치다.\n(GPT: 이 이벤트의 선택지와 결과를 기획한다)",
    effect: {} },
];
