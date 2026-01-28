/* pages.js — make body column width match the rendered pageTitle width (pixel perfect) */

(function () {
  function px(n) { return `${Math.round(n)}px`; }

  function measureAndApply() {
    const layout = document.querySelector(".pageLayout");
    const title  = document.querySelector(".pageTitle");
    const body   = document.querySelector(".pageBody");
    if (!layout || !title || !body) return;

    // Measure actual rendered title width
    // Use getBoundingClientRect for accurate pixel width
    const w = title.getBoundingClientRect().width;

    // Apply as CSS variable (used by CSS), plus inline width as fallback
    layout.style.setProperty("--titleW", px(w));
    body.style.width = px(w);

    // Ensure rule follows 100% of body width (if present)
    const rules = layout.querySelectorAll(".pageRule");
    rules.forEach(r => (r.style.width = "100%"));

    // Optional: if imprint grid exists, keep it inside the measured column
    const imprintGrid = layout.querySelector(".imprintGrid");
    if (imprintGrid) {
      imprintGrid.style.width = px(w);
    }
  }

  // Run after fonts load (important because Big Shoulders changes widths)
  async function init() {
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    } catch {}

    // First paint + next frame to stabilize layout
    measureAndApply();
    requestAnimationFrame(measureAndApply);
  }

  // Recompute on resize (debounced)
  let t = null;
  function onResize() {
    clearTimeout(t);
    t = setTimeout(measureAndApply, 80);
  }

  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);
  window.addEventListener("load", init);

  // Also run immediately (in case script is loaded at end of body)
  init();
})();
