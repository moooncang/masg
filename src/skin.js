// ============================================================
// 네이티브 UI 아틀라스를 상태별 셀로 잘라 CSS 변수(data URL)로 등록한다.
// 9-slice 테두리는 한 셀씩 필요하므로 여기서 분리한다. 원본 픽셀 그대로, 확대는 CSS가 한다.
// ============================================================
window.Skin = {
  ready: null,
  SHEETS: {
    button:         { cells: 4, w: 24, h: 24, name: "button" },
    button_primary: { cells: 4, w: 24, h: 24, name: "primary" },
    slot:           { cells: 4, w: 24, h: 24, name: "slot" },
    tab:            { cells: 2, w: 24, h: 16, name: "tab" },
    toolbar_cell:   { cells: 2, w: 32, h: 32, name: "cell" },
    bar:            { cells: 3, w: 16, h: 8,  name: "bar" },
  },
  init() {
    const root = document.documentElement.style;
    const jobs = Object.entries(Skin.SHEETS).map(([key, def]) => new Promise((resolve) => {
      const im = new Image();
      im.onload = () => {
        for (let i = 0; i < def.cells; i++) {
          const c = document.createElement("canvas"); c.width = def.w; c.height = def.h;
          const ctx = c.getContext("2d"); ctx.imageSmoothingEnabled = false;
          ctx.drawImage(im, i * def.w, 0, def.w, def.h, 0, 0, def.w, def.h);
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
