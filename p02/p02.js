// p02.js
window.JG.project.title.t1 = "Portrait Photography";
window.JG.project.title.t2 = "Art District Augsburg — Team";

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
    const real = `${project.dir}/images/${seed}.jpg`;

    img.src = real;
    img.onerror = () => {
      img.src = svgDataURI({
        w: 1200,
        h: 1800,
        label: `${project.dir.toUpperCase()} — ${seed.toUpperCase()}`,
        sub: "IMAGE MISSING",
        bg: "#2a2a2a"
      });
    };
  });
})();
