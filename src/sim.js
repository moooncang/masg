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
  player() { return Sim.s.staff.find(st => st.id === "player"); },
  staffOf(code) { return Sim.s.staff.find(st => st.id === code); },
  trait(st, key) { let v = 0; for (const t of (st.traits || [])) if (TRAITS[t] && TRAITS[t][key] != null) v += TRAITS[t][key]; return v; },
  traitMul(st, key) { let v = 1; for (const t of (st.traits || [])) if (TRAITS[t] && TRAITS[t][key] != null) v *= TRAITS[t][key]; return v; },
  dayMod(key, def) { const s = Sim.s; return (s.dayMods && s.dayMods[key] != null) ? s.dayMods[key] : def; },

  // ---------- 하루 ----------
  startDay() {
    const s = Sim.s;
    s.time = CONFIG.DAY_START_MIN;
    s.open = true;
    s.customers = [];
    s.outcall = null;
    s.dayMods = null;
    for (const r of s.rooms) { r.customerId = null; r.staffId = null; r.endsAt = 0; r.menuId = null; }
    for (const st of s.staff) { st.busy = null; st.fatigue = s.mods.fullRest ? 0 : Math.max(0, st.fatigue - 60 * s.mods.restMul); }
    s.ledger.today = { income: 0, expense: 0, served: 0, left: 0 };
    s.todayEvent = null;

    // 유지비 + 급여
    let expense = CONFIG.DAILY_UPKEEP + s.rooms.length * CONFIG.UPKEEP_PER_ROOM + U.repTier(s.rep).id * CONFIG.UPKEEP_PER_TIER;
    for (const st of s.staff) expense += Math.round((st.wage || 0) * (s.mods.dorm ? 0.7 : 1));
    s.money -= expense;
    s.ledger.today.expense += expense;
    Sim.log(`${s.day}일차 개점. 유지비·급여 ${U.fmtMoney(expense)} 지출.`);

    // 전속 계약
    if (s.flags.E_contract) {
      s.money += CONFIG.CONTRACT_DAILY; s.ledger.today.income += CONFIG.CONTRACT_DAILY;
      s.rumor = U.clamp(s.rumor + CONFIG.CONTRACT_RUMOR, 0, 100);
      Sim.log(`카르벤 상단에서 계약금 ${U.fmtMoney(CONFIG.CONTRACT_DAILY)}이 들어왔다.`, "good");
    }

    // 조향
    const rena = s.staff.find(st => st.id === "A");
    const brewer = rena && (rena.post === "brew" || rena.post === "reception") ? rena : null;
    if (brewer) {
      const n = rena.post === "brew" ? CONFIG.OIL_BREW_PER_DAY + s.mods.brewBonus : 1;
      const kind = s.oils.calm <= s.oils.warm ? "calm" : "warm";
      s.oils[kind] += n; s.counters.oilsBrewed += n;
      Sim.log(rena.post === "brew" ? `레이나가 ${OILS[kind].name} ${n}병을 만들었다.` : `레이나가 접수 틈틈이 ${OILS[kind].name} 1병을 만들어 두었다.`, "good");
      if (s.oilsUnlocked.moon && s.mods.still && s.day % CONFIG.MOON_BREW_EVERY === 0) {
        s.oils.moon += 1; s.counters.oilsBrewed += 1;
        Sim.log("선반 뒤에 월하향 한 병이 놓였다.", "ev");
      }
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
    if (s.equips.lamp) s.rumor = Math.max(0, s.rumor - 1);
    Sim.checkDebt();
    Sim.checkStoryEvents();
    Sim.checkAchievements();
    s.nextCustomerAt = s.time + U.randInt(5, 20);
    Sim.emit("day");
  },

  endDay() {
    const s = Sim.s;
    if (!s.open) return;
    s.open = false;
    for (const c of s.customers) if (c.state === "waiting") Sim.customerLeaves(c, true);
    for (const r of s.rooms) if (r.customerId) Sim.finishTreatment(r);
    if (s.outcall) Sim.finishOutcall();
    if (s.expedition) Sim.finishExpedition();
    const t0 = s.ledger.today;
    if (t0.served >= 5 && t0.left === 0) s.counters.perfectDays += 1;
    if (s.rumor <= 10) s.counters.quietDays += 1;
    if (U.repTier(s.rep).id >= 3) s.counters.tier3Days += 1;
    let decay = CONFIG.RUMOR_DECAY_PER_DAY * (s.flags.C_designated ? 2 : 1);
    s.rumor = Math.max(0, s.rumor - decay);
    const t = s.ledger.today;
    s.ledger.history.push({ day: s.day, ...t });
    if (s.ledger.history.length > 30) s.ledger.history.shift();
    Sim.emit("summary", { day: s.day, ...t, money: s.money, debtLeft: Sim.debtLeft(), debtDays: Sim.debtDaysLeft() - 1, debtDone: !!s.debt?.cleared });
    s.day += 1;
    State.rollCandidates(s);
    State.save(s);
  },

  // ---------- 빚 (게임 목표) ----------
  debtLeft() { const d = Sim.s.debt; return d ? Math.max(0, d.total - d.paid) : 0; },
  debtDaysLeft() { const d = Sim.s.debt; return d ? d.dueDay - Sim.s.day : 0; },
  canPayDebt(amount) { const s = Sim.s; return !!s.debt && !s.debt.cleared && !s.debt.failed && amount > 0 && s.money >= amount && Sim.debtLeft() > 0; },
  payDebt(amount) {
    const s = Sim.s, d = s.debt;
    amount = Math.min(amount, Sim.debtLeft(), s.money);
    if (!Sim.canPayDebt(amount)) return false;
    s.money -= amount; d.paid += amount;
    Sim.log(`카르벤 상단에 ${U.fmtMoney(amount)}을 갚았다. 남은 빚 ${U.fmtMoney(Sim.debtLeft())}.`, "good");
    if (Sim.debtLeft() <= 0) {
      d.cleared = s.day;
      s.rep += 100;
      Sim.log("빚을 전부 갚았다. 가게는 이제 온전히 우리 것이다.", "good");
      Sim.emit("debt", { kind: "cleared" });
      Sim.checkAchievements();
    }
    Sim.emit("change");
    return true;
  },
  checkDebt() {
    const s = Sim.s, d = s.debt, D = CONFIG.DEBT;
    if (!d || d.cleared || d.failed) return;
    for (const m of D.milestones) {
      if (s.day === m.day && !d.warned[m.day]) {
        d.warned[m.day] = true;
        Sim.emit("debt", { kind: d.paid >= m.amount ? "milestone_ok" : "milestone_warn", need: m.amount });
        return;
      }
    }
    if (s.day >= d.dueDay) {
      if (!d.extended) {
        d.extended = true;
        const interest = Math.round(Sim.debtLeft() * D.extendRate);
        d.total += interest; d.dueDay = s.day + D.extendDays;
        Sim.log(`[최후통첩] 기한을 넘겼다. 이자 ${U.fmtMoney(interest)}이 붙고 ${D.extendDays}일 연장됐다.`, "bad");
        Sim.emit("debt", { kind: "extended", interest });
      } else {
        d.failed = s.day;
        Sim.log("[폐업] 기한을 또 넘겼다. 상단이 가게 열쇠를 가져갔다.", "bad");
        Sim.emit("debt", { kind: "failed" });
      }
    }
  },

  // ---------- 틱 ----------
  tick() {
    const s = Sim.s;
    if (!s.open) return;
    s.time += 1;
    if (s.time >= CONFIG.DAY_END_MIN) { Sim.endDay(); return; }

    const phase = Sim.phase();
    if (s.time >= s.nextCustomerAt) {
      const waiting = s.customers.filter(c => c.state === "waiting").length;
      if (waiting < s.seats) {
        const tier = U.repTier(s.rep).id;
        let recMul = s.staff.some(st => st.id === "A" && st.post === "reception") ? 1.15 : 1;
        for (const st of s.staff) if (st.post === "reception" && st.busy == null) recMul *= Sim.traitMul(st, "receptionMul");
        let chance = CONFIG.SPAWN_BASE_CHANCE * phase.spawnMul * (1 + tier * CONFIG.SPAWN_REP_BONUS)
          * s.mods.spawnMul * Sim.dayMod("spawnMul", 1) * recMul;
        if (phase.id !== "day") chance *= s.mods.eveningMul * Sim.dayMod("eveningMul", 1);
        if (phase.id === "night") chance *= s.mods.nightMul * Sim.dayMod("nightMul", 1);
        if (s.flags.C_designated) chance *= 1.15;
        const gap = Math.max(3, Math.round(1 / chance));
        s.nextCustomerAt = s.time + U.randInt(Math.round(gap * 0.5), Math.round(gap * 1.5));
        Sim.spawnCustomer(phase);
      } else {
        s.nextCustomerAt = s.time + 5;
      }
    }

    for (const c of s.customers.slice()) {
      if (c.state !== "waiting") continue;
      const room = s.rooms.find(r => !r.customerId);
      const staff = Sim.freeStaff();
      if (room && staff) { Sim.beginTreatment(room, staff, c); continue; }
      c.patience -= 1;
      if (c.patience <= 0) Sim.customerLeaves(c, true);
    }

    for (const r of s.rooms) if (r.customerId && s.time >= r.endsAt) Sim.finishTreatment(r);
    if (s.rooms.length >= 3 && s.rooms.every(r => r.customerId)) s.counters.fullDay = Math.max(s.counters.fullDay, 1);
    if (s.outcall && s.time >= s.outcall.endsAt) Sim.finishOutcall();
    if (s.expedition && s.time >= s.expedition.endsAt) Sim.finishExpedition();

    for (const st of s.staff) if (st.busy == null) st.fatigue = Math.max(0, st.fatigue - CONFIG.FATIGUE_RECOVER_PER_MIN * s.mods.restMul);

    if (s.money > s.counters.moneyMax) s.counters.moneyMax = s.money;
    if (s.time % 30 === 0) { Sim.checkStoryEvents(); Sim.checkAchievements(); }
    Sim.emit("tick");
  },

  freeStaff() {
    const s = Sim.s;
    const list = s.staff.filter(st => st.post === "treatment" && st.busy == null && st.fatigue < 100 && !s.party.includes(st.id));
    list.sort((a, b) => (a.id === "player" ? 0 : 1) - (b.id === "player" ? 0 : 1) || a.fatigue - b.fatigue);
    return list[0] || null;
  },

  // ---------- 손님 ----------
  spawnCustomer(phase) {
    const s = Sim.s;
    const tier = U.repTier(s.rep).id;

    // 엘리트 손님 등장
    const vipBoost = s.staff.some(st => st.id === "A" && st.post === "reception") ? 1.5 : 1;
    for (const code of ["C", "D", "E"]) {
      const ch = CHARACTERS[code];
      if (s.recruited[code]) continue;
      if (!s.vipUnlocked[code]) {
        const u = ch.unlock;
        if (tier >= (u.repTier || 0) && s.rumor >= (u.rumorAtLeast || 0)) { s.vipUnlocked[code] = true; Sim.checkStoryEvents(); }
        else continue;
      }
      const last = s.vipLastVisit[code] || -99;
      const gap = (code === "E" && s.flags.E_contract) ? 1 : 2;
      if (s.day - last < gap) continue;
      let p = (phase.id === "day" ? 0.08 : 0.2) * vipBoost;
      if (s.flags.E_contract && code !== "E") p *= 0.7;
      if (Math.random() < p) {
        s.vipLastVisit[code] = s.day;
        const avail = Sim.menuAvailable();
        const menu = avail.find(m => m.id === ch.prefer.menu) || avail[avail.length - 1];
        Sim.pushCustomer({ id: "c_" + U.uid(), vip: code, name: ch.name, race: ch.race, job: ch.title,
          sex: "f", spriteKey: code, hair: ch.hair, skin: ch.skin, cloth: ch.cloth,
          menuId: menu.id, part: ch.prefer.part, depth: menu.depth });
        Sim.log(`${ch.name}이(가) 들어왔다. "${U.pick(ch.line_idle)}"`, "ev");
        return;
      }
    }

    if (phase.reservationOnly && Math.random() < 0.6) return;

    // 단골
    if (s.regulars.length && Math.random() < CONFIG.REGULAR_SPAWN_RATIO) {
      const r = U.pick(s.regulars);
      const menu = Sim.menu(r.menuId) && Sim.menuAvailable().includes(Sim.menu(r.menuId)) ? Sim.menu(r.menuId) : U.pick(Sim.menuAvailable());
      if (!(phase.reservationOnly && !menu.reservation)) {
        Sim.pushCustomer({ ...r, id: "c_" + U.uid(), menuId: menu.id, depth: menu.depth, regular: true });
        return;
      }
    }

    const pool = CUSTOMER_POOL;
    const race = U.pickWeighted(pool.races);
    const sex = Math.random() < 0.65 ? "f" : "m";
    const name = U.pick(pool.names[sex === "f" ? "female" : "male"]);
    let jobTier = Math.min(tier, pool.jobsByTier.length - 1);
    if (s.mods.backdoor && phase.id !== "day" && Math.random() < 0.4) jobTier = Math.min(jobTier + 1, pool.jobsByTier.length - 1);
    let job = U.pick(pool.jobsByTier[jobTier]);
    let knight = false;
    if (s.flags.C_designated && Math.random() < 0.3) { job = U.pick(pool.knightJobs); knight = true; }
    const dw = pool.depthByTier[Math.min(tier, pool.depthByTier.length - 1)];
    const veinBias = Sim.dayMod("veinBias", 1);
    const depth = Math.random() < (dw[1] * veinBias) / (dw[0] + dw[1] * veinBias) ? "vein" : "surface";
    const avail = Sim.menuAvailable();
    let menu;
    if (depth === "vein") menu = avail.find(m => m.depth === "vein") || avail[avail.length - 1];
    else menu = U.pick(avail.filter(m => m.depth === "surface"));
    if (phase.reservationOnly && !menu.reservation) return;
    Sim.pushCustomer({ id: "c_" + U.uid(), vip: null, name, race: race.name, raceId: race.id, job, sex, knight,
      spriteKey: `${race.id}_${sex}`, hair: U.pick(race.hair), skin: race.skin, cloth: U.pick(["#5a6a8a", "#7a5a4a", "#4a6a5a", "#6a4a6a"]),
      menuId: menu.id, part: race.sensitive && Math.random() < 0.3 ? race.sensitive : U.pick(pool.parts), depth: menu.depth });
  },

  pushCustomer(c) {
    const s = Sim.s;
    c.state = "waiting";
    c.arrivedAt = s.time;
    c.patience = Math.round(U.randInt(CONFIG.PATIENCE_MIN, CONFIG.PATIENCE_MAX) * s.mods.patienceMul * Sim.dayMod("patienceMul", 1) * (c.regular ? 1.3 : 1));
    s.customers.push(c);
    if (!c.vip) {
      const raceLines = CUSTOMER_POOL.lines.race[c.raceId] || [];
      const line = c.regular ? ` "${U.pick(CUSTOMER_POOL.lines.regular)}"` : c.knight ? ` "${U.pick(CUSTOMER_POOL.lines.knight)}"` : (raceLines.length && Math.random() < 0.3) ? ` "${U.pick(raceLines)}"` : Math.random() < 0.3 ? ` "${U.pick(CUSTOMER_POOL.lines.enter)}"` : "";
      Sim.log(`${c.regular ? "[단골] " : ""}${c.name}(${c.race} ${c.job}) 방문 — ${Sim.menu(c.menuId).name}, ${c.part}${line}`, c.regular ? "good" : "");
    }
    Sim.emit("customer", c);
  },

  customerLeaves(c, angry) {
    const s = Sim.s;
    s.customers = s.customers.filter(x => x !== c);
    if (angry) {
      if (window.Render) Render.emote("cu_" + c.id, "anger");
      s.rep = Math.max(0, s.rep + CONFIG.LEAVE_ANGRY_REP);
      s.ledger.today.left += 1;
      if (c.vip) s.relation[c.vip] = Math.max(0, s.relation[c.vip] - 5);
      if (c.regular) { s.regulars = s.regulars.filter(r => r.name !== c.name); Sim.log(`단골 ${c.name}이(가) 발길을 끊었다.`, "bad"); }
      else Sim.log(`${c.name}이(가) 기다리다 떠났다. "${U.pick(CUSTOMER_POOL.lines.angry)}"`, "bad");
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
    room.endsAt = s.time + Math.round(m.duration * (s.equips.bedplate ? ITEMS.bedplate.equip.durationMul : 1));
    room.oilUsed = null;
    if (m.oil) {
      const need = Math.max(1, Math.round(Sim.traitMul(staff, "oilMul")));
      // 월하향: 혈맥 시술에 우선 사용
      if (m.depth === "vein" && s.oils.moon > 0) { s.oils.moon -= 1; room.oilUsed = "moon"; s.counters.moonUsed += 1; s.counters.oilsUsed += 1; }
      else if (s.oils[m.oil] >= need) { s.oils[m.oil] -= need; room.oilUsed = m.oil; s.counters.oilsUsed += 1; }
    }
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
    const phase = Sim.phase();

    // 점수
    const st = staff.stats;
    const base = st.technique + st.sense * 0.6 + st.charm * 0.4;
    const need = m.difficulty * 2.2;
    let score = 50 + (base - need) * 6;
    if (room.oilUsed) score += OILS[room.oilUsed].bonus;
    else if (m.oil) score -= 15;
    if (staff.fatigue >= CONFIG.FATIGUE_PENALTY_AT) score -= 20;
    if (staff.id === "player" && c.part && /귀|꼬리|비늘|목/.test(c.part)) score += 5;
    const helper = s.staff.find(x => x.id === "B" && x.post === "treatment" && x.busy == null && x.id !== staff.id);
    if (helper) score += 4;
    score += Sim.trait(staff, "scoreBonus");
    if (phase.id === "night") score += Sim.trait(staff, "nightBonus"); else if (phase.id === "day") score -= Sim.trait(staff, "dayPenalty");
    if (c.regular) score += 3;
    score += Sim.dayMod("scoreBonus", 0);
    score += U.rand(-10, 10);
    score = U.clamp(Math.round(score), 0, 100);
    const g = U.grade(score);

    // 정산
    let pay = m.price * CONFIG.GRADE_PAY_MUL[g] * Sim.traitMul(staff, "payMul");
    if (c.vip) pay *= 1 + CONFIG.VIP_TIP;
    if (c.regular) pay *= 1 + CONFIG.REGULAR_TIP;
    if (s.equips.sheet) pay *= ITEMS.sheet.equip.payMul;
    pay = Math.round(pay);
    if (g === "S") s.counters.sCount += 1;
    if (phase.id === "night") s.counters.nightServed += 1;
    if (c.knight) s.counters.knights += 1;
    if (c.vip) s.counters.vipServed += 1;
    s.money += pay;
    s.ledger.today.income += pay; s.ledger.today.served += 1;
    s.stats.totalServed += 1; s.stats.totalIncome += pay;
    if ("CBAS".indexOf(g) > "CBAS".indexOf(s.stats.bestGrade)) s.stats.bestGrade = g;
    s.rep = Math.max(0, s.rep + CONFIG.GRADE_REP[g] + (c.regular ? 1 : 0));
    let rumor = m.rumor * (g === "C" ? 0.5 : 1) + Sim.trait(staff, "rumorAdd");
    if (room.oilUsed === "moon") rumor += 1.5;
    if (s.mods.backdoor && m.depth === "vein") rumor = Math.max(0, rumor - 1);
    if (s.mods.soundproof) rumor *= 0.4;
    s.rumor = U.clamp(s.rumor + rumor, 0, 100);

    // 직원 성장
    staff.fatigue = Math.min(100, staff.fatigue + CONFIG.FATIGUE_PER_TREATMENT * Sim.traitMul(staff, "fatigueMul") * Sim.dayMod("fatigueMul", 1));
    staff.xp += Math.round(m.difficulty * 10 * CONFIG.GRADE_XP_MUL[g] * Sim.traitMul(staff, "xpMul"));
    Sim.levelUp(staff);

    // 관계
    if (c.vip) {
      const d = { S: 8, A: 5, B: 2, C: -3 }[g];
      s.relation[c.vip] = U.clamp(s.relation[c.vip] + d, 0, 100);
      if (c.vip === "D" && s.flags.D_quest) s.counters.D_treated += 1;
    }
    if (staff.id === "A" || staff.id === "B") s.relation[staff.id] = U.clamp(s.relation[staff.id] + (g === "C" ? 0 : 1), 0, 100);

    // 단골 전환
    if (!c.vip && !c.regular && (g === "S" || g === "A") && s.regulars.length < CONFIG.REGULAR_MAX && Math.random() < CONFIG.REGULAR_CHANCE) {
      s.regulars.push({ name: c.name, race: c.race, raceId: c.raceId, job: c.job, sex: c.sex, spriteKey: c.spriteKey, hair: c.hair, skin: c.skin, cloth: c.cloth, menuId: c.menuId, part: c.part, vip: null });
      Sim.log(`${c.name}이(가) 단골이 됐다.`, "good");
      if (window.Render) Render.emote("cu_" + c.id, "note");
    }

    const line = g === "C" ? U.pick(CUSTOMER_POOL.lines.angry) : U.pick(CUSTOMER_POOL.lines.happy);
    Sim.log(`${c.name} ${m.name} [${g}] ${U.fmtMoney(pay)} — ${staff.name}. "${line}"`, g === "C" ? "bad" : (g === "S" ? "good" : ""));

    // 칸막이: 엿듣기 / 질투
    if (!s.mods.soundproof) {
      const waiting = s.customers.filter(x => x.state === "waiting" && x !== c);
      if (m.depth === "vein" && waiting.length && Math.random() < CONFIG.OVERHEAR_CHANCE) {
        const w = U.pick(waiting);
        s.rumor = U.clamp(s.rumor + 0.5, 0, 100);
        if (Math.random() < 0.25) { Sim.log(`${w.name}: "${U.pick(CUSTOMER_POOL.lines.overhear)}" — 슬그머니 나갔다.`, "bad"); Sim.customerLeaves(w, false); }
        else Sim.log(`${w.name}: "${U.pick(CUSTOMER_POOL.lines.overhear)}"`, "bad");
      }
      if (c.vip && staff.id === "player" && Math.random() < CONFIG.JEALOUSY_CHANCE) {
        const who = U.pick(["A", "B"].filter(k => { const x = Sim.staffOf(k); return x && x.busy == null; }));
        if (who) {
          s.relation[who] = Math.max(0, s.relation[who] - 1);
          Sim.log(who === "A" ? "레이나의 장부 넘기는 소리가 차가워졌다." : "네르가 티 나게 삐쳤다. 꼬리가 바닥을 쳤다.", "ev");
        }
      }
    }

    if (window.Render) Render.emote("cu_" + c.id, g === "S" ? "sparkle" : g === "A" ? "heart" : g === "C" ? "sweat" : "coin");
    Sim.emit("treated", { c, staff, grade: g, score, pay });
    Sim.customerLeaves(c, false);
  },

  levelUp(staff) {
    while (staff.xp >= staff.level * CONFIG.XP_PER_LEVEL) {
      staff.xp -= staff.level * CONFIG.XP_PER_LEVEL; staff.level += 1;
      const key = U.pick(["technique", "sense", "stamina", "charm"]);
      staff.stats[key] = Math.min(10, staff.stats[key] + 1);
      Sim.log(`${staff.name} Lv.${staff.level} — ${Sim.statName(key)} +1`, "good");
      if (window.Render) Render.emote("st_" + staff.id, "sparkle");
    }
  },

  statName(k) { return { technique: "손기술", sense: "감각", stamina: "체력", charm: "친절" }[k]; },

  // ---------- 경영 ----------
  buyUpgrade(id) {
    const s = Sim.s;
    const up = UPGRADES.find(u => u.id === id);
    if (!up || s.upgrades.includes(id)) return false;
    if (up.effect.rooms && s.rooms.length + up.effect.rooms > CONFIG.MAX_ROOMS) return false;
    if (up.requires && !s.upgrades.includes(up.requires)) return false;
    if (up.repTier && U.repTier(s.rep).id < up.repTier) return false;
    if (s.money < up.cost) return false;
    s.money -= up.cost; s.ledger.today.expense += up.cost;
    s.upgrades.push(id);
    const e = up.effect;
    if (e.rooms) for (let i = 0; i < e.rooms; i++) s.rooms.push({ id: s.rooms.length, customerId: null, staffId: null, endsAt: 0, menuId: null });
    if (e.seats) s.seats += e.seats;
    for (const k of ["soundproof", "backdoor", "still", "dorm", "fullRest"]) if (e[k]) s.mods[k] = true;
    for (const k of ["spawnMul", "patienceMul", "restMul", "nightMul", "eveningMul"]) if (e[k]) s.mods[k] *= e[k];
    if (e.brewBonus) s.mods.brewBonus += e.brewBonus;
    if (e.maxStaff) s.maxStaff += e.maxStaff;
    if (e.candidates) { s.candidateCount += e.candidates; State.rollCandidates(s); }
    Sim.log(`[확장] ${up.name} 완료.`, "good");
    Sim.emit("change");
    return true;
  },

  hire(id) {
    const s = Sim.s;
    const c = s.candidates.find(x => x.id === id);
    if (!c || s.money < c.hireCost || s.staff.length >= s.maxStaff) return false;
    s.money -= c.hireCost; s.ledger.today.expense += c.hireCost;
    c.hired = true;
    s.staff.push(c);
    s.candidates = s.candidates.filter(x => x !== c);
    s.counters.hired += 1;
    Sim.log(`[고용] ${c.name}(${c.race}${c.traits.length ? ", " + c.traits.join("·") : ""})을(를) 고용했다. 일당 ${U.fmtMoney(c.wage)}`, "good");
    Sim.emit("change");
    return true;
  },

  fire(id) {
    const s = Sim.s;
    const st = s.staff.find(x => x.id === id);
    if (!st || st.id === "player" || CHARACTERS[st.id] || st.busy != null) return false;
    s.staff = s.staff.filter(x => x !== st);
    s.party = s.party.filter(x => x !== id);
    Sim.log(`${st.name}이(가) 가게를 떠났다.`);
    Sim.emit("change");
    return true;
  },

  setPost(id, post) {
    const st = Sim.s.staff.find(x => x.id === id);
    if (!st || st.busy != null) return false;
    if (!Sim.postsFor(st).includes(post)) return false;
    st.post = post;
    Sim.emit("change");
    return true;
  },

  postsFor(st) {
    if (st.id === "A") return ["reception", "brew", "treatment", "rest"];
    const ch = CHARACTERS[st.id];
    if (ch && ch.asStaff) return ch.asStaff.posts;
    return ["treatment", "rest"];
  },

  oilPrice(kind) {
    const s = Sim.s;
    let price = CONFIG.OIL_PRICE[kind];
    if (s.recruited.E) price *= TRAITS["상단주"].oilDiscount;
    if ((s.relation.E || 0) >= 45 || s.flags.E_contract) price *= 0.8;
    if (s.day <= s.oilDiscountUntil) price *= 0.8;
    price *= Sim.dayMod("oilDiscount", 1);
    return Math.round(price);
  },

  buyOil(kind, n) {
    const s = Sim.s;
    const price = Sim.oilPrice(kind) * n;
    if (s.money < price) return false;
    s.money -= price; s.ledger.today.expense += price;
    s.oils[kind] += n; s.counters.oilsBought += n;
    Sim.log(`${OILS[kind].name} ${n}병 구매 (${U.fmtMoney(price)})`);
    Sim.emit("change");
    return true;
  },

  // ---------- 관계 ----------
  canTalk(code) {
    const s = Sim.s;
    if (!s.open) return false;
    const ch = CHARACTERS[code];
    if (ch.role === "vip" && !s.vipUnlocked[code]) return false;
    if (ch.role === "staff" || s.recruited[code]) { const st = Sim.staffOf(code); if (!st || st.busy != null) return false; }
    const t = s.talked[code];
    return !(t && t.day === s.day && t.n >= CONFIG.TALK_PER_DAY);
  },

  topicsFor(code) {
    const s = Sim.s, rel = s.relation[code] || 0;
    return DIALOGUES[code].topics.filter(t =>
      rel >= (t.minRel || 0) && !(t.once && s.topicsDone[t.id]) && (!t.flag || s.flags[t.flag]) && (!t.noFlag || !s.flags[t.noFlag]));
  },

  greet(code) {
    const tier = RELATION_TIERS.indexOf(U.relTier(Sim.s.relation[code] || 0));
    const g = DIALOGUES[code].greet;
    return g[Math.min(tier, g.length - 1)];
  },

  talk(code, topicId, choiceIdx) {
    const s = Sim.s;
    if (!Sim.canTalk(code)) return null;
    const topic = DIALOGUES[code].topics.find(t => t.id === topicId);
    const choice = topic.choices[choiceIdx];
    const t = s.talked[code];
    s.talked[code] = { day: s.day, n: (t && t.day === s.day ? t.n : 0) + 1 };
    if (topic.once) s.topicsDone[topic.id] = true;
    if (choice.flagOnPick) s.flags[choice.flagOnPick] = true;
    s.counters.talks += 1;
    Sim.applyEffect(choice.effect);
    Sim.log(`[대화] ${CHARACTERS[code].name} — ${topic.name}`, "ev");
    Sim.emit("change");
    return choice.text;
  },

  canGift(code) {
    const s = Sim.s;
    const ch = CHARACTERS[code];
    if (!s.open || (ch.role === "vip" && !s.vipUnlocked[code])) return false;
    return s.gifted[code] !== s.day;
  },

  gift(code, kind) {
    const s = Sim.s;
    if (!Sim.canGift(code) || s.oils[kind] <= 0) return false;
    s.oils[kind] -= 1;
    s.gifted[code] = s.day; s.counters.gifts += 1;
    const bonus = CONFIG.GIFT_RELATION + (kind === "warm" ? 1 : 0) + (kind === "moon" ? 3 : 0);
    s.relation[code] = U.clamp(s.relation[code] + bonus, 0, 100);
    Sim.log(`${CHARACTERS[code].name}에게 ${OILS[kind].name}을 건넸다. (관계 +${bonus})`, "good");
    Sim.emit("change");
    return true;
  },

  canOutcall(code) {
    const s = Sim.s, ch = CHARACTERS[code];
    if (!s.open || ch.role !== "vip" || !s.vipUnlocked[code] || s.recruited[code]) return false;
    if ((s.relation[code] || 0) < CONFIG.OUTCALL_MIN_REL) return false;
    if (s.outcall || Sim.player().busy != null) return false;
    if (s.time > CONFIG.OUTCALL_LAST_START) return false;
    return s.flags["outcall_" + code] !== s.day;
  },

  outcall(code) {
    const s = Sim.s;
    if (!Sim.canOutcall(code)) return false;
    const p = Sim.player();
    p.busy = "out";
    s.outcall = { code, endsAt: s.time + CONFIG.OUTCALL_DURATION };
    s.flags["outcall_" + code] = s.day;
    Sim.log(`${CHARACTERS[code].place}(으)로 출장. ${CHARACTERS[code].name}의 공간에서는 주도권이 저쪽에 있다.`, "ev");
    Sim.emit("change");
    return true;
  },

  finishOutcall() {
    const s = Sim.s;
    const o = s.outcall; if (!o) return;
    s.outcall = null;
    const p = Sim.player();
    p.busy = null;
    p.fatigue = Math.min(100, p.fatigue + CONFIG.FATIGUE_PER_TREATMENT * 1.5);
    const pay = CONFIG.OUTCALL_PAY;
    s.money += pay; s.ledger.today.income += pay; s.ledger.today.served += 1; s.stats.totalServed += 1;
    s.relation[o.code] = U.clamp(s.relation[o.code] + CONFIG.OUTCALL_RELATION, 0, 100);
    s.rumor = U.clamp(s.rumor + 1, 0, 100);
    s.counters.outcalls += 1;
    p.xp += 40; Sim.levelUp(p);
    Sim.log(`출장에서 돌아왔다. ${U.fmtMoney(pay)}, ${CHARACTERS[o.code].name} 관계 +${CONFIG.OUTCALL_RELATION}`, "good");
    Sim.emit("change");
  },

  // ---------- 이벤트 ----------
  applyEffect(e) {
    const s = Sim.s;
    if (!e) return;
    s.dayMods = s.dayMods || {};
    if (e.spawnMul) s.dayMods.spawnMul = (s.dayMods.spawnMul || 1) * e.spawnMul;
    if (e.spawnToday) s.dayMods.spawnMul = (s.dayMods.spawnMul || 1) * e.spawnToday;
    if (e.veinBias) s.dayMods.veinBias = e.veinBias;
    if (e.fatigueMul) s.dayMods.fatigueMul = e.fatigueMul;
    if (e.oilDiscount) s.dayMods.oilDiscount = e.oilDiscount;
    if (e.oilDiscountDays) s.oilDiscountUntil = s.day + e.oilDiscountDays;
    if (e.rumor) s.rumor = U.clamp(s.rumor + e.rumor, 0, 100);
    if (e.rep) s.rep = Math.max(0, s.rep + e.rep);
    if (e.money) s.money += e.money;
    if (e.relation) for (const k in e.relation) s.relation[k] = U.clamp((s.relation[k] || 0) + e.relation[k], 0, 100);
    if (e.flag) s.flags[e.flag] = true;
    if (e.unflag) delete s.flags[e.unflag];
    if (e.oil) for (const k in e.oil) s.oils[k] = Math.max(0, s.oils[k] + e.oil[k]);
    if (e.unlockOil) { s.oilsUnlocked[e.unlockOil] = true; s.oils[e.unlockOil] += 1; }
    if (e.stat) { const p = Sim.player(); for (const k in e.stat) p.stats[k] = U.clamp(p.stats[k] + e.stat[k], 1, 10); }
    if (e.staffStat) for (const code in e.staffStat) { const st = Sim.staffOf(code); if (st) for (const k in e.staffStat[code]) st.stats[k] = U.clamp(st.stats[k] + e.staffStat[code][k], 1, 10); }
    if (e.staffXp) for (const code in e.staffXp) { const st = Sim.staffOf(code); if (st) { st.xp += e.staffXp[code]; Sim.levelUp(st); } }
    if (e.playerRest) { const p = Sim.player(); p.fatigue = Math.max(0, p.fatigue - e.playerRest); }
    if (e.staffRest) for (const code in e.staffRest) { const st = Sim.staffOf(code); if (st) st.fatigue = Math.max(0, st.fatigue - e.staffRest[code]); }
    if (e.nightMul) s.dayMods.nightMul = e.nightMul;
    if (e.eveningMul) s.dayMods.eveningMul = e.eveningMul;
    if (e.counterAdd) for (const k in e.counterAdd) s.counters[k] = (s.counters[k] || 0) + e.counterAdd[k];
    if (e.dayPatience) s.dayMods.patienceMul = (s.dayMods.patienceMul || 1) * e.dayPatience;
    if (e.dayScore) s.dayMods.scoreBonus = (s.dayMods.scoreBonus || 0) + e.dayScore;
    if (e.recruit) Sim.recruit(e.recruit);
    if (e.closeToday) { Sim.log("오늘 영업을 마감한다.", "bad"); setTimeout(() => Sim.endDay(), 0); }
  },

  choiceAllowed(ch) {
    const s = Sim.s, r = ch.requires;
    if (!r) return true;
    if (r.money != null && s.money < r.money) return false;
    if (r.relationAtLeast) for (const k in r.relationAtLeast) if ((s.relation[k] || 0) < r.relationAtLeast[k]) return false;
    if (r.flag && !s.flags[r.flag]) return false;
    if (r.noFlag && s.flags[r.noFlag]) return false;
    return true;
  },

  whenOk(w) {
    const s = Sim.s;
    if (!w) return true;
    if (w.rumorAtLeast != null && s.rumor < w.rumorAtLeast) return false;
    if (w.repTier != null && U.repTier(s.rep).id < w.repTier) return false;
    if (w.vipUnlocked && !s.vipUnlocked[w.vipUnlocked]) return false;
    if (w.vipUnlocked2 && !s.vipUnlocked[w.vipUnlocked2]) return false;
    if (w.achievement && !s.achievements[w.achievement]) return false;
    if (w.notRecruited && s.recruited[w.notRecruited]) return false;
    if (w.flag && !s.flags[w.flag]) return false;
    if (w.noFlag && s.flags[w.noFlag]) return false;
    if (w.relationAtLeast) for (const k in w.relationAtLeast) if ((s.relation[k] || 0) < w.relationAtLeast[k]) return false;
    if (w.counter) for (const k in w.counter) if ((s.counters[k] || 0) < w.counter[k]) return false;
    if (w.staffLevel) for (const k in w.staffLevel) { const st = Sim.staffOf(k); if (!st || st.level < w.staffLevel[k]) return false; }
    return true;
  },

  checkStoryEvents() {
    const s = Sim.s;
    if (s.pendingEvent) return;
    for (const ev of STORY_EVENTS) {
      if (ev.once && s.firedEvents[ev.id]) continue;
      if (!ev.once && s.firedEvents[ev.id] === s.day) continue;
      if (!Sim.whenOk(ev.when)) continue;
      s.firedEvents[ev.id] = ev.once ? true : s.day;
      if (ev.id === "inspection") s.counters.inspections += 1;
      Sim.log(`[${ev.title}] ${ev.text.split("\n")[0]}`, "ev");
      const code = (ev.when && ev.when.vipUnlocked) || (ev.id.match(/^([A-E])_/) || [])[1];
      if (ev.choices) {
        s.pendingEvent = ev.id;
        Sim.emit("choice", { ev, code, onPick: (i) => {
          const ch = ev.choices[i];
          s.pendingEvent = null;
          Sim.applyEffect(ch.effect);
          Sim.log(`→ ${ch.label}`, "ev");
          Sim.emit("change");
          return ch.text;
        } });
      } else {
        Sim.emit("modal", { title: ev.title, text: ev.text, code });
        Sim.applyEffect(ev.effect);
      }
      return;
    }
  },

  // ---------- 업적 ----------
  metrics() {
    const s = Sim.s, c = s.counters;
    const rel = ["A", "B", "C", "D", "E"].map(k => s.relation[k] || 0);
    const ner = Sim.staffOf("B");
    return {
      served: s.stats.totalServed, income: s.stats.totalIncome, days: s.day, repTier: U.repTier(s.rep).id,
      regulars: s.regulars.length, rooms: s.rooms.length, staff: s.staff.length, upgrades: s.upgrades.length,
      seats: s.seats, vips: Object.keys(s.vipUnlocked).length, relationMax: Math.max(...rel), relationMin: Math.min(...rel),
      soundproof: s.mods.soundproof ? 1 : 0, levelMax: Math.max(...s.staff.map(x => x.level)), nerLevel: ner ? ner.level : 0,
      moonUnlocked: s.oilsUnlocked.moon ? 1 : 0, equips: Object.keys(s.equips).length, storyEvents: Object.keys(s.firedEvents).length,
      dTreated: c.D_treated, hired: c.hired, debtPaid: s.debt?.cleared ? 1 : 0, debtEarly: s.debt?.cleared && s.debt.cleared <= 20 ? 1 : 0, debtPaidAmount: s.debt ? s.debt.paid : 0, ...c,
    };
  },

  checkAchievements() {
    const s = Sim.s, m = Sim.metrics();
    for (const a of ACHIEVEMENTS) {
      if (s.achievements[a.id]) continue;
      let ok = true;
      for (const k in a.when) if ((m[k] || 0) < a.when[k]) { ok = false; break; }
      if (!ok) continue;
      s.achievements[a.id] = s.day;
      Sim.applyEffect(a.reward);
      const r = [];
      if (a.reward.money) r.push(U.fmtMoney(a.reward.money));
      if (a.reward.rep) r.push(`평판 +${a.reward.rep}`);
      Sim.log(`[업적] ${a.name}${a.text ? " — " + a.text : ""} (${r.join(", ")})`, "good");
      Sim.emit("achievement", a);
    }
  },

  // ---------- 던전 ----------
  depthAvailable(d) {
    const s = Sim.s;
    return U.repTier(s.rep).id >= d.repTier;
  },
  expeditionCandidates() {
    return Sim.s.staff.filter(st => st.id !== "player" && st.busy == null && st.fatigue < 70 && st.post !== "brew");
  },
  toggleParty(id) {
    const s = Sim.s;
    if (s.party.includes(id)) s.party = s.party.filter(x => x !== id);
    else if (s.party.length < DUNGEON.MAX_PARTY && Sim.expeditionCandidates().some(st => st.id === id)) s.party.push(id);
    Sim.emit("change");
  },
  canExpedition(depthId, ids) {
    const s = Sim.s, d = DUNGEON.depths.find(x => x.id === depthId);
    if (!s.open || s.expedition || !d || !Sim.depthAvailable(d)) return false;
    if (!ids.length || ids.length > DUNGEON.MAX_PARTY) return false;
    if (s.time + d.duration > CONFIG.DAY_END_MIN - 30) return false;
    const cands = Sim.expeditionCandidates();
    for (const id of ids) { const st = cands.find(x => x.id === id); if (!st || st.level < d.minLevel) return false; }
    return true;
  },
  startExpedition(depthId, ids) {
    const s = Sim.s;
    if (!Sim.canExpedition(depthId, ids)) return false;
    const d = DUNGEON.depths.find(x => x.id === depthId);
    for (const id of ids) Sim.staffOf(id).busy = "dungeon";
    s.party = [];
    s.expedition = { depth: depthId, members: ids.slice(), endsAt: s.time + d.duration };
    Sim.log(`[심연구 ${d.name}] ${ids.map(id => Sim.staffOf(id).name).join(", ")} — ${U.pick(DUNGEON.lines.depart)}`, "ev");
    Sim.emit("change");
    return true;
  },
  finishExpedition() {
    const s = Sim.s, ex = s.expedition; if (!ex) return;
    s.expedition = null;
    const d = DUNGEON.depths.find(x => x.id === ex.depth);
    const got = {}; let knot = 0;
    for (const id of ex.members) {
      const st = Sim.staffOf(id); if (!st) continue;
      st.busy = null;
      const rolls = d.lootRolls + Math.floor(st.stats.stamina / 4);
      const rareMul = Sim.traitMul(st, "rareMul") * (1 + st.stats.sense / 10);
      for (let i = 0; i < rolls; i++) {
        const table = DUNGEON.loot[d.id].map(x => ({ id: x.id, weight: x.w * (MATERIALS[x.id].sell >= 300 ? rareMul : 1) }));
        const pick = U.pickWeighted(table);
        if (Math.random() < 0.85) { got[pick.id] = (got[pick.id] || 0) + 1; }
      }
      if (Math.random() < d.knotChance && !Sim.trait(st, "knotImmune")) { st.fatigue = 100; knot++; }
      else st.fatigue = Math.min(100, st.fatigue + d.fatigue * Sim.traitMul(st, "fatigueMul"));
      st.xp += 15 * d.id; Sim.levelUp(st);
    }
    for (const k in got) s.materials[k] += got[k];
    if (got.core) s.counters.coreFound += got.core;
    s.counters.dungeonRuns += 1;
    if (d.id === 2) s.counters.depth2 += 1;
    if (d.id === 3) s.counters.depth3 += 1;
    if (knot) { s.counters.knotReturns += knot; Sim.log(U.pick(DUNGEON.lines.knot), "bad"); }
    const list = Object.keys(got).map(k => `${MATERIALS[k].name}×${got[k]}`).join(", ");
    Sim.log(`[귀환] ${list ? list + " — " + U.pick(DUNGEON.lines.return) : U.pick(DUNGEON.lines.empty)}`, list ? "good" : "bad");
    Sim.emit("change");
  },

  // ---------- 제작 ----------
  canCraft(r) {
    const s = Sim.s;
    if (r.needStill && !s.mods.still) return false;
    if (r.needOil && !s.oilsUnlocked[r.needOil]) return false;
    if (r.result.equip && s.equips[r.result.equip]) return false;
    for (const k in r.cost) if ((s.materials[k] || 0) < r.cost[k]) return false;
    return true;
  },
  craft(id) {
    const s = Sim.s, r = RECIPES.find(x => x.id === id);
    if (!r || !Sim.canCraft(r)) return false;
    for (const k in r.cost) s.materials[k] -= r.cost[k];
    const res = r.result;
    if (res.oil) { s.oils[res.oil] += res.n; s.counters.oilsBrewed += res.n; }
    if (res.item) s.items[res.item] += res.n;
    if (res.equip) { s.equips[res.equip] = true; if (ITEMS[res.equip].equip.nightMul) s.mods.nightMul *= ITEMS[res.equip].equip.nightMul; }
    s.counters.crafted += 1;
    Sim.log(`[제작] ${r.name}`, "good");
    Sim.emit("change");
    return true;
  },
  sellMaterial(k, n) {
    const s = Sim.s;
    if ((s.materials[k] || 0) < n) return false;
    s.materials[k] -= n; const got = MATERIALS[k].sell * n;
    s.money += got; s.ledger.today.income += got;
    Sim.log(`${MATERIALS[k].name} ${n}개를 상단에 팔았다. (${U.fmtMoney(got)})`);
    Sim.emit("change");
    return true;
  },
  useItem(id, targetId) {
    const s = Sim.s, it = ITEMS[id];
    if (!it || it.kind !== "item" || (s.items[id] || 0) <= 0) return false;
    const u = it.use;
    if (u.staffRest) { const st = Sim.staffOf(targetId) || Sim.staffOf("player"); st.fatigue = Math.max(0, st.fatigue - u.staffRest); Sim.log(`${st.name}에게 ${it.name}을 썼다.`); }
    if (u.playerRest) { const p = Sim.player(); p.fatigue = Math.max(0, p.fatigue - u.playerRest); Sim.log(`${it.name}을 마셨다.`); }
    if (u.dayPatience || u.dayScore) { Sim.applyEffect(u); Sim.log(`${it.name}을 썼다. 오늘 하루 효과.`, "good"); }
    s.items[id] -= 1;
    Sim.emit("change");
    return true;
  },

  // ---------- 영입 ----------
  recruit(code) {
    const s = Sim.s, ch = CHARACTERS[code];
    if (!ch || !ch.asStaff || s.recruited[code]) return false;
    s.recruited[code] = s.day;
    s.counters.recruits += 1;
    const st = State.mkStaff({ ...ch, stats: ch.asStaff.stats, traits: ch.asStaff.traits, wage: ch.asStaff.wage ?? CONFIG.ELITE_WAGE });
    st.post = ch.asStaff.posts[0] === "reception" ? "reception" : "treatment";
    st.level = 3;
    s.staff.push(st);
    s.maxStaff = Math.max(s.maxStaff, s.staff.length);
    s.customers = s.customers.filter(c => c.vip !== code);
    Sim.log(`[영입] ${ch.name}이(가) 가게 식구가 됐다. ${ch.asStaff.title}.`, "good");
    Sim.emit("change");
    return true;
  },
};
