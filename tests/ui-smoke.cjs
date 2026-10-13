// Run against a locally served repository: BASE_URL=http://127.0.0.1:8123 node tests/ui-smoke.cjs
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.BASE_URL || "http://127.0.0.1:8123";
const out = process.env.UI_SCREENSHOTS || "/tmp/masg-ui-qa";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.setDefaultTimeout(7000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(base);
    assert(
      (await page.evaluate(() => Render.ready)).every(Boolean),
      "All renderer assets load",
    );
    assert(await page.evaluate(() => PixelSkin.ready), 'Approved frame atlas loads');
    for (
      let i = 0;
      i < 10 && (await page.locator("#modal:not(.hidden)").count());
      i++
    )
      await page
        .locator("#modal-actions button:not(:disabled)")
        .first()
        .click();
    await page.evaluate(() => UI.setSpeed(0));
    const reset = async () =>
      page.evaluate(() => {
        Sim.s = State.newGame();
        Sim.s.speed = 0;
        UI.dungeonSel = { depth: 1, members: [] };
        UI.dungeonMode = "explore";
        UI.staffMode = "team";
        UI.staffId = "A";
        UI.refresh();
      });
    const click = (a, v = "") =>
      page
        .locator(`#panel-content [data-action="${a}"][data-value="${v}"]`)
        .click();
    await reset();
    assert.equal(await page.locator(".scene-hit.locked").count(), 6);
    assert.deepEqual(
      await page.evaluate(() => [
        Render.ctx.canvas.width,
        Render.ctx.canvas.height,
        Render.img.spr_A.width,
        Render.img.face_A.width,
      ]),
      [1536, 864, 256, 128],
    );
    for (const key of [
      "shop",
      "staff",
      "upgrade",
      "oil",
      "dungeon",
      "people",
      "achv",
      "system",
    ]) {
      await page.locator(`#tabs [data-value="${key}"]`).click();
      assert.equal(await page.evaluate(() => UI.view), key);
      assert((await page.locator("#panel-content").innerText()).length > 50);
    }
    // Input, focus, selection and scroll survive the live refresh.
    await page.locator("#shopname").fill("달빛 <테스트> & 쉼터");
    await page.waitForTimeout(1200);
    assert.equal(
      await page.locator("#shopname").inputValue(),
      "달빛 <테스트> & 쉼터",
    );
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "shopname",
    );
    await click("save");
    assert.equal(
      await page.evaluate(() => State.load().shopName),
      "달빛 <테스트> & 쉼터",
    );
    await page.evaluate(() => {
      window.originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = () => {
        throw Error("quota");
      };
    });
    await click("save");
    assert(
      (await page.locator(".toast-stack").innerText()).includes(
        "저장하지 못했습니다",
      ),
    );
    await page.evaluate(() => {
      Storage.prototype.setItem = window.originalSet;
    });
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => UI.view), null);
    // Staff jobs and towel target must never silently fall back to the owner.
    await page.locator('#tabs [data-value="staff"]').click();
    await click("post", "brew");
    assert.equal(await page.evaluate(() => Sim.staffOf("A").post), "brew");
    await page.evaluate(() => {
      Sim.s.items.towel = 1;
      Sim.staffOf("A").fatigue = 67;
      Sim.staffOf("player").fatigue = 80;
      UI.refresh();
    });
    await click("towel", "A");
    await page.locator("#modal-actions button").first().click();
    assert.deepEqual(
      await page.evaluate(() => [
        Sim.staffOf("A").fatigue,
        Sim.staffOf("player").fatigue,
        Sim.s.items.towel,
      ]),
      [27, 80, 0],
    );
    await page.evaluate(() => {
      Sim.s.items.towel = 1;
      Sim.staffOf("B").fatigue = 50;
      UI.towelModal("B");
      Sim.s.staff = Sim.s.staff.filter((x) => x.id !== "B");
    });
    await page.locator("#modal-actions button").first().click();
    assert.equal(await page.evaluate(() => Sim.s.items.towel), 1);
    await reset();
    await page.evaluate(() => {
      Sim.s.money = 100000;
      UI.open("staff");
    });
    await click("staff-mode", "hire");
    const hireId = await page.evaluate(() => UI.staffId);
    await click("hire", hireId);
    assert(await page.evaluate((id) => !!Sim.staffOf(id), hireId));
    await page.evaluate(() => {
      Sim.s.maxStaff = Sim.s.staff.length;
      UI.refresh();
    });
    assert(await page.locator('[data-action="hire"]').isDisabled());
    // Upgrade conditions, expense and corresponding floor capacity are real.
    await reset();
    await page.evaluate(() => {
      Sim.s.money = 300000;
      Sim.s.rep = 1000;
      UI.open("upgrade");
    });
    assert.equal(await page.locator('[data-action="buy-upgrade"]').count(), 20);
    for (const id of ["room3", "room4", "room5", "room6", "room7", "room8"])
      await click("buy-upgrade", id);
    assert.equal(await page.locator(".scene-hit.locked").count(), 0);
    assert.equal(await page.evaluate(() => Sim.s.rooms.length), 8);
    // All recipes stay available; result quantities and equipment installation are accurate.
    await reset();
    await page.evaluate(() => {
      UI.dungeonMode = "craft";
      UI.open("dungeon");
    });
    assert.equal(await page.locator('[data-action="recipe"]').count(), 10);
    await click("recipe", "r_moon");
    assert(
      (await page.locator("#panel-content").innerText()).includes(
        "조향 증류기가 필요",
      ),
    );
    assert(
      (await page.locator("#panel-content").innerText()).includes(
        "월하향 해금이 필요",
      ),
    );
    assert(await page.locator('[data-action="craft"]').isDisabled());
    await page.evaluate(() => {
      for (const k in Sim.s.materials) Sim.s.materials[k] = 100;
      UI.refresh();
    });
    await click("recipe", "r_towel");
    await click("craft", "r_towel");
    assert.deepEqual(
      await page.evaluate(() => [Sim.s.items.towel, Sim.s.materials.spring]),
      [2, 98],
    );
    await click("recipe", "r_sheet");
    await click("craft", "r_sheet");
    assert(await page.locator('[data-action="craft"]').isDisabled());
    assert.equal(await page.evaluate(() => Sim.s.equips.sheet), true);
    await page.locator('[data-action="recipe"][data-value="r_tonic"]').focus();
    await page.evaluate(() => {
      UI.$("#panel-content").scrollTop = 180;
      window.savedScroll = UI.$("#panel-content").scrollTop;
    });
    await page.waitForTimeout(1200);
    assert.equal(
      await page.evaluate(() => document.activeElement.dataset.value),
      "r_tonic",
    );
    assert.equal(
      await page.evaluate(() => UI.$("#panel-content").scrollTop),
      await page.evaluate(() => window.savedScroll),
    );
    await click("dungeon-mode", "bag");
    assert.equal(await page.locator('[data-action="sell"]').count(), 7);
    // Fatigue boundary, party limit, locked depth, late return, stale selections and actual departure.
    await reset();
    await page.evaluate(() => {
      Sim.staffOf("A").fatigue = 69;
      Sim.staffOf("B").fatigue = 70;
      UI.open("dungeon");
    });
    assert(
      !(await page
        .locator('[data-action="member"][data-value="A"]')
        .isDisabled()),
    );
    assert(
      await page.locator('[data-action="member"][data-value="B"]').isDisabled(),
    );
    await click("member", "A");
    await page.evaluate(() => {
      Sim.staffOf("A").fatigue = 70;
      UI.refresh();
    });
    assert(await page.locator('[data-action="depart"]').isDisabled());
    await page.evaluate(() => {
      Sim.staffOf("A").fatigue = 0;
      Sim.s.time = CONFIG.DAY_END_MIN - 100;
      UI.refresh();
    });
    assert(await page.locator('[data-action="depart"]').isDisabled());
    await page.evaluate(() => {
      Sim.s.time = 540;
      UI.refresh();
    });
    await click("depth", "2");
    assert(await page.locator('[data-action="depart"]').isDisabled());
    await click("depth", "1");
    await click("depart");
    assert.deepEqual(
      await page.evaluate(() => [
        Sim.s.expedition.depth,
        Sim.staffOf("A").busy,
      ]),
      [1, "dungeon"],
    );
    await page.evaluate(() => {
      Sim.finishExpedition();
      UI.refresh();
    });
    assert.equal(await page.evaluate(() => Sim.s.counters.dungeonRuns), 1);
    await reset();
    await page.evaluate(() => {
      for (let n = 0; n < 3; n++) {
        const st = structuredClone(Sim.staffOf("A"));
        st.id = "test" + n;
        st.name = "추가 직원 " + n;
        Sim.s.staff.push(st);
      }
      UI.open("dungeon");
    });
    for (const id of ["A", "B", "test0"]) await click("member", id);
    assert(
      await page
        .locator('[data-action="member"][data-value="test1"]')
        .isDisabled(),
    );
    assert.equal(await page.evaluate(() => UI.dungeonSel.members.length), 3);
    // Hidden achievements reveal neither name, text nor reward before discovery.
    await reset();
    const hidden = await page.evaluate(() => {
      const a = ACHIEVEMENTS.find((x) => x.hidden);
      UI.achCat = a.cat;
      UI.achId = a.id;
      UI.open("achv");
      return a;
    });
    const achText = await page.locator("#panel-content").innerText();
    assert(!achText.includes(hidden.name));
    assert(!achText.includes(hidden.text));
    assert.equal(await page.evaluate(() => ACHIEVEMENTS.length), 76);
    await page.evaluate(() => {
      Sim.s.vipUnlocked = { C: true, D: true, E: true };
      UI.personId = "C";
      UI.open("people");
    });
    assert(
      (await page.locator("#panel-content").innerText()).includes(
        "기사단 지정 시술소",
      ),
    );
    await page.evaluate(() => {
      Sim.s.firedEvents.C_recruit = true;
      UI.refresh();
    });
    assert(
      (await page.locator("#panel-content").innerText()).includes(
        "이미 진행되었습니다",
      ),
    );
    // Modal queue and replacements restore the original speed, including paused zero.
    for (const speed of [0, 1, 2, 4]) {
      assert.equal(
        await page.evaluate((speed) => {
          UI.setSpeed(speed);
          UI.modal("첫 창", "내용", [{ label: "확인" }]);
          UI.modal("다음 창", "내용", [{ label: "확인" }]);
          UI.$("#modal-actions button").click();
          if (Sim.s.speed !== 0) throw Error("queue resumed too early");
          UI.modal("교체 창", "내용", [{ label: "확인" }], null, {
            replace: true,
          });
          UI.$("#modal-actions button").click();
          return Sim.s.speed;
        }, speed),
        speed,
      );
    }
    await page.evaluate(() => {
      UI.setSpeed(0);
      UI.modal("포커스", "확인", [{ label: "취소" }, { label: "완료" }]);
    });
    assert(await page.evaluate(() => UI.$("#app").inert));
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await page.evaluate(() => document.activeElement.textContent),
      "완료",
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await page.evaluate(() => document.activeElement.textContent),
      "취소",
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => Sim.s.speed), 0);
    assert(!(await page.evaluate(() => UI.$("#app").inert)));
    // Render active customers, recruited staff and night background without exceptions.
    await reset();
    await page.evaluate(() => {
      Sim.s.customers = [
        {
          id: "render1",
          state: "treating",
          roomId: 0,
          spriteKey: "human_m",
          name: "손님",
        },
        {
          id: "render2",
          state: "waiting",
          spriteKey: "elf_f",
          name: "대기 손님",
          patience: 60,
        },
      ];
      Sim.s.rooms[0].customerId = "render1";
      Sim.s.rooms[0].menuId = MENU[0].id;
      Sim.s.rooms[0].endsAt = Sim.s.time + 10;
      Sim.staffOf("B").busy = 0;
      Sim.recruit("C");
      Render.draw(Sim.s);
      Sim.s.time = 1300;
      Render.draw(Sim.s);
      UI.refresh();
    });
    // Responsive layouts: document never spills horizontally; every menu and subview renders.
    for (const width of [360, 390, 768, 1360]) {
      await page.setViewportSize({ width, height: width < 760 ? 844 : 900 });
      for (const k of [
        "shop",
        "staff",
        "upgrade",
        "oil",
        "dungeon",
        "people",
        "achv",
        "system",
      ]) {
        await page.evaluate((k) => UI.open(k), k);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${width}px ${k} overflow`,
        );
        assert(
          await page.evaluate(
            () =>
              UI.$("#panel-content").scrollWidth <=
              UI.$("#panel-content").clientWidth + 1,
          ),
          `${width}px ${k} panel overflow`,
        );
      }
      for (const mode of ["explore", "craft", "bag"]) {
        await page.evaluate((mode) => {
          UI.dungeonMode = mode;
          UI.open("dungeon");
        }, mode);
        assert(
          await page.evaluate(
            () =>
              UI.$("#panel-content").scrollWidth <=
              UI.$("#panel-content").clientWidth + 1,
          ),
          `${width}px ${mode} overflow`,
        );
      }
      const targets = await page
        .locator("#tabs button")
        .evaluateAll((bs) => bs.map((b) => [b.offsetWidth, b.offsetHeight]));
      assert(targets.every(([w, h]) => w >= 44 && h >= 44));
    }
    await page.setViewportSize({width:1672,height:941});
    await page.waitForTimeout(80);
    const referenceRects=await page.evaluate(()=>{
      const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)];};
      return {scene:rect('#scene'),menu:rect('#tabs'),staff:rect('#quick-staff'),money:rect('#tb-money')};
    });
    assert.deepEqual(referenceRects.scene,[0,0,1672,941]);
    assert.deepEqual(referenceRects.money,[29,5,341,56]);
    assert.deepEqual(referenceRects.menu.slice(0,2),[453,817]);
    assert.deepEqual(referenceRects.staff.slice(0,2),[23,815]);
    // Capture honest in-game screenshots with a fresh isolated save, not a staged HTML mockup.
    await reset();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      UI.close();
      UI.$(".toast-stack").replaceChildren();
    });
    await page.mouse.move(0, 0);
    await page.screenshot({ path: path.join(out, "game.png") });
    for (const k of ["staff", "upgrade", "dungeon", "achv"]) {
      await page.evaluate((k) => UI.open(k), k);
      await page.screenshot({ path: path.join(out, k + ".png") });
    }
    await page.evaluate(() => {
      UI.dungeonMode = "craft";
      UI.recipeId = "r_towel";
      UI.open("dungeon");
    });
    await page.screenshot({ path: path.join(out, "crafting.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => UI.open("staff"));
    await page.screenshot({ path: path.join(out, "mobile.png") });
    // Existing schema round trip and reload continue the same game.
    await page.evaluate(() => {
      Sim.s.shopName = "저장 복원 검증";
      Sim.s.money = 12345;
      State.save(Sim.s);
    });
    await page.reload();
    await page.evaluate(() => Render.ready);
    assert.equal(await page.evaluate(() => Sim.s.shopName), "저장 복원 검증");
    assert.equal(await page.evaluate(() => Sim.s.money), 12345);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 8 menus, 4 viewport widths, HD assets, staffing, hiring, upgrades, crafting, expedition constraints, hidden content, modal queue/focus, live refresh, save/failure/reload.",
    );
    console.log("Screenshots: " + out);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
