// ============================================================
// 캔버스 렌더러. 384x216 논리 좌표, 4배 backing canvas. HD 에셋을 직접 샘플링한다.
// ============================================================
window.Render = {
  W: 384,
  H: 216,
  ctx: null,
  frame: 0,
  img: {},
  // 방 배치 (픽셀 좌표). 평면도 배경 이미지를 만들 때 이 좌표를 기준으로 그린다.
  LAYOUT: {
    reception: { x: 8, y: 8, w: 122, h: 52, name: "접수대" },
    waiting: { x: 8, y: 68, w: 122, h: 140, name: "대기실" },
    // 베드 8칸: 4열 × 2행, 각 56×64. 1~4 윗줄, 5~8 아랫줄
    rooms: [
      { x: 137.799, y: 15.15, w: 54.66, h: 60.14 },
      { x: 194.067, y: 15.15, w: 62.699, h: 60.14 },
      { x: 259.062, y: 15.15, w: 56.038, h: 60.14 },
      { x: 317.167, y: 15.15, w: 60.402, h: 60.14 },
      { x: 137.799, y: 80.111, w: 54.66, h: 61.747 },
      { x: 194.067, y: 80.111, w: 62.699, h: 61.747 },
      { x: 259.062, y: 80.111, w: 56.038, h: 61.747 },
      { x: 317.167, y: 80.111, w: 60.402, h: 61.747 },
    ],
    brew: { x: 140, y: 152, w: 114, h: 56, name: "조향실" },
    stairs: { x: 262, y: 152, w: 114, h: 56, name: "2층 계단" },
  },
  SPRITE: { w: 20, h: 30, frames: 4 },

  init(canvas) {
    canvas.width = Render.W * 4;
    canvas.height = Render.H * 4;
    Render.ctx = canvas.getContext("2d");
    Render.ctx.setTransform(4, 0, 0, 4, 0, 0);
    Render.ctx.imageSmoothingEnabled = false;
    const load = (key, src) =>
      new Promise((resolve) => {
        const im = new Image();
        im.onload = () => {
          Render.img[key] = im;
          resolve(true);
        };
        im.onerror = () => {
          Render.img[key] = null;
          resolve(false);
        };
        im.src = src;
      });
    const pending = [];
    for (const k in ASSETS.sprites)
      pending.push(load("spr_" + k, ASSETS.sprites[k]));
    for (const k of ["C", "D", "E"])
      pending.push(
        load("spr_" + k + "_staff", `assets/sprites/hd/char_${k}_staff.png`),
      );
    for (const k in ASSETS.portraits)
      pending.push(load("face_" + k, ASSETS.portraits[k]));
    for (const k in ASSETS.bg) pending.push(load("bg_" + k, ASSETS.bg[k]));
    Render.ready = Promise.all(pending);
  },

  draw(s) {
    const c = Render.ctx,
      L = Render.LAYOUT;
    Render.frame++;
    const night = s.time >= 21 * 60,
      evening = s.time >= 17 * 60 && !night;

    // 배경
    const bg =
      Render.img[night ? "bg_floor1_night" : "bg_floor1"] ||
      Render.img["bg_floor1"];
    if (bg) c.drawImage(bg, 0, 0, Render.W, Render.H);
    else {
      c.fillStyle = "#2a2430";
      c.fillRect(0, 0, Render.W, Render.H);
      Render.room(L.reception, "#5a4a3a", L.reception.name);
      Render.room(L.waiting, "#4a4a5a", L.waiting.name);
      L.rooms.forEach((r, i) => {
        const built = i < s.rooms.length;
        Render.room(
          r,
          built ? "#3a5a4a" : "#2a2a2a",
          built ? `베드 ${i + 1}` : "",
        );
        if (built) {
          c.fillStyle = "#d8c8a8";
          c.fillRect(r.x + 10, r.y + 36, 36, 14);
          c.fillStyle = "#b8a888";
          c.fillRect(r.x + 10, r.y + 36, 8, 14);
        }
      });
      Render.room(L.brew, "#4a3a5a", L.brew.name);
      Render.room(L.stairs, "#3a3a3a", L.stairs.name);
      // 대기 의자
      c.fillStyle = "#6a5a4a";
      for (let i = 0; i < s.seats; i++)
        c.fillRect(
          L.waiting.x + 10 + (i % 4) * 28,
          L.waiting.y + 30 + Math.floor(i / 4) * 44,
          14,
          6,
        );
      // 접수대
      c.fillStyle = "#7a5a3a";
      c.fillRect(L.reception.x + 20, L.reception.y + 30, 80, 10);
      // 조향 선반
      c.fillStyle = "#6a4a7a";
      c.fillRect(L.brew.x + 10, L.brew.y + 14, 60, 8);
    }

    // 미확장 베드는 가려서 배경의 8개 베드와 실제 영업 용량을 구별한다.
    L.rooms.forEach((r, i) => {
      if (i < s.rooms.length) return;
      c.fillStyle = "rgba(21,19,26,.51)";
      c.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      c.strokeStyle = "#896344";
      c.lineWidth = 0.5;
    });
    const people = [],
      counts = { reception: 0, brew: 0, rest: 0, treatment: 0 };
    const bedFeet = [
      [176, 49],
      [216, 49],
      [298, 49],
      [350, 49],
      [176, 116],
      [216, 116],
      [298, 116],
      [350, 116],
    ];
    for (const st of s.staff) {
      if (st.busy === "out" || st.busy === "dungeon") continue;
      let foot;
      const n = counts[st.post]++ || 0;
      if (typeof st.busy === "number") foot = bedFeet[st.busy];
      else if (st.post === "reception") foot = [67 + n * 20, 59];
      else if (st.post === "brew") foot = [174 + n * 20, 190];
      else if (st.post === "rest")
        foot = [40 + (n % 4) * 20, 175 + Math.floor(n / 4) * 22];
      else foot = bedFeet[n % bedFeet.length];
      if (!foot) continue;
      const key =
        s.recruited[st.id] && ["C", "D", "E"].includes(st.id)
          ? st.id + "_staff"
          : st.code || st.id;
      people.push({
        x: foot[0] - 10,
        y: foot[1] - 30,
        key,
        info: st,
        bob: st.busy != null,
        reception: st.post === "reception" && st.busy == null,
        staff: true,
      });
    }
    let wi = 0;
    for (const cu of s.customers) {
      if (cu.state === "treating") {
        const r = L.rooms[cu.roomId];
        if (r)
          people.push({
            x: r.x + 12,
            y: r.y + 22,
            key: cu.spriteKey,
            info: cu,
            lying: true,
          });
      } else {
        people.push({
          x: wi < 3 ? 38 + wi * 18 : 39 + ((wi - 3) % 3) * 27,
          y: wi < 3 ? 100 : 153 + Math.floor((wi - 3) / 3) * 15,
          key: cu.spriteKey,
          info: cu,
          patience: cu.patience,
          vip: cu.vip,
        });
        wi++;
      }
    }
    people.sort((a, b) => a.y - b.y);
    for (const p of people) Render.person(p);
    // Foreground counter and bed linen occlude staff feet, matching the approved scene depth.
    if (bg) {
      const patch = (x, y, w, h) =>
        c.drawImage(
          bg,
          (x / 384) * bg.width,
          (y / 216) * bg.height,
          (w / 384) * bg.width,
          (h / 216) * bg.height,
          x,
          y,
          w,
          h,
        );
      patch(33, 50.7, 74, 20);
      for (const st of s.staff) {
        if (
          st.busy === "out" ||
          st.busy === "dungeon" ||
          st.post !== "treatment"
        )
          continue;
        const bed =
          typeof st.busy === "number"
            ? st.busy
            : s.staff
                .filter((x) => x.post === "treatment" && x.busy == null)
                .indexOf(st);
        const r = L.rooms[bed];
        if (r && bed < s.rooms.length) patch(r.x + 31, r.y + 27, r.w - 32, 19);
      }
    }

    // 시술 진행 바
    for (const r of s.rooms) {
      if (!r.customerId) continue;
      const m = MENU.find((x) => x.id === r.menuId),
        lr = L.rooms[r.id];
      const t = 1 - (r.endsAt - s.time) / m.duration;
      c.fillStyle = "#15141a";
      c.fillRect(lr.x + 4, lr.y + 10, lr.w - 8, 4);
      c.fillStyle = "#80cd48";
      c.fillRect(lr.x + 4, lr.y + 10, (lr.w - 8) * U.clamp(t, 0, 1), 4);
    }

    // 시간대 조명
    if (evening) {
      c.fillStyle = "rgba(220,140,60,0.10)";
      c.fillRect(0, 0, Render.W, Render.H);
    }
    if (night) {
      c.fillStyle = "rgba(20,20,60,0.35)";
      c.fillRect(0, 0, Render.W, Render.H);
    }
    if (!s.open) {
      c.fillStyle = "rgba(0,0,0,0.6)";
      c.fillRect(0, 0, Render.W, Render.H);
      Render.text("폐점", Render.W / 2 - 10, Render.H / 2, "#e8e2d6", 12);
    }
  },

  room(r, color, label) {
    const c = Render.ctx;
    c.fillStyle = color;
    c.fillRect(r.x, r.y, r.w, r.h);
    c.strokeStyle = "#15141a";
    c.lineWidth = 1;
    c.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    Render.text(label, r.x + 3, r.y + 9, "#c8c0b0", 8);
  },

  text(str, x, y, color, size) {
    const c = Render.ctx;
    c.font = `${size || 8}px sans-serif`;
    c.fillStyle = color || "#fff";
    c.textBaseline = "alphabetic";
    c.fillText(str, x, y);
  },

  person(p) {
    const c = Render.ctx,
      S = Render.SPRITE;
    const im = Render.img["spr_" + p.key];
    const bob = p.bob ? Math.floor(Render.frame / 12) % 2 : 0;
    const x = Math.round(p.x),
      y = Math.round(p.y) - bob;
    // Approved chibi poses are clipped from the approved atlas; no baked scene or HUD is displayed.
    const ref = PixelSkin.image;
    if (
      ref &&
      p.staff &&
      ((p.reception && p.key === "A") ||
        (p.info.post === "treatment" && ["P", "B"].includes(p.key)))
    ) {
      const pose = p.reception ? "reception" : p.key;
      const defs = {
        reception: {
          box: [252, 140, 82, 81],
          points: [
            [20, 0],
            [48, 0],
            [66, 12],
            [69, 36],
            [76, 49],
            [82, 79],
            [0, 79],
            [5, 55],
            [12, 33],
            [11, 12],
          ],
          dx: 0,
          dy: 3,
          w: 20,
          h: 20,
        },
        P: {
          box: [725, 110, 100, 80],
          points: [
            [26, 0],
            [64, 0],
            [78, 14],
            [77, 35],
            [90, 47],
            [98, 72],
            [75, 80],
            [4, 80],
            [0, 59],
            [20, 43],
            [16, 24],
          ],
          dx: 0,
          dy: 6,
          w: 23,
          h: 18.4,
        },
        B: {
          box: [883, 99, 117, 91],
          points: [
            [27, 0],
            [46, 7],
            [76, 0],
            [91, 18],
            [92, 38],
            [84, 49],
            [103, 67],
            [117, 79],
            [105, 91],
            [7, 89],
            [0, 76],
            [4, 62],
            [16, 54],
            [21, 35],
            [14, 18],
          ],
          dx: -3,
          dy: 3.8,
          w: 27,
          h: 21,
        },
      };
      const d = defs[pose];
      c.save();
      c.translate(x + d.dx, y + d.dy);
      c.scale(d.w / d.box[2], d.h / d.box[3]);
      c.beginPath();
      d.points.forEach(([px, py], i) =>
        i ? c.lineTo(px, py) : c.moveTo(px, py),
      );
      c.closePath();
      c.clip();
      c.drawImage(ref, ...d.box, 0, 0, d.box[2], d.box[3]);
      c.restore();
      return;
    }
    if (p.lying) {
      // 베개의 손님 머리도 실제 캐릭터 에셋을 사용한다.
      if (im) c.drawImage(im, 10, 0, 44, 42, x, y, 15, 14.3);
    } else if (im) {
      // 현장에서 정지한 인물은 대기 프레임. 시술 시에만 미세한 bob을 적용한다.
      c.drawImage(im, 0, 0, 64, 96, x, y, S.w, S.h);
    } else {
      // 플레이스홀더 인형
      const hair = p.info.hair || "#333",
        skin = p.info.skin || "#f0c8a0",
        cloth = p.info.cloth || "#556";
      c.fillStyle = skin;
      c.fillRect(x + 4, y + 3, 8, 8);
      c.fillStyle = hair;
      c.fillRect(x + 3, y + 1, 10, 4);
      c.fillRect(x + 3, y + 5, 2, 4);
      c.fillRect(x + 11, y + 5, 2, 4);
      c.fillStyle = cloth;
      c.fillRect(x + 3, y + 11, 10, 9);
      c.fillStyle = "#2a2a2a";
      c.fillRect(x + 4, y + 20, 3, 4);
      c.fillRect(x + 9, y + 20, 3, 4);
      if (p.info.race === "엘프" || p.info.race === "다크엘프") {
        c.fillStyle = skin;
        c.fillRect(x + 1, y + 5, 3, 2);
        c.fillRect(x + 12, y + 5, 3, 2);
      }
      if (p.info.race === "묘인족" || p.info.race === "수인") {
        c.fillStyle = hair;
        c.fillRect(x + 4, y - 1, 2, 3);
        c.fillRect(x + 10, y - 1, 2, 3);
      }
    }
    if (p.vip) {
      c.fillStyle = "#ffd866";
      c.fillRect(x + 6, y - 5, 4, 4);
    }
    if (p.patience != null) {
      const t = U.clamp(p.patience / 90, 0, 1);
      c.fillStyle = "#15141a";
      c.fillRect(x, y + 31, 16, 2);
      c.fillStyle = t > 0.4 ? "#7fcf8a" : "#e06c6c";
      c.fillRect(x, y + 31, Math.round(16 * t), 2);
    }
  },
};
