// The approved screen is the coordinate and frame source, not a static playable screenshot.
window.PixelSkin = {
  width: 1672,
  height: 941,
  init() {
    const im = new Image();
    PixelSkin.ready = new Promise((resolve) => {
      im.onload = () => {
        PixelSkin.image = im;
        const frame = (name, x, y, w, h, inset, fill) => {
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          const ctx = c.getContext("2d");
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(im, x, y, w, h, 0, 0, w, h);
          if (fill) {
            ctx.fillStyle = fill;
            ctx.fillRect(inset, inset, w - inset * 2, h - inset * 2);
          }
          document.documentElement.style.setProperty(
            "--skin-" + name,
            `url("${c.toDataURL()}")`,
          );
        };
        frame("hud", 29, 5, 341, 56, 12, "#241d1c");
        frame("control", 1383, 4, 55, 58, 10, "#241d1c");
        frame("control-active", 1439, 4, 57, 58, 12, "#241d1c");
        frame("button", 655, 819, 101, 104, 12, "#211c1b");
        frame("selected", 453, 816, 100, 107, 15, "#211c1b");
        frame("bar", 25, 897, 111, 26, 5, "#271e1a");
        frame("plaque", 711, 291, 49, 35, 8, "#2c241b");
        frame("staff", 27, 750, 174, 58, 10, "#f0d39f");
        resolve(true);
      };
      im.onerror = () => resolve(false);
      im.src = "assets/ui/reference_screen.png";
    });
    const resize = () => {
      const desktop = innerWidth > 760;
      const scale = desktop
        ? Math.min(innerWidth / 1672, innerHeight / 941)
        : 1;
      const app = document.getElementById("app");
      app.style.setProperty("--game-scale", scale);
      if (desktop) {
        app.style.width = "1672px";
        app.style.height = "941px";
      } else {
        app.style.removeProperty("width");
        app.style.removeProperty("height");
      }
    };
    addEventListener("resize", resize);
    resize();
  },
};
