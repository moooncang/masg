// ============================================================
// 시뮬레이션. 게임 1분 단위로 tick 한다.
// ============================================================
window.Sim = {
  s: null,
  listeners: [],
  on(fn) { Sim.listeners.push(fn); },
  emit(type, payload) { for (const fn of Sim.listeners) fn(type, payload); },

  log(text, cls) {
    const s = Sim.s;
    s.log.push({ t: s.time, day: s.day, text, cls: cls || "" });
    if (s.log.length > 200) s.log.shift();
    Sim.emit("log", s.log[s.log.length - 1]);
  },

  phase() {
    const s = Sim.s;
    let p = CONFIG.PHASES[0];
    for (const x of CONFIG.PHASES) if (s.time >= x.start) p = x;
    return p;
  },

  charInfo(id) { return CHARACTERS[id] || Sim.s.candidates.find(c => c.id === id) || Sim.s.staff.find(c => c.id === id); },

  // ---------- 하루 ----------
  startDay() {
    const s = Sim.s;
    s.time = CONFIG.DAY_START_MIN;
    s.open = true;
    s.customers = [];
    for (const r of s.rooms) { r.customerId = null; r.staffId = null; r.endsAt = 0; r.menuId = null; }
    for (const st of s.staff) { st.busy = null; st.fatigue = Math.max(0, st.fatigue - 60 * s.mods.restMul); }
    s.ledger.today = { income: 0, expense: 0, served: 0, left: 0 };
    s.todayEvent = null;

    // 유지비 + 급여
    let expense = CONFIG.DAILY_UPKEEP;
    for (const st of s.staff) expense += (st.wage || 0);
    s.money -= expense;
    s.ledger.today.expense += expense;
    Sim.log(`${s.day}일차 개점. 유지비·급여 ${U.fmtMoney(expense)} 지출.`);

    // 조향
    const brewer = s.staff.find(st => st.id === "A" && st.post === "brew");
    if (brewer) {
      const n = CONFIG.OIL_BREW_PER_DAY + s.mods.brewBonus;
      const kind = s.oils.calm <= s.oils.warm ? "calm" : "warm";
      s.oils[kind] += n;
      Sim.log(`레이나가 ${OILS[kind].name} ${n}병을 만들었다.`, "good");
    }

    // 하루 이벤트
    const tier = U.repTier(s.rep).id;
    for (const ev of DAILY_EVENTS) {
      if (tier >= (ev.minTier || 0) && Math.random() < ev.chance) {
        s.todayEvent = ev;
        Sim.applyEffect(ev.effect);
        Sim.log(`[${ev.name}] ${ev.text}`, "ev");
        Sim.emit("modal", { title: ev.name, text: ev.text });
        break;
      }
    }
    Sim.checkStoryEvents();
    s.nextCustomerAt = s.time + U.randInt(5, 20);
    Sim.emit("day");
  },

  endDay() {
    const s = Sim.s;
    s.open = false;
    // 남은 손님 정리
    for (const c of s.customers) if (c.state === "waiting") Sim.customerLeaves(c, true);
    for (const r of s.rooms) if (r.customerId) Sim.finishTreatment(r);
    s.rumor = Math.max(0, s.rumor - CONFIG.RUMOR_DECAY_PER_DAY);
    const t = s.ledger.today;
    s.ledger.history.push({ day: s.day, ...t });
    if (s.ledger.history.length > 30) s.ledger.history.shift();
    Sim.emit("summary", { day: s.day, ...t, money: s.money });
    s.day += 1;
    State.rollCandidates(s);
    // 일일 효과 초기화
    s.dayMods = null;
    State.save(s);
  },

  // ---------- 틱 ----------
  tick() {
    const s = Sim.s;
    if (!s.open) return;
    s.time += 1;
    if (s.time >= CONFIG.DAY_END_MIN) { Sim.endDay(); return; }

    const phase = Sim.phase();
    // 손님 생성
    if (s.time >= s.nextCustomerAt) {
      const waiting = s.customers.filter(c => c.state === "waiting").length;
      if (waiting < s.seats) {
        const tier = U.repTier(s.rep).id;
        const recMul = s.staff.some(st => st.id === "A" && st.post === "reception") ? 1.15 : 1;
        const chance = CONFIG.SPAWN_BASE_CHANCE * phase.spawnMul * (1 + tier * CONFIG.SPAWN_REP_BONUS)
          * s.mods.spawnMul * ((s.dayMods && s.dayMods.spawnMul) || 1) * recMul;
        // 틱마다 굴리지 않고 다음 도착 시각을 잡는다
        const gap = Math.max(3, Math.round(1 / chance));
        s.nextCustomerAt = s.time + U.randInt(Math.round(gap * 0.5), Math.round(gap * 1.5));
        Sim.spawnCustomer(phase);
      } else {
        s.nextCustomerAt = s.time + 5;
      }
    }

    // 대기 손님 배정 / 인내심
    for (const c of s.customers.slice()) {
      if (c.state !== "waiting") continue;
      const room = s.rooms.find(r => !r.customerId);
      const staff = Sim.freeStaff();
      if (room && staff) { Sim.beginTreatment(room, staff, c); continue; }
      c.patience -= 1;
      if (c.patience <= 0) Sim.customerLeaves(c, true);
    }

    // 시술 완료
    for (const r of s.rooms) if (r.customerId && s.time >= r.endsAt) Sim.finishTreatment(r);

    // 피로 회복 (쉬는 직원)
    for (const st of s.staff) if (!st.busy) st.fatigue = Math.max(0, st.fatigue - CONFIG.FATIGUE_RECOVER_PER_MIN * s.mods.restMul);

    if (s.time % 30 === 0) Sim.checkStoryEvents();
    Sim.emit("tick");
  },

  freeStaff() {
    const s = Sim.s;
    // 시술 가능한 직원 중 피로가 가장 낮은 사람. 사장 우선.
    const list = s.staff.filter(st => st.post === "treatment" && st.busy == null && st.fatigue < 100);
    list.sort((a, b) => (a.id === "player" ? 0 : 1) - (b.id === "player" ? 0 : 1) || a.fatigue - b.fatigue);
    return list[0] || null;
  },

  // ---------- 손님 ----------
  spawnCustomer(phase) {
    const s = Sim.s;
    const tier = U.repTier(s.rep).id;

    // VIP 등장 판정
    for (const code of ["C", "D", "E"]) {
      const ch = CHARACTERS[code];
      if (!s.vipUnlocked[code]) {
        const u = ch.unlock;
        if (tier >= (u.repTier || 0) && s.rumor >= (u.rumorAtLeast || 0)) { s.vipUnlocked[code] = true; Sim.checkStoryEvents(); }
        else continue;
      }
      const last = s.vipLastVisit[code] || -99;
      if (s.day - last < 2) continue;
      if (Math.random() < (phase.id === "day" ? 0.08 : 0.2)) {
        s.vipLastVisit[code] = s.day;
        const menu = Sim.menuAvailable().find(m => m.id === ch.prefer.menu) || Sim.menuAvailable()[0];
        Sim.pushCustomer({ id: "c_" + U.uid(), vip: code, name: ch.name, race: ch.race, job: ch.title,
          sex: "f", spriteKey: code, hair: ch.hair, skin: ch.skin, cloth: ch.cloth,
          menuId: menu.id, part: ch.prefer.part, depth: menu.depth });
        Sim.log(`${ch.name}이(가) 들어왔다. "${ch.line_idle[0]}"`, "ev");
        return;
      }
    }

    if (phase.reservationOnly && Math.random() < 0.6) return; // 심야는 예약 손님만 드문드문

    const pool = CUSTOMER_POOL;
    const race = U.pickWeighted(pool.races);
    const sex = Math.random() < 0.65 ? "f" : "m";
    const name = U.pick(pool.names[sex === "f" ? "female" : "male"]);
    const job = U.pick(pool.jobsByTier[Math.min(tier, pool.jobsByTier.length - 1)]);
    const dw = pool.depthByTier[Math.min(tier, pool.depthByTier.length - 1)];
    const veinBias = (s.dayMods && s.dayMods.veinBias) || 1;
    const depth = Math.random() < (dw[1] * veinBias) / (dw[0] + dw[1] * veinBias) ? "vein" : "surface";
    const avail = Sim.menuAvailable().filter(m => depth === "vein" ? true : m.depth === "surface");
    let menu = avail[avail.length - 1];
    if (depth === "vein" && !avail.some(m => m.depth === "vein")) menu = avail[avail.length - 1];
    if (depth === "surface") menu = U.pick(avail);
    if (phase.reservationOnly && !menu.reservation) return;
    Sim.pushCustomer({ id: "c_" + U.uid(), vip: null, name, race: race.name, job, sex,
      spriteKey: `${race.id}_${sex}`, hair: U.pick(race.hair), skin: race.skin, cloth: U.pick(["#5a6a8a", "#7a5a4a", "#4a6a5a", "#6a4a6a"]),
      menuId: menu.id, part: race.sensitive && Math.random() < 0.3 ? race.sensitive : U.pick(pool.parts), depth });
  },

  pushCustomer(c) {
    const s = Sim.s;
    c.state = "waiting";
    c.arrivedAt = s.time;
    c.patience = Math.round(U.randInt(CONFIG.PATIENCE_MIN, CONFIG.PATIENCE_MAX) * s.mods.patienceMul);
    c.x = 40 + s.customers.length * 18; c.y = 170;
    s.customers.push(c);
    if (!c.vip) Sim.log(`${c.name}(${c.race} ${c.job}) 방문 — ${Sim.menu(c.menuId).name}, ${c.part}`);
    Sim.emit("customer", c);
  },

  customerLeaves(c, angry) {
    const s = Sim.s;
    s.customers = s.customers.filter(x => x !== c);
    if (angry) {
      s.rep = Math.max(0, s.rep + CONFIG.LEAVE_ANGRY_REP);
      s.ledger.today.left += 1;
      if (c.vip) s.relation[c.vip] = Math.max(0, s.relation[c.vip] - 5);
      Sim.log(`${c.name}이(가) 기다리다 떠났다. "${U.pick(CUSTOMER_POOL.lines.angry)}"`, "bad");
    }
  },

  menu(id) { return MENU.find(m => m.id === id); },
  menuAvailable() {
    const tier = U.repTier(Sim.s.rep).id;
    return MENU.filter(m => m.unlockTier <= tier);
  },

  // ---------- 시술 ----------
  beginTreatment(room, staff, c) {
    const s = Sim.s;
    const m = Sim.menu(c.menuId);
    room.customerId = c.id; room.staffId = staff.id; room.menuId = m.id;
    room.endsAt = s.time + m.duration;
    room.oilUsed = null;
    if (m.oil && s.oils[m.oil] > 0) { s.oils[m.oil] -= 1; room.oilUsed = m.oil; }
    staff.busy = room.id;
    c.state = "treating";
    c.roomId = room.id;
  },

  finishTreatment(room) {
    const s = Sim.s;
    const c = s.customers.find(x => x.id === room.customerId);
    const staff = s.staff.find(x => x.id === room.staffId);
    const m = Sim.menu(room.menuId);
    room.customerId = null; room.staffId = null; room.menuId = null;
    if (!c || !staff) return;
    staff.busy = null;

    // 점수 계산
    const st = staff.stats;
    const base = st.technique + st.sense * 0.6 + st.charm * 0.4; // 2~20
    const need = m.difficulty * 2.2;
    let score = 50 + (base - need) * 6;
    if (room.oilUsed) score += OILS[room.oilUsed].bonus;
    else if (m.oil) score -= 15; // 향유 없이 향유 시술
    if (staff.fatigue >= CONFIG.FATIGUE_PENALTY_AT) score -= 20;
    if (staff.id === "player" && c.part && /귀|꼬리|비늘|목/.test(c.part)) score += 5; // 사장의 감각
    const helper = s.staff.find(x => x.id === "B" && x.post === "treatment" && x.busy == null && x.id !== staff.id);
    if (helper) score += 4;
    score += U.rand(-10, 10);
    score = U.clamp(Math.round(score), 0, 100);
    const g = U.grade(score);

    // 정산
    const pay = Math.round(m.price * CONFIG.GRADE_PAY_MUL[g]);
    s.money += pay;
    s.ledger.today.income += pay; s.ledger.today.served += 1;
    s.stats.totalServed += 1; s.stats.totalIncome += pay;
    s.rep = Math.max(0, s.rep + CONFIG.GRADE_REP[g]);
    let rumor = m.rumor * (g === "C" ? 0.5 : 1);
    if (s.mods.soundproof) rumor *= 0.4;
    s.rumor = U.clamp(s.rumor + rumor, 0, 100);

    // 직원 성장
    staff.fatigue = Math.min(100, staff.fatigue + CONFIG.FATIGUE_PER_TREATMENT);
    staff.xp += Math.round(m.difficulty * 10 * CONFIG.GRADE_XP_MUL[g]);
    while (staff.xp >= staff.level * CONFIG.XP_PER_LEVEL) {
      staff.xp -= staff.level * CONFIG.XP_PER_LEVEL; staff.level += 1;
      const key = U.pick(["technique", "sense", "stamina", "charm"]);
      staff.stats[key] = Math.min(10, staff.stats[key] + 1);
      Sim.log(`${staff.name} Lv.${staff.level} — ${Sim.statName(key)} +1`, "good");
    }

    // 관계
    if (c.vip) {
      const d = { S: 8, A: 5, B: 2, C: -3 }[g];
      s.relation[c.vip] = U.clamp(s.relation[c.vip] + d, 0, 100);
    }
    if (staff.id !== "player") s.relation[staff.id] = U.clamp((s.relation[staff.id] || 0) + (g === "C" ? 0 : 1), 0, 100);

    const line = g === "C" ? U.pick(CUSTOMER_POOL.lines.angry) : U.pick(CUSTOMER_POOL.lines.happy);
    Sim.log(`${c.name} ${m.name} [${g}] ${U.fmtMoney(pay)} — ${staff.name}. "${line}"`, g === "C" ? "bad" : (g === "S" ? "good" : ""));
    Sim.emit("treated", { c, staff, grade: g, score, pay });
    Sim.customerLeaves(c, false);
  },

  statName(k) { return { technique: "손기술", sense: "감각", stamina: "체력", charm: "친절" }[k]; },

  // ---------- 경영 ----------
  buyUpgrade(id) {
    const s = Sim.s;
    const up = UPGRADES.find(u => u.id === id);
    if (!up || s.upgrades.includes(id)) return false;
    if (up.requires && !s.upgrades.includes(up.requires)) return false;
    if (up.repTier && U.repTier(s.rep).id < up.repTier) return false;
    if (s.money < up.cost) return false;
    s.money -= up.cost; s.ledger.today.expense += up.cost;
    s.upgrades.push(id);
    const e = up.effect;
    if (e.rooms) for (let i = 0; i < e.rooms; i++) s.rooms.push({ id: s.rooms.length, customerId: null, staffId: null, endsAt: 0, menuId: null });
    if (e.seats) s.seats += e.seats;
    if (e.soundproof) s.mods.soundproof = true;
    if (e.spawnMul) s.mods.spawnMul *= e.spawnMul;
    if (e.patienceMul) s.mods.patienceMul *= e.patienceMul;
    if (e.brewBonus) s.mods.brewBonus += e.brewBonus;
    if (e.restMul) s.mods.restMul *= e.restMul;
    Sim.log(`[확장] ${up.name} 완료.`, "good");
    Sim.emit("change");
    return true;
  },

  hire(id) {
    const s = Sim.s;
    const c = s.candidates.find(x => x.id === id);
    if (!c || s.money < c.hireCost) return false;
    s.money -= c.hireCost; s.ledger.today.expense += c.hireCost;
    c.hired = true;
    s.staff.push(c);
    s.candidates = s.candidates.filter(x => x !== c);
    Sim.log(`[고용] ${c.name}(${c.race})을(를) 고용했다. 일당 ${U.fmtMoney(c.wage)}`, "good");
    Sim.emit("change");
    return true;
  },

  fire(id) {
    const s = Sim.s;
    const st = s.staff.find(x => x.id === id);
    if (!st || st.id === "player" || st.id === "A" || st.id === "B" || st.busy != null) return false;
    s.staff = s.staff.filter(x => x !== st);
    Sim.log(`${st.name}이(가) 가게를 떠났다.`);
    Sim.emit("change");
    return true;
  },

  setPost(id, post) {
    const st = Sim.s.staff.find(x => x.id === id);
    if (!st || st.busy != null) return false;
    if (post === "brew" && st.id !== "A") return false;
    st.post = post;
    Sim.emit("change");
    return true;
  },

  buyOil(kind, n) {
    const s = Sim.s;
    let price = CONFIG.OIL_PRICE[kind] * n;
    // 카샤 관계가 높으면 납품가 인하
    const rel = s.relation.E || 0;
    if (rel >= 45) price = Math.round(price * 0.8);
    if (s.money < price) return false;
    s.money -= price; s.ledger.today.expense += price;
    s.oils[kind] += n;
    Sim.log(`${OILS[kind].name} ${n}병 구매 (${U.fmtMoney(price)})`);
    Sim.emit("change");
    return true;
  },

  // ---------- 이벤트 ----------
  applyEffect(e) {
    const s = Sim.s;
    if (!e) return;
    s.dayMods = s.dayMods || {};
    if (e.spawnMul) s.dayMods.spawnMul = (s.dayMods.spawnMul || 1) * e.spawnMul;
    if (e.veinBias) s.dayMods.veinBias = e.veinBias;
    if (e.rumor) s.rumor = U.clamp(s.rumor + e.rumor, 0, 100);
    if (e.rep) s.rep = Math.max(0, s.rep + e.rep);
    if (e.money) s.money += e.money;
    if (e.relation) for (const k in e.relation) s.relation[k] = U.clamp((s.relation[k] || 0) + e.relation[k], 0, 100);
    if (e.closeToday) { Sim.log("오늘 영업을 마감한다.", "bad"); setTimeout(() => Sim.endDay(), 0); }
  },

  checkStoryEvents() {
    const s = Sim.s;
    for (const ev of STORY_EVENTS) {
      if (ev.once && s.firedEvents[ev.id]) continue;
      if (!ev.once && s.firedEvents[ev.id] === s.day) continue;
      const w = ev.when || {};
      if (w.rumorAtLeast != null && s.rumor < w.rumorAtLeast) continue;
      if (w.repTier != null && U.repTier(s.rep).id < w.repTier) continue;
      if (w.vipUnlocked && !s.vipUnlocked[w.vipUnlocked]) continue;
      if (w.relationAtLeast) {
        let ok = true;
        for (const k in w.relationAtLeast) if ((s.relation[k] || 0) < w.relationAtLeast[k]) ok = false;
        if (!ok) continue;
      }
      s.firedEvents[ev.id] = ev.once ? true : s.day;
      Sim.log(`[${ev.title}] ${ev.text.split("\n")[0]}`, "ev");
      Sim.emit("modal", { title: ev.title, text: ev.text, code: w.vipUnlocked });
      Sim.applyEffect(ev.effect);
      return; // 하루에 한 개씩
    }
  },
};
