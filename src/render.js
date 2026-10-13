// ============================================================
// 캔버스 렌더러 — 네이티브 도트 파이프라인
// 논리 해상도 384×216. 모든 에셋을 원본 픽셀 그대로 정수 배율로만 그린다.
// 배율(S)은 main.js의 Layout이 정한다. 캔버스 backing = 384·S·dpr.
// ============================================================
window.Render = {
  W: 384, H: 216,
  ctx: null, frame: 0, img: {}, scale: 1, dpr: 1,
  // 방 배치 (논리 픽셀). 배경 floor1.png 의 실제 가구 위치에 맞춘 값.
  LAYOUT: {
    reception: { x: 8,   y: 8,   w: 122, h: 56,  spot: [[62, 34], [84, 34]] },           // 접수 직원이 서는 자리 (카운터 뒤)
    waiting:   { x: 8,   y: 70,  w: 122, h: 138, seats: [[68, 138], [89, 138], [109, 138], [129, 138], [68, 163], [89, 163], [109, 163], [129, 163], [82, 98], [106, 98]] },
    rooms: [
      { x: 138, y: 15, w: 55, h: 60 }, { x: 194, y: 15, w: 63, h: 60 }, { x: 259, y: 15, w: 56, h: 60 }, { x: 317, y: 15, w: 60, h: 60 },
      { x: 138, y: 80, w: 55, h: 62 }, { x: 194, y: 80, w: 63, h: 62 }, { x: 259, y: 80, w: 56, h: 62 }, { x: 317, y: 80, w: 60, h: 62 },
    ],
    bed: { dx: 12, dy: 30, w: 34, h: 16 },           // 방 기준 베드 위치. 베개는 왼쪽
    staffSpot: { dx: 38, dy: 4 },                     // 시술 직원이 서는 자리 (방 기준)
    brew:      { x: 200, y: 150, w: 120, h: 58, spot: [[262, 150]] },
    stairs:    { x: 322, y: 150, w: 54,  h: 58, idle: [[150, 186], [168, 186], [186, 186], [204, 186], [222, 186], [240, 186]], rest: [[300, 186], [318, 186], [336, 186], [354, 158], [366, 180], [346, 194]] },
    door: [150, 212],                                  // 손님 입장 지점 (아래 복도)
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
    let e = Render.ents[id];
    if (!e) { e = Render.ents[id] = { x: tx, y: ty, tx, ty, moving: false, seen: Render.frame }; if (!teleport) { e.x = Render.LAYOUT.door[0]; e.y = Render.LAYOUT.door[1]; } }
    e.tx = tx; e.ty = ty; e.seen = Render.frame;
    const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy);
    const speed = 1.2;
    if (d > speed) { e.x += dx / d * speed; e.y += dy / d * speed; e.moving = true; }
    else { e.x = e.tx; e.y = e.ty; e.moving = false; }
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
        people.push({ x: r.x + L.bed.dx, y: r.y + L.bed.dy, img: Render.img["spr_" + cu.spriteKey], info: cu, lying: true, room: r });
      } else {
        const sp = L.waiting.seats[wi % L.waiting.seats.length]; wi++;
        const e = Render.ent("cu_" + cu.id, sp[0], sp[1], false);
        people.push({ x: e.x, y: e.y, img: Render.img["spr_" + cu.spriteKey], info: cu, label: cu.name, patience: cu.patience, vip: cu.vip, regular: cu.regular, moving: e.moving });
      }
    }
    // 오래된 엔티티 정리
    for (const k in Render.ents) if (Render.frame - Render.ents[k].seen > 2) delete Render.ents[k];

    people.sort((a, b) => (a.y + (a.lying ? 0 : 24)) - (b.y + (b.lying ? 0 : 24)));
    for (const p of people) Render.person(p);

    // 시술 진행 바
    for (const r of s.rooms) {
      if (!r.customerId) continue;
      const m = MENU.find(x => x.id === r.menuId), lr = L.rooms[r.id];
      const dur = Math.round(m.duration * (s.equips.bedplate ? ITEMS.bedplate.equip.durationMul : 1));
      const t = U.clamp(1 - (r.endsAt - s.time) / dur, 0, 1);
      const bx = lr.x + 6, by = lr.y + lr.h - 7, bw = lr.w - 12;
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
      const bx = r.x + B.dx, by = r.y + B.dy;
      c.fillStyle = "#d8cfb8"; c.fillRect(bx + 9, by + 2, B.w - 10, B.h - 4);
      c.fillStyle = "#b9452f"; c.fillRect(bx + 9, by + 3, 3, B.h - 6);
      if (p.img) c.drawImage(p.img, 0, 0, S.w, 11, bx - 1, by + 1, S.w, 11);
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
