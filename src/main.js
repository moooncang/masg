// ============================================================
// 부트스트랩 + 게임 루프
// ============================================================
(function () {
  const canvas = document.getElementById("game");
  Render.init(canvas);
  UI.init();

  const saved = State.load();
  Sim.s = saved || State.newGame();
  // 저장 당시 선택지가 떠 있던 이벤트는 다시 띄운다
  if (Sim.s.pendingEvent) { delete Sim.s.firedEvents[Sim.s.pendingEvent]; Sim.s.pendingEvent = null; }
  if (!saved) {
    Sim.startDay();
  } else if (!Sim.s.open) {
    Sim.startDay();
  } else {
    Sim.log("이어서 시작.", "ev");
  }
  // 저장본의 로그 복원
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

  // 탭 전환 시 1초마다 패널 갱신
  setInterval(() => { if (document.querySelector("#modal.hidden")) UI.refresh(); }, 1000);
  window.addEventListener("beforeunload", () => State.save(Sim.s));
  window.Game = { Sim, State, Render, UI };
})();
