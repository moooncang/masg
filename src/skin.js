// ============================================================
// HD UI 아틀라스를 상태별 셀로 잘라 CSS 변수로 등록한다 (9-slice 는 셀 하나가 필요하다).
// ============================================================
window.Skin = {
  ready: null,
  SHEETS: {
    button:         { cells: 4, w: 48, h: 48, name: "button" },
    button_primary: { cells: 4, w: 48, h: 48, name: "primary" },
    slot:           { cells: 4, w: 64, h: 64, name: "slot" },
    tab:            { cells: 2, w: 48, h: 32, name: "tab" },
    toolbar_cell:   { cells: 2, w: 100, h: 100, name: "cell" },
  },
  init() {
    const root = document.documentElement.style;
    const jobs = Object.entries(Skin.SHEETS).map(([key, def]) => new Promise((resolve) => {
      const im = new Image();
      im.onload = () => {
        for (let i = 0; i < def.cells; i++) {
          const c = document.createElement("canvas"); c.width = def.w; c.height = def.h;
          c.getContext("2d").drawImage(im, i * def.w, 0, def.w, def.h, 0, 0, def.w, def.h);
          root.setProperty(`--ui-${def.name}-${i}`, `url("${c.toDataURL()}")`);
        }
        resolve(true);
      };
      im.onerror = () => resolve(false);
      im.src = ASSETS.ui[key];
    }));
    Skin.ready = Promise.all(jobs).then(() => document.documentElement.classList.add("skin-ready"));
    return Skin.ready;
  },
};
