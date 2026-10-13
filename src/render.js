// ============================================================
// 캔버스 렌더러. 384x216 픽셀 평면도. 스프라이트가 없으면 색 블록으로 대체.
// ============================================================
window.Render = {
  W: 384, H: 216,
  ctx: null, frame: 0, img: {},
  // 방 배치 (픽셀 좌표). 평면도 배경 이미지를 만들 때 이 좌표를 기준으로 그린다.
  LAYOUT: {
    reception: { x: 8,   y: 8,   w: 122, h: 52,  name: "접수대" },
    waiting:   { x: 8,   y: 68,  w: 122, h: 140, name: "대기실" },
    // 베드 8칸: 4열 × 2행, 각 56×64. 1~4 윗줄, 5~8 아랫줄
    rooms: [
      { x: 140, y: 8,  w: 56, h: 64 }, { x: 200, y: 8,  w: 56, h: 64 }, { x: 260, y: 8,  w: 56, h: 64 }, { x: 320, y: 8,  w: 56, h: 64 },
      { x: 140, y: 80, w: 56, h: 64 }, { x: 200, y: 80, w: 56, h: 64 }, { x: 260, y: 80, w: 56, h: 64 }, { x: 320, y: 80, w: 56, h: 64 },
    ],
    brew:      { x: 140, y: 152, w: 114, h: 56,  name: "조향실" },
    stairs:    { x: 262, y: 152, w: 114, h: 56,  name: "2층 계단" },
  },
  SPRITE: { w: 16, h: 24, frames: 4 },

  init(canvas) {
    Render.ctx = canvas.getContext("2d");
    Render.ctx.imageSmoothingEnabled = false;
    const load = (key, src) => {
      const im = new Image();
      im.onload = () => { Render.img[key] = im; };
      im.onerror = () => { Render.img[key] = null; };
      im.src = src;
    };
    for (const k in ASSETS.sprites) load("spr_" + k, ASSETS.sprites[k]);
    for (const k in ASSETS.portraits) load("face_" + k, ASSETS.portraits[k]);
    for (const k in ASSETS.bg) load("bg_" + k, ASSETS.bg[k]);
  },

  draw(s) {
    const c = Render.ctx, L = Render.LAYOUT;
    Render.frame++;
    const night = s.time >= 21 * 60, evening = s.time >= 17 * 60 && !night;

    // 배경
    const bg = Render.img[night ? "bg_floor1_night" : "bg_floor1"] || Render.img["bg_floor1"];
    if (bg) c.drawImage(bg, 0, 0);
    else {
      c.fillStyle = "#2a2430"; c.fillRect(0, 0, Render.W, Render.H);
      Render.room(L.reception, "#5a4a3a", L.reception.name);
      Render.room(L.waiting, "#4a4a5a", L.waiting.name);
      L.rooms.forEach((r, i) => {
        const built = i < s.rooms.length;
        Render.room(r, built ? "#3a5a4a" : "#2a2a2a", built ? `베드 ${i + 1}` : "");
        if (built) { c.fillStyle = "#d8c8a8"; c.fillRect(r.x + 10, r.y + 36, 36, 14); c.fillStyle = "#b8a888"; c.fillRect(r.x + 10, r.y + 36, 8, 14); }
      });
      Render.room(L.brew, "#4a3a5a", L.brew.name);
      Render.room(L.stairs, "#3a3a3a", L.stairs.name);
      // 대기 의자
      c.fillStyle = "#6a5a4a";
      for (let i = 0; i < s.seats; i++) c.fillRect(L.waiting.x + 10 + (i % 4) * 28, L.waiting.y + 30 + Math.floor(i / 4) * 44, 14, 6);
      // 접수대
      c.fillStyle = "#7a5a3a"; c.fillRect(L.reception.x + 20, L.reception.y + 30, 80, 10);
      // 조향 선반
      c.fillStyle = "#6a4a7a"; c.fillRect(L.brew.x + 10, L.brew.y + 14, 60, 8);
    }

    // 사람들
    const people = [];
    for (const st of s.staff) {
      let x, y;
      if (st.busy === "out" || st.busy === "dungeon") continue; // 출장·탐사 중
      if (st.busy != null) { const r = L.rooms[st.busy]; x = r.x + 36; y = r.y + 8; }
      else if (st.post === "reception") { x = L.reception.x + 40 + (people.filter(p => p.post === "reception").length) * 20; y = L.reception.y + 6; }
      else if (st.post === "brew") { x = L.brew.x + 30; y = L.brew.y + 20; }
      else if (st.post === "rest") { x = L.stairs.x + 8 + (people.filter(p => p.post === "rest").length % 6) * 18; y = L.stairs.y + 28; }
      else { const n = people.filter(p => p.post === "treatment" && p.info.busy == null).length; x = L.stairs.x + 8 + (n % 6) * 18; y = L.stairs.y + 2; }
      people.push({ x, y, key: st.code || st.id, info: st, label: st.name, bob: st.busy != null, post: st.post });
    }
    let wi = 0;
    for (const cu of s.customers) {
      if (cu.state === "treating") {
        const r = L.rooms[cu.roomId];
        people.push({ x: r.x + 24, y: r.y + 26, key: cu.spriteKey, info: cu, label: cu.name, lying: true });
      } else {
        const x = L.waiting.x + 10 + (wi % 4) * 28, y = L.waiting.y + 10 + Math.floor(wi / 4) * 44;
        people.push({ x, y, key: cu.spriteKey, info: cu, label: cu.name, patience: cu.patience, vip: cu.vip });
        wi++;
      }
    }
    people.sort((a, b) => a.y - b.y);
    for (const p of people) Render.person(p);

    // 시술 진행 바
    for (const r of s.rooms) {
      if (!r.customerId) continue;
      const m = MENU.find(x => x.id === r.menuId), lr = L.rooms[r.id];
      const t = 1 - (r.endsAt - s.time) / m.duration;
      c.fillStyle = "#15141a"; c.fillRect(lr.x + 4, lr.y + lr.h - 8, lr.w - 8, 4);
      c.fillStyle = "#d9a35b"; c.fillRect(lr.x + 4, lr.y + lr.h - 8, (lr.w - 8) * U.clamp(t, 0, 1), 4);
    }

    // 시간대 조명
    if (evening) { c.fillStyle = "rgba(220,140,60,0.10)"; c.fillRect(0, 0, Render.W, Render.H); }
    if (night) { c.fillStyle = "rgba(20,20,60,0.35)"; c.fillRect(0, 0, Render.W, Render.H); }
    if (s.outcall) Render.text(`사장 출장 중 → ${CHARACTERS[s.outcall.code].place}`, L.stairs.x + 4, L.stairs.y + 40, "#d9a35b", 8);
    if (s.expedition) Render.text(`심연구 ${s.expedition.depth}층 탐사 중 (${s.expedition.members.length}명)`, L.stairs.x + 4, L.stairs.y + 50, "#d9a35b", 8);
    if (!s.open) { c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(0, 0, Render.W, Render.H); Render.text("폐점", Render.W / 2 - 10, Render.H / 2, "#e8e2d6", 12); }
  },

  room(r, color, label) {
    const c = Render.ctx;
    c.fillStyle = color; c.fillRect(r.x, r.y, r.w, r.h);
    c.strokeStyle = "#15141a"; c.lineWidth = 1; c.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    Render.text(label, r.x + 3, r.y + 9, "#c8c0b0", 8);
  },

  text(str, x, y, color, size) {
    const c = Render.ctx;
    c.font = `${size || 8}px sans-serif`; c.fillStyle = color || "#fff"; c.textBaseline = "alphabetic";
    c.fillText(str, x, y);
  },

  person(p) {
    const c = Render.ctx, S = Render.SPRITE;
    const im = Render.img["spr_" + p.key];
    const bob = p.bob ? (Math.floor(Render.frame / 12) % 2) : 0;
    const x = Math.round(p.x), y = Math.round(p.y) - bob;
    if (p.lying) {
      // 누운 손님: 스프라이트를 눕혀 그리기 어렵다 → 베드 위 머리만 표시(플레이스홀더)
      c.fillStyle = p.info.skin || "#f0c8a0"; c.fillRect(x - 12, y + 10, 7, 7);
      c.fillStyle = p.info.hair || "#333"; c.fillRect(x - 12, y + 8, 7, 3);
      c.fillStyle = "#e8e0d0"; c.fillRect(x - 5, y + 10, 24, 7);
    } else if (im) {
      const f = Math.floor(Render.frame / 10) % S.frames;
      c.drawImage(im, f * S.w, 0, S.w, S.h, x, y, S.w, S.h);
    } else {
      // 플레이스홀더 인형
      const hair = p.info.hair || "#333", skin = p.info.skin || "#f0c8a0", cloth = p.info.cloth || "#556";
      c.fillStyle = skin; c.fillRect(x + 4, y + 3, 8, 8);
      c.fillStyle = hair; c.fillRect(x + 3, y + 1, 10, 4); c.fillRect(x + 3, y + 5, 2, 4); c.fillRect(x + 11, y + 5, 2, 4);
      c.fillStyle = cloth; c.fillRect(x + 3, y + 11, 10, 9);
      c.fillStyle = "#2a2a2a"; c.fillRect(x + 4, y + 20, 3, 4); c.fillRect(x + 9, y + 20, 3, 4);
      if (p.info.race === "엘프" || p.info.race === "다크엘프") { c.fillStyle = skin; c.fillRect(x + 1, y + 5, 3, 2); c.fillRect(x + 12, y + 5, 3, 2); }
      if (p.info.race === "묘인족" || p.info.race === "수인") { c.fillStyle = hair; c.fillRect(x + 4, y - 1, 2, 3); c.fillRect(x + 10, y - 1, 2, 3); }
    }
    if (p.vip) { c.fillStyle = "#ffd866"; c.fillRect(x + 6, y - 5, 4, 4); }
    if (p.patience != null) {
      const t = U.clamp(p.patience / 90, 0, 1);
      c.fillStyle = "#15141a"; c.fillRect(x, y + 25, 16, 2);
      c.fillStyle = t > 0.4 ? "#7fcf8a" : "#e06c6c"; c.fillRect(x, y + 25, Math.round(16 * t), 2);
    }
    if (!p.lying) Render.text(p.label, x - 2, y + 33, "#e8e2d6", 7);
  },
};
