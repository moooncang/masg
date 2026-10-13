// 게임 HUD / 관리 창. 시뮬레이션과 저장 스키마는 기존 Sim / State를 사용한다.
window.UI = {
  $(sel) {
    return document.querySelector(sel);
  },
  el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  },
  esc(v) {
    return String(v ?? "")
      .replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      )
      .replace(/\n/g, "<br>");
  },
  POST_NAME: {
    reception: "접수",
    brew: "조향",
    treatment: "시술",
    rest: "휴식",
  },
  menus: [
    ["shop", "가게 장부"],
    ["staff", "직원 관리"],
    ["upgrade", "시설 확장"],
    ["oil", "향유 선반"],
    ["dungeon", "심연구 탐사"],
    ["people", "인연 수첩"],
    ["achv", "업적 기록"],
    ["system", "설정"],
  ],
  products: [
    "calm",
    "warm",
    "moon",
    "towel",
    "candle",
    "charm",
    "tonic",
    "sheet",
    "bedplate",
    "lamp",
  ],
  view: null,
  staffId: "A",
  staffMode: "team",
  shopMode: "today",
  dungeonMode: "explore",
  recipeId: "r_calm",
  personId: "A",
  achCat: "가게",
  achId: null,
  upgradeCat: "전체",
  dungeonSel: { depth: 1, members: [] },
  // 아틀라스 아이콘. size 는 희망 CSS 크기(1672 좌표계). 64px 셀(products_large 는 128) 기준 배율로 그린다.
  icon(atlas, index = 0, size = 32) {
    const n = ASSETS.uiCells[atlas] || 1;
    const cell = ASSETS.uiCell[atlas] || 64;
    const m = Math.max(0.25, Math.round((size / cell) * 4) / 4);
    const cls = (cell === 128 ? " cell128" : "") + (Number.isInteger(m) || m === 0.5 ? "" : " smooth");
    return `<i class="icon${cls}" aria-hidden="true" style="background-image:url('${ASSETS.ui[atlas]}');--n:${n};--i:${index};--m:${m}"></i>`;
  },
  product(k, size = 40) {
    return UI.icon(size > 64 ? "products_large" : "products", UI.products.indexOf(k), size);
  },
  money(n) {
    const v = Math.round(Math.abs(n));
    return `<span class="coins" aria-label="${n < 0 ? "마이너스 " : ""}${v}동">${n < 0 ? "−" : ""}${[Math.floor(v / 1000), Math.floor((v % 1000) / 100), v % 100].map((a, i) => `<span class="coin">${UI.icon("currency", i, 24)}${a}</span>`).join("")}</span>`;
  },
  face(st, cls = "portrait", mood) {
    const code = typeof st === "string" ? st : st.code || st.id;
    const name = UI.esc(typeof st === "string" ? CHARACTERS[code]?.name || "" : st.name);
    if (ASSETS.portraits[code]) {
      const big = /\bbig\b/.test(cls);
      const src = big ? ASSETS.bust(code, mood) : ASSETS.portrait(code, mood);
      return `<img class="${cls}" src="${src}" alt="${name}" width="${big ? 256 : 128}" height="${big ? 256 : 128}">`;
    }
    return UI.bust(st, cls);
  },
  // 초상이 없는 일반 직원·손님: 시트의 idle 첫 칸을 보여 준다
  bust(st, cls = "") {
    const code = typeof st === "string" ? st : st.code || st.id;
    const key = Render.sheetKey(code === "player" ? "P" : code);
    return `<span class="sprite-bust ${cls.replace("portrait", "")}" role="img" aria-label="${UI.esc(typeof st === "string" ? CHARACTERS[code]?.name || "사장" : st.name)}" style="background-image:url('${ASSETS.sheetPath(key)}')"></span>`;
  },
  btn(label, action, value = "", options = {}) {
    return `<button data-action="${action}" data-value="${UI.esc(value)}" data-key="${action}:${UI.esc(value)}${options.key || ""}" class="${options.cls || ""}" ${options.disabled ? "disabled" : ""} ${options.pressed != null ? `aria-pressed="${options.pressed}"` : ""} ${options.title ? `title="${UI.esc(options.title)}"` : ""}>${label}</button>`;
  },
  bar(v, max, cls = "") {
    return `<div class="bar ${cls}" role="meter" aria-label="진행도" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.round(v)}"><i style="width:${U.clamp((v / max) * 100, 0, 100)}%"></i></div>`;
  },
  subnav(items, action, selected) {
    return `<div class="subtabs">${items.map(([id, name]) => UI.btn(name, action, id, { pressed: id === selected })).join("")}</div>`;
  },
  // Reconcile in place: retain focused controls, editable values and scroll positions on live refresh.
  patch(target, html) {
    const template = document.createElement("template");
    template.innerHTML = html;
    const key = (n) =>
      n?.nodeType === 1 ? n.dataset.key || n.id || null : null;
    const sync = (old, fresh) => {
      if (old.nodeType !== fresh.nodeType || old.nodeName !== fresh.nodeName) {
        old.replaceWith(fresh);
        return;
      }
      if (old.nodeType === 3) {
        if (old.data !== fresh.data) old.data = fresh.data;
        return;
      }
      if (old.nodeType !== 1) return;
      for (const a of [...old.attributes])
        if (!fresh.hasAttribute(a.name)) old.removeAttribute(a.name);
      for (const a of [...fresh.attributes])
        if (
          old.getAttribute(a.name) !== a.value &&
          !(old === document.activeElement && a.name === "value")
        )
          old.setAttribute(a.name, a.value);
      if (old.tagName === "INPUT" && old !== document.activeElement)
        old.value = fresh.value;
      children(old, fresh);
    };
    const children = (old, fresh) => {
      let cursor = old.firstChild;
      for (const node of [...fresh.childNodes]) {
        const k = key(node);
        if (k && key(cursor) !== k) {
          const found = [...old.childNodes].find((n) => key(n) === k);
          if (found) old.insertBefore(found, cursor);
          cursor = found || cursor;
        }
        if (!cursor) {
          old.appendChild(node);
          continue;
        }
        if (k !== key(cursor) && (k || key(cursor))) {
          old.insertBefore(node, cursor);
          continue;
        }
        const next = cursor.nextSibling;
        sync(cursor, node);
        cursor = next;
      }
      while (cursor) {
        const next = cursor.nextSibling;
        cursor.remove();
        cursor = next;
      }
    };
    children(target, template.content);
  },
  init() {
    UI.$("#tabs").innerHTML = UI.menus
      .map(([k, t], i) =>
        UI.btn(
          UI.icon("menu", i, 32) +
            `<span>${["가게", "직원", "확장", "향유", "탐사", "관계", "업적", "설정"][i]}</span>`,
          "open",
          k,
          { title: t },
        ),
      )
      .join("");
    UI.$("#rep-icon").innerHTML = UI.icon("status", 5, 32);
    UI.$("#rumor-icon").innerHTML = UI.icon("status", 6, 32);
    document.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-action]");
      if (b && !b.disabled) UI.action(b.dataset.action, b.dataset.value, b);
    });
    document.addEventListener("input", (e) => {
      if (e.target.id === "shopname")
        Sim.s.shopName = e.target.value.slice(0, 40);
    });
    document.addEventListener("change", (e) => {
      if (e.target.id === "shopname" && !e.target.value.trim()) {
        Sim.s.shopName = CONFIG.SHOP_DEFAULT_NAME;
        UI.refresh();
      }
    });
    document.addEventListener("keydown", UI.keydown);
    Sim.on((type, p) => {
      if (type === "log") UI.addLog(p);
      if (type === "modal")
        UI.modal(p.title, UI.esc(p.text), [{ label: "확인" }], p.code);
      if (type === "choice") UI.choiceModal(p);
      if (type === "summary") UI.summary(p);
      if (["change", "day", "customer", "treated"].includes(type)) UI.refresh();
      if (type === "achievement") UI.toast(`업적 달성 · ${p.name}`);
    });
  },
  open(view) {
    UI.windowFocus = document.activeElement;
    UI.view = view;
    UI.$("#panel").classList.remove("hidden");
    UI.$("#panel-title").innerHTML =
      UI.icon("menu", UI.menus.findIndex((x) => x[0] === view), 32) + UI.menus.find((x) => x[0] === view)[1];
    UI.refresh();
    UI.$("#panel-content").scrollTop = 0;
    UI.$(".close-window").focus({ preventScroll: true });
  },
  close() {
    UI.view = null;
    UI.$("#panel").classList.add("hidden");
    UI.refresh();
    if (UI.windowFocus?.isConnected)
      UI.windowFocus.focus({ preventScroll: true });
  },
  setSpeed(v) {
    if (UI.modalPrevSpeed !== null) return;
    Sim.s.speed = v;
    UI.topbar(true);
  },
  topbar(force = false) {
    if (!Sim.s || (!force && performance.now() - (UI.lastHUD || 0) < 200))
      return;
    UI.lastHUD = performance.now();
    const s = Sim.s;
    UI.patch(UI.$("#tb-money"), UI.money(s.money));
    UI.$("#tb-rep").textContent = `${Math.round(s.rep)}`;
    UI.$("#tb-rumor").textContent = `${Math.round(s.rumor)}`;
    UI.$("#tb-day").textContent = `${s.day}일`;
    UI.$("#tb-phase").textContent = Sim.phase().name;
    UI.$("#tb-clock").textContent = U.fmtClock(s.time);
    UI.$("#tb-rep").title = `평판 ${U.repTier(s.rep).name}`;
    UI.$("#tb-rumor").classList.toggle("bad", s.rumor >= 50);
    document.querySelectorAll('[data-action="speed"]').forEach((b) => {
      b.classList.toggle("active", +b.dataset.value === s.speed);
      b.setAttribute("aria-pressed", String(+b.dataset.value === s.speed));
    });
  },
  refresh() {
    if (!Sim.s) return;
    if (window.Layout) Layout.sync();
    UI.topbar(true);
    const s = Sim.s;
    document.querySelectorAll("#tabs button").forEach((b) => {
      b.classList.toggle("active", b.dataset.value === UI.view);
      b.setAttribute("aria-expanded", String(b.dataset.value === UI.view));
    });
    UI.patch(
      UI.$("#quick-staff"),
      [...s.staff]
        .sort(
          (a, b) =>
            (({ A: 0, B: 1, player: 2 })[a.id] ?? 3) -
            ({ A: 0, B: 1, player: 2 }[b.id] ?? 3),
        )
        .slice(0, 3)
        .map((st) =>
          UI.btn(
            UI.face(st) + `<span class="availability ${st.busy != null ? "busy" : ""}"></span>` +
              UI.bar(100 - st.fatigue, 100, st.fatigue >= 70 ? "red" : "green"),
            "staff",
            st.id,
            { title: `${st.name} · 피로 ${Math.round(st.fatigue)}` },
          ),
        )
        .join(""),
    );
    UI.patch(
      UI.$("#quick-stock"),
      ["calm", "warm"]
        .map((k) =>
          UI.btn(
            UI.product(k, 32) + `<span>${s.oils[k]}</span>`,
            "open",
            "oil",
            { key: k, title: OILS[k].name },
          ),
        )
        .join(""),
    );
    UI.$("#staff-count").textContent = `직원 ${s.staff.length}/${s.maxStaff}`;
    UI.$("#staff-count").title = `${s.open ? "영업 중" : "영업 마감"} · 시술 ${s.rooms.filter((r) => r.customerId).length}/${s.rooms.length} · 대기 ${s.customers.filter((c) => c.state === "waiting").length}/${s.seats}`;
    const ex = s.expedition;
    UI.patch(
      UI.$("#expedition-chip"),
      UI.btn(
        UI.icon("menu", 4, 32) +
          `<span class="return-info">${ex ? `귀환 ${U.fmtClock(ex.endsAt)}` : ""}${UI.bar(ex ? 1 - (ex.endsAt - s.time) / DUNGEON.depths.find((d) => d.id === ex.depth).duration : 0, 1, "green")}</span><span class="return-party">${(ex
            ? ex.members.map((id) => Sim.staffOf(id)).filter(Boolean)
            : []
          )
            .slice(0, 2)
            .map((st) => UI.face(st))
            .join("")}</span>`,
        "open",
        "dungeon",
        { cls: ex ? "" : "idle", title: ex ? `심연구 탐사 중 · ${U.fmtClock(ex.endsAt)} 귀환` : "심연구 탐사" },
      ),
    );
    UI.scene();
    if (UI.view) UI.patch(UI.$("#panel-content"), UI["tab_" + UI.view]());
  },
  // 현장 클릭 영역: 베드 8칸 + 접수대·조향실·계단. 번호판·자물쇠는 캔버스가 그린다.
  scene() {
    const s = Sim.s, k = Render.kCss;
    const px = (r) => `left:${r[0] * k}px;top:${r[1] * k}px;width:${r[2] * k}px;height:${r[3] * k}px`;
    let html = LAYOUT_HD.rooms
      .map((r, i) => {
        const room = s.rooms[i], lock = !room;
        return `<button class="scene-hit ${lock ? "locked" : ""}" data-key="bed${i}" data-action="open" data-value="${lock ? "upgrade" : "staff"}" style="${px(r.rect)}" aria-label="베드 ${i + 1} ${lock ? "미확장 — 확장 열기" : room.customerId ? "시술 중 — 직원 관리" : "비어 있음 — 직원 배치"}"><span class="room-hint">${lock ? "시설 확장" : "직원 배치"}</span></button>`;
      })
      .join("");
    for (const [id, label, action, value, rect] of [
      ["reception", "접수 현황", "open", "shop", [140, 70, 340, 240]],
      ["brew", "조향실 · 제작", "craft-room", "", [820, 640, 540, 180]],
      ["stairs", "심연구 탐사", "open", "dungeon", [1370, 640, 280, 220]],
    ]) {
      html += `<button class="scene-hit" data-key="scene-${id}" data-action="${action}" data-value="${value}" aria-label="${label}" style="${px(rect)}"><span class="room-hint">${label}</span></button>`;
    }
    UI.patch(UI.$("#scene-controls"), html);
  },
  toast(text) {
    const stack = UI.$(".toast-stack");
    while (stack.children.length >= 3) stack.firstChild.remove();
    const t = UI.el("div", "toast");
    t.textContent = text;
    stack.appendChild(t);
    setTimeout(() => t.remove(), 3300);
  },
  addLog(line) {
    const tk = UI.$("#ticker");
    if (tk) { tk.textContent = line.text; tk.className = line.cls || ""; }
    const box = UI.$("#log");
    box.appendChild(
      UI.el(
        "div",
        "line " + (line.cls || ""),
        `${U.fmtClock(line.t)} ${UI.esc(line.text)}`,
      ),
    );
    while (box.children.length > 120) box.firstChild.remove();
  },
  action(a, v, b) {
    const s = Sim.s;
    if (a === "open") {
      UI.open(v);
      return;
    }
    if (a === "close") {
      UI.close();
      return;
    }
    if (a === "speed") {
      UI.setSpeed(+v);
      return;
    }
    if (a === "staff") {
      UI.staffId = v;
      UI.staffMode = "team";
      UI.open("staff");
      return;
    }
    if (a === "staff-select") UI.staffId = v;
    if (a === "staff-mode") UI.staffMode = v;
    if (a === "shop-mode") UI.shopMode = v;
    if (a === "upgrade-cat") UI.upgradeCat = v;
    if (a === "dungeon-mode") UI.dungeonMode = v;
    if (a === "craft-room") {
      UI.dungeonMode = "craft";
      UI.open("dungeon");
      return;
    }
    if (a === "recipe") UI.recipeId = v;
    if (a === "person") UI.personId = v;
    if (a === "ach-cat") {
      UI.achCat = v;
      UI.achId = null;
    }
    if (a === "ach-select") UI.achId = v;
    if (a === "post") Sim.setPost(UI.staffId, v);
    if (a === "hire") Sim.hire(v);
    if (a === "fire")
      UI.modal(
        "직원 해고",
        `${UI.esc(Sim.staffOf(v)?.name)}을(를) 내보낼까요?`,
        [{ label: "취소" }, { label: "해고", fn: () => Sim.fire(v) }],
      );
    if (a === "buy-upgrade") Sim.buyUpgrade(v);
    if (a === "buy-oil") {
      const [k, n] = v.split(":");
      Sim.buyOil(k, +n);
    }
    if (a === "craft") {
      const r = RECIPES.find((x) => x.id === v);
      if (Sim.canCraft(r)) {
        Sim.craft(v);
        UI.toast(`${r.name} 제작 완료`);
      } else UI.toast("재료와 제작 조건을 다시 확인해 주세요.");
    }
    if (a === "sell") Sim.sellMaterial(v, 1);
    if (a === "use") Sim.useItem(v);
    if (a === "towel") UI.towelModal(v);
    if (a === "depth") UI.dungeonSel.depth = +v;
    if (a === "member") {
      const sel = UI.dungeonSel;
      if (sel.members.includes(v))
        sel.members = sel.members.filter((x) => x !== v);
      else if (sel.members.length < DUNGEON.MAX_PARTY) sel.members.push(v);
    }
    if (a === "depart") {
      const sel = UI.dungeonSel;
      if (Sim.canExpedition(sel.depth, sel.members)) {
        Sim.startExpedition(sel.depth, [...sel.members]);
        sel.members = [];
      } else UI.toast("출발 조건이 바뀌었습니다. 파티와 시간을 확인해 주세요.");
    }
    if (a === "talk") UI.dialog(v);
    if (a === "gift")
      UI.giftModal(
        v,
        ["calm", "warm", "moon"].filter(
          (k) => s.oils[k] > 0 && s.oilsUnlocked[k],
        ),
      );
    if (a === "outcall") {
      UI.modal(
        "출장 시술",
        `${UI.esc(CHARACTERS[v].place)}에 방문합니다. 출장 동안 사장은 가게 시술에 참여할 수 없습니다.`,
        [{ label: "취소" }, { label: "출장 출발", fn: () => Sim.outcall(v) }],
        v,
      );
    }
    if (a === "save")
      UI.toast(
        State.save(s)
          ? "저장했습니다."
          : "저장하지 못했습니다. 브라우저 저장 공간과 권한을 확인해 주세요.",
      );
    if (a === "endday")
      UI.modal(
        "오늘 영업 마감",
        "영업을 마감하고 하루를 정산할까요?" +
          (s.expedition
            ? '<p class="bad">진행 중인 탐사는 조기 귀환합니다.</p>'
            : ""),
        [
          { label: "취소" },
          {
            label: "마감하기",
            fn: () => {
              if (s.open) Sim.endDay();
            },
          },
        ],
      );
    if (a === "reset")
      UI.modal(
        "새 게임",
        "현재 브라우저의 저장을 지우고 처음부터 시작합니다.",
        [
          { label: "취소" },
          {
            label: "저장 삭제 후 시작",
            fn: () => {
              State.clear();
              location.reload();
            },
          },
        ],
      );
    UI.refresh();
  },
  towelModal(id) {
    const list = id ? [Sim.staffOf(id)].filter(Boolean) : Sim.s.staff;
    UI.modal(
      "온열 수건 사용",
      `${UI.product("towel", 64)}<p>피로를 40 낮출 직원을 고르세요. 보유 ${Sim.s.items.towel || 0}개</p>`,
      [
        ...list.map((st) => ({
          label: `${st.name} · 피로 ${Math.round(st.fatigue)} → ${Math.max(0, Math.round(st.fatigue) - 40)}`,
          disabled: !Sim.s.open || !Sim.s.items.towel || st.fatigue <= 0,
          fn: () => {
            if (Sim.staffOf(st.id)) Sim.useItem("towel", st.id);
            else UI.toast("해당 직원이 가게에 없습니다.");
          },
        })),
        { label: "취소" },
      ],
    );
  },
  status(st) {
    return st.busy === "out"
      ? "출장 중"
      : st.busy === "dungeon"
        ? "탐사 중"
        : st.busy != null
          ? "시술 중"
          : UI.POST_NAME[st.post] || "지원자";
  },
  stats(st) {
    return `<div class="stat-grid">${["technique", "sense", "stamina", "charm"].map((k, i) => `<div class="stat-cell">${UI.icon("stats", i, 32)}<b>${st.stats[k]}</b><span class="sub">${Sim.statName(k)}</span></div>`).join("")}</div>`;
  },
  tab_staff() {
    const s = Sim.s,
      team = UI.staffMode === "team",
      list = team ? s.staff : s.candidates;
    if (!list.some((x) => x.id === UI.staffId)) UI.staffId = list[0]?.id;
    const st = list.find((x) => x.id === UI.staffId),
      full = s.staff.length >= s.maxStaff;
    let html = UI.subnav(
      [
        ["team", `직원 ${s.staff.length}/${s.maxStaff}`],
        ["hire", "오늘의 구인"],
      ],
      "staff-mode",
      UI.staffMode,
    );
    if (!st)
      return (
        html +
        '<div class="empty">오늘 남은 지원자가 없습니다. 다음 날 새로운 지원자가 찾아옵니다.</div>'
      );
    const info = CHARACTERS[st.id] || st,
      title = s.recruited[st.id] ? info.asStaff?.title : info.title;
    html += `<div class="split"><div class="select-list">${list.map((x) => UI.btn(UI.face(x) + `<span class="copy">${UI.esc(x.name)}<span class="sub" style="display:block">Lv.${x.level || 1} · ${team ? UI.status(x) : UI.esc(x.race || "지원자")}</span></span>`, "staff-select", x.id, { pressed: x.id === st.id, cls: "select-row" })).join("")}</div><div class="sheet" data-key="staff-detail:${st.id}"><div class="identity">${UI.face(st)}<div><span class="sub">${UI.esc(title || "가게의 식구")}</span><h2>${UI.esc(st.name)}</h2><p class="sub">Lv.${st.level || 1} · ${team ? UI.status(st) : "고용 대기"}</p></div></div>${UI.stats(st)}<div>${(st.traits || []).map((t) => `<span class="tag" title="${UI.esc(TRAITS[t]?.desc || "")}">${UI.esc(t)}</span>`).join("")}</div><p class="sub">${UI.esc(info.quirk || "")}</p>`;
    if (team) {
      html += `<div class="row"><span>${UI.icon("status", 0, 24)} 피로</span><b class="${st.fatigue >= 70 ? "bad" : ""}">${Math.round(st.fatigue)} / 100</b></div>${UI.bar(st.fatigue, 100, st.fatigue >= 70 ? "red" : "green")}<div class="row"><span>다음 레벨까지</span><b>${Math.floor(st.xp)} / ${st.level * CONFIG.XP_PER_LEVEL}</b></div>${UI.bar(st.xp, st.level * CONFIG.XP_PER_LEVEL)}<h3>담당 업무</h3><div class="actions">${Sim.postsFor(
        st,
      )
        .map((p) =>
          UI.btn(UI.POST_NAME[p], "post", p, {
            pressed: st.post === p,
            disabled: st.busy != null,
          }),
        )
        .join(
          "",
        )}</div>${st.busy != null ? '<p class="sub">진행 중인 업무가 끝나면 배치를 바꿀 수 있습니다.</p>' : ""}<div class="actions">${UI.btn(UI.product("towel", 28) + ` 수건 사용 (${s.items.towel || 0})`, "towel", st.id, { disabled: !s.items.towel || st.fatigue <= 0 || !s.open })}${st.id !== "player" && !CHARACTERS[st.id] ? UI.btn("해고", "fire", st.id, { disabled: st.busy != null, cls: "danger" }) : ""}</div>`;
    } else {
      const wage = Math.round(st.wage * (s.mods.dorm ? 0.7 : 1));
      html += `<div class="row"><span>고용비</span>${UI.money(st.hireCost)}</div><div class="row"><span>하루 임금</span>${UI.money(wage)}</div><div class="notice">${full ? "직원 정원이 가득 찼습니다. 숙소를 확장해 주세요." : s.money < st.hireCost ? "고용비가 부족합니다." : "고용하면 바로 업무를 배치할 수 있습니다."}</div><div class="actions">${UI.btn("직원 고용", "hire", st.id, { disabled: full || s.money < st.hireCost, cls: "primary" })}${UI.btn("숙소 확장 보기", "open", "upgrade")}</div>`;
    }
    return html + "</div></div>";
  },
  tab_shop() {
    const s = Sim.s,
      t = s.ledger.today;
    let html = UI.subnav(
      [
        ["today", "오늘의 영업"],
        ["menu", "시술 메뉴"],
        ["records", "장부 · 소식"],
      ],
      "shop-mode",
      UI.shopMode,
    );
    if (UI.shopMode === "today") {
      html += `<div class="metric-grid">${[
        ["오늘 수입", UI.money(t.income)],
        ["오늘 지출", UI.money(t.expense)],
        ["시술 완료", `${t.served}명`],
        [
          "대기 / 이탈",
          `${s.customers.filter((c) => c.state === "waiting").length} / ${t.left}명`,
        ],
        ["단골", `${s.regulars.length}명`],
        [
          "가동 베드",
          `${s.rooms.filter((r) => r.customerId).length} / ${s.rooms.length}`,
        ],
      ]
        .map(
          ([k, v]) =>
            `<div class="metric"><span class="sub">${k}</span><b>${v}</b></div>`,
        )
        .join("")}</div>`;
      if (s.todayEvent)
        html += `<div class="notice"><b>${UI.esc(s.todayEvent.name)}</b><p>${UI.esc(s.todayEvent.text)}</p></div>`;
      if (s.expedition)
        html += `<p class="notice">${UI.icon("status", 1)} 탐사대 · ${U.fmtClock(s.expedition.endsAt)} 귀환 예정</p>`;
      if (s.outcall)
        html += `<p class="notice">${UI.icon("status", 2)} 사장 출장 · ${UI.esc(CHARACTERS[s.outcall.code].place)} · ${U.fmtClock(s.outcall.endsAt)} 복귀</p>`;
      if (s.flags.E_contract)
        html += `<p class="notice">카르벤 상단 전속 계약 · 일당 ${UI.money(CONFIG.CONTRACT_DAILY)} · 소문 +${CONFIG.CONTRACT_RUMOR}/일</p>`;
      if (s.flags.C_designated)
        html +=
          '<p class="notice">기사단 지정 시술소 · 소문 감소 2배 · 기사단 손님 방문</p>';
      const m = Sim.metrics(),
        next = ACHIEVEMENTS.filter((a) => !a.hidden && !s.achievements[a.id])
          .map((a) => ({ a, p: UI.achProgress(a, m) }))
          .sort((a, b) => b.p - a.p)
          .slice(0, 4);
      html += `<h3>다음 성장 목표</h3><div class="card-grid">${next.map(({ a, p }) => `<div class="card"><div class="row">${UI.icon("medal", ["가게", "평판", "확장", "향유", "던전", "관계"].indexOf(a.cat), 40)}<b>${a.name}</b><span>${Math.round(p * 100)}%</span></div><p class="sub">${a.text || ""}</p>${UI.bar(p, 1, "green")}</div>`).join("")}</div><div class="actions">${UI.btn("전체 업적 보기", "open", "achv")}</div>`;
    } else if (UI.shopMode === "menu") {
      html += `<div class="card-grid">${MENU.map((m) => {
        const locked = m.unlockTier > U.repTier(s.rep).id;
        return `<div class="card"><div class="row"><b>${m.name}</b>${UI.money(m.price)}</div><p class="sub">${m.duration}분 · 난이도 ${m.difficulty} · ${m.depth === "vein" ? "혈맥" : "표층"}${m.reservation ? " · 예약제" : ""}</p>${m.oil ? `<p>${UI.product(m.oil, 32)} ${OILS[m.oil].name} · 보유 ${s.oils[m.oil]}</p>` : ""}<p class="${locked ? "bad" : "good"}">${locked ? CONFIG.REP_TIERS[m.unlockTier].name + " 평판 필요" : "영업 중 자동 제공"}</p></div>`;
      }).join(
        "",
      )}</div><p class="notice">심결은 관계 이벤트에서만 열립니다.</p>`;
    } else {
      html += `<h3>최근 7일 장부</h3><div class="sheet">${
        s.ledger.history
          .slice(-7)
          .reverse()
          .map(
            (h) =>
              `<div class="ledger-row"><span>${h.day}일차 · ${h.served}명</span><span class="good">+${UI.money(h.income)}</span><span class="bad">−${UI.money(h.expense)}</span></div>`,
          )
          .join("") || '<p class="sub">첫 영업을 마감하면 기록이 남습니다.</p>'
      }</div><h3>가게 소식</h3><div class="sheet log-lines">${s.log
        .slice(-40)
        .reverse()
        .map(
          (l) =>
            `<div><span class="muted">${U.fmtClock(l.t)}</span> ${UI.esc(l.text)}</div>`,
        )
        .join("")}</div>`;
    }
    return html;
  },
  upgradeGroup(up) {
    const e = up.effect;
    return e.rooms || e.seats
      ? "시설"
      : e.maxStaff || e.candidates || e.dorm || e.restMul || e.fullRest
        ? "직원"
        : e.brewBonus || e.still
          ? "조향"
          : "운영";
  },
  tab_upgrade() {
    const s = Sim.s,
      tier = U.repTier(s.rep).id;
    return (
      UI.subnav(
        ["전체", "시설", "직원", "조향", "운영"].map((x) => [x, x]),
        "upgrade-cat",
        UI.upgradeCat,
      ) +
      `<p class="sub">베드 ${s.rooms.length}/${CONFIG.MAX_ROOMS} · 대기 좌석 ${s.seats} · 직원 정원 ${s.maxStaff}</p><div class="card-grid">` +
      UPGRADES.filter(
        (up) =>
          UI.upgradeCat === "전체" || UI.upgradeGroup(up) === UI.upgradeCat,
      )
        .map((up) => {
          const done = s.upgrades.includes(up.id),
            reasons = [];
          if (up.requires && !s.upgrades.includes(up.requires))
            reasons.push(
              `선행 시설: ${UPGRADES.find((u) => u.id === up.requires).name}`,
            );
          if (up.repTier && tier < up.repTier)
            reasons.push(`${CONFIG.REP_TIERS[up.repTier].name} 평판 필요`);
          if (up.effect.rooms && s.rooms.length >= CONFIG.MAX_ROOMS)
            reasons.push("베드 확장 한도 도달");
          if (s.money < up.cost) reasons.push("소지금 부족");
          return `<div class="card" data-key="up:${up.id}"><div class="row">${UI.icon("status", done ? 4 : reasons.length ? 3 : 5, 36)}<b>${up.name}</b></div><p class="sub">${up.desc}</p><div class="row">${done ? '<span class="good">설치 완료</span>' : UI.money(up.cost)}${UI.btn(done ? "설치됨" : "확장하기", "buy-upgrade", up.id, { disabled: done || !!reasons.length, cls: done ? "" : "primary" })}</div>${!done && reasons.length ? `<p class="sub bad">${reasons.join("<br>")}</p>` : ""}</div>`;
        })
        .join("") +
      "</div>"
    );
  },
  tab_oil() {
    const s = Sim.s;
    return `<div class="card-grid">${["calm", "warm", "moon"]
      .map((k) => {
        const o = OILS[k],
          price = k === "moon" ? 0 : Sim.oilPrice(k);
        return `<div class="card"><div class="row">${UI.product(k, 64)}<div><b>${o.name}</b><p>재고 ${s.oils[k]}병</p></div></div><p class="sub">${o.desc} · 시술 점수 +${o.bonus}</p>${k === "moon" ? `<p class="${s.oilsUnlocked.moon ? "good" : "bad"}">${s.oilsUnlocked.moon ? "월하향 해금 완료" : "관계 콘텐츠를 통해 해금"}</p><p class="sub">${s.mods.still ? `${CONFIG.MOON_BREW_EVERY}일마다 1병 자동 조향` : "자동 조향에는 증류기 필요"}</p>${UI.btn("제작실 보기", "craft-room")}` : `<p class="sub">병당 ${UI.money(price)} ${price < CONFIG.OIL_PRICE[k] ? "· 상단 할인" : ""}</p><div class="actions">${[1, 5].map((n) => UI.btn(`${n}병 구매`, "buy-oil", `${k}:${n}`, { disabled: s.money < price * n })).join("")}</div>`}</div>`;
      })
      .join(
        "",
      )}</div><div class="notice">${s.staff.some((st) => st.id === "A" && st.post === "brew") ? `레이나 조향 중 · 매일 ${CONFIG.OIL_BREW_PER_DAY + s.mods.brewBonus}병 생산` : "레이나를 조향에 배치하면 매일 향유를 만듭니다."}</div>${UI.btn("레이나 배치", "staff", "A")}`;
  },
  expeditionReason(st, d) {
    if (st.id === "player") return "사장은 탐사 불가";
    if (st.busy != null) return UI.status(st);
    if (st.post === "brew") return "조향 담당";
    if (st.fatigue >= 70) return "피로 70 미만 필요";
    if (st.level < d.minLevel) return `Lv.${d.minLevel} 필요`;
    return "";
  },
  tab_dungeon() {
    const s = Sim.s;
    let html = UI.subnav(
      [
        ["explore", "탐사대 편성"],
        ["bag", "재료 · 가방"],
        ["craft", "아이템 제작"],
      ],
      "dungeon-mode",
      UI.dungeonMode,
    );
    if (UI.dungeonMode === "craft") return html + UI.crafting();
    if (UI.dungeonMode === "bag") return html + UI.bag();
    const sel = UI.dungeonSel,
      d = DUNGEON.depths.find(
        (x) => x.id === (s.expedition?.depth || sel.depth),
      );
    const removed = sel.members.filter((id) => !Sim.staffOf(id));
    if (removed.length) {
      sel.members = sel.members.filter((id) => Sim.staffOf(id));
      UI.toast("가게를 떠난 직원을 탐사 파티에서 제외했습니다.");
    }
    html += `<div class="split wide-list"><div class="map-panel" aria-label="심연구 3개 층 지도">${DUNGEON.depths.map((x, i) => `<button class="map-node ${x.id === d.id ? "active" : ""}" data-action="depth" data-value="${x.id}" data-key="depth:${x.id}" style="left:${[52, 68, 40][i]}%;top:${[19, 48, 68][i]}%" aria-label="${x.name}" aria-pressed="${x.id === d.id}" ${s.expedition ? "disabled" : ""}>${x.id}층</button>`).join("")}</div><div class="sheet"><h2>${d.name}</h2><p class="sub">${d.desc}</p><div class="notice">소요 ${d.duration / 60}시간 · Lv.${d.minLevel} 이상<br>귀환 피로 +${d.fatigue}${d.knotChance ? ` · 결 발생 ${Math.round(d.knotChance * 100)}%` : ""}</div><p class="sub">발견 재료</p><div class="actions">${DUNGEON.loot[d.id].map((l) => `<span title="${MATERIALS[l.id].name}">${UI.icon("materials", Object.keys(MATERIALS).indexOf(l.id), 32)}<span class="sr-only">${MATERIALS[l.id].name}</span></span>`).join("")}</div>`;
    if (s.expedition) {
      html += `<h3>탐사 진행 중</h3><p>${s.expedition.members.map((id) => UI.esc(Sim.staffOf(id)?.name || "귀환 대기")).join(" · ")}</p><p class="good">${U.fmtClock(s.expedition.endsAt)} 귀환 · ${Math.max(0, Math.ceil(s.expedition.endsAt - s.time))}분 남음</p>${UI.bar(d.duration - (s.expedition.endsAt - s.time), d.duration, "green")}<p class="sub">귀환하면 재료가 가방에 자동으로 들어옵니다. 결과는 가게 장부의 소식에서 확인할 수 있습니다.</p>${UI.btn("가방 확인", "dungeon-mode", "bag")}`;
    } else {
      html += `<h3>파티 ${sel.members.length}/${DUNGEON.MAX_PARTY}</h3><div class="party-slots">${Array.from(
        { length: DUNGEON.MAX_PARTY },
        (_, i) => {
          const st = Sim.staffOf(sel.members[i]);
          return `<div class="party-slot ${st ? "filled" : ""}">${st ? UI.face(st) + `<div>${UI.esc(st.name)}</div>` : '<span class="muted">＋<br>직원 선택</span>'}</div>`;
        },
      ).join("")}</div><div class="member-list">${s.staff
        .map((st) => {
          const reason = UI.expeditionReason(st, d),
            chosen = sel.members.includes(st.id);
          return UI.btn(
            UI.face(st) +
              `<span class="copy">${UI.esc(st.name)}<span class="sub" style="display:block">Lv.${st.level} · 피로 ${Math.round(st.fatigue)}<br><span class="${reason ? "bad" : ""}">${reason || "참여 가능"}</span></span></span>`,
            "member",
            st.id,
            {
              pressed: chosen,
              disabled:
                !chosen &&
                (!!reason || sel.members.length >= DUNGEON.MAX_PARTY),
              cls: "select-row",
            },
          );
        })
        .join("")}</div>`;
      const reasons = [];
      if (!s.open) reasons.push("영업 중에 출발할 수 있습니다.");
      if (!Sim.depthAvailable(d))
        reasons.push(`${CONFIG.REP_TIERS[d.repTier].name} 평판 필요`);
      if (s.time + d.duration > CONFIG.DAY_END_MIN - 30)
        reasons.push(
          "오늘은 출발하기 늦었습니다. 마감 30분 전까지 귀환해야 합니다.",
        );
      if (!sel.members.length) reasons.push("직원을 1명 이상 선택하세요.");
      for (const id of sel.members) {
        const st = Sim.staffOf(id),
          r = UI.expeditionReason(st, d);
        if (r) reasons.push(`${st.name}: ${r}`);
      }
      html += `<p class="sub ${reasons.length ? "bad" : ""}">${reasons.join("<br>") || "체력이 높으면 더 많이, 감각이 높으면 희귀한 재료를 가져옵니다."}</p><div class="actions">${UI.btn("탐사 출발", "depart", "", { disabled: !Sim.canExpedition(sel.depth, sel.members), cls: "primary" })}<span class="sub">예정 귀환 ${U.fmtClock(s.time + d.duration)}</span></div>`;
    }
    return html + "</div></div>";
  },
  crafting() {
    const s = Sim.s,
      r = RECIPES.find((x) => x.id === UI.recipeId) || RECIPES[0],
      res = r.result,
      k = res.oil || res.item || res.equip,
      owned = !!(res.equip && s.equips[res.equip]),
      reasons = [];
    if (r.needStill && !s.mods.still) reasons.push("조향 증류기가 필요합니다.");
    if (r.needOil && !s.oilsUnlocked[r.needOil])
      reasons.push(`${OILS[r.needOil].name} 해금이 필요합니다.`);
    if (owned) reasons.push("이미 설치한 영구 설비입니다.");
    if (Object.keys(r.cost).some((k) => (s.materials[k] || 0) < r.cost[k]))
      reasons.push("필요 재료가 부족합니다.");
    return `<div class="split"><div class="select-list">${RECIPES.map((x) => UI.btn(UI.product(x.result.oil || x.result.item || x.result.equip, 40) + `<span class="copy">${x.name}<span class="sub" style="display:block">${x.result.equip ? (s.equips[x.result.equip] ? "설치됨" : "영구 설비") : `${x.result.n}개 제작`}</span></span>`, "recipe", x.id, { pressed: x.id === r.id, cls: "select-row" })).join("")}</div><div class="sheet" data-key="recipe-detail:${r.id}"><div class="item-hero">${UI.product(k, 128)}<span class="title">${r.name}${res.n ? " ×" + res.n : ""}</span></div><p class="sub">${(ITEMS[k] || OILS[k]).desc}</p><p>${res.equip ? "제작 시 즉시 설치 · 한 번만 제작" : `현재 보유 ${res.oil ? s.oils[k] : s.items[k] || 0}개`}</p><h3>필요 재료</h3><div class="cost-list">${Object.entries(
      r.cost,
    )
      .map(
        ([key, n]) =>
          `<div>${UI.icon("materials", Object.keys(MATERIALS).indexOf(key), 40)}<span>${MATERIALS[key].name}</span><p class="${s.materials[key] >= n ? "good" : "bad"}">보유 ${s.materials[key] || 0} / 필요 ${n}</p></div>`,
      )
      .join(
        "",
      )}</div><p class="notice ${reasons.length ? "bad" : "good"}">${reasons.join("<br>") || "재료가 준비되었습니다. 바로 제작할 수 있습니다."}</p><div class="actions">${UI.btn(owned ? "설치 완료" : "제작하기", "craft", r.id, { disabled: !Sim.canCraft(r), cls: "primary" })}${r.needStill && !s.mods.still ? UI.btn("증류기 확장", "open", "upgrade") : ""}${UI.btn("탐사에서 재료 수집", "dungeon-mode", "explore")}</div></div></div>`;
  },
  bag() {
    const s = Sim.s;
    return `<h3>재료 보관함</h3><div class="slot-grid">${Object.keys(MATERIALS)
      .map(
        (k, i) =>
          `<div class="sheet slot" data-key="material:${k}" title="${MATERIALS[k].desc}">${UI.icon("materials", i, 48)}<span>${MATERIALS[k].name}</span><b>${s.materials[k] || 0}</b>${UI.btn("1개 판매", "sell", k, { disabled: !s.materials[k], title: `판매가 ${U.fmtMoney(MATERIALS[k].sell)}` })}<span class="sub">${UI.money(MATERIALS[k].sell)}</span></div>`,
      )
      .join("")}</div><h3>소모품</h3><div class="card-grid">${Object.keys(ITEMS)
      .filter((k) => ITEMS[k].kind === "item")
      .map(
        (k) =>
          `<div class="card"><div class="row">${UI.product(k, 48)}<b>${ITEMS[k].name} ×${s.items[k] || 0}</b></div><p class="sub">${ITEMS[k].desc}</p>${UI.btn(k === "towel" ? "사용할 직원 선택" : "사용하기", k === "towel" ? "towel" : "use", k === "towel" ? "" : k, { disabled: !s.items[k] || !s.open })}</div>`,
      )
      .join("")}</div><h3>영구 설비</h3><div class="card-grid">${Object.keys(
      ITEMS,
    )
      .filter((k) => ITEMS[k].kind === "equip")
      .map(
        (k) =>
          `<div class="card"><div class="row">${UI.product(k, 48)}<b>${ITEMS[k].name}</b><span class="${s.equips[k] ? "good" : "muted"}">${s.equips[k] ? "설치됨" : "미설치"}</span></div><p class="sub">${ITEMS[k].desc}</p></div>`,
      )
      .join("")}</div>`;
  },
  tab_people() {
    const s = Sim.s,
      c = UI.personId,
      ch = CHARACTERS[c],
      known = ch.role === "staff" || s.vipUnlocked[c],
      rel = s.relation[c] || 0;
    let html = `<div class="character-strip">${["A", "B", "C", "D", "E"]
      .map((k) => {
        const known = CHARACTERS[k].role === "staff" || s.vipUnlocked[k];
        return UI.btn(
          (known
            ? UI.face(k)
            : UI.face(k).replace(
                /alt="[^"]*"/,
                'alt="아직 만나지 못한 인물"',
              )) + `<span>${known ? CHARACTERS[k].name : "???"}</span>`,
          "person",
          k,
          { pressed: k === c, cls: known ? "" : "unknown" },
        );
      })
      .join("")}</div>`;
    if (!known)
      return (
        html +
        `<div class="sheet"><h2>아직 만나지 못한 인연</h2><p class="notice">${ch.unlock.repTier ? `${CONFIG.REP_TIERS[ch.unlock.repTier].name} 이상 평판` : ""}${ch.unlock.rumorAtLeast ? ` · 소문 ${ch.unlock.rumorAtLeast} 이상` : ""}</p><p class="sub">가게가 성장하면 새로운 손님이 찾아옵니다.</p></div>`
      );
    html += `<div class="sheet"><div class="identity">${UI.face(c)}<div><span class="sub">${s.recruited[c] ? ch.asStaff.title : ch.race + " · " + ch.title}</span><h2>${ch.name}</h2><p>${U.relTier(rel).name} · ${rel} / 100</p></div></div>${UI.bar(rel, 100, "green")}<p class="sub">${ch.desc}</p><div class="actions">${UI.btn("대화", "talk", c, { disabled: !Sim.canTalk(c), cls: "primary" })}${UI.btn("향유 선물", "gift", c, { disabled: !Sim.canGift(c) || !["calm", "warm", "moon"].some((k) => s.oils[k] > 0 && s.oilsUnlocked[k]) })}${ch.role === "vip" && !s.recruited[c] ? UI.btn("출장 시술", "outcall", c, { disabled: !Sim.canOutcall(c) }) : ""}</div><p class="sub">대화는 하루 ${CONFIG.TALK_PER_DAY}회 · 선물은 하루 1회${ch.role === "vip" && !s.recruited[c] ? `<br>출장: 관계 ${CONFIG.OUTCALL_MIN_REL} 이상 · 20시 전 · 하루 1회 · 사장 대기 중` : ""}</p>`;
    if (c === "D" && s.flags.D_quest && !s.flags.D_quest_done)
      html += `<p class="notice">측정 의뢰 ${s.counters.D_treated} / ${CONFIG.D_QUEST_COUNT}</p>`;
    if (ch.hook) html += `<p class="notice">${ch.hook}</p>`;
    if (ch.role === "vip") {
      const req = {
        C: [
          ["a_knights", "기사단 업적"],
          ["C_designated", "기사단 지정 시술소"],
        ],
        D: [
          ["a_core", "마력핵 업적"],
          ["D_quest_done", "측정 의뢰 완료"],
        ],
        E: [["a_oil50", "향유 50병 업적"]],
      }[c];
      html += `<h3>가게 식구로 영입</h3>${s.recruited[c] ? '<p class="good">영입 완료 · 직원 관리에서 업무를 배치할 수 있습니다.</p>' : `<p class="${rel >= 75 ? "good" : "muted"}">${rel >= 75 ? "✓" : "□"} 관계 각별 ${rel}/75</p>${req.map(([k, label]) => `<p class="${s.achievements[k] || s.flags[k] ? "good" : "muted"}">${s.achievements[k] || s.flags[k] ? "✓" : "□"} ${ACHIEVEMENTS.find((a) => a.id === k)?.name || label}</p>`).join("")}<p class="sub">${s.firedEvents[c + "_recruit"] ? "이 인물의 영입 제안 이벤트는 이미 진행되었습니다." : "조건을 갖추면 영업 중 영입 제안 이벤트가 열립니다."}</p>`}`;
    }
    return html + "</div>";
  },
  achProgress(a, m) {
    let p = 1;
    for (const k in a.when) p = Math.min(p, (m[k] || 0) / a.when[k]);
    return U.clamp(p, 0, 1);
  },
  tab_achv() {
    const s = Sim.s,
      m = Sim.metrics(),
      cats = [...new Set(ACHIEVEMENTS.map((a) => a.cat))],
      list = ACHIEVEMENTS.filter((a) => a.cat === UI.achCat);
    if (!list.some((a) => a.id === UI.achId)) UI.achId = list[0]?.id;
    const a = list.find((a) => a.id === UI.achId),
      hidden = a.hidden && !s.achievements[a.id],
      got = s.achievements[a.id],
      p = got ? 1 : UI.achProgress(a, m);
    return (
      `<p class="sub">전체 ${ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length} / ${ACHIEVEMENTS.length} 달성 · 달성 보상은 자동 지급됩니다.</p>` +
      UI.subnav(
        cats.map((c, i) => [c, UI.icon("medal", i, 24) + " " + c]),
        "ach-cat",
        UI.achCat,
      ) +
      `<div class="split wide-list"><div class="sheet"><div class="item-hero">${UI.icon(hidden ? "medal_hidden" : "medal", hidden ? 0 : cats.indexOf(a.cat), 96)}<span class="title">${hidden ? "???" : a.name}</span></div>${hidden ? '<p class="sub">숨겨진 업적입니다. 조건을 발견하면 기록이 열립니다.</p>' : `<p>${a.text || ""}</p>${a.key ? '<span class="tag">엘리트 영입 조건</span>' : ""}<p class="${got ? "good" : "muted"}">${got ? got + "일차 달성" : Math.round(p * 100) + "% 진행"}</p>${UI.bar(p, 1, "green")}<h3>달성 보상</h3>${a.reward.money ? UI.money(a.reward.money) : ""}${a.reward.rep ? `<p>${UI.icon("status", 5, 24)} 평판 +${a.reward.rep}</p>` : ""}<p class="sub">${got ? "보상 지급 완료" : "달성 시 자동으로 받습니다."}</p>`}</div><div class="medal-grid">${list
        .map((x) => {
          const h = x.hidden && !s.achievements[x.id],
            got = s.achievements[x.id];
          return UI.btn(
            UI.icon(
              h ? "medal_hidden" : "medal",
              h ? 0 : cats.indexOf(x.cat),
              48,
            ) +
              `<span>${h ? "???" : x.name}</span><span class="sub ${got ? "good" : ""}">${h ? "숨겨진 업적" : got ? "달성 완료" : Math.round(UI.achProgress(x, m) * 100) + "%"}</span>`,
            "ach-select",
            x.id,
            { pressed: x.id === a.id, cls: "medal-card" },
          );
        })
        .join("")}</div></div>`
    );
  },
  tab_system() {
    const s = Sim.s;
    return `<div class="sheet"><label class="field" for="shopname">가게 이름<input id="shopname" maxlength="40" value="${UI.esc(s.shopName)}" autocomplete="off"></label><div class="actions">${UI.btn("게임 저장", "save", "", { cls: "primary" })}${UI.btn("오늘 영업 마감", "endday", "", { disabled: !s.open })}${UI.btn("새 게임", "reset", "", { cls: "danger" })}</div><p class="notice">매일 마감과 페이지를 나갈 때 자동 저장합니다. 현재 브라우저의 저장 공간을 사용합니다.</p><h3>누적 기록</h3><div class="row"><span>시술한 손님</span><b>${s.stats.totalServed}명</b></div><div class="row"><span>누적 수입</span>${UI.money(s.stats.totalIncome)}</div><div class="row"><span>최고 등급</span><b>${s.stats.bestGrade}</b></div><h3>조작 안내</h3><p class="sub">하단 도구띠 또는 가게의 시설을 눌러 관리 창을 엽니다.<br>Esc: 관리 창 닫기 · Tab: 조작 항목 이동<br>상단 Ⅱ: 일시정지 · 1x / 2x / 4x: 영업 속도<br>모바일에서는 현장을 좌우로 밀어 가게를 둘러볼 수 있습니다.</p></div>`;
  },
  modalPrevSpeed: null,
  modalQueue: [],
  modal(title, html, actions, code, opts) {
    const m = UI.$("#modal"),
      visible = !m.classList.contains("hidden");
    if (visible && !opts?.replace) {
      UI.modalQueue.push([title, html, actions, code]);
      return;
    }
    if (UI.modalPrevSpeed === null) {
      UI.modalPrevSpeed = Sim.s.speed;
      UI.modalFocus = document.activeElement;
    }
    Sim.s.speed = 0;
    UI.$("#app").inert = true;
    document.body.classList.add("modal-open");
    UI.$("#modal-title").textContent = title;
    UI.$("#modal-body").innerHTML =
      (code ? UI.face(code, "portrait big", opts?.mood) : "") + `<div class="text">${html}</div>`;
    const act = UI.$("#modal-actions");
    act.replaceChildren();
    UI.modalCancel = null;
    for (const a of actions) {
      const b = UI.el("button");
      b.textContent = a.label;
      b.disabled = !!a.disabled;
      b.onclick = () => {
        if (a.keep) {
          a.fn?.();
          UI.refresh();
          return;
        }
        // Keep the original speed throughout queued and synchronously emitted dialogs.
        m.classList.add("hidden");
        a.fn?.();
        if (m.classList.contains("hidden")) {
          if (UI.modalQueue.length) UI.modal(...UI.modalQueue.shift());
          else {
            const speed = UI.modalPrevSpeed;
            UI.modalPrevSpeed = null;
            UI.$("#app").inert = false;
            document.body.classList.remove("modal-open");
            UI.setSpeed(speed ?? 1);
            if (UI.modalFocus?.isConnected)
              UI.modalFocus.focus({ preventScroll: true });
          }
        }
        UI.refresh();
      };
      if (["취소", "나중에"].includes(a.label)) UI.modalCancel = b;
      act.appendChild(b);
    }
    m.classList.remove("hidden");
    act.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
    UI.topbar(true);
  },
  keydown(e) {
    if (UI.modalPrevSpeed !== null) {
      if (e.key === "Escape") {
        e.preventDefault();
        UI.modalCancel?.click();
      }
      if (e.key === "Tab") {
        const nodes = [
          ...UI.$("#modal").querySelectorAll(
            'button:not(:disabled),input,[tabindex="0"]',
          ),
        ];
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            !UI.$("#modal").contains(document.activeElement))
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            !UI.$("#modal").contains(document.activeElement))
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
      return;
    }
    if (e.key === "Escape" && UI.view) {
      e.preventDefault();
      UI.close();
    }
  },
  giftModal(code, oils) {
    UI.modal(
      `${CHARACTERS[code].name}에게 선물`,
      "향유 한 병을 건넨다. (하루 1회)",
      [
        ...oils.map((k) => ({
          label: `${OILS[k].name} (${Sim.s.oils[k]})`,
          fn: () => Sim.gift(code, k),
        })),
        { label: "취소" },
      ],
      code,
    );
  },

  dialog(code) {
    const s = Sim.s,
      ch = CHARACTERS[code];
    if (!Sim.canTalk(code)) return;
    const topics = Sim.topicsFor(code);
    const body = `<p class="quote">${UI.esc(Sim.greet(code))}</p><div class="sub">주제를 고른다 (하루 ${CONFIG.TALK_PER_DAY}회)</div>`;
    const actions = topics.map((t) => ({
      label: t.name + (t.once ? " ✦" : ""),
      keep: true,
      fn: () => UI.dialogTopic(code, t),
    }));
    actions.push({ label: "나중에" });
    const tier = RELATION_TIERS.indexOf(U.relTier(s.relation[code] || 0));
    UI.modal(ch.name, body, actions, code, { mood: tier >= 2 ? 3 : 2 });
  },

  dialogTopic(code, t) {
    const ch = CHARACTERS[code];
    const actions = t.choices.map((c, i) => ({
      label: c.label,
      keep: true,
      disabled: !Sim.choiceAllowed(c),
      fn: () => {
        const d = (c.effect?.relation || {})[code] || 0;
        const text = Sim.talk(code, t.id, i);
        UI.modal(
          ch.name,
          `<p class="quote">${UI.esc(text)}</p>`,
          [{ label: "확인" }],
          code,
          { replace: true, mood: d > 2 ? 3 : d < 0 ? 7 : 2 },
        );
      },
    }));
    UI.modal(
      `${ch.name} — ${t.name}`,
      `<p class="quote">${UI.esc(t.text)}</p>`,
      actions,
      code,
      { replace: true, mood: 2 },
    );
  },

  choiceModal(p) {
    const ev = p.ev;
    const actions = ev.choices.map((c, i) => ({
      label: c.label,
      keep: true,
      disabled: !Sim.choiceAllowed(c),
      fn: () => {
        const text = p.onPick(i);
        UI.modal(
          ev.title,
          `<p class="quote">${UI.esc(text)}</p>`,
          [{ label: "확인" }],
          p.code,
          { replace: true },
        );
      },
    }));
    UI.modal(
      ev.title,
      `<p class="quote">${UI.esc(ev.text)}</p>`,
      actions,
      p.code,
    );
  },

  summary(p) {
    UI.modal(
      `${p.day}일차 마감`,
      `
      <div class="row"><span>수입</span>${UI.money(p.income)}</div>
      <div class="row"><span>지출</span>${UI.money(p.expense)}</div>
      <div class="row"><span>순이익</span>${UI.money(p.income - p.expense)}</div>
      <div class="row"><span>시술 / 이탈</span><b>${p.served} / ${p.left}</b></div>
      <div class="row"><span>소지금</span>${UI.money(p.money)}</div>
    `,
      [{ label: "다음 날", fn: () => Sim.startDay() }],
    );
  },
};
