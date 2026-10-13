// ============================================================
// 부트스트랩 + 배율 결정 + 게임 루프
// ============================================================
window.Layout = {
  mobile: false, S: 3, F: 2,
  sync() { if (innerWidth !== Layout.lastW || innerHeight !== Layout.lastH) Layout.apply(); },
  apply() {
    const app = document.getElementById("app");
    const vw = innerWidth, vh = innerHeight;
    Layout.lastW = vw; Layout.lastH = vh;
    const mobile = vw < 700 || (vw < vh && vw < 900);
    let S, F;
    if (mobile) { S = Math.max(1, Math.floor(vw / 384)); F = 2; }
    else { S = U.clamp(Math.floor(Math.min(vw / 384, vh / 216)), 1, 6); F = S <= 1 ? 1 : S <= 4 ? 2 : 3; }
    Layout.mobile = mobile; Layout.S = S; Layout.F = F;
    app.classList.toggle("mobile", mobile);
    const root = document.documentElement.style;
    root.setProperty("--s", S); root.setProperty("--f", F); root.setProperty("--tf", F);
    Render.resize(S, Math.max(1, Math.round(devicePixelRatio || 1)));
  },
};

(function () {
  const canvas = document.getElementById("game");
  Render.init(canvas);
  Skin.init();
  Layout.apply();
  addEventListener("resize", () => { Layout.apply(); UI.refresh(); });
  UI.init();

  const saved = State.load();
  Sim.s = saved || State.newGame();
  if (Sim.s.pendingEvent) { delete Sim.s.firedEvents[Sim.s.pendingEvent]; Sim.s.pendingEvent = null; }
  if (!saved) Sim.startDay();
  else if (!Sim.s.open) Sim.startDay();
  else Sim.log("이어서 시작.", "ev");
  if (saved) for (const l of Sim.s.log.slice(-40)) UI.addLog(l);
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
})();
