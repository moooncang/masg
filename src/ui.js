// ============================================================
// DOM UI: 상단바, 사이드 패널 탭, 로그, 모달
// ============================================================
window.UI = {
  $(sel) { return document.querySelector(sel); },
  el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; },

  init() {
    document.querySelectorAll("#tabs button").forEach(b => b.onclick = () => {
      document.querySelectorAll("#tabs button").forEach(x => x.classList.toggle("active", x === b));
      document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x.id === "tab-" + b.dataset.tab));
      UI.refresh();
    });
    document.querySelectorAll("#topbar [data-speed]").forEach(b => b.onclick = () => {
      Sim.s.speed = Number(b.dataset.speed);
      document.querySelectorAll("#topbar [data-speed]").forEach(x => x.classList.toggle("active", x === b));
    });
    Sim.on((type, p) => {
      if (type === "log") UI.addLog(p);
      if (type === "modal") UI.modal(p.title, p.text.replace(/\n/g, "<br>"), [{ label: "확인" }], p.code);
      if (type === "summary") UI.summary(p);
      if (type === "change" || type === "day" || type === "customer" || type === "treated") UI.refresh();
    });
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
    box.appendChild(UI.el("h3", null, "장부"));
    const hist = s.ledger.history.slice(-7).reverse();
    box.appendChild(UI.el("div", "card sub", hist.length ? hist.map(h => `${h.day}일차: +${U.fmtMoney(h.income)} / -${U.fmtMoney(h.expense)} (${h.served}명)`).join("<br>") : "아직 기록 없음"));
  },

  staffCard(st, actions) {
    const info = Sim.charInfo(st.id) || st;
    const stats = ["technique", "sense", "stamina", "charm"].map(k => `<span class="stat">${Sim.statName(k)} <b>${st.stats[k]}</b></span>`).join("");
    const postName = { reception: "접수", brew: "조향", treatment: "시술", rest: "휴식" }[st.post];
    return `
      <div class="row"><span class="title">${st.name} <span class="sub">${info.title || st.race || ""}</span></span><span class="sub">Lv.${st.level}${st.hired ? " · " + postName : ""}</span></div>
      <div>${stats}</div>
      ${st.hired ? `<div class="sub">피로</div>${UI.bar(st.fatigue, 100, st.fatigue >= CONFIG.FATIGUE_PENALTY_AT ? "red" : "")}<div class="sub">경험</div>${UI.bar(st.xp, st.level * CONFIG.XP_PER_LEVEL, "green")}` : ""}
      ${info.quirk ? `<div class="sub">${info.quirk}</div>` : ""}
      <div class="row" style="flex-wrap:wrap">${actions}</div>`;
  },

  tab_staff() {
    const s = Sim.s;
    const box = UI.$("#tab-staff"); box.innerHTML = "";
    box.appendChild(UI.el("h3", null, "직원"));
    for (const st of s.staff) {
      const posts = st.id === "A" ? ["reception", "brew", "treatment", "rest"] : ["treatment", "rest"];
      const btns = posts.map(p => `<button data-post="${p}" ${st.post === p ? 'class="active"' : ""} ${st.busy != null ? "disabled" : ""}>${{ reception: "접수", brew: "조향", treatment: "시술", rest: "휴식" }[p]}</button>`).join("");
      const fire = (st.id !== "player" && st.id !== "A" && st.id !== "B") ? `<button data-fire="1" ${st.busy != null ? "disabled" : ""}>해고</button>` : "";
      const card = UI.el("div", "card", UI.staffCard(st, btns + fire));
      card.querySelectorAll("[data-post]").forEach(b => b.onclick = () => Sim.setPost(st.id, b.dataset.post));
      const f = card.querySelector("[data-fire]"); if (f) f.onclick = () => UI.modal("해고", `${st.name}을(를) 내보낼까요?`, [{ label: "취소" }, { label: "해고", fn: () => Sim.fire(st.id) }]);
      box.appendChild(card);
    }
    box.appendChild(UI.el("h3", null, "구인 (매일 갱신)"));
    for (const c of s.candidates) {
      const card = UI.el("div", "card", UI.staffCard(c, `<span class="sub">고용 ${U.fmtMoney(c.hireCost)} · 일당 ${U.fmtMoney(c.wage)}</span><button data-hire="1" ${s.money < c.hireCost ? "disabled" : ""}>고용</button>`));
      card.querySelector("[data-hire]").onclick = () => Sim.hire(c.id);
      box.appendChild(card);
    }
  },

  tab_upgrade() {
    const s = Sim.s, tier = U.repTier(s.rep).id;
    const box = UI.$("#tab-upgrade"); box.innerHTML = "";
    box.appendChild(UI.el("h3", null, "확장"));
    for (const up of UPGRADES) {
      const done = s.upgrades.includes(up.id);
      const locked = (up.requires && !s.upgrades.includes(up.requires)) || (up.repTier && tier < up.repTier);
      const card = UI.el("div", "card", `
        <div class="row"><span class="title ${done ? "good" : locked ? "muted" : ""}">${up.name}</span><span>${done ? "완료" : U.fmtMoney(up.cost)}</span></div>
        <div class="sub">${up.desc}${locked && up.repTier && tier < up.repTier ? ` · <span class="bad">${CONFIG.REP_TIERS[up.repTier].name} 필요</span>` : ""}${locked && up.requires && !s.upgrades.includes(up.requires) ? ` · <span class="bad">선행: ${UPGRADES.find(u => u.id === up.requires).name}</span>` : ""}</div>
        ${done || locked ? "" : `<div class="row"><span></span><button data-buy="1" ${s.money < up.cost ? "disabled" : ""}>구매</button></div>`}
      `);
      const b = card.querySelector("[data-buy]"); if (b) b.onclick = () => Sim.buyUpgrade(up.id);
      box.appendChild(card);
    }
  },

  tab_oil() {
    const s = Sim.s;
    const box = UI.$("#tab-oil"); box.innerHTML = "";
    box.appendChild(UI.el("h3", null, "향유 재고"));
    for (const k of ["calm", "warm"]) {
      const o = OILS[k], price = Math.round(CONFIG.OIL_PRICE[k] * ((s.relation.E || 0) >= 45 ? 0.8 : 1));
      const card = UI.el("div", "card", `
        <div class="row"><span class="title">${o.name}</span><b>${s.oils[k]}병</b></div>
        <div class="sub">${o.desc} · 시술 점수 +${o.bonus}</div>
        <div class="row"><span class="sub">상단 납품가 ${U.fmtMoney(price)}/병${(s.relation.E || 0) >= 45 ? ' <span class="good">(카샤 할인)</span>' : ""}</span>
          <span><button data-n="1" ${s.money < price ? "disabled" : ""}>1병</button> <button data-n="5" ${s.money < price * 5 ? "disabled" : ""}>5병</button></span></div>
      `);
      card.querySelectorAll("[data-n]").forEach(b => b.onclick = () => Sim.buyOil(k, Number(b.dataset.n)));
      box.appendChild(card);
    }
    const brewing = s.staff.some(st => st.id === "A" && st.post === "brew");
    box.appendChild(UI.el("div", "card sub", `조향실: ${brewing ? `레이나가 매일 ${CONFIG.OIL_BREW_PER_DAY + s.mods.brewBonus}병을 만든다.` : "레이나를 조향실에 배치하면 매일 향유를 만든다."}<br>월하향은 선반에 없다.`));
  },

  tab_people() {
    const s = Sim.s;
    const box = UI.$("#tab-people"); box.innerHTML = "";
    box.appendChild(UI.el("h3", null, "인물"));
    for (const code of ["A", "B", "C", "D", "E"]) {
      const ch = CHARACTERS[code], rel = s.relation[code] || 0, known = ch.role === "staff" || s.vipUnlocked[code];
      const face = Render.img["face_" + code];
      box.appendChild(UI.el("div", "card", `
        ${face ? `<img class="portrait" src="${ASSETS.portraits[code]}">` : ""}
        <div class="row"><span class="title">${known ? ch.name : "???"} <span class="sub">${known ? ch.race + " · " + ch.title : ""}</span></span><span class="sub">${known ? U.relTier(rel).name : ""}</span></div>
        ${known ? UI.bar(rel, 100, "green") : ""}
        <div class="sub">${known ? ch.desc : "아직 만나지 못했다. " + (ch.unlock.repTier ? CONFIG.REP_TIERS[ch.unlock.repTier].name + " 이상" : "") + (ch.unlock.rumorAtLeast ? ", 소문 " + ch.unlock.rumorAtLeast + " 이상" : "")}</div>
        ${known && ch.hook ? `<div class="sub">▸ ${ch.hook}</div>` : ""}
        <div style="clear:both"></div>
      `));
    }
  },

  tab_system() {
    const s = Sim.s;
    const box = UI.$("#tab-system"); box.innerHTML = "";
    const card = UI.el("div", "card", `
      <div class="row"><span>가게 이름</span><input id="shopname" value="${s.shopName}" style="width:140px"></div>
      <div class="row"><button id="btn-save">저장</button><button id="btn-endday">오늘 마감</button><button id="btn-reset">새 게임</button></div>
      <div class="sub" style="margin-top:6px">누적 시술 ${s.stats.totalServed}명 · 누적 수입 ${U.fmtMoney(s.stats.totalIncome)}</div>
      <div class="sub">자동 저장: 매일 마감 시. 저장 위치: 브라우저 localStorage</div>
    `);
    card.querySelector("#shopname").onchange = (e) => { s.shopName = e.target.value || CONFIG.SHOP_DEFAULT_NAME; UI.topbar(); };
    card.querySelector("#btn-save").onclick = () => { State.save(s); Sim.log("저장했다.", "good"); };
    card.querySelector("#btn-endday").onclick = () => { if (s.open) Sim.endDay(); };
    card.querySelector("#btn-reset").onclick = () => UI.modal("새 게임", "저장을 지우고 처음부터 시작할까요?", [{ label: "취소" }, { label: "새 게임", fn: () => { State.clear(); location.reload(); } }]);
    box.appendChild(card);
  },

  modal(title, html, actions, code) {
    const m = UI.$("#modal");
    UI.$("#modal-title").textContent = title;
    const face = code && Render.img["face_" + code] ? `<img class="portrait" src="${ASSETS.portraits[code]}">` : "";
    UI.$("#modal-body").innerHTML = face + html + '<div style="clear:both"></div>';
    const act = UI.$("#modal-actions"); act.innerHTML = "";
    const prevSpeed = Sim.s.speed; Sim.s.speed = 0;
    for (const a of actions) {
      const b = UI.el("button", null, a.label);
      b.onclick = () => { m.classList.add("hidden"); Sim.s.speed = prevSpeed || 1; if (a.fn) a.fn(); UI.refresh(); };
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
