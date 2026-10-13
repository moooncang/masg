// ============================================================
// 게임 상태 생성 / 저장 / 불러오기 / 마이그레이션
// ============================================================
window.State = {
  mkStaff(c) {
    return {
      id: c.id, code: c.code, name: c.name, role: c.role,
      stats: { ...c.stats }, level: 1, xp: 0, fatigue: 0,
      traits: c.traits ? [...c.traits] : [],
      post: c.id === "A" ? "reception" : "treatment", // reception | brew | treatment | rest
      busy: null, // roomId | "out"
      hired: true, wage: c.wage || 0,
    };
  },

  newGame(shopName) {
    const s = {
      version: CONFIG.SAVE_VERSION,
      shopName: shopName || CONFIG.SHOP_DEFAULT_NAME,
      day: 1,
      time: CONFIG.DAY_START_MIN,
      speed: 1,
      open: true,
      money: CONFIG.START_MONEY,
      rep: 0,
      rumor: 0,
      staff: [State.mkStaff(CHARACTERS.player), State.mkStaff(CHARACTERS.A), State.mkStaff(CHARACTERS.B)],
      candidates: [],
      rooms: [],
      seats: CONFIG.START_SEATS,
      customers: [],
      regulars: [],
      upgrades: [],
      mods: { spawnMul: 1, patienceMul: 1, soundproof: false, brewBonus: 0, restMul: 1, backdoor: false, nightMul: 1, eveningMul: 1, still: false, dorm: false, fullRest: false },
      dayMods: null,
      oils: { calm: 3, warm: 0, moon: 0 },
      oilsUnlocked: { calm: true, warm: true, moon: false },
      relation: { A: 10, B: 10, C: 0, D: 0, E: 0 },
      vipUnlocked: {},
      vipLastVisit: {},
      talked: {},        // code → day (오늘 대화 횟수용) {code: {day, n}}
      gifted: {},        // code → day
      topicsDone: {},    // topicId → true
      flags: {},
      counters: { D_treated: 0, hired: 0 },
      oilDiscountUntil: 0,
      outcall: null,     // {code, endsAt}
      firedEvents: {},
      milestones: {},
      todayEvent: null,
      ledger: { today: { income: 0, expense: 0, served: 0, left: 0 }, history: [] },
      log: [],
      stats: { totalServed: 0, totalIncome: 0, bestGrade: "C" },
      nextCustomerAt: 0,
    };
    for (let i = 0; i < CONFIG.START_ROOMS; i++) s.rooms.push({ id: i, customerId: null, staffId: null, endsAt: 0, menuId: null });
    State.rollCandidates(s);
    return s;
  },

  rollCandidates(s) {
    const pool = CUSTOMER_POOL;
    const traitKeys = Object.keys(TRAITS).filter(k => k !== "조향사" && k !== "성장기");
    s.candidates = [];
    for (let i = 0; i < CONFIG.HIRE_CANDIDATES; i++) {
      const race = U.pickWeighted(pool.races);
      const sex = Math.random() < 0.6 ? "female" : "male";
      const tier = U.repTier(s.rep).id;
      const base = 2 + tier;
      const trait = Math.random() < 0.7 ? U.pick(traitKeys) : null;
      const c = {
        id: "h_" + U.uid(), code: `${race.id}_${sex === "female" ? "f" : "m"}`,
        name: U.pick(pool.names[sex]), race: race.name, role: "staff", title: "시술사",
        stats: {
          technique: U.randInt(base, base + 3), sense: U.randInt(base - 1, base + 2),
          stamina: U.randInt(base, base + 4), charm: U.randInt(base - 1, base + 3),
        },
        traits: trait ? [trait] : [],
        hireCost: 1500 + tier * 1500, wage: 300 + tier * 200,
        hair: U.pick(race.hair), skin: race.skin,
        level: 1, xp: 0, fatigue: 0, post: "treatment", busy: null, hired: false,
      };
      if (trait && TRAITS[trait].charmBonus) c.stats.charm += TRAITS[trait].charmBonus;
      s.candidates.push(c);
    }
  },

  migrate(s) {
    if (s.version === CONFIG.SAVE_VERSION) return s;
    const fresh = State.newGame(s.shopName);
    for (const k in fresh) if (s[k] === undefined) s[k] = fresh[k];
    for (const k in fresh.mods) if (s.mods[k] === undefined) s.mods[k] = fresh.mods[k];
    for (const st of s.staff) { if (!st.traits) st.traits = (CHARACTERS[st.id] && CHARACTERS[st.id].traits) ? [...CHARACTERS[st.id].traits] : []; if (st.wage == null) st.wage = 0; }
    s.version = CONFIG.SAVE_VERSION;
    return s;
  },

  save(s) {
    try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(s)); return true; }
    catch (e) { console.warn("save failed", e); return false; }
  },
  load() {
    try {
      const raw = localStorage.getItem(CONFIG.SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.version) return null;
      return State.migrate(s);
    } catch (e) { return null; }
  },
  clear() { localStorage.removeItem(CONFIG.SAVE_KEY); },
};
