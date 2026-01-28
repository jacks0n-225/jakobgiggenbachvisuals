window.JG.project.title.t1 = "Editorial - Sedcard";
window.JG.project.title.t2 = "Lucas Hofmann";

window.JGSetHeroTitle(
  window.JG.project.title.t1,
  window.JG.project.title.t2
);

window.JGProject = { destroy(){} };

(() => {
  const JG = window.JG;
  if (!JG) return;

  const { mount, project, svgDataURI } = JG;

  mount.querySelectorAll("img[data-seed]").forEach(img => {
    const seed = img.getAttribute("data-seed") || "x";

    // 1) versuche echtes Bild
    const real = `${project.dir}/images/${seed}.jpg`;

    // 2) fallback placeholder, falls Datei fehlt
    img.src = real;
    img.onerror = () => {
      img.src = svgDataURI({
        w: 1600,
        h: 1000,
        label: `${project.dir.toUpperCase()} — ${seed.toUpperCase()}`,
        sub: "IMAGE MISSING",
        bg: "#2a2a2a"
      });
    };
  });
})();
