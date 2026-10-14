// ============================================================
// 부트스트랩 + 화면 배율 + 게임 루프
// 데스크톱: #app 은 목업과 같은 1672×941 이고, 화면에 맞춰 zoom(--k) 으로 통째로 줄인다.
// 모바일: 세로 흐름. 세계는 가로 스크롤, 상단·하단 띠는 작은 배율로 접는다.
// ============================================================
window.Layout = {
  mobile: false, k: 1, km: 1,
  sync(panelMayChange) {
    const panel = !document.querySelector("#panel.hidden");
    if (innerWidth !== Layout.lastW || innerHeight !== Layout.lastH || (panelMayChange && Layout.mobile && panel !== Layout.lastPanel)) Layout.apply();
  },
  apply() {
    const app = document.getElementById("app");
    const vw = innerWidth, vh = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    Layout.lastW = vw; Layout.lastH = vh;
    const mobile = vw < 700 || (vw < vh && vw < 900);
    Layout.mobile = mobile;
    app.classList.toggle("mobile", mobile);
    const root = document.documentElement.style;
    if (mobile) {
      // 창이 열려 있으면 세계를 폭에 맞추고(승인 모바일 시안), 닫혀 있으면 남는 높이만큼 키워 가로로 둘러본다
      const panel = !document.querySelector("#panel.hidden");
      Layout.lastPanel = panel;
      const used = ["#topbar", "#ticker", "#bottom"].reduce((a, q) => a + (document.querySelector(q)?.getBoundingClientRect().height || 0), 0);
      const km = panel ? Math.min(1, vw / 1672) : Math.min(0.6, Math.max(vw / 1672, (vh - used - 16) / 941));
      Layout.k = 1; Layout.km = km;
      root.setProperty("--k", 1); root.setProperty("--km", km);
      Render.resize(km * dpr, km);
    } else {
      const k = Math.min(vw / 1672, vh / 941);
      Layout.k = k; Layout.km = 1;
      root.setProperty("--k", k); root.setProperty("--km", 1);
      Render.resize(k * dpr, 1);
    }
  },
};

(function () {
  const canvas = document.getElementById("game");
  Render.init(canvas);
  Skin.init();
  Layout.apply();
  addEventListener("resize", () => { Layout.apply(); UI.refresh(); });

  Loader.run((mode) => {
    UI.init();
    const saved = mode === "continue" ? State.load() : null;
    Sim.s = saved || State.newGame();
    if (Sim.s.pendingEvent) { delete Sim.s.firedEvents[Sim.s.pendingEvent]; Sim.s.pendingEvent = null; }
    if (!saved || !Sim.s.open) Sim.startDay();
    else Sim.log("이어서 시작.", "ev");
    if (saved) for (const l of Sim.s.log.slice(-40)) UI.addLog(l);
    Layout.apply();
    UI.refresh();

    let acc = 0, last = performance.now();
    const MS_PER_MIN = 1000 / CONFIG.MINUTES_PER_SECOND;
    function loop(now) {
      const dt = Math.min(250, now - last); last = now;
      acc += dt * Sim.s.speed;
      let guard = 0;
      while (acc >= MS_PER_MIN && guard++ < 50) { acc -= MS_PER_MIN; Sim.tick(); }
      Render.draw(Sim.s);
      UI.topbar();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    setInterval(() => { if (document.querySelector("#modal.hidden")) UI.refresh(); }, 1000);
    addEventListener("beforeunload", () => State.save(Sim.s));
    window.Game = { Sim, State, Render, UI, Layout };
    document.dispatchEvent(new Event("game-ready"));
  });
})();
