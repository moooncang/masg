// ============================================================
// 캔버스 렌더러 — 네이티브 도트 파이프라인
// 논리 해상도 384×216. 모든 에셋을 원본 픽셀 그대로 정수 배율로만 그린다.
// 배율(S)은 main.js의 Layout이 정한다. 캔버스 backing = 384·S·dpr.
// ============================================================
window.Render = {
  W: 384, H: 216,
  ctx: null, frame: 0, img: {}, scale: 1, dpr: 1,
  // 자리 좌표는 assets/layout.js (LAYOUT) 에서 읽는다. 여기서는 방 기준 오프셋을 절대 좌표로 펼친다.
  get LAYOUT() {
    if (Render._layout) return Render._layout;
    const L = window.LAYOUT, R = L.room;
    const rooms = L.rooms.map(r => ({ x: r.rect[0], y: r.rect[1], w: r.rect[2], h: r.rect[3] }));
    Render._layout = {
      reception: { x: L.reception.rect[0], y: L.reception.rect[1], w: L.reception.rect[2], h: L.reception.rect[3], spot: L.reception.spots },
      waiting: { x: L.waiting.rect[0], y: L.waiting.rect[1], w: L.waiting.rect[2], h: L.waiting.rect[3], seats: [...L.waiting.seats, ...L.waiting.stand] },
      rooms, bed: { dx: R.bed[0], dy: R.bed[1], w: R.bed[2], h: R.bed[3] }, lie: { dx: R.lie[0], dy: R.lie[1] },
      staffSpot: { dx: R.staff[0], dy: R.staff[1] }, bar: R.bar, plate: R.plate, lock: R.lock,
      brew: { x: L.brew.rect[0], y: L.brew.rect[1], w: L.brew.rect[2], h: L.brew.rect[3], spot: L.brew.spots },
      stairs: { x: L.stairs.rect[0], y: L.stairs.rect[1], w: L.stairs.rect[2], h: L.stairs.rect[3], idle: L.idle, rest: L.rest },
      door: L.door, waypoints: L.waypoints, bubble: L.waiting.bubble,
    };
    return Render._layout;
  },
  SPRITE: { w: 16, h: 24, frames: 4 },
  ents: {},   // id → {x, y, tx, ty, f}  (이동 보간용)

  init(canvas) {
    Render.canvas = canvas;
    Render.ctx = canvas.getContext("2d");
    const load = (key, src) => new Promise((resolve) => {
      const im = new Image();
      im.onload = () => { Render.img[key] = im; resolve(true); };
      im.onerror = () => { Render.img[key] = null; resolve(false); };
      im.src = src;
    });
    const pending = [];
    for (const k in ASSETS.sprites) pending.push(load("spr_" + k, ASSETS.sprites[k]));
    for (const k of ["C", "D", "E"]) pending.push(load("spr_" + k + "_staff", ASSETS.staffSprites[k]));
    for (const k in ASSETS.bg) pending.push(load("bg_" + k, ASSETS.bg[k]));
    Render.ready = Promise.all(pending);
  },

  // Layout 이 배율을 바꿀 때 호출
  resize(scale, dpr) {
    Render.scale = scale; Render.dpr = dpr;
    const c = Render.canvas, k = scale * dpr;
    c.width = Render.W * k; c.height = Render.H * k;
    c.style.width = Render.W * scale + "px"; c.style.height = Render.H * scale + "px";
    Render.ctx.setTransform(k, 0, 0, k, 0, 0);
    Render.ctx.imageSmoothingEnabled = false;
  },

  spriteFor(st) {
    const s = Sim.s;
    if (["C", "D", "E"].includes(st.id) && s.recruited[st.id]) return Render.img["spr_" + st.id + "_staff"] || Render.img["spr_" + st.id];
    return Render.img["spr_" + (st.code || st.spriteKey || st.id)];
  },

  // 목표 지점으로 걸어가는 엔티티. 도착 전엔 걷기 프레임.
  ent(id, tx, ty, teleport) {
    const L = Render.LAYOUT, W = L.waypoints;
    let e = Render.ents[id];
    if (!e) {
      e = Render.ents[id] = { x: tx, y: ty, tx, ty, moving: false, seen: Render.frame, route: [] };
      if (!teleport) { e.x = L.door[0]; e.y = L.door[1]; e.route = [W.hall, W.corridor]; }
    }
    if (e.tx !== tx || e.ty !== ty) { e.tx = tx; e.ty = ty; e.route = [W.corridor]; }
    e.seen = Render.frame;
    const goal = e.route.length ? e.route[0] : [e.tx, e.ty];
    const dx = goal[0] - e.x, dy = goal[1] - e.y, d = Math.hypot(dx, dy);
    const speed = 1.2;
    if (d > speed) { e.x += dx / d * speed; e.y += dy / d * speed; e.moving = true; e.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down"); }
    else { e.x = goal[0]; e.y = goal[1]; if (e.route.length) e.route.shift(); else e.moving = false; }
    return e;
  },

  draw(s) {
    const c = Render.ctx, L = Render.LAYOUT;
    Render.frame++;
    const night = s.time >= 21 * 60, evening = s.time >= 17 * 60 && !night;

    // 배경
    const bg = Render.img[night ? "bg_floor1_night" : "bg_floor1"] || Render.img["bg_floor1"];
    if (bg) c.drawImage(bg, 0, 0, Render.W, Render.H);
    else { c.fillStyle = "#2a2430"; c.fillRect(0, 0, Render.W, Render.H); }

    // 미개설 베드: 어둡게
    L.rooms.forEach((r, i) => {
      if (i < s.rooms.length) return;
      c.fillStyle = "rgba(20,16,26,0.72)"; c.fillRect(r.x, r.y, r.w, r.h);
    });

    // 사람 배치 계산
    const people = [];
    const treatmentIdle = s.staff.filter(st => st.post === "treatment" && st.busy == null && st.id !== "player" || (st.id === "player" && st.busy == null && st.post === "treatment"));
    let idleN = 0, restN = 0, recN = 0, brewN = 0;
    for (const st of s.staff) {
      if (st.busy === "out" || st.busy === "dungeon") continue;
      let x, y, bob = false;
      if (st.busy != null && typeof st.busy === "number") { const r = L.rooms[st.busy]; x = r.x + L.staffSpot.dx; y = r.y + L.staffSpot.dy; bob = true; }
      else if (st.post === "reception") { const sp = L.reception.spot[Math.min(recN++, L.reception.spot.length - 1)]; x = sp[0]; y = sp[1]; }
      else if (st.post === "brew") { const sp = L.brew.spot[Math.min(brewN++, L.brew.spot.length - 1)]; x = sp[0]; y = sp[1]; }
      else if (st.post === "rest") { const sp = L.stairs.rest[restN++ % L.stairs.rest.length]; x = sp[0]; y = sp[1]; }
      else { const sp = L.stairs.idle[idleN++ % L.stairs.idle.length]; x = sp[0]; y = sp[1]; }
      const e = Render.ent("st_" + st.id, x, y, true);
      people.push({ x: e.x, y: e.y, img: Render.spriteFor(st), info: st, label: st.name, bob, moving: e.moving, staff: true });
    }
    let wi = 0;
    for (const cu of s.customers) {
      if (cu.state === "treating") {
        const r = L.rooms[cu.roomId];
        people.push({ x: r.x + L.lie.dx, y: r.y + L.lie.dy, img: Render.img["spr_" + cu.spriteKey], info: cu, lying: true, room: r });
      } else {
        const sp = L.waiting.seats[wi % L.waiting.seats.length]; wi++;
        const e = Render.ent("cu_" + cu.id, sp[0], sp[1], false);
        people.push({ x: e.x, y: e.y, img: Render.img["spr_" + cu.spriteKey], info: cu, label: cu.name, patience: cu.patience, vip: cu.vip, regular: cu.regular, moving: e.moving });
      }
    }
    // 오래된 엔티티 정리
    for (const k in Render.ents) if (Render.frame - Render.ents[k].seen > 2) delete Render.ents[k];

    const waiting = people.filter(p => p.patience != null && !p.moving);
    if (waiting.length) { const w = waiting.reduce((a, b) => (a.info.arrivedAt < b.info.arrivedAt ? a : b)); w.bubble = true; }
    people.sort((a, b) => (a.y + (a.lying ? 0 : 24)) - (b.y + (b.lying ? 0 : 24)));
    for (const p of people) Render.person(p);

    // 시술 진행 바
    for (const r of s.rooms) {
      if (!r.customerId) continue;
      const m = MENU.find(x => x.id === r.menuId), lr = L.rooms[r.id];
      const dur = Math.round(m.duration * (s.equips.bedplate ? ITEMS.bedplate.equip.durationMul : 1));
      const t = U.clamp(1 - (r.endsAt - s.time) / dur, 0, 1);
      const bx = lr.x + L.bar[0], by = lr.y + L.bar[1], bw = L.bar[2];
      c.fillStyle = "#211c29"; c.fillRect(bx, by, bw, 4);
      c.fillStyle = "#4a3f3a"; c.fillRect(bx + 1, by + 1, bw - 2, 2);
      c.fillStyle = "#91ad74"; c.fillRect(bx + 1, by + 1, Math.round((bw - 2) * t), 2);
    }

    // 시간대 조명
    if (evening) { c.fillStyle = "rgba(220,140,60,0.08)"; c.fillRect(0, 0, Render.W, Render.H); }
    if (!s.open) { c.fillStyle = "rgba(10,8,14,0.55)"; c.fillRect(0, 0, Render.W, Render.H); }
  },

  person(p) {
    const c = Render.ctx, S = Render.SPRITE;
    if (p.lying) {
      // 베드에 누운 손님: 베개 위 머리 + 이불
      const r = p.room, B = Render.LAYOUT.bed;
      // 머리만 베개 위에. 이불은 배경에 그려져 있다
      if (p.img) c.drawImage(p.img, 0, 0, S.w, 11, Math.round(p.x), Math.round(p.y), S.w, 11);
      return;
    }
    const bob = p.bob ? (Math.floor(Render.frame / 14) % 2) : 0;
    const x = Math.round(p.x), y = Math.round(p.y) - bob;
    const f = p.moving ? Math.floor(Render.frame / 8) % S.frames : (p.bob ? (Math.floor(Render.frame / 14) % 2) * 2 : 0);
    if (p.img) c.drawImage(p.img, f * S.w, 0, S.w, S.h, x, y, S.w, S.h);
    else {
      const hair = p.info.hair || "#333", skin = p.info.skin || "#f0c8a0", cloth = p.info.cloth || "#556";
      c.fillStyle = skin; c.fillRect(x + 4, y + 3, 8, 8);
      c.fillStyle = hair; c.fillRect(x + 3, y + 1, 10, 4);
      c.fillStyle = cloth; c.fillRect(x + 3, y + 11, 10, 9);
      c.fillStyle = "#2a2a2a"; c.fillRect(x + 4, y + 20, 3, 4); c.fillRect(x + 9, y + 20, 3, 4);
    }
    if (p.bubble) {
      const bx = x + Render.LAYOUT.bubble[0] + 3, by = y + Render.LAYOUT.bubble[1];
      c.fillStyle = "#211c29"; c.fillRect(bx - 1, by - 1, 12, 8); c.fillStyle = "#f4ecd8"; c.fillRect(bx, by, 10, 6); c.fillRect(bx + 2, by + 6, 2, 1);
      const dots = Math.floor(Render.frame / 20) % 3 + 1; c.fillStyle = "#211c29"; for (let i = 0; i < dots; i++) c.fillRect(bx + 2 + i * 3, by + 3, 1, 1);
    }
    if (p.vip) { c.fillStyle = "#211c29"; c.fillRect(x + 5, y - 6, 6, 5); c.fillStyle = "#d7ac62"; c.fillRect(x + 6, y - 5, 4, 3); }
    else if (p.regular) { c.fillStyle = "#211c29"; c.fillRect(x + 6, y - 5, 4, 4); c.fillStyle = "#c97868"; c.fillRect(x + 7, y - 4, 2, 2); }
    if (p.patience != null) {
      const t = U.clamp(p.patience / 90, 0, 1);
      c.fillStyle = "#211c29"; c.fillRect(x - 1, y + 25, 18, 3);
      c.fillStyle = t > 0.4 ? "#91ad74" : "#c97868"; c.fillRect(x, y + 26, Math.round(16 * t), 1);
    }
  },

  // 논리 좌표 → #app 기준 CSS 좌표 (화면 위 버튼 배치용)
  toCss(x, y) { return { left: x * Render.scale, top: y * Render.scale }; },
};
