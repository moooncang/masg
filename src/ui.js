// ============================================================
// DOM UI: 상단바, 사이드 패널 탭, 로그, 모달, 대화
// ============================================================
window.UI = {
  $(sel) { return document.querySelector(sel); },
  el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; },
  esc(str) { return String(str).replace(/\n/g, "<br>"); },
  POST_NAME: { reception: "접수", brew: "조향", treatment: "시술", rest: "휴식" },

  init() {
    document.querySelectorAll("#tabs button").forEach(b => b.onclick = () => {
      document.querySelectorAll("#tabs button").forEach(x => x.classList.toggle("active", x === b));
      document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x.id === "tab-" + b.dataset.tab));
      UI.refresh();
    });
    document.querySelectorAll("#topbar [data-speed]").forEach(b => b.onclick = () => UI.setSpeed(Number(b.dataset.speed)));
    Sim.on((type, p) => {
      if (type === "log") UI.addLog(p);
      if (type === "modal") UI.modal(p.title, UI.esc(p.text), [{ label: "확인" }], p.code);
      if (type === "choice") UI.choiceModal(p);
      if (type === "summary") UI.summary(p);
      if (type === "change" || type === "day" || type === "customer" || type === "treated") UI.refresh();
      if (type === "achievement") UI.toast(`업적: ${p.name}`);
    });
  },

  toast(text) {
    const t = UI.el("div", "toast", text);
    document.body.appendChild(t);
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 2600);
  },

  setSpeed(v) {
    Sim.s.speed = v;
    document.querySelectorAll("#topbar [data-speed]").forEach(x => x.classList.toggle("active", Number(x.dataset.speed) === v));
  },

  topbar() {
    const s = Sim.s, tier = U.repTier(s.rep);
    UI.$("#tb-shop").textContent = s.shopName;
    UI.$("#tb-day").textContent = `${s.day}일차`;
    UI.$("#tb-phase").textContent = Sim.phase().name;
    UI.$("#tb-clock").textContent = U.fmtClock(s.time);
    UI.$("#tb-money").textContent = U.fmtMoney(s.money);
    UI.$("#tb-money").className = s.money < 0 ? "bad" : "";
    UI.$("#tb-rep").textContent = `${tier.name} (${Math.round(s.rep)})`;
    UI.$("#tb-rumor").textContent = `소문 ${Math.round(s.rumor)}`;
    UI.$("#tb-rumor").className = s.rumor >= 50 ? "bad" : "";
  },

  addLog(line) {
    const box = UI.$("#log");
    box.appendChild(UI.el("div", "line " + line.cls, `<span class="muted">${U.fmtClock(line.t)}</span> ${line.text}`));
    while (box.children.length > 120) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  },

  refresh() {
    const active = document.querySelector("#tabs button.active").dataset.tab;
    UI["tab_" + active]();
  },

  bar(v, max, cls) { return `<div class="bar ${cls || ""}"><i style="width:${U.clamp(v / max * 100, 0, 100)}%"></i></div>`; },

  // ---------- 가게 ----------
  tab_shop() {
    const s = Sim.s, t = s.ledger.today;
    const box = UI.$("#tab-shop"); box.innerHTML = "";
    box.appendChild(UI.el("h3", null, "오늘"));
    box.appendChild(UI.el("div", "card", `
      <div class="row"><span>수입</span><b class="good">${U.fmtMoney(t.income)}</b></div>
      <div class="row"><span>지출</span><b class="bad">${U.fmtMoney(t.expense)}</b></div>
      <div class="row"><span>시술 / 이탈</span><b>${t.served} / ${t.left}</b></div>
      <div class="row"><span>시술실</span><b>${s.rooms.filter(r => r.customerId).length} / ${s.rooms.length} 사용 중</b></div>
      <div class="row"><span>대기</span><b>${s.customers.filter(c => c.state === "waiting").length} / ${s.seats}</b></div>
      <div class="row"><span>단골</span><b>${s.regulars.length}명</b></div>
      <div class="row"><span>직원</span><b>${s.staff.length} / ${s.maxStaff}</b></div>
      ${s.expedition ? `<div class="sub">심연구 탐사 중 — ${s.expedition.members.map(id => (Sim.staffOf(id) || {}).name).join(", ")}, ${U.fmtClock(s.expedition.endsAt)} 귀환</div>` : ""}
      ${s.outcall ? `<div class="sub">사장 출장 중 — ${CHARACTERS[s.outcall.code].place}, ${U.fmtClock(s.outcall.endsAt)} 복귀</div>` : ""}
      ${s.flags.E_contract ? `<div class="sub">카르벤 상단 전속 계약 중 (일당 ${U.fmtMoney(CONFIG.CONTRACT_DAILY)}, 소문 +${CONFIG.CONTRACT_RUMOR}/일)</div>` : ""}
      ${s.flags.C_designated ? `<div class="sub">기사단 지정 시술소 (소문 감소 2배, 기사단 손님)</div>` : ""}
      ${s.todayEvent ? `<div class="sub" style="margin-top:4px">[${s.todayEvent.name}] ${s.todayEvent.text}</div>` : ""}
    `));
    box.appendChild(UI.el("h3", null, "메뉴"));
    const tier = U.repTier(s.rep).id;
    for (const m of MENU) {
      const open = m.unlockTier <= tier;
      box.appendChild(UI.el("div", "card", `
        <div class="row"><span class="title ${open ? "" : "muted"}">${m.name}</span><span>${U.fmtMoney(m.price)}</span></div>
        <div class="sub">${m.duration}분 · 난이도 ${m.difficulty} · ${m.depth === "vein" ? "혈맥" : "표층"}${m.oil ? " · " + OILS[m.oil].name : ""}${m.reservation ? " · 예약제" : ""}${open ? "" : ` · <span class="bad">${CONFIG.REP_TIERS[m.unlockTier].name} 필요</span>`}</div>
      `));
    }
    box.appendChild(UI.el("div", "card sub", "심결은 메뉴에 없다. 관계 이벤트에서만 열린다."));

    box.appendChild(UI.el("h3", null, "업적"));
    const done = ACHIEVEMENTS.filter(a => s.achievements[a.id]).length;
    const m = Sim.metrics();
    const next = ACHIEVEMENTS.filter(a => !s.achievements[a.id] && !a.hidden).map(a => ({ a, p: UI.achProgress(a, m) })).sort((x, y) => y.p - x.p).slice(0, 4);
    box.appendChild(UI.el("div", "card", `
      <div class="sub">${done} / ${ACHIEVEMENTS.length} 달성 · 자세히는 업적 탭</div>
      ${next.map(({ a, p }) => `<div class="row"><span>□ ${a.name}</span><span class="sub">${Math.round(p * 100)}%</span></div>`).join("")}
    `));

    box.appendChild(UI.el("h3", null, "장부"));
    const hist = s.ledger.history.slice(-7).reverse();
    box.appendChild(UI.el("div", "card sub", hist.length ? hist.map(h => `${h.day}일차: +${U.fmtMoney(h.income)} / -${U.fmtMoney(h.expense)} (${h.served}명)`).join("<br>") : "아직 기록 없음"));
  },

  // ---------- 직원 ----------
  staffCard(st, actions) {
    const info = CHARACTERS[st.id] || st;
    const title = (info.asStaff && Sim.s.recruited[st.id]) ? info.asStaff.title : (info.title || st.race || "");
    const stats = ["technique", "sense", "stamina", "charm"].map(k => `<span class="stat">${Sim.statName(k)} <b>${st.stats[k]}</b></span>`).join("");
    const traits = (st.traits || []).map(t => `<span class="tag" title="${TRAITS[t] ? TRAITS[t].desc : ""}">${t}</span>`).join(" ");
    const busy = st.busy === "out" ? "출장" : st.busy === "dungeon" ? "탐사 중" : st.busy != null ? "시술 중" : UI.POST_NAME[st.post];
    return `
      <div class="row"><span class="title">${info.elite ? "★ " : ""}${st.name} <span class="sub">${title}</span></span><span class="sub">Lv.${st.level}${st.hired ? " · " + busy : ""}</span></div>
      <div>${stats}</div>
      ${traits ? `<div class="sub">${traits}</div>` : ""}
      ${st.hired ? `<div class="sub">피로</div>${UI.bar(st.fatigue, 100, st.fatigue >= CONFIG.FATIGUE_PENALTY_AT ? "red" : "")}<div class="sub">경험</div>${UI.bar(st.xp, st.level * CONFIG.XP_PER_LEVEL, "green")}` : ""}
      ${info.quirk ? `<div class="sub">${info.quirk}</div>` : ""}
      <div class="row" style="flex-wrap:wrap">${actions}</div>`;
  },

  tab_staff() {
    const s = Sim.s;
    const box = UI.$("#tab-staff"); box.innerHTML = "";
    box.appendChild(UI.el("h3", null, `직원 ${s.staff.length} / ${s.maxStaff}`));
    const towel = s.items.towel || 0;
    for (const st of s.staff) {
      const posts = Sim.postsFor(st);
      const btns = posts.map(p => `<button data-post="${p}" ${st.post === p ? 'class="active"' : ""} ${st.busy != null ? "disabled" : ""}>${UI.POST_NAME[p]}</button>`).join("");
      const fire = (st.id !== "player" && !CHARACTERS[st.id]) ? `<button data-fire="1" ${st.busy != null ? "disabled" : ""}>해고</button>` : "";
      const tw = towel > 0 && st.fatigue > 0 ? `<button data-towel="1" title="온열 수건: 피로 -40">수건(${towel})</button>` : "";
      const card = UI.el("div", "card", UI.staffCard(st, btns + fire + tw));
      card.querySelectorAll("[data-post]").forEach(b => b.onclick = () => Sim.setPost(st.id, b.dataset.post));
      const f = card.querySelector("[data-fire]"); if (f) f.onclick = () => UI.modal("해고", `${st.name}을(를) 내보낼까요?`, [{ label: "취소" }, { label: "해고", fn: () => Sim.fire(st.id) }]);
      const t = card.querySelector("[data-towel]"); if (t) t.onclick = () => Sim.useItem("towel", st.id);
      box.appendChild(card);
    }
    const full = s.staff.length >= s.maxStaff;
    box.appendChild(UI.el("h3", null, `구인 (매일 갱신)${full ? ' <span class="bad">정원 가득 — 숙소를 넓힌다</span>' : ""}`));
    for (const c of s.candidates) {
      const wage = Math.round(c.wage * (s.mods.dorm ? 0.7 : 1));
      const card = UI.el("div", "card", UI.staffCard(c, `<span class="sub">고용 ${U.fmtMoney(c.hireCost)} · 일당 ${U.fmtMoney(wage)}</span><button data-hire="1" ${s.money < c.hireCost || full ? "disabled" : ""}>고용</button>`));
      card.querySelector("[data-hire]").onclick = () => Sim.hire(c.id);
      box.appendChild(card);
    }
  },

  // ---------- 확장 ----------
  tab_upgrade() {
    const s = Sim.s, tier = U.repTier(s.rep).id;
    const box = UI.$("#tab-upgrade"); box.innerHTML = "";
    box.appendChild(UI.el("h3", null, "확장"));
    for (const up of UPGRADES) {
      const done = s.upgrades.includes(up.id);
      const needReq = up.requires && !s.upgrades.includes(up.requires);
      const needTier = up.repTier && tier < up.repTier;
      const capped = up.effect.rooms && s.rooms.length >= CONFIG.MAX_ROOMS;
      const locked = needReq || needTier || capped;
      const card = UI.el("div", "card", `
        <div class="row"><span class="title ${done ? "good" : locked ? "muted" : ""}">${up.name}</span><span>${done ? "완료" : U.fmtMoney(up.cost)}</span></div>
        <div class="sub">${up.desc}${needTier ? ` · <span class="bad">${CONFIG.REP_TIERS[up.repTier].name} 필요</span>` : ""}${needReq ? ` · <span class="bad">선행: ${UPGRADES.find(u => u.id === up.requires).name}</span>` : ""}</div>
        ${done || locked ? "" : `<div class="row"><span></span><button data-buy="1" ${s.money < up.cost ? "disabled" : ""}>구매</button></div>`}
      `);
      const b = card.querySelector("[data-buy]"); if (b) b.onclick = () => Sim.buyUpgrade(up.id);
      box.appendChild(card);
    }
  },

  // ---------- 향유 ----------
  tab_oil() {
    const s = Sim.s;
    const box = UI.$("#tab-oil"); box.innerHTML = "";
    box.appendChild(UI.el("h3", null, "향유 재고"));
    for (const k of ["calm", "warm"]) {
      const o = OILS[k], price = Sim.oilPrice(k);
      const disc = price < CONFIG.OIL_PRICE[k];
      const card = UI.el("div", "card", `
        <div class="row"><span class="title">${o.name}</span><b>${s.oils[k]}병</b></div>
        <div class="sub">${o.desc} · 시술 점수 +${o.bonus}</div>
        <div class="row"><span class="sub">상단 납품가 ${U.fmtMoney(price)}/병${disc ? ' <span class="good">(할인)</span>' : ""}</span>
          <span><button data-n="1" ${s.money < price ? "disabled" : ""}>1병</button> <button data-n="5" ${s.money < price * 5 ? "disabled" : ""}>5병</button></span></div>
      `);
      card.querySelectorAll("[data-n]").forEach(b => b.onclick = () => Sim.buyOil(k, Number(b.dataset.n)));
      box.appendChild(card);
    }
    if (s.oilsUnlocked.moon) {
      box.appendChild(UI.el("div", "card", `
        <div class="row"><span class="title">${OILS.moon.name}</span><b>${s.oils.moon}병</b></div>
        <div class="sub">${OILS.moon.desc} · 혈맥 시술에 자동 사용, 점수 +${OILS.moon.bonus}, 소문 +2 · ${s.mods.still ? `${CONFIG.MOON_BREW_EVERY}일마다 1병` : "조향 증류기가 있어야 만들 수 있다"}</div>
      `));
    }
    const brewing = s.staff.some(st => st.id === "A" && st.post === "brew");
    box.appendChild(UI.el("div", "card sub", `조향실: ${brewing ? `레이나가 매일 ${CONFIG.OIL_BREW_PER_DAY + s.mods.brewBonus}병을 만든다.` : "레이나를 조향실에 배치하면 매일 향유를 만든다."}${s.oilsUnlocked.moon ? "" : "<br>월하향은 선반에 없다."}`));
  },

  // ---------- 관계 ----------
  tab_people() {
    const s = Sim.s;
    const box = UI.$("#tab-people"); box.innerHTML = "";
    const staffCodes = ["A", "B", ...["C", "D", "E"].filter(c => s.recruited[c])];
    const vipCodes = ["C", "D", "E"].filter(c => !s.recruited[c]);
    box.appendChild(UI.el("h3", null, "엘리트 직원"));
    for (const code of staffCodes) box.appendChild(UI.personCard(code));
    if (vipCodes.length) { box.appendChild(UI.el("h3", null, "엘리트 손님")); for (const code of vipCodes) box.appendChild(UI.personCard(code)); }
    box.appendChild(UI.el("div", "card sub", "엘리트 손님은 특정 업적을 달성하고 관계가 각별(75)해지면 식구로 들일 수 있다. 조건은 각 카드의 ▸ 항목."));
  },

  personCard(code) {
    const s = Sim.s, ch = CHARACTERS[code], rel = s.relation[code] || 0;
    const known = ch.role === "staff" || s.vipUnlocked[code];
    const face = Render.img["face_" + code];
    const st = Sim.staffOf(code);
    const talkOk = Sim.canTalk(code), giftOk = Sim.canGift(code), outOk = Sim.canOutcall(code);
    const talked = s.talked[code] && s.talked[code].day === s.day;
    const giftOils = ["calm", "warm", "moon"].filter(k => s.oils[k] > 0 && s.oilsUnlocked[k]);
    const card = UI.el("div", "card", `
      ${face ? `<img class="portrait" src="${ASSETS.portraits[code]}">` : ""}
      <div class="row"><span class="title">★ ${known ? ch.name : "???"} <span class="sub">${known ? ch.race + " · " + ch.title : ""}</span></span><span class="sub">${known ? U.relTier(rel).name + " " + rel : ""}</span></div>
      ${known ? UI.bar(rel, 100, "green") : ""}
      <div class="sub">${known ? ch.desc : "아직 만나지 못했다. " + (ch.unlock.repTier ? CONFIG.REP_TIERS[ch.unlock.repTier].name + " 이상" : "") + (ch.unlock.rumorAtLeast ? ", 소문 " + ch.unlock.rumorAtLeast + " 이상" : "")}</div>
      ${known && ch.hook ? `<div class="sub">▸ ${ch.hook}</div>` : ""}
      ${known && st ? `<div class="sub">Lv.${st.level} · ${st.busy === "out" ? "출장" : st.busy != null ? "시술 중" : UI.POST_NAME[st.post]}</div>` : ""}
      ${known && code === "D" && s.flags.D_quest && !s.flags.D_quest_done ? `<div class="sub">측정 ${s.counters.D_treated} / ${CONFIG.D_QUEST_COUNT}</div>` : ""}
      ${known ? `<div class="row" style="flex-wrap:wrap">
        <button data-talk="1" ${talkOk ? "" : "disabled"}>${talked ? "오늘 대화함" : "대화"}</button>
        <button data-gift="1" ${giftOk && giftOils.length ? "" : "disabled"}>선물</button>
        ${ch.role === "vip" && !s.recruited[code] ? `<button data-out="1" ${outOk ? "" : "disabled"} title="관계 ${CONFIG.OUTCALL_MIN_REL} 이상, 20시 전, 하루 1회">출장</button>` : ""}
      </div>` : ""}
      <div style="clear:both"></div>
    `);
    const t = card.querySelector("[data-talk]"); if (t) t.onclick = () => UI.dialog(code);
    const g = card.querySelector("[data-gift]"); if (g) g.onclick = () => UI.giftModal(code, giftOils);
    const o = card.querySelector("[data-out]"); if (o) o.onclick = () => { Sim.outcall(code); UI.refresh(); };
    return card;
  },

  giftModal(code, oils) {
    UI.modal(`${CHARACTERS[code].name}에게 선물`, "향유 한 병을 건넨다. (하루 1회)", [
      ...oils.map(k => ({ label: `${OILS[k].name} (${Sim.s.oils[k]})`, fn: () => Sim.gift(code, k) })),
      { label: "취소" },
    ], code);
  },

  dialog(code) {
    const s = Sim.s, ch = CHARACTERS[code];
    if (!Sim.canTalk(code)) return;
    const topics = Sim.topicsFor(code);
    const body = `<p class="quote">${UI.esc(Sim.greet(code))}</p><div class="sub">주제를 고른다 (하루 ${CONFIG.TALK_PER_DAY}회)</div>`;
    const actions = topics.map(t => ({ label: t.name + (t.once ? " ✦" : ""), keep: true, fn: () => UI.dialogTopic(code, t) }));
    actions.push({ label: "나중에" });
    UI.modal(ch.name, body, actions, code);
  },

  dialogTopic(code, t) {
    const ch = CHARACTERS[code];
    const actions = t.choices.map((c, i) => ({ label: c.label, keep: true, disabled: !Sim.choiceAllowed(c), fn: () => {
      const text = Sim.talk(code, t.id, i);
      UI.modal(ch.name, `<p class="quote">${UI.esc(text)}</p>`, [{ label: "확인" }], code, { replace: true });
    } }));
    UI.modal(`${ch.name} — ${t.name}`, `<p class="quote">${UI.esc(t.text)}</p>`, actions, code, { replace: true });
  },

  choiceModal(p) {
    const ev = p.ev;
    const actions = ev.choices.map((c, i) => ({ label: c.label, keep: true, disabled: !Sim.choiceAllowed(c), fn: () => {
      const text = p.onPick(i);
      UI.modal(ev.title, `<p class="quote">${UI.esc(text)}</p>`, [{ label: "확인" }], p.code, { replace: true });
    } }));
    UI.modal(ev.title, `<p class="quote">${UI.esc(ev.text)}</p>`, actions, p.code);
  },

  // ---------- 던전 ----------
  dungeonSel: { depth: 1, members: [] },
  tab_dungeon() {
    const s = Sim.s, sel = UI.dungeonSel;
    const box = UI.$("#tab-dungeon"); box.innerHTML = "";
    box.appendChild(UI.el("h3", null, "심연구 탐사"));
    if (s.expedition) {
      const d = DUNGEON.depths.find(x => x.id === s.expedition.depth);
      box.appendChild(UI.el("div", "card", `<div class="title">${d.name}</div><div class="sub">${s.expedition.members.map(id => (Sim.staffOf(id) || {}).name).join(", ")} · ${U.fmtClock(s.expedition.endsAt)} 귀환</div>`));
    } else {
      const cands = Sim.expeditionCandidates();
      sel.members = sel.members.filter(id => cands.some(c => c.id === id));
      const tier = U.repTier(s.rep).id;
      const depthBtns = DUNGEON.depths.map(d => `<button data-depth="${d.id}" ${sel.depth === d.id ? 'class="active"' : ""} ${tier >= d.repTier ? "" : "disabled"} title="${d.desc}">${d.id}층</button>`).join(" ");
      const d = DUNGEON.depths.find(x => x.id === sel.depth);
      const memBtns = cands.length ? cands.map(c => `<button data-mem="${c.id}" ${sel.members.includes(c.id) ? 'class="active"' : ""} ${c.level < d.minLevel ? "disabled" : ""} title="Lv.${c.level} 피로 ${Math.round(c.fatigue)}">${c.name}</button>`).join(" ") : '<span class="sub">보낼 수 있는 직원이 없다 (피로 70 미만, 조향·시술 중 제외, 사장 제외)</span>';
      const ok = Sim.canExpedition(sel.depth, sel.members);
      const card = UI.el("div", "card", `
        <div class="row"><span>깊이</span><span>${depthBtns}</span></div>
        <div class="sub">${d.name} — ${d.desc}<br>${d.duration / 60}시간 · 직원 Lv.${d.minLevel}↑ · 피로 +${d.fatigue}${d.knotChance ? ` · 결 ${Math.round(d.knotChance * 100)}%` : ""}${tier < d.repTier ? ` · <span class="bad">${CONFIG.REP_TIERS[d.repTier].name} 필요</span>` : ""}</div>
        <div class="sub" style="margin-top:6px">파티 (최대 ${DUNGEON.MAX_PARTY}명)</div>
        <div class="row" style="flex-wrap:wrap;justify-content:flex-start">${memBtns}</div>
        <div class="row"><span class="sub">${s.time + d.duration > CONFIG.DAY_END_MIN - 30 ? "오늘은 늦었다" : "체력이 높으면 더 많이, 감각이 높으면 희귀한 것을 가져온다"}</span><button data-go="1" ${ok ? "" : "disabled"}>출발</button></div>
      `);
      card.querySelectorAll("[data-depth]").forEach(b => b.onclick = () => { sel.depth = Number(b.dataset.depth); UI.refresh(); });
      card.querySelectorAll("[data-mem]").forEach(b => b.onclick = () => { const id = b.dataset.mem; if (sel.members.includes(id)) sel.members = sel.members.filter(x => x !== id); else if (sel.members.length < DUNGEON.MAX_PARTY) sel.members.push(id); UI.refresh(); });
      card.querySelector("[data-go]").onclick = () => { Sim.startExpedition(sel.depth, sel.members); sel.members = []; UI.refresh(); };
      box.appendChild(card);
    }

    box.appendChild(UI.el("h3", null, "재료"));
    const mats = Object.keys(MATERIALS).filter(k => s.materials[k] > 0);
    const mc = UI.el("div", "card", mats.length ? mats.map(k => `<div class="row"><span>${MATERIALS[k].name} <span class="sub">${MATERIALS[k].desc}</span></span><span><b>${s.materials[k]}</b> <button data-sell="${k}" title="상단에 판다 (${U.fmtMoney(MATERIALS[k].sell)})">팔기</button></span></div>`).join("") : '<span class="sub">아직 없다. 탐사를 보낸다.</span>');
    mc.querySelectorAll("[data-sell]").forEach(b => b.onclick = () => Sim.sellMaterial(b.dataset.sell, 1));
    box.appendChild(mc);

    box.appendChild(UI.el("h3", null, "제작 (조향실)"));
    for (const r of RECIPES) {
      const ok = Sim.canCraft(r);
      const owned = r.result.equip && s.equips[r.result.equip];
      const cost = Object.keys(r.cost).map(k => `${MATERIALS[k].name}×${r.cost[k]}`).join(" ");
      const resName = r.result.oil ? OILS[r.result.oil].name + "×" + r.result.n : r.result.item ? ITEMS[r.result.item].name + "×" + r.result.n : ITEMS[r.result.equip].name;
      const resDesc = r.result.item ? ITEMS[r.result.item].desc : r.result.equip ? ITEMS[r.result.equip].desc : "";
      const lock = r.needStill && !s.mods.still ? ' · <span class="bad">증류기 필요</span>' : r.needOil && !s.oilsUnlocked[r.needOil] ? ' · <span class="bad">미해금</span>' : "";
      const card = UI.el("div", "card", `
        <div class="row"><span class="title ${owned ? "good" : ""}">${resName}</span>${owned ? '<span class="sub">설치됨</span>' : `<button data-craft="1" ${ok ? "" : "disabled"}>제작</button>`}</div>
        <div class="sub">${cost}${lock}${resDesc ? "<br>" + resDesc : ""}</div>`);
      const b = card.querySelector("[data-craft]"); if (b) b.onclick = () => Sim.craft(r.id);
      box.appendChild(card);
    }

    box.appendChild(UI.el("h3", null, "소모품"));
    const its = Object.keys(ITEMS).filter(k => ITEMS[k].kind === "item");
    const ic = UI.el("div", "card", its.map(k => `<div class="row"><span>${ITEMS[k].name} <span class="sub">${ITEMS[k].desc}</span></span><span><b>${s.items[k] || 0}</b> ${k !== "towel" ? `<button data-use="${k}" ${(s.items[k] || 0) > 0 && s.open ? "" : "disabled"}>사용</button>` : '<span class="sub">직원 탭</span>'}</span></div>`).join(""));
    ic.querySelectorAll("[data-use]").forEach(b => b.onclick = () => Sim.useItem(b.dataset.use));
    box.appendChild(ic);
  },

  // ---------- 업적 ----------
  achProgress(a, m) {
    let p = 1;
    for (const k in a.when) p = Math.min(p, (m[k] || 0) / a.when[k]);
    return U.clamp(p, 0, 1);
  },
  tab_achv() {
    const s = Sim.s, m = Sim.metrics();
    const box = UI.$("#tab-achv"); box.innerHTML = "";
    const done = ACHIEVEMENTS.filter(a => s.achievements[a.id]).length;
    box.appendChild(UI.el("h3", null, `업적 ${done} / ${ACHIEVEMENTS.length}`));
    const cats = [...new Set(ACHIEVEMENTS.map(a => a.cat))];
    for (const cat of cats) {
      const list = ACHIEVEMENTS.filter(a => a.cat === cat);
      const cd = list.filter(a => s.achievements[a.id]).length;
      box.appendChild(UI.el("h3", null, `${cat} ${cd}/${list.length}`));
      for (const a of list) {
        const got = s.achievements[a.id];
        if (a.hidden && !got) { box.appendChild(UI.el("div", "card sub", "??? — 숨겨진 업적")); continue; }
        const p = got ? 1 : UI.achProgress(a, m);
        const r = []; if (a.reward.money) r.push(U.fmtMoney(a.reward.money)); if (a.reward.rep) r.push("평판 +" + a.reward.rep);
        box.appendChild(UI.el("div", "card", `
          <div class="row"><span class="title ${got ? "good" : ""}">${got ? "✔ " : "□ "}${a.name}${a.key ? ' <span class="tag">영입 조건</span>' : ""}</span><span class="sub">${got ? got + "일차" : Math.round(p * 100) + "%"}</span></div>
          ${a.text ? `<div class="sub">${a.text}</div>` : ""}
          <div class="sub">보상 ${r.join(", ")}</div>
          ${got ? "" : UI.bar(p, 1, "green")}
        `));
      }
    }
  },

  // ---------- 설정 ----------
  tab_system() {
    const s = Sim.s;
    const box = UI.$("#tab-system"); box.innerHTML = "";
    const card = UI.el("div", "card", `
      <div class="row"><span>가게 이름</span><input id="shopname" value="${s.shopName}" style="width:140px"></div>
      <div class="row"><button id="btn-save">저장</button><button id="btn-endday">오늘 마감</button><button id="btn-reset">새 게임</button></div>
      <div class="sub" style="margin-top:6px">누적 시술 ${s.stats.totalServed}명 · 누적 수입 ${U.fmtMoney(s.stats.totalIncome)} · 최고 등급 ${s.stats.bestGrade}</div>
      <div class="sub">자동 저장: 매일 마감 시. 저장 위치: 브라우저 localStorage</div>
    `);
    card.querySelector("#shopname").onchange = (e) => { s.shopName = e.target.value || CONFIG.SHOP_DEFAULT_NAME; UI.topbar(); };
    card.querySelector("#btn-save").onclick = () => { State.save(s); Sim.log("저장했다.", "good"); };
    card.querySelector("#btn-endday").onclick = () => { if (s.open) Sim.endDay(); };
    card.querySelector("#btn-reset").onclick = () => UI.modal("새 게임", "저장을 지우고 처음부터 시작할까요?", [{ label: "취소" }, { label: "새 게임", fn: () => { State.clear(); location.reload(); } }]);
    box.appendChild(card);
  },

  // ---------- 모달 (큐: 열려 있으면 뒤에 줄을 선다. replace 는 같은 흐름 안에서 내용 교체) ----------
  modalPrevSpeed: null,
  modalQueue: [],
  modal(title, html, actions, code, opts) {
    const m = UI.$("#modal");
    const visible = !m.classList.contains("hidden");
    if (visible && !(opts && opts.replace)) { UI.modalQueue.push([title, html, actions, code]); return; }
    UI.$("#modal-title").textContent = title;
    const face = code && Render.img["face_" + code] ? `<img class="portrait" src="${ASSETS.portraits[code]}">` : "";
    UI.$("#modal-body").innerHTML = face + html + '<div style="clear:both"></div>';
    const act = UI.$("#modal-actions"); act.innerHTML = "";
    if (!visible) { UI.modalPrevSpeed = Sim.s.speed; Sim.s.speed = 0; }
    for (const a of actions) {
      const b = UI.el("button", null, a.label);
      if (a.disabled) b.disabled = true;
      b.onclick = () => {
        if (!a.keep) {
          m.classList.add("hidden");
          if (a.fn) a.fn();
          if (UI.modalQueue.length) { const next = UI.modalQueue.shift(); UI.modal(...next); }
          else UI.setSpeed(UI.modalPrevSpeed || 1);
        } else if (a.fn) a.fn();
        UI.refresh();
      };
      act.appendChild(b);
    }
    m.classList.remove("hidden");
  },

  summary(p) {
    UI.modal(`${p.day}일차 마감`, `
      <div class="row"><span>수입</span><b class="good">${U.fmtMoney(p.income)}</b></div>
      <div class="row"><span>지출</span><b class="bad">${U.fmtMoney(p.expense)}</b></div>
      <div class="row"><span>순이익</span><b>${U.fmtMoney(p.income - p.expense)}</b></div>
      <div class="row"><span>시술 / 이탈</span><b>${p.served} / ${p.left}</b></div>
      <div class="row"><span>소지금</span><b>${U.fmtMoney(p.money)}</b></div>
    `, [{ label: "다음 날", fn: () => Sim.startDay() }]);
  },
};
