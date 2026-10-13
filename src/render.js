// ============================================================
// 캔버스 렌더러 — HD 세계 1672×941 (승인 목업 docs/ux/previews/v3/game_screen.png 과 같은 좌표계)
// 모든 좌표는 assets/layout_hd.json (GPT 실측) 을 그대로 쓴다.
//  · 시트 스프라이트 96×96: 원점 = 앵커 − (48, 96)  (발끝/엉덩이가 셀 바닥 가운데)
//  · 눕기 192×96: 원점 = 앵커 − (0, 48)             (머리끝이 셀 왼쪽 가운데)
// 오프스크린 캔버스에 원본 픽셀로 그린 뒤, 화면 크기에 맞춰 한 번만 축소(평활)한다.
// ============================================================
window.Render = {
  W: 1672, H: 941,
  ctx: null, buf: null, bctx: null, img: {}, frame: 0, now: 0, kDev: 1, kCss: 1,
  ents: {}, emotes: [], tintCache: {},

  get L() { return window.LAYOUT_HD; },

  init(canvas) {
    Render.canvas = canvas;
    Render.ctx = canvas.getContext("2d");
    Render.buf = document.createElement("canvas");
    Render.buf.width = Render.W; Render.buf.height = Render.H;
    Render.bctx = Render.buf.getContext("2d");
    Render.bctx.imageSmoothingEnabled = false;
    Render.img = Loader.img;                      // 로딩 화면이 미리 받아 둔 이미지
    Render.ready = Promise.resolve(true);
    Render.buildGraph();
  },

  // 화면 배율. kDev: 백킹 픽셀 배율(= CSS 배율 × dpr), kCss: CSS 픽셀 배율(zoom 을 안 쓰는 모바일만 1 이 아님)
  resize(kDev, kCss) {
    Render.kDev = kDev; Render.kCss = kCss;
    const c = Render.canvas;
    c.width = Math.round(Render.W * kDev); c.height = Math.round(Render.H * kDev);
    c.style.width = Math.round(Render.W * kCss) + "px"; c.style.height = Math.round(Render.H * kCss) + "px";
  },

  // ---------- 이동 그래프 ----------
  // 노드: E 입구, H 홀, C 복도, R 접수 진입, A0..A3 윗줄 통로, B0..B3 아랫줄 통로, BR 조향실 앞, RS 계단 앞
  buildGraph() {
    const L = Render.L, W = L.waypoints;
    const row1Y = L.rooms[4].rect[1] + L.rooms[4].rect[3] + 22;
    const N = { E: L.entrance, H: W.hall, C: W.corridor, R: [440, 330], BR: [800, 740], RS: [1300, 830] };
    W.bedAisle.forEach((p, i) => { N["A" + i] = p; N["B" + i] = [p[0], row1Y]; });
    const edges = [["E", "H"], ["H", "C"], ["C", "R"], ["C", "A0"], ["A0", "A1"], ["A1", "A2"], ["A2", "A3"], ["H", "B0"], ["B0", "B1"], ["B1", "B2"], ["B2", "B3"], ["H", "BR"], ["BR", "RS"], ["B3", "RS"]];
    const adj = {}; for (const k in N) adj[k] = [];
    for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
    Render.graph = { N, adj, row1Y };
  },
  path(from, to) {
    if (from === to) return [];
    const { adj } = Render.graph, prev = { [from]: null }, q = [from];
    while (q.length) {
      const n = q.shift();
      if (n === to) break;
      for (const m of adj[n]) if (!(m in prev)) { prev[m] = n; q.push(m); }
    }
    if (!(to in prev)) return [to];
    const out = []; for (let n = to; n !== from; n = prev[n]) out.unshift(n);
    return out;
  },

  // ---------- 자리 ----------
  roomSpot(i, kind) {
    const L = Render.L, r = L.rooms[i], row = i < 4 ? 0 : 1, col = i % 4;
    const node = (row ? "B" : "A") + col;
    if (kind === "staff") {
      const sx = r.staff[0] + 40, sy = r.staff[1];
      return { x: r.staff[0], y: r.staff[1], pose: "work", node, via: [[sx, Render.graph.N[node][1]], [sx, sy]] };
    }
    // 손님: 베드 발치까지 걸어와서 눕는다
    const gx = r.plate[0], gy = row ? r.plate[1] - 12 : r.rect[1] + r.rect[3] - 24;
    return { x: gx, y: gy, pose: "lie", lie: r.lie, node, via: [[gx, Render.graph.N[node][1]]] };
  },
  waitSpot(i) {
    const Wt = Render.L.waiting, seats = [...Wt.sofa.map(p => ({ p, pose: "sit", node: "C" })), ...Wt.chairs.map(p => ({ p, pose: "sit", node: "H" })), ...Wt.stand.map(p => ({ p, pose: "idle", node: "C" }))];
    const s = seats[i % seats.length];
    return { x: s.p[0], y: s.p[1], pose: s.pose, node: s.node, via: [] };
  },

  // ---------- 엔티티 이동 ----------
  // target: {x,y,pose,node,via,lie}
  ent(id, target, teleport) {
    let e = Render.ents[id];
    if (!e) {
      e = Render.ents[id] = { x: target.x, y: target.y, tx: null, ty: null, node: target.node, route: [], dir: "down", moving: false, seen: 0, pose: target.pose };
      if (!teleport) { const E = Render.L.entrance; e.x = E[0]; e.y = E[1]; e.node = "E"; }
    }
    e.seen = Render.frame;
    if (e.tx !== target.x || e.ty !== target.y) {
      e.tx = target.x; e.ty = target.y; e.target = target;
      const nodes = Render.path(e.node, target.node);
      e.route = [...nodes.map(n => Render.graph.N[n]), ...(target.via || []), [target.x, target.y]];
      e.node = target.node;
    }
    const goal = e.route[0];
    if (goal) {
      const dx = goal[0] - e.x, dy = goal[1] - e.y, d = Math.hypot(dx, dy);
      const step = Render.dt * 0.22 * Math.max(1, Math.min(Sim.s.speed, 2));
      if (d > step) { e.x += dx / d * step; e.y += dy / d * step; e.moving = true; e.dir = Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down"); }
      else { e.x = goal[0]; e.y = goal[1]; e.route.shift(); if (!e.route.length) { e.moving = false; e.dir = "down"; } }
    } else e.moving = false;
    e.pose = e.moving ? "walk" : target.pose;
    return e;
  },

  // ---------- 스프라이트 ----------
  sheetKey(code) {
    if (code === "player" || code === "P") return "P";
    if (/^[A-E](_staff)?$/.test(code)) return code;
    return code.startsWith("cust_") ? code : "cust_" + code;
  },
  staffCode(st) {
    if (st.id === "player") return "P";
    if (["C", "D", "E"].includes(st.id)) return st.id + "_staff";
    return Render.sheetKey(st.code || st.id);
  },
  // 머리색 마스크가 있는 일반 손님/직원은 시트를 머리색으로 물들인 복사본을 쓴다
  sheetFor(code, hair) {
    const base = Render.img["sheet_" + code];
    const mask = hair && Render.img["hair_" + code];
    if (!base || !mask) return base;
    const key = code + "|" + hair;
    if (Render.tintCache[key]) return Render.tintCache[key];
    const c = document.createElement("canvas"); c.width = base.width; c.height = base.height;
    const x = c.getContext("2d");
    const m = document.createElement("canvas"); m.width = base.width; m.height = base.height;
    const mx = m.getContext("2d");
    mx.drawImage(mask, 0, 0); mx.globalCompositeOperation = "source-in"; mx.fillStyle = hair; mx.fillRect(0, 0, m.width, m.height);
    x.drawImage(base, 0, 0); x.globalCompositeOperation = "color"; x.drawImage(m, 0, 0);
    x.globalCompositeOperation = "destination-in"; x.drawImage(base, 0, 0);
    return (Render.tintCache[key] = c);
  },
  animFrame(row) {
    const S = ASSETS.sheet;
    return Math.floor(Render.now * (S.fps[row] || 2) / 1000) % (S.frames[row] || 1);
  },
  drawSheet(sheet, row, dir, x, y, flip) {
    const S = ASSETS.sheet, c = Render.bctx;
    if (!sheet) { c.fillStyle = "#c97868"; c.fillRect(x - 12, y - 48, 24, 48); return; }
    const r = S.rows[row] ?? 0, f = Render.animFrame(row);
    const sx = f * S.cell, sy = r * S.cell, dx = Math.round(x - 48), dy = Math.round(y - 96);
    if (flip) { c.save(); c.translate(dx + S.cell, dy); c.scale(-1, 1); c.drawImage(sheet, sx, sy, S.cell, S.cell, 0, 0, S.cell, S.cell); c.restore(); }
    else c.drawImage(sheet, sx, sy, S.cell, S.cell, dx, dy, S.cell, S.cell);
  },
  nine(img, sx, sy, sw, sh, cut, dx, dy, dw, dh) {
    const c = Render.bctx, cw = sw - cut * 2, ch = sh - cut * 2, iw = Math.max(0, dw - cut * 2), ih = Math.max(0, dh - cut * 2);
    const d = (ox, oy, w, h, tx, ty, tw, th) => { if (w > 0 && h > 0 && tw > 0 && th > 0) c.drawImage(img, sx + ox, sy + oy, w, h, dx + tx, dy + ty, tw, th); };
    d(0, 0, cut, cut, 0, 0, cut, cut); d(cut, 0, cw, cut, cut, 0, iw, cut); d(sw - cut, 0, cut, cut, cut + iw, 0, cut, cut);
    d(0, cut, cut, ch, 0, cut, cut, ih); d(cut, cut, cw, ch, cut, cut, iw, ih); d(sw - cut, cut, cut, ch, cut + iw, cut, cut, ih);
    d(0, sh - cut, cut, cut, 0, cut + ih, cut, cut); d(cut, sh - cut, cw, cut, cut, cut + ih, iw, cut); d(sw - cut, sh - cut, cut, cut, cut + iw, cut + ih, cut, cut);
  },
  progress(x, y, w, h, t) {
    const b = Render.img.prop_bar_round, c = Render.bctx;
    if (!b) { c.fillStyle = "#211c29"; c.fillRect(x, y, w, h); c.fillStyle = "#91ad74"; c.fillRect(x + 2, y + 2, Math.round((w - 4) * t), h - 4); return; }
    Render.nine(b, 0, 0, 24, 24, 8, x, y, w, h);
    if (t <= 0) return;
    c.save(); c.beginPath(); c.rect(x, y, Math.max(16, Math.round(w * t)), h); c.clip();
    Render.nine(b, 24, 0, 24, 24, 8, x, y, w, h); c.restore();
  },
  emote(entId, kind) {
    const e = Render.ents[entId]; if (!e) return;
    Render.emotes.push({ x: e.x, y: e.y - (e.pose === "lie" ? 20 : 96), kind, t0: Render.now });
  },

  // ---------- 프레임 ----------
  draw(s) {
    const c = Render.bctx, L = Render.L, img = Render.img;
    const now = performance.now();
    Render.dt = Math.min(50, now - (Render.now || now)); Render.now = now; Render.frame++;
    const night = s.time >= 21 * 60, evening = s.time >= 17 * 60 && !night;

    const bg = img[night ? "bg_floor1_night" : "bg_floor1"] || img.bg_floor1;
    if (bg) c.drawImage(bg, 0, 0); else { c.fillStyle = "#2a2430"; c.fillRect(0, 0, Render.W, Render.H); }

    // 미개설 베드: 어둡게 + 자물쇠
    L.rooms.forEach((r, i) => {
      if (i < s.rooms.length) return;
      c.fillStyle = "rgba(14,10,18,0.66)"; c.fillRect(r.rect[0], r.rect[1], r.rect[2], r.rect[3]);
      if (img.prop_lock) c.drawImage(img.prop_lock, r.lock[0] - 24, r.lock[1] - 24);
    });

    // 사람 배치
    const people = [];
    let idleN = 0, restN = 0, recN = 0, brewN = 0;
    for (const st of s.staff) {
      if (st.busy === "out" || st.busy === "dungeon") continue;
      let t;
      if (typeof st.busy === "number") t = Render.roomSpot(st.busy, "staff");
      else if (st.post === "reception") { const sp = L.reception.spots[Math.min(recN++, L.reception.spots.length - 1)]; t = { x: sp[0], y: sp[1], pose: ["A", "E"].includes(st.id) ? "recept" : "idle", node: "R", via: [] }; }
      else if (st.post === "brew") { const sp = L.brew.spots[Math.min(brewN++, L.brew.spots.length - 1)]; t = { x: sp[0], y: sp[1], pose: "work", node: "BR", via: [] }; }
      else if (st.post === "rest") { const sp = L.rest[restN++ % L.rest.length]; t = { x: sp[0], y: sp[1], pose: "sit", node: "RS", via: [] }; }
      else { const sp = L.idle[idleN++ % L.idle.length]; t = { x: sp[0], y: sp[1], pose: "idle", node: "H", via: [] }; }
      const e = Render.ent("st_" + st.id, t, true);
      const code = Render.staffCode(st);
      people.push({ e, code, hair: code.startsWith("cust_") ? st.hair : null, info: st });
    }
    let wi = 0;
    for (const cu of s.customers) {
      const code = Render.sheetKey(cu.spriteKey);
      const hair = code.startsWith("cust_") ? cu.hair : null;
      if (cu.state === "treating") {
        const e = Render.ent("cu_" + cu.id, Render.roomSpot(cu.roomId, "customer"), false);
        people.push({ e, code, hair, info: cu, lie: !e.moving ? L.rooms[cu.roomId].lie : null });
      } else {
        const e = Render.ent("cu_" + cu.id, Render.waitSpot(wi++), false);
        people.push({ e, code, hair, info: cu, waiting: !e.moving });
      }
    }
    for (const k in Render.ents) if (Render.frame - Render.ents[k].seen > 2) delete Render.ents[k];

    const waiting = people.filter(p => p.waiting);
    if (waiting.length) waiting.reduce((a, b) => (a.info.arrivedAt < b.info.arrivedAt ? a : b)).bubble = true;
    people.sort((a, b) => (a.lie ? a.lie[1] + 60 : a.e.y) - (b.lie ? b.lie[1] + 60 : b.e.y));
    for (const p of people) Render.person(p);

    // 베드 번호판 · 시술 진행
    for (let i = 0; i < L.rooms.length; i++) {
      const r = L.rooms[i], room = s.rooms[i];
      if (img.prop_plate) c.drawImage(img.prop_plate, r.plate[0] - 24, r.plate[1] - 16);
      c.font = "16px Galmuri11, monospace"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillStyle = room ? "#eee1bc" : "#8a7a66"; c.fillText(String(i + 1), r.plate[0], r.plate[1] + 1);
      if (room && room.customerId) {
        const m = MENU.find(x => x.id === room.menuId);
        const dur = Math.round(m.duration * (s.equips.bedplate ? ITEMS.bedplate.equip.durationMul : 1));
        Render.progress(r.bar[0], r.bar[1] - 1, r.bar[2], 16, U.clamp(1 - (room.endsAt - s.time) / dur, 0, 1));
      }
    }

    // 이모트
    Render.emotes = Render.emotes.filter(em => now - em.t0 < 1400);
    for (const em of Render.emotes) {
      const t = (now - em.t0) / 1400, idx = ASSETS.emote[em.kind] ?? 0;
      c.globalAlpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      if (img.prop_emotes) c.drawImage(img.prop_emotes, idx * 32, 0, 32, 32, Math.round(em.x - 16), Math.round(em.y - 36 - t * 28), 32, 32);
      c.globalAlpha = 1;
    }

    // 시간대 조명
    if (evening) { c.fillStyle = "rgba(220,140,60,0.08)"; c.fillRect(0, 0, Render.W, Render.H); }
    if (!s.open) { c.fillStyle = "rgba(10,8,14,0.5)"; c.fillRect(0, 0, Render.W, Render.H); }

    // 화면으로 한 번에 축소
    const o = Render.ctx, cv = Render.canvas;
    o.imageSmoothingEnabled = !Number.isInteger(Render.kDev); o.imageSmoothingQuality = "high";
    o.drawImage(Render.buf, 0, 0, cv.width, cv.height);
  },

  person(p) {
    const c = Render.bctx, e = p.e, img = Render.img, S = ASSETS.sheet;
    const x = Math.round(e.x), y = Math.round(e.y);
    if (p.lie) {
      const lie = img["lie_" + p.code];
      const f = Math.floor(Render.now / 1000) % 2;
      if (lie) c.drawImage(lie, 0, f * 96, 192, 96, p.lie[0], p.lie[1] - 48, 192, 96);
      return;
    }
    const sheet = Render.sheetFor(p.code, p.hair);
    let row = "idle", flip = false;
    if (e.pose === "walk") { row = e.dir === "left" || e.dir === "right" ? "walk_side" : e.dir === "up" ? "walk_up" : "walk_down"; flip = e.dir === "right"; }
    else if (e.pose === "sit" || e.pose === "work" || e.pose === "recept") row = e.pose;
    if ((row === "idle" || row.startsWith("walk")) && img.shadow) c.drawImage(img.shadow, x - 32, y - 12);
    Render.drawSheet(sheet, row, e.dir, x, y, flip);

    const cu = p.info;
    if (p.bubble && img.prop_bubble) {
      const b = Render.L.waiting.bubble, f = Math.floor(Render.now / 450) % 3;
      c.drawImage(img.prop_bubble, f * 64, 0, 64, 48, x + b[0] - 32, y + b[1] - 48, 64, 48);
    }
    if (p.waiting && cu.vip && img.prop_emotes && Math.floor(Render.now / 600) % 2) c.drawImage(img.prop_emotes, ASSETS.emote.sparkle * 32, 0, 32, 32, x + 24, y - 104, 32, 32);
    else if (p.waiting && cu.regular && img.prop_emotes) c.drawImage(img.prop_emotes, ASSETS.emote.note * 32, 0, 32, 32, x + 24, y - 104, 32, 32);
    if (p.waiting && cu.patience != null) {
      const t = U.clamp(cu.patience / CONFIG.PATIENCE_MAX, 0, 1);
      if (t < 0.6) Render.progress(x - 24, y - 116, 48, 16, t);
    }
  },

  // 세계 좌표 → #stage CSS 좌표
  toCss(x, y) { return { left: x * Render.kCss, top: y * Render.kCss }; },
};
