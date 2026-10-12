// ============================================================
// 게임 상태 생성 / 저장 / 불러오기
// ============================================================
window.State = {
  newGame(shopName) {
    const mk = (c) => ({
      id: c.id, code: c.code, name: c.name, role: c.role,
      stats: { ...c.stats }, level: 1, xp: 0, fatigue: 0,
      post: c.id === "A" ? "reception" : "treatment", // reception | brew | treatment | rest
      busy: null, // roomId
      hired: true,
    });
    const s = {
      version: 1,
      shopName: shopName || CONFIG.SHOP_DEFAULT_NAME,
      day: 1,
      time: CONFIG.DAY_START_MIN,
      speed: 1,
      open: true,
      money: CONFIG.START_MONEY,
      rep: 0,
      rumor: 0,
      staff: [mk(CHARACTERS.player), mk(CHARACTERS.A), mk(CHARACTERS.B)],
      candidates: [],
      rooms: [],
      seats: CONFIG.START_SEATS,
      customers: [],      // 대기/시술 중 손님
      upgrades: [],       // 구매한 id
      mods: { spawnMul: 1, patienceMul: 1, soundproof: false, brewBonus: 0, restMul: 1 },
      oils: { calm: 3, warm: 0, moon: 0 },
      relation: { A: 10, B: 10, C: 0, D: 0, E: 0 },
      vipUnlocked: {},
      vipLastVisit: {},
      firedEvents: {},
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
    s.candidates = [];
    for (let i = 0; i < CONFIG.HIRE_CANDIDATES; i++) {
      const race = U.pickWeighted(pool.races);
      const sex = Math.random() < 0.6 ? "female" : "male";
      const tier = U.repTier(s.rep).id;
      const base = 2 + tier;
      s.candidates.push({
        id: "h_" + U.uid(), code: `${race.id}_${sex === "female" ? "f" : "m"}`,
        name: U.pick(pool.names[sex]), race: race.name, role: "staff", title: "시술사",
        stats: {
          technique: U.randInt(base, base + 3), sense: U.randInt(base - 1, base + 2),
          stamina: U.randInt(base, base + 4), charm: U.randInt(base - 1, base + 3),
        },
        hireCost: 1500 + tier * 1500, wage: 300 + tier * 200,
        hair: U.pick(race.hair), skin: race.skin,
        level: 1, xp: 0, fatigue: 0, post: "treatment", busy: null, hired: false,
      });
    }
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
      if (s.version !== 1) return null;
      return s;
    } catch (e) { return null; }
  },
  clear() { localStorage.removeItem(CONFIG.SAVE_KEY); },
};
