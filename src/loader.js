// ============================================================
// 로딩·타이틀 화면. 모든 HD 에셋을 미리 받고 "새 게임 / 이어하기" 를 보여 준다.
// ============================================================
window.Loader = {
  LINES: ["향유를 데우는 중…", "장부를 펴는 중…", "등불을 켜는 중…", "베드 시트를 가는 중…", "칸막이를 두드려 보는 중…", "네르를 깨우는 중…", "레이나가 잔소리를 준비하는 중…"],
  img: {},
  load(key, src) {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => { Loader.img[key] = im; resolve(true); };
      im.onerror = () => { Loader.img[key] = null; resolve(false); };
      im.src = src;
    });
  },
  list() {
    const L = [];
    for (const c of ASSETS.sheetCodes) L.push(["sheet_" + c, ASSETS.sheetPath(c)]);
    for (const c of ASSETS.lieCodes) L.push(["lie_" + c, ASSETS.liePath(c)]);
    for (const c of ASSETS.hairCodes) L.push(["hair_" + c, ASSETS.hairPath(c)]);
    L.push(["shadow", ASSETS.shadow]);
    for (const k in ASSETS.bg) L.push(["bg_" + k, ASSETS.bg[k]]);
    for (const k in ASSETS.props) L.push(["prop_" + k, ASSETS.props[k]]);
    for (const k in ASSETS.ui) L.push(["ui_" + k, ASSETS.ui[k]]);
    return L;
  },
  async run(onDone) {
    const el = document.getElementById("loading");
    const bar = el.querySelector(".ld-fill"), txt = el.querySelector(".ld-text"), lantern = el.querySelector(".ld-lantern");
    const btns = el.querySelector(".ld-buttons");
    const hour = new Date().getHours();
    el.style.backgroundImage = `url("${hour >= 7 && hour < 18 ? ASSETS.loading.bg_day : ASSETS.loading.bg}")`;
    let frame = 0;
    const tick = setInterval(() => { frame = (frame + 1) % 8; lantern.style.backgroundPosition = `${-frame * 32}px 0`; }, 110);
    const lineTimer = setInterval(() => { txt.textContent = U.pick(Loader.LINES); }, 900);
    txt.textContent = Loader.LINES[0];
    const list = Loader.list();
    let done = 0;
    await Promise.all([document.fonts ? document.fonts.load("22px Galmuri11").catch(() => {}) : Promise.resolve(), ...list.map(([k, src]) => Loader.load(k, src).then(() => { done++; bar.style.width = Math.round(done / list.length * 100) + "%"; }))]);
    clearInterval(lineTimer);
    txt.textContent = "준비가 끝났다.";
    const hasSave = !!State.load();
    btns.innerHTML = `<button class="ld-btn" data-start="new">새 게임</button>${hasSave ? '<button class="ld-btn primary" data-start="continue">이어하기</button>' : ""}`;
    btns.classList.remove("hidden");
    (btns.querySelector(".primary") || btns.querySelector("button")).focus();
    btns.onclick = (e) => {
      const b = e.target.closest("[data-start]"); if (!b) return;
      clearInterval(tick);
      el.classList.add("fade");
      setTimeout(() => el.remove(), 450);
      onDone(b.dataset.start);
    };
  },
};
