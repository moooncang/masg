// ============================================================
// 이벤트. 개점 시 무작위 하루 이벤트 + 조건 이벤트(선택지).
// GPT: 텍스트를 채우고 새 이벤트를 추가한다.
// effect 키 (sim.js applyEffect):
//   spawnMul:x, veinBias:x, rumor:+n, rep:+n, money:+n, relation:{코드:+n},
//   closeToday:true, flag:"이름", unflag:"이름", oil:{calm:+n}, stat:{sense:+n}(사장),
//   staffStat:{B:{sense:+2}}, unlockOil:"moon"
// when 키: rumorAtLeast, repTier, vipUnlocked:"C", relationAtLeast:{A:45},
//   flag:"이름", noFlag:"이름", counter:{D_treated:5}, staffLevel:{B:5}
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
  { id: "caravan", name: "상단 행사", chance: 0.05, minTier: 1,
    text: "운하변에서 카르벤 상단의 장이 섰다. 향유 재료가 싸다.",
    effect: { oilDiscount: 0.5 } },
  { id: "patrol", name: "기사단 순찰", chance: 0.05, minTier: 1,
    text: "주둔지 기사단이 골목을 돈다. 소문이 잦아들고 손님도 조심스럽다.",
    effect: { rumor: -8, spawnMul: 0.85 } },
  { id: "heat", name: "폭염", chance: 0.06, minTier: 0,
    text: "숨이 막히는 더위. 직원들이 빨리 지친다.",
    effect: { fatigueMul: 1.4 } },
];

// 조건 이벤트. 하루 1개. choices 가 있으면 선택지 모달, 없으면 확인만.
window.STORY_EVENTS = [
  { id: "intro", once: true, when: {},
    title: "개업",
    text: "골목 안쪽 2층 건물. 간판은 아직 없다.\n레이나가 장부를 펼치고, 네르가 다락에서 뛰어내려온다.\n\n\"사장님, 첫 손님이 오기 전에 한 가지만. 시술실은 두 칸, 칸막이는 얇습니다.\"",
    choices: [
      { label: "알았어. 열자.", text: "레이나가 고개를 끄덕이고 문의 빗장을 내렸다.", effect: { relation: { A: 2, B: 2 } } },
      { label: "칸막이가 얇으면 무슨 문제가?", text: "\"…소리가 샙니다. 나중에 아시게 될 겁니다.\"\n네르가 킥킥 웃었다.", effect: { relation: { B: 3 } } },
    ] },

  { id: "inspection", once: false,
    when: { rumorAtLeast: 70 },
    title: "위생 감찰",
    text: "의회에서 감찰관이 나왔다. 칸막이 너머 소문이 여기까지 닿은 모양이다.\n\"장부와 허가증. 그리고 시술실을 보겠소.\"",
    choices: [
      { label: "순순히 보여 준다", text: "감찰관은 한참 뒤적이다 혀를 찼다. 오늘은 문을 닫아야 한다.", effect: { rumor: -50, rep: -30, closeToday: true } },
      { label: "차 한 잔 대접하며 시간을 끈다 (금 3)", text: "감찰관이 찻잔을 내려놓았다. \"…오늘은 여기까지 하지.\"", effect: { money: -3000, rumor: -35, rep: -10 }, requires: { money: 3000 } },
      { label: "세르피나의 이름을 댄다", text: "\"부단장님이…? 알겠소.\" 감찰관이 서류를 덮었다. 하지만 세르피나가 이걸 알면.", effect: { rumor: -40, relation: { C: -10 } }, requires: { relationAtLeast: { C: 20 } } },
    ] },

  { id: "C_first", once: true,
    when: { vipUnlocked: "C" },
    title: "감찰",
    text: "제복 차림의 여자가 문을 열었다. 왕립기사단 파견대 부단장, 세르피나.\n\"감찰이다. 영업 허가증과 장부를 보이도록.\"",
    choices: [
      { label: "정중히 보여 준다", text: "장부를 넘기던 손이 멈췄다. \"…어깨. 결이 뭔지 확인해 보겠다. 감찰의 일환이다.\"", effect: { relation: { C: 8 } } },
      { label: "영장부터 보자고 한다", text: "회색 눈이 가늘어졌다. \"그 태도, 기억해 두지.\" 그래도 돌아가지는 않았다.", effect: { relation: { C: -3 }, rumor: 5 } },
    ] },

  { id: "D_first", once: true,
    when: { vipUnlocked: "D" },
    title: "측정",
    text: "안경 쓴 연구원이 측정 마도구를 꺼냈다. 마탑 분원의 이브레아.\n\"네 손, 측정해 보고 싶어. 비용은 낼게.\"",
    choices: [
      { label: "좋아. 조건은?", text: "\"다섯 번. 매번 기록한다. 결과는 내 거야.\" 안경을 고쳐 썼다.", effect: { relation: { D: 6 }, flag: "D_quest" } },
      { label: "연구 대상은 사양한다", text: "\"…그럼 손님으로 오지. 기록은 할 거야.\"", effect: { relation: { D: 2 }, flag: "D_quest" } },
    ] },

  { id: "E_first", once: true,
    when: { vipUnlocked: "E" },
    title: "큰손",
    text: "붉은 드레스의 다크엘프가 부채를 접었다. 카르벤 상단의 카샤.\n\"사장니임. 소문이 운하까지 왔어요. 값은 얼마든지.\"",
    choices: [
      { label: "값은 메뉴대로입니다", text: "\"어머. 돈으로 안 되는 가게네.\" 호박색 눈이 즐거워 보였다.", effect: { relation: { E: 8 } } },
      { label: "그럼 두 배로", text: "\"좋아요.\" 금화가 카운터에 놓였다. 레이나의 장부 넘기는 소리가 차가워졌다.", effect: { money: 4000, relation: { E: 3, A: -3 }, rumor: 4 } },
    ] },

  { id: "D_quest_done", once: true,
    when: { flag: "D_quest", counter: { D_treated: 5 } },
    title: "측정 완료",
    text: "이브레아가 마도구의 수치를 읽다가 멈췄다.\n\"…다섯 번째 기록. 네 손이 닿는 순간 마력 파형이 평탄해져. 이건 보고서감이야.\"\n\"보수.\" 금화 주머니를 내밀었다. \"그리고 하나 더. 내 반응까지 기록됐어. 이 부분은 지울 거야.\"",
    choices: [
      { label: "보고서, 기대할게", text: "\"…기대하지 마. 학술지에 네 이름은 안 나가.\"", effect: { money: 5000, stat: { sense: 1 }, relation: { D: 10 }, flag: "D_quest_done" } },
      { label: "지울 필요 없어", text: "안경 너머의 눈이 흔들렸다. \"…기록자는 나야.\" 그래도 지우지 않은 듯했다.", effect: { money: 5000, stat: { sense: 1 }, relation: { D: 14 }, flag: "D_quest_done" } },
    ] },

  { id: "C_designate", once: true,
    when: { relationAtLeast: { C: 45 }, vipUnlocked: "C" },
    title: "지정 시술소",
    text: "세르피나가 서류 한 장을 내밀었다. 기사단 인장이 찍혀 있다.\n\"파견대 지정 시술소. 부하들이 올 거다. 감찰 명목은 이제 필요 없겠지.\"\n\"…내 방문은 기록하지 마라.\"",
    choices: [
      { label: "받는다", text: "기사단 병사들이 줄을 서기 시작했다. 소문도 함부로 돌지 않는다.", effect: { flag: "C_designated", rep: 50, relation: { C: 8 } } },
      { label: "조용한 가게로 남고 싶다", text: "\"…그런가.\" 서류를 접었다. \"그럼 나만 오지.\"", effect: { relation: { C: 12 } } },
    ] },

  { id: "E_contract", once: true,
    when: { relationAtLeast: { E: 45 }, vipUnlocked: "E" },
    title: "전속 계약",
    text: "카샤가 계약서를 펼쳤다.\n\"매일 금화 한 닢. 대신 저녁엔 제 자리를 비워 두세요. 재료도 상단가로.\"\n부채 끝이 사장의 손등을 톡 쳤다. \"돈으로 안 되는 가게라면서요. 그래서 사고 싶은 거예요.\"",
    choices: [
      { label: "계약한다", text: "\"현명하시네요.\" 매일 금화가 들어온다. 다른 손님 눈치가 보이고, 소문도 커진다.", effect: { flag: "E_contract", relation: { E: 6 }, rumor: 5 } },
      { label: "거절한다", text: "\"…어머.\" 부채가 멈췄다. \"처음이에요, 이런 거.\" 돌아가는 발걸음이 느렸다.", effect: { relation: { E: 10 }, flag: "E_declined" } },
    ] },

  { id: "A_rest", once: true,
    when: { relationAtLeast: { A: 45 } },
    title: "폐점 후",
    text: "레이나가 손목을 주무르다 사장과 눈이 마주쳤다.\n\"…저는 괜찮습니다. 장부나 보세요.\"\n손목 안쪽, 결이 뭉친 자리가 보였다.",
    choices: [
      { label: "장부는 내일. 손 내밀어", text: "한참 만에 손이 나왔다. 결이 풀리자 느릿한 존댓말이 잠깐 흐트러졌다.\n\"…고맙습니다, 사장… 님.\"", effect: { relation: { A: 10 }, staffStat: { A: { stamina: 2 } }, flag: "A_rested" } },
      { label: "힘들면 말해", text: "\"말씀드릴 겁니다. 언젠가요.\" 그 언젠가는 오지 않을 것 같았다.", effect: { relation: { A: 3 } } },
    ] },

  { id: "A_moon", once: true,
    when: { relationAtLeast: { A: 75 }, flag: "A_rested" },
    title: "월하향",
    text: "조향실, 선반 뒤에서 레이나가 작은 병을 꺼냈다.\n\"숲 밖에 내면 안 되는 배합입니다. 가문의 것이에요.\"\n\"사장님 손에만 맡기겠습니다. 증류기가 있어야 만들 수 있어요.\"",
    choices: [
      { label: "맡아 줄게", text: "월하향. 감각을 예민하게 한다. 혈맥 시술에 쓰면 결과가 좋지만, 소문도 따라붙는다.", effect: { unlockOil: "moon", relation: { A: 8 } } },
    ] },

  { id: "B_tail", once: true,
    when: { relationAtLeast: { B: 45 } },
    title: "꼬리 뿌리",
    text: "네르의 꼬리가 의자 다리에 걸려 있다. 본인은 모르는 눈치다.\n\"…사장님, 왜 그렇게 봐요. 꼬리는 안 된다고 했잖아요.\"\n꼬리가 먼저 솔직해졌다. 뿌리 쪽, 오래 묵은 결.",
    choices: [
      { label: "안 건드려. 대신 결은 풀자", text: "\"…진짜 뿌리만이에요.\" 결이 풀리자 다리가 풀렸다. 다락까지 업어다 줘야 했다.", effect: { relation: { B: 10 }, staffStat: { B: { sense: 2 } }, flag: "B_tail" } },
      { label: "싫으면 안 해", text: "\"…싫다고는 안 했는데요.\" 꼬리가 바닥을 쳤다.", effect: { relation: { B: 4 } } },
    ] },

  { id: "B_promote", once: true,
    when: { relationAtLeast: { B: 75 }, staffLevel: { B: 5 }, flag: "B_tail" },
    title: "정식 시술사",
    text: "네르가 처음으로 혼자 혈맥 결을 풀었다. 손님이 \"다른 데랑 달라요\"라고 했다.\n\"…사장님. 저, 이제 안 버려지죠?\"\n처음 입 밖에 낸 말이었다.",
    choices: [
      { label: "처음부터 그럴 생각 없었어", text: "꼬리가 다리를 감았다. \"…네.\" 견습 딱지를 뗐다.", effect: { relation: { B: 10 }, staffStat: { B: { technique: 2 } }, flag: "B_promoted" } },
    ] },
];
