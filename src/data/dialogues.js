// ============================================================
// 관계 탭 대화. 인물당 하루 TALK_PER_DAY 회.
// greet: 관계 단계(0 낯섦/1 안면/2 신뢰/3 각별)별 인사.
// topics: { id, name, minRel, once?, flag?, noFlag?, text, choices:[{label, text, effect}] }
//   once 주제는 한 번만. 나머지는 반복 가능(효과는 작게).
// GPT: 주제·대사를 늘린다. 인물 말투 유지. 성인 요소 없음.
// ============================================================
window.DIALOGUES = {
  A: {
    greet: ["사장님. 장부는 보셨습니까.", "사장님, 오셨어요. 차 드릴까요.", "…오늘은 좀 피곤해 보이시네요. 사장님.", "사장… 님. 아, 아무것도 아닙니다."],
    topics: [
      { id: "A_ledger", name: "장부 이야기", minRel: 0,
        text: "\"어제 수입이 지출보다 많았습니다. 느긋하게 말씀드리는 겁니다만, 향유 값이 올랐어요.\"",
        choices: [
          { label: "수고했어", text: "\"…수고는 제가 아니라 사장님 손이 했죠.\" 눈 밑 점 아래가 살짝 붉어졌다.", effect: { relation: { A: 2 } } },
          { label: "향유는 네가 만들면 되잖아", text: "\"조향실에 두시면요. 접수대에 세워 두시고 그런 말씀을.\" 느릿한 잔소리가 길어졌다.", effect: { relation: { A: 1 } } },
          { label: "숫자는 됐고, 쉬어", text: "\"…장부는 안 쉽니다.\" 그래도 펜을 내려놓았다.", effect: { relation: { A: 3 } } },
        ] },
      { id: "A_oilcraft", name: "향유 조향", minRel: 20,
        text: "\"진정 향유는 긴장을 낮춥니다. 온열은 혈맥을 열고요. 배합은… 실벤하르의 것입니다. 거기까지만요.\"",
        choices: [
          { label: "고향 얘기 해 줘", text: "\"숲이었어요. 향기가 숲 밖으로 나가면 안 된다고 했는데… 제가 나왔죠.\" 시선이 비껴갔다.", effect: { relation: { A: 3 } } },
          { label: "한 병 더 만들어 줄 수 있어?", text: "\"재료가 있으면요.\" 선반에서 병 하나를 꺼내 주었다.", effect: { oil: { calm: 1 }, relation: { A: 1 } } },
        ] },
      { id: "A_worry", name: "사장 걱정", minRel: 45,
        text: "\"사장님, 손이 떨립니다. 오늘 몇 명 보셨어요.\" 느릿한 말투가 조금 빨랐다.",
        choices: [
          { label: "괜찮아", text: "\"괜찮다는 분들이 제일 안 괜찮죠.\" 따뜻한 수건을 손에 올려 주었다.", effect: { relation: { A: 3 }, playerRest: 20 } },
          { label: "네 손목은?", text: "\"…제 얘기가 아니잖아요.\" 손목을 소매 안으로 감췄다.", effect: { relation: { A: 2 } } },
        ] },
      { id: "A_name", name: "이름", minRel: 75, once: true,
        text: "단둘이 남은 접수대. 레이나가 장부를 덮었다.\n\"사장님이라고 부르는 게… 가끔 멀게 느껴집니다.\"",
        choices: [
          { label: "이름으로 불러도 돼", text: "\"…그럼, 가끔만요.\" 이름이 새어 나왔다. 존댓말은 여전했다.", effect: { relation: { A: 8 } } },
          { label: "사장님이 편해", text: "\"네. 사장님.\" 평소보다 길게 늘였다.", effect: { relation: { A: 2 } } },
        ] },
    ],
  },
  B: {
    greet: ["사장님! 저 오늘 뭐 해요?", "사장님, 저 어제 칭찬받았어요! 손님한테!", "사장님… 저 잘하고 있죠?", "사장님! 오늘도 안 버릴 거죠? 농담이에요!"],
    topics: [
      { id: "B_praise", name: "오늘의 시술", minRel: 0,
        text: "\"어깨 결은 이제 손으로 짚으면 알아요! 근데 푸는 건… 아직.\" 꼬리가 바닥을 쳤다.",
        choices: [
          { label: "잘하고 있어", text: "\"진짜요?!\" 꼬리가 수직으로 섰다. 귀도.", effect: { relation: { B: 3 } } },
          { label: "서두르지 마", text: "\"…네. 근데 빨리 잘하고 싶어요.\" 귀가 조금 처졌다.", effect: { relation: { B: 1 }, staffXp: { B: 10 } } },
          { label: "실수한 거 있지?", text: "\"어, 어떻게 알았어요. 오일을 좀 많이… 쏟았어요.\"", effect: { relation: { B: 1 }, oil: { calm: -1 } } },
        ] },
      { id: "B_attic", name: "다락 이야기", minRel: 20,
        text: "\"다락 좋아요. 천장이 낮아서 꼬리가 닿지만… 제 자리가 있다는 게 좋아요.\"",
        choices: [
          { label: "이불은 따뜻해?", text: "\"레이나 씨가 하나 더 줬어요. 잔소리랑 같이요.\" 송곳니가 보이게 웃었다.", effect: { relation: { B: 3 } } },
          { label: "방을 하나 내줄까", text: "\"…아, 아뇨! 다락이 좋아요. 사장님 발소리 들리거든요.\"", effect: { relation: { B: 4 } } },
        ] },
      { id: "B_fear", name: "불안", minRel: 45,
        text: "\"사장님. 제가 결을 못 풀면… 그래도 여기 있어도 돼요?\" 꼬리가 다리를 감았다.",
        choices: [
          { label: "당연하지", text: "\"…네.\" 한참 뒤에 작게 \"고마워요\"가 들렸다.", effect: { relation: { B: 5 } } },
          { label: "풀 수 있게 될 거야", text: "\"그, 그건 답이 아니잖아요!\" 그래도 꼬리가 풀렸다.", effect: { relation: { B: 3 }, staffXp: { B: 20 } } },
        ] },
      { id: "B_tail_talk", name: "꼬리", minRel: 75, once: true, flag: "B_tail",
        text: "\"그… 그날요. 꼬리 뿌리 풀어 준 날.\" 귀가 새빨갰다. \"다리 풀린 거, 레이나 씨한테 말 안 했죠?\"",
        choices: [
          { label: "안 했어", text: "\"다행이다…\" 꼬리가 사장의 팔을 한 번 감았다 풀렸다.", effect: { relation: { B: 8 } } },
          { label: "레이나가 업어 가라고 했는데", text: "\"네?!\" 다락으로 도망갔다. 내려올 때까지 반나절 걸렸다.", effect: { relation: { B: 4, A: 2 } } },
        ] },
    ],
  },
  C: {
    greet: ["시술사. 감찰 중이다. 잡담은 사양한다.", "…시술사. 오늘은 근무 외다.", "당신… 아니, 시술사. 어깨가 또 굳었다.", "오늘은 부하들 모르게 왔다. …이름으로 불러도 된다."],
    topics: [
      { id: "C_duty", name: "감찰 이야기", minRel: 0,
        text: "\"수상한 시술소라는 신고가 있었다. 칸막이가 얇더군.\" 흰 장갑이 카운터를 두드렸다.",
        choices: [
          { label: "방음을 할 생각입니다", text: "\"그래야 할 거다.\" 눈매가 조금 풀렸다.", effect: { relation: { C: 2 }, rumor: -2 } },
          { label: "소문일 뿐입니다", text: "\"소문이 감찰을 부른다. 기억해라.\"", effect: { relation: { C: 1 } } },
          { label: "직접 받아 보시죠", text: "\"…감찰의 일환으로.\" 제복 단추 하나가 풀리는 데 한참 걸렸다.", effect: { relation: { C: 3 }, rumor: 2 } },
        ] },
      { id: "C_knights", name: "기사단", minRel: 20,
        text: "\"부하들이 심연구에서 돌아오면 결을 달고 온다. 치유 마법으로는 안 풀리더군.\"",
        choices: [
          { label: "보내 주세요", text: "\"…고려하지.\" 그날 저녁 병사 둘이 머뭇거리며 들어왔다.", effect: { relation: { C: 3 }, spawnToday: 1.3 } },
          { label: "부단장님이 먼저", text: "\"내 얘기가 아니다.\" 그래도 자리에 앉았다.", effect: { relation: { C: 3 } } },
        ] },
      { id: "C_offduty", name: "근무 후", minRel: 45,
        text: "제복 재킷이 의자에 걸려 있다. 셔츠 차림의 세르피나는 조금 작아 보였다.\n\"…오늘은 당신에게 맡기지. 어디까지가 아니라, 전부.\"",
        choices: [
          { label: "편하게 계세요", text: "\"편하게가 제일 어렵다.\" 그래도 다나까가 조금 끊겼다.", effect: { relation: { C: 4 } } },
          { label: "부하들에겐 비밀로", text: "\"당연하다.\" 귀 끝이 붉었다.", effect: { relation: { C: 3 } } },
        ] },
      { id: "C_name", name: "호칭", minRel: 75, once: true,
        text: "\"시술사… 아니.\" 세르피나가 헛기침을 했다. \"이름을 부르지. 당신도 그렇게 해라. 명령이다.\"",
        choices: [
          { label: "세르피나", text: "\"…그래.\" 다나까가 끊기고 짧아졌다. \"그렇게.\"", effect: { relation: { C: 8 } } },
          { label: "부단장님", text: "\"…명령 불복종이다.\" 그래도 웃는 것처럼 보였다.", effect: { relation: { C: 3 } } },
        ] },
    ],
  },
  D: {
    greet: ["시술사. 기록 시작.", "너… 아니, 시술사. 측정구 가져왔어.", "너 손, 오늘은 온도가 높네. 기록해 둘게.", "…핑계가 바닥났어. 그냥 왔어."],
    topics: [
      { id: "D_measure", name: "측정", minRel: 0,
        text: "\"마력 파형이 네 손이 닿으면 평탄해져. 원리가 뭐야. 모른다고 하지 마.\"",
        choices: [
          { label: "모른다", text: "\"…그럴 줄 알았어.\" 메모했다. '본인도 모름'.", effect: { relation: { D: 2 } } },
          { label: "손이 알아", text: "\"비과학적이야.\" 그래도 메모했다. '손이 안다고 함'.", effect: { relation: { D: 3 } } },
          { label: "직접 측정해 봐", text: "\"그럴 거야. 다섯 번.\" 안경을 고쳐 썼다.", effect: { relation: { D: 2 }, counterAdd: { D_treated: 0 } } },
        ] },
      { id: "D_tower", name: "마탑 분원", minRel: 20,
        text: "\"분원 사람들은 결을 치유 마법으로 풀려다 역류해. 나는 안 그래. 이론은 아니까.\" 목을 돌리자 소리가 났다.",
        choices: [
          { label: "이론보다 손이 먼저야", text: "\"…반박 못 하겠네.\" 건조한 만족. 옅은 비웃음.", effect: { relation: { D: 3 } } },
          { label: "목, 심하네", text: "\"측정 대상의 신체 상태는 기록 사항이야. 걱정이 아니라.\"", effect: { relation: { D: 3 } } },
        ] },
      { id: "D_record", name: "기록", minRel: 45,
        text: "측정구가 켜져 있다. 이브레아가 그걸 끄지 않았다.\n\"…내 반응도 기록되고 있어. 알아. 지우지 않을 거야.\"",
        choices: [
          { label: "왜?", text: "\"데이터니까.\" 안경 너머 시선이 비껴갔다. \"그것뿐이야.\"", effect: { relation: { D: 4 } } },
          { label: "기록 그만하고 쉬어", text: "\"…기록하라고 한 건 나였는데.\" 그 말을 잊은 것 같았다.", effect: { relation: { D: 5 } } },
        ] },
      { id: "D_name", name: "호칭", minRel: 75, once: true,
        text: "\"시술사. 너. …이브레아라고 불러. 보고서에 '피험자 관계: 친밀'이라고 쓰기 싫으니까.\"",
        choices: [
          { label: "이브레아", text: "\"…됐어. 기록 안 해.\" 안경을 벗었다. 처음이었다.", effect: { relation: { D: 8 } } },
          { label: "연구원님", text: "\"비꼬지 마.\" 입꼬리가 올라갔다.", effect: { relation: { D: 3 } } },
        ] },
    ],
  },
  E: {
    greet: ["사장니임. 오늘 값은 얼마예요?", "사장니임, 운하 쪽은 소문이 늘었어요. 좋은 쪽으로.", "사장님. 오늘은 계산 없이 왔어요.", "…사장님. 존대가 빠졌죠. 진심일 때만 그래요."],
    topics: [
      { id: "E_deal", name: "거래", minRel: 0,
        text: "\"향유 재료, 상단가로 드릴게요. 대신 제 예약은 늘 비워 두시고요.\" 부채가 천천히 흔들렸다.",
        choices: [
          { label: "재료는 받겠습니다", text: "\"현명하시네요.\" 다음 납품가가 조금 내려갔다.", effect: { relation: { E: 2 }, oilDiscountDays: 3 } },
          { label: "예약은 선착순입니다", text: "\"어머, 돈으로 안 되는 가게.\" 즐거워 보였다.", effect: { relation: { E: 4 } } },
          { label: "둘 다 받죠", text: "\"욕심쟁이.\" 금팔찌가 짤랑였다. 레이나의 시선이 차가웠다.", effect: { relation: { E: 3, A: -1 }, oil: { warm: 1 } } },
        ] },
      { id: "E_vault", name: "금고 결계", minRel: 20,
        text: "\"상단 금고 결계를 제 마력으로 유지해요. 수년째. 허리랑 목이 이 모양인 건 그래서죠.\" 목덜미를 쓸었다.",
        choices: [
          { label: "결계를 남에게 맡기면", text: "\"그럼 금고가 제 것이 아니게 되죠.\" 계산이 빨랐다.", effect: { relation: { E: 3 } } },
          { label: "그럼 매주 오셔야겠네요", text: "\"…영업이 느셨네요, 사장니임.\"", effect: { relation: { E: 4 } } },
        ] },
      { id: "E_nocalc", name: "계산 없는 날", minRel: 45,
        text: "카샤가 부채를 접고 카운터에 금화를 놓지 않았다.\n\"오늘은 값을 안 물어볼게요. 그냥… 목덜미가 아파서요.\"",
        choices: [
          { label: "앉으세요", text: "목덜미에 손이 닿자 말이 멎었다. 여유가 깨지는 순간은 짧았다.", effect: { relation: { E: 5 } } },
          { label: "값은 다음에", text: "\"…외상은 처음이에요.\" 그 말에 존대가 빠져 있었다.", effect: { relation: { E: 4 } } },
        ] },
      { id: "E_name", name: "진심", minRel: 75, once: true,
        text: "\"사장님. 돈으로 안 되는 게 하나 있어요.\" 부채를 내려놓았다. \"카샤라고 불러 봐요. 값은 안 받을게.\"",
        choices: [
          { label: "카샤", text: "\"…그래.\" 존대가 빠졌다. 계산도 잊은 얼굴이었다.", effect: { relation: { E: 8 } } },
          { label: "상단주님", text: "\"비싸게 구네.\" 부채로 입을 가렸다.", effect: { relation: { E: 3 } } },
        ] },
    ],
  },
};
