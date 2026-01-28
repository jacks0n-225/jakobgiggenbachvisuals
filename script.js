/* -----------------------------
   JGVISUALS – Main Controller (20 Projekte, lokal, ohne externe Bildquellen)
   - Placeholder via inline SVG Data-URI (immer sichtbar)
   - HTML ist Gatekeeper:
     wenn p0x.html fehlt => NUR fallback hero, mount bleibt leer, kein CSS/JS
   - Ticks wie Scrollbar (Idle-Filmstrip -> aktiver Tick folgt Scroll-Progress)
   - FIX: Beim Klick auf Filmstrip wird Tick-UI sofort auf Interactive-Variante gerendert



let TICK_COUNT = 20;

const PROJECT_IDS = [
  "01","02","03","04","05","06","07","08","09","10",
  "11","12","13","14","15","16","17","18","19","20"
];

const FALLBACK_HERO_FILE = "assets/fallback-hero.png";
const DEFAULT_BG = "#212121";

const BG_COLORS = [
  "#212121","#1e2a2f","#bbbbbb", "#e26c86", "#b498fc", "#7e8d40", "#a99185", "#e3012c", "#46b1d3", "#93807a",
  "#ab8572", "#71685f","#00519d", "#d4b195", "#be8375", "#e6e2e3", "#b498fc", "#88855a",
];

const body = document.body;

const progressEl = document.getElementById("progress");
const scroller   = document.getElementById("filmScroller");
const scrollHint = document.getElementById("scrollHint");
const homeBtn    = document.getElementById("homeBtn");

/* Filter UI elements (IDs from header block) */
const filterToggle = document.getElementById("filterToggle");
const filterMenu   = document.getElementById("filterMenu");
const optPhoto     = document.getElementById("optPhoto");
const optVideo     = document.getElementById("optVideo");
const filterClose  = document.getElementById("filterClose");

/* Loader elements (Overlay in index.html) */
const loaderOverlay = document.getElementById("loaderOverlay");
const loaderPercent = document.getElementById("loaderPercent");

let mode = "idle";

/* activeIndex ist immer VISIBLE index (gefilterte Reihenfolge) */
let activeIndex = 0;

/* Filter state + visible mapping */
let filterState = "all"; // "all" | "photo" | "video"
let visibleIndices = []; // array of GLOBAL project indices in visible order

// avoid spammy DOM updates
let lastTickIndex = -1;
let lastTickMode = null;

const ticks = [];
const tickX = [];
const frames = [];
const imgs   = [];

/* ---------- Registry ---------- */
const PROJECTS = PROJECT_IDS.map((id, i) => ({
  id,
  dir: `p${id}`,
  html: `p${id}/p${id}.html`,
  css:  `p${id}/p${id}.css`,
  js:   `p${id}/p${id}.js`,
  hero: `p${id}/images/hero.png`,
  title: { t1: "Projekttitel", t2: `Projekt ${id}` },
  bg: BG_COLORS[i] || DEFAULT_BG,

  // tags (abwechselnd)
  tags: (i % 2 === 0) ? ["photo"] : ["video"]
}));

function isMobileLike(){
  // 1) echte Touch Phones / kleine Viewports
  const small = Math.min(window.innerWidth, window.innerHeight) <= 900;

  // 2) touch device heuristic
  const touch =
    ("ontouchstart" in window) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

  // 3) UA fallback (für alte iPhones/Android Browser)
  const ua = navigator.userAgent || "";
  const uaMobile = /Android|iPhone|iPod|Windows Phone|IEMobile|Opera Mini/i.test(ua);

  // Entscheidend: small + (touch oder UA)
  return small && (touch || uaMobile);
}

function openMobileGateAndStop(){
  const gate = document.getElementById("mobileGate");
  if (gate){
    gate.classList.add("isOpen");
    gate.setAttribute("aria-hidden", "false");
  }

  // Loader ausblenden falls vorhanden (damit nur die Gate-Seite sichtbar ist)
  const loader = document.getElementById("loaderOverlay");
  if (loader){
    loader.remove();
  }

  // Scroll/Body Freeze (sicher)
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

function measureMobileGateTitle(){
  const gate = document.getElementById("mobileGate");
  if (!gate) return;

  const layout = gate.querySelector(".pageLayout");
  const title  = gate.querySelector(".pageTitle");
  const body   = gate.querySelector(".pageBody");
  if (!layout || !title || !body) return;

  const w = title.getBoundingClientRect().width;
  const px = `${Math.round(w)}px`;

  layout.style.setProperty("--titleW", px);
  body.style.width = px;

  const rules = gate.querySelectorAll(".pageRule");
  rules.forEach(r => (r.style.width = "100%"));
}

// run on load + resize (like pages.js)
function bindMobileGateMeasure(){
  const run = () => {
    measureMobileGateTitle();
    requestAnimationFrame(measureMobileGateTitle);
  };

  // after fonts (Big Shoulders)
  (async () => {
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch {}
    run();
  })();

  let t = null;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(run, 80);
  });
}



/* ---------- SVG Placeholder ---------- */
function svgDataURI({ w=1600, h=900, label="PLACEHOLDER", sub="", bg="#2a2a2a", fg="#ffffff" }){
  const safe = (s) => String(s).replace(/[<>&]/g,"");
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${bg}"/>
        <stop offset="1" stop-color="#111"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g opacity="0.35">
      <path d="M0 ${h*0.7} L${w} ${h*0.3}" stroke="${fg}" stroke-width="4" fill="none"/>
      <path d="M0 ${h*0.3} L${w} ${h*0.7}" stroke="${fg}" stroke-width="4" fill="none"/>
    </g>
    <text x="${w*0.06}" y="${h*0.18}" fill="${fg}" font-family="Arial, sans-serif" font-size="${Math.round(h*0.09)}" opacity="0.92">
      ${safe(label)}
    </text>
    <text x="${w*0.06}" y="${h*0.26}" fill="${fg}" font-family="Arial, sans-serif" font-size="${Math.round(h*0.045)}" opacity="0.75">
      ${safe(sub)}
    </text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
}

function setImgWithFallback(imgEl, primarySrc, placeholderURI){
  imgEl.onerror = null;
  imgEl.src = primarySrc;
  imgEl.onerror = () => { imgEl.src = placeholderURI; };
}

/* ---------- helpers ---------- */
const clamp = (v,a,b) => Math.min(b, Math.max(a,v));

function normalizeDelta(e){
  let d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  if (e.deltaMode === 1) d *= 16;
  if (e.deltaMode === 2) d *= 800;
  return d;
}

function visibleCount(){
  return visibleIndices.length;
}

function vToG(vIdx){
  return visibleIndices[vIdx];
}

function getProjectByVisibleIndex(vIdx){
  const g = vToG(vIdx);
  return PROJECTS[g];
}

function updateSidePadding(){
  if (!frames.length) return;
  const itemW = frames[0].offsetWidth || 80;
  const sidePad = Math.max(0, scroller.clientWidth / 2 - itemW / 2);
  scroller.style.paddingLeft = `${sidePad}px`;
  scroller.style.paddingRight = `${sidePad}px`;
}

function updateStageMetrics(){
  const main = document.querySelector(".main");
  if (!main) return;

  const mainRect = main.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();

  const cs = getComputedStyle(scroller);
  const padTop = parseFloat(cs.paddingTop) || 0;
  const padBot = parseFloat(cs.paddingBottom) || 0;

  const filmH = scrollerRect.height - padTop - padBot;
  const stageTop = mainRect.top + (mainRect.height - scrollerRect.height) / 2 + padTop;

  document.documentElement.style.setProperty("--stageTop", `${Math.round(stageTop)}px`);
  document.documentElement.style.setProperty("--stageH", `${Math.round(filmH)}px`);
}

function centerIndexInstant(idx){
  if (!frames[idx]) return;
  const el = frames[idx];
  const center = el.offsetLeft + el.offsetWidth/2;
  const desired = center - scroller.clientWidth/2;
  scroller.scrollLeft = clamp(desired, 0, scroller.scrollWidth - scroller.clientWidth);
}

/* ---------- LOADER OVERLAY (Filmstrip hero preloads) ---------- */
function setLoaderPercent(pct){
  if (!loaderPercent) return;
  loaderPercent.textContent = `${clamp(Math.round(pct), 0, 100)}%`;
}

function finishLoader(){
  if (!loaderOverlay) return;
  loaderOverlay.classList.add("isDone");
  loaderOverlay.setAttribute("aria-hidden", "true");
  setTimeout(() => {
    try { loaderOverlay.remove(); } catch {}
  }, 320);
}

function preloadFilmstripHeroesWithProgress(){
  if (!loaderOverlay) return;

  const sources = visibleIndices
    .map((g) => PROJECTS[g]?.hero)
    .filter(Boolean);

  const total = sources.length;
  if (total <= 0){
    setLoaderPercent(100);
    finishLoader();
    return;
  }

  let done = 0;
  setLoaderPercent(0);

  const bump = () => {
    done++;
    const pct = (done / total) * 100;
    setLoaderPercent(pct);
    if (done >= total){
      setTimeout(() => {
        setLoaderPercent(100);
        finishLoader();
      }, 120);
    }
  };

  // parallel preload (nur heroes)
  for (const src of sources){
    const img = new Image();
    img.decoding = "async";
    img.onload = bump;
    img.onerror = bump;
    img.src = src;
  }
}

/* ---------- Filmstrip Hero loading (batch after first paint) ---------- */
let filmHeroToken = 0;
let filmHeroRaf = null;

function cancelFilmHeroBatch(){
  filmHeroToken++;
  if (filmHeroRaf) cancelAnimationFrame(filmHeroRaf);
  filmHeroRaf = null;
}

function setFilmHeroNow(vIdx){
  const img = imgs[vIdx];
  if (!img) return;
  if (img.dataset.loaded === "1") return;

  const src = img.dataset.src;
  const ph  = img.dataset.ph;
  if (!src) return;

  img.decoding = "async";
  setImgWithFallback(img, src, ph);
  img.dataset.loaded = "1";
}

function scheduleFilmHeroesLoadAll(priorityIndex = 0){
  cancelFilmHeroBatch();
  const token = filmHeroToken;

  const n = visibleCount();
  if (n <= 0) return;

  const radius = 3;
  const order = [];
  const used = new Set();

  const add = (i) => {
    if (i < 0 || i >= n) return;
    if (used.has(i)) return;
    used.add(i);
    order.push(i);
  };

  add(priorityIndex);
  for (let k=1;k<=radius;k++){
    add(priorityIndex - k);
    add(priorityIndex + k);
  }
  for (let i=0;i<n;i++) add(i);

  let ptr = 0;

  const step = () => {
    if (token !== filmHeroToken) return;

    const BATCH = 4;
    let c = 0;

    while (ptr < order.length && c < BATCH){
      setFilmHeroNow(order[ptr]);
      ptr++;
      c++;
    }

    if (ptr < order.length){
      filmHeroRaf = requestAnimationFrame(step);
    } else {
      filmHeroRaf = null;
    }
  };

  filmHeroRaf = requestAnimationFrame(step);
}

/* ---------- Active Index ---------- */
function setActiveIndex(i){
  const n = visibleCount();
  activeIndex = clamp(i, 0, Math.max(0, n - 1));
  setTicks(true);

  if (mode === "idle"){
    setFilmHeroNow(activeIndex);
    scheduleFilmHeroesLoadAll(activeIndex);
  }

  if (mode === "interactive" && n > 0){
    body.style.backgroundColor = getProjectByVisibleIndex(activeIndex).bg || DEFAULT_BG;
  }
}

/* ---------- FAST tick sync ---------- */
function getIndexFromScrollProgress(){
  const n = visibleCount();
  if (n <= 1) return 0;

  const max = scroller.scrollWidth - scroller.clientWidth;
  if (max <= 1) return 0;

  const t = clamp(scroller.scrollLeft / max, 0, 1);
  return clamp(Math.round(t * (n - 1)), 0, n - 1);
}

function syncActiveIndexFromFilmstripImmediate(){
  if (mode !== "idle") return;

  const idx = getIndexFromScrollProgress();
  if (idx !== activeIndex){
    activeIndex = idx;
    setTicks(false);
    setFilmHeroNow(activeIndex);
  }
}

/* ---------- Ticks ---------- */
function buildTicks(){
  TICK_COUNT = visibleCount();

  for (let i=0;i<TICK_COUNT;i++){
    const t = document.createElement("div");
    t.className = "tick";

    const x = document.createElement("span");
    x.className = "tickX";
    x.textContent = "×";

    x.addEventListener("click", (e) => {
      e.stopPropagation();
      if (mode !== "interactive") return;
      if (i !== activeIndex) return;
      exitInteractive();
    });

    t.appendChild(x);
    progressEl.appendChild(t);
    ticks.push(t);
    tickX.push(x);
  }
}

function renderTickAt(i, activeTick){
  const t = ticks[i];
  const x = tickX[i];
  if (!t || !x) return;

  if (mode === "idle"){
    t.style.width = "1.5px";
    t.style.borderWidth = "0px";
    t.style.borderColor = "rgba(255,255,255,0)";
    t.style.background = (i === activeTick) ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.25)";
    x.style.opacity = "0";
    return;
  }

  t.style.width = "1.5px";
  t.style.borderWidth = "0px";
  t.style.borderColor = "rgba(255,255,255,0)";
  t.style.background = "rgba(255,255,255,.25)";
  x.style.opacity = "0";

  if (i === activeTick){
    t.style.width = "34px";
    t.style.borderWidth = "1.5px";
    t.style.borderColor = "rgba(255,255,255,.95)";
    t.style.background = "rgba(255,255,255,0)";
    x.style.opacity = "1";
  }
}

function setTicks(force = false){
  const n = ticks.length;
  const activeTick = clamp(activeIndex, 0, Math.max(0, n - 1));

  if (!force && activeTick === lastTickIndex && mode === lastTickMode) return;

  const modeChanged = (mode !== lastTickMode);
  const prev = lastTickIndex;

  if (modeChanged){
    for (let i = 0; i < n; i++){
      renderTickAt(i, activeTick);
    }
  } else {
    if (prev >= 0 && prev < n) renderTickAt(prev, activeTick);
    renderTickAt(activeTick, activeTick);
  }

  lastTickIndex = activeTick;
  lastTickMode = mode;
}

/* ---------- Filmstrip ---------- */
function buildFilmstrip(){
  for (let v=0; v<visibleCount(); v++){
    const g = vToG(v);
    const p = PROJECTS[g];

    const item = document.createElement("div");
    item.className = "frameItem";
    item.dataset.index = String(v);
    item.dataset.global = String(g);
    item.dataset.pid = p.id;

    const img = document.createElement("img");
    img.alt = `Projekt ${p.id}`;

    // Placeholder sofort
    const ph = svgDataURI({ w: 900, h: 1400, label: `P${p.id}`, sub: "FILMSTRIP", bg:"#242424" });
    img.src = ph;

    // echtes hero per batch
    img.dataset.src = p.hero;
    img.dataset.ph = ph;
    img.dataset.loaded = "0";
    img.decoding = "async";

    item.appendChild(img);

    item.addEventListener("click", () => {
      setActiveIndex(v);
      enterInteractive(v);
    });

    scroller.appendChild(item);
    frames.push(item);
    imgs.push(img);
  }
}

/* ---------- idle wheel horizontal scroll (smooth) ---------- */
let wheelRaf = null;
let wheelTarget = null;
let wheelLastT = 0;

function stopWheel(){
  if (wheelRaf) cancelAnimationFrame(wheelRaf);
  wheelRaf = null;
  wheelTarget = null;
  wheelLastT = 0;
}

function wheelAnimate(t){
  if (!wheelLastT) wheelLastT = t;
  const dt = Math.min(0.05, (t - wheelLastT)/1000);
  wheelLastT = t;

  const current = scroller.scrollLeft;
  const target = (wheelTarget ?? current);
  const dist = target - current;

  const pow = 0.0008;
  const alpha = 1 - Math.pow(pow, dt);

  scroller.scrollLeft = current + dist*alpha;
  syncActiveIndexFromFilmstripImmediate();

  if (Math.abs(dist) < 0.5){
    scroller.scrollLeft = target;
    stopWheel();
    return;
  }
  wheelRaf = requestAnimationFrame(wheelAnimate);
}

function bindFilmstripWheel(){
  scroller.addEventListener("wheel", (e) => {
    if (mode === "interactive") return;
    if (e.shiftKey) return;
    if (visibleCount() <= 1) return;

    e.preventDefault();

    const d = normalizeDelta(e);
    const base = (wheelTarget ?? scroller.scrollLeft);
    wheelTarget = clamp(base + d, 0, scroller.scrollWidth - scroller.clientWidth);

    if (!wheelRaf) wheelRaf = requestAnimationFrame(wheelAnimate);
  }, { passive:false });

  let scrollSyncRaf = null;
  scroller.addEventListener("scroll", () => {
    if (mode !== "idle") return;
    if (scrollSyncRaf) return;
    scrollSyncRaf = requestAnimationFrame(() => {
      scrollSyncRaf = null;
      syncActiveIndexFromFilmstripImmediate();
    });
  }, { passive:true });
}

/* ---------- Interactive Viewer ---------- */
let viewer = null;
let projectScroll = null;
let hero = null;
let heroImg = null;
let heroT1 = null;
let heroT2 = null;
let projectMount = null;

let sideNav = null;
let leftSlotImg = null;
let rightSlotImg = null;
let leftBtn = null;
let rightBtn = null;

let currentProject = { styleEl:null, scriptEl:null, destroy:null };
let loadToken = 0;

function ensureViewer(){
  if (viewer) return;

  viewer = document.createElement("div");
  viewer.className = "projectViewer";

  projectScroll = document.createElement("div");
  projectScroll.className = "projectScroll";
  viewer.appendChild(projectScroll);

  const heroWrap = document.createElement("div");
  heroWrap.className = "heroWrap";

  hero = document.createElement("div");
  hero.className = "hero";

  const title = document.createElement("div");
  title.className = "heroTitle";

  heroT1 = document.createElement("div");
  heroT1.className = "t1";

  heroT2 = document.createElement("div");
  heroT2.className = "t2";

  title.appendChild(heroT1);
  title.appendChild(heroT2);

  heroImg = document.createElement("img");
  heroImg.alt = "Projekt Hero";

  hero.appendChild(heroImg);
  hero.appendChild(title);
  heroWrap.appendChild(hero);
  projectScroll.appendChild(heroWrap);

  projectMount = document.createElement("div");
  projectMount.className = "projectMount";
  projectMount.id = "projectMount";
  projectScroll.appendChild(projectMount);

  sideNav = document.createElement("div");
  sideNav.className = "sideNav";

  const leftSlot = document.createElement("div");
  leftSlot.className = "sideSlot left";
  leftSlotImg = document.createElement("img");
  leftSlot.appendChild(leftSlotImg);
  const leftOverlay = document.createElement("div");
  leftOverlay.className = "sideOverlay";
  leftSlot.appendChild(leftOverlay);
  leftBtn = document.createElement("div");
  leftBtn.className = "sideBtn";
  leftBtn.innerHTML = `
  <div class="navBtn navBtn--left" aria-hidden="true">
    <svg class="navIco" viewBox="0 0 24 24">
      <path d="M14.5 6.5 L9 12 L14.5 17.5" />
    </svg>
  </div>
`;
  leftSlot.appendChild(leftBtn);

  const rightSlot = document.createElement("div");
  rightSlot.className = "sideSlot right";
  rightSlotImg = document.createElement("img");
  rightSlot.appendChild(rightSlotImg);
  const rightOverlay = document.createElement("div");
  rightOverlay.className = "sideOverlay";
  rightSlot.appendChild(rightOverlay);
  rightBtn = document.createElement("div");
  rightBtn.className = "sideBtn";
  rightBtn.innerHTML = `
  <div class="navBtn navBtn--right" aria-hidden="true">
    <svg class="navIco" viewBox="0 0 24 24">
      <path d="M9.5 6.5 L15 12 L9.5 17.5" />
    </svg>
  </div>
`;
  rightSlot.appendChild(rightBtn);

  sideNav.appendChild(leftSlot);
  sideNav.appendChild(rightSlot);

  document.body.appendChild(viewer);
  document.body.appendChild(sideNav);

  leftBtn.addEventListener("click", () => gotoProject(activeIndex - 1));
  rightBtn.addEventListener("click", () => gotoProject(activeIndex + 1));
}

window.JGSetHeroTitle = (t1, t2) => {
  if (heroT1) heroT1.textContent = t1 ?? "";
  if (heroT2) heroT2.textContent = t2 ?? "";
};

function updateSideSlotMetrics(){
  if (!sideNav || !hero) return;

  const navRect = sideNav.getBoundingClientRect();
  const heroRect = hero.getBoundingClientRect();

  const heroLeft = heroRect.left - navRect.left;
  const heroRight = heroRect.right - navRect.left;

  document.documentElement.style.setProperty("--heroLeftPx", `${Math.round(heroLeft)}px`);
  document.documentElement.style.setProperty("--heroRightPx", `${Math.round(heroRight)}px`);
}

/* ---------- Project Cache + Prefetch (NEW) ---------- */
// Cache keyed by GLOBAL index
const projectCache = new Map(); // g -> { htmlText: string|null, htmlOk: boolean, promise: Promise<string|null> }
const preloadLinks = new Set(); // hrefs to avoid duplicate <link rel="preload">

function ensurePreloadLink(href, as){
  // rel=preload ist optional; wenn Browser es nicht nutzt, schadet es nicht.
  // Wichtig: wir deduplizieren.
  if (!href || preloadLinks.has(href)) return;
  preloadLinks.add(href);

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = as;
  link.href = href;
  document.head.appendChild(link);
}

function ensureProjectPrefetchByGlobal(g){
  const p = PROJECTS[g];
  if (!p) return Promise.resolve(null);

  // CSS/JS preloads (cache warm)
  ensurePreloadLink(p.css, "style");
  ensurePreloadLink(p.js, "script");

  // HTML fetch in cache
  const existing = projectCache.get(g);
  if (existing?.promise) return existing.promise;

  const entry = existing || { htmlText: null, htmlOk: false, promise: null };
  entry.promise = (async () => {
    let htmlText = null;
    try{
      const res = await fetch(p.html, { cache: "force-cache" });
      if (res.ok) htmlText = await res.text();
    }catch{
      htmlText = null;
    }
    entry.htmlText = htmlText;
    entry.htmlOk = (htmlText != null);
    entry.promise = null;
    projectCache.set(g, entry);
    return htmlText;
  })();

  projectCache.set(g, entry);
  return entry.promise;
}

function prefetchNeighbors(visibleIdx){
  if (mode !== "interactive") return;

  const n = visibleCount();
  if (n <= 1) return;

  const prevV = wrapIndex(visibleIdx - 1);
  const nextV = wrapIndex(visibleIdx + 1);

  const prevG = vToG(prevV);
  const nextG = vToG(nextV);

  // fire & forget
  ensureProjectPrefetchByGlobal(prevG);
  ensureProjectPrefetchByGlobal(nextG);
}

/* ---------- Project load/unload ---------- */
async function unloadCurrentProject(){
  if (typeof currentProject.destroy === "function"){
    try { currentProject.destroy(); } catch {}
  }
  if (currentProject.scriptEl) currentProject.scriptEl.remove();
  if (currentProject.styleEl) currentProject.styleEl.remove();
  currentProject = { styleEl:null, scriptEl:null, destroy:null };
}

function injectCSS(href){
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve(link);
    link.onerror = () => resolve(null);
    document.head.appendChild(link);
  });
}

function injectJS(src){
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = src;
    s.defer = true;
    s.onload = () => resolve(s);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

/* index ist VISIBLE index */
async function loadProject(index, token){
  if (visibleCount() === 0) return;

  const g = vToG(index);
  const p = PROJECTS[g];

  await unloadCurrentProject();
  if (token !== loadToken) return;

  // ✅ Use cache if exists, otherwise fetch now
  let htmlText = null;
  const cached = projectCache.get(g);

  if (cached?.htmlText !== undefined && cached.htmlText !== null){
    htmlText = cached.htmlText;
  } else if (cached?.htmlOk === false && cached.htmlText === null && !cached.promise){
    // known-miss
    htmlText = null;
  } else {
    // ensure prefetch (will fill cache)
    htmlText = await ensureProjectPrefetchByGlobal(g);
  }

  if (token !== loadToken) return;

  if (htmlText == null){
    projectMount.innerHTML = "";
    const ph = svgDataURI({ label:"FALLBACK", sub:"PROJECT NOT FOUND", bg:"#1e1e1e" });
    setImgWithFallback(heroImg, FALLBACK_HERO_FILE, ph);
    return;
  }

  const heroPH = svgDataURI({ label:`P${p.id}`, sub:"HERO PLACEHOLDER", bg:"#242424" });
  setImgWithFallback(heroImg, p.hero, heroPH);

  projectMount.innerHTML = htmlText;

  currentProject.styleEl = await injectCSS(p.css);
  if (token !== loadToken) return;

  window.JG = { svgDataURI, project: p, index: g, visibleIndex: index, mount: projectMount, filter: filterState };
  window.JGProject = null;

  // JS nur beim aktiven Projekt ausführen (wie gehabt)
  currentProject.scriptEl = await injectJS(p.js);
  if (token !== loadToken) return;

  if (window.JGProject && typeof window.JGProject.destroy === "function"){
    currentProject.destroy = window.JGProject.destroy;
  }
}

/* ---------- Mode switching ---------- */
function enterInteractive(index){
  if (visibleCount() === 0) return;

  ensureViewer();
  mode = "interactive";
  body.classList.add("interactive");

  setTicks(true);

  updateStageMetrics();
  viewer.style.display = "block";
  sideNav.style.display = "block";

  gotoProject(index);
  requestAnimationFrame(updateSideSlotMetrics);
}

function exitInteractive(){
  mode = "idle";
  body.classList.remove("interactive");

  viewer && (viewer.style.display = "none");
  sideNav && (sideNav.style.display = "none");

  body.style.backgroundColor = DEFAULT_BG;

  centerIndexInstant(activeIndex);

  setTicks(true);
  syncActiveIndexFromFilmstripImmediate();
}

function wrapIndex(i){
  const n = visibleCount();
  if (n <= 0) return 0;
  return ((i % n) + n) % n;
}

async function gotoProject(index){
  if (visibleCount() === 0) return;

  const token = ++loadToken;

  setActiveIndex(wrapIndex(index));
  centerIndexInstant(activeIndex);

  setTicks(true);

  if (projectScroll) projectScroll.scrollTop = 0;

  const p = getProjectByVisibleIndex(activeIndex);
  heroT1.textContent = p.title.t1;
  heroT2.textContent = p.title.t2;

  body.style.backgroundColor = p.bg || DEFAULT_BG;

  const prev = wrapIndex(activeIndex - 1);
  const next = wrapIndex(activeIndex + 1);

  const prevP = getProjectByVisibleIndex(prev);
  const nextP = getProjectByVisibleIndex(next);

  const prevPH = svgDataURI({ label:`P${prevP.id}`, sub:"PREV", bg:"#202020" });
  const nextPH = svgDataURI({ label:`P${nextP.id}`, sub:"NEXT", bg:"#202020" });

  setImgWithFallback(leftSlotImg, prevP.hero, prevPH);
  setImgWithFallback(rightSlotImg, nextP.hero, nextPH);

  // ✅ NEW: Prefetch neighbor contents NOW (HTML+CSS+JS cached, JS not executed)
  prefetchNeighbors(activeIndex);

  await loadProject(activeIndex, token);
  if (token !== loadToken) return;

  requestAnimationFrame(updateSideSlotMetrics);
  setTicks(true);

  // ✅ After load: prefetch again (safe) in case activeIndex changed fast
  prefetchNeighbors(activeIndex);
}

/* ---------- Input bindings ---------- */
function bindInteractiveWheel(){
  window.addEventListener("wheel", (e) => {
    if (mode !== "interactive" || !projectScroll) return;
    e.preventDefault();
    projectScroll.scrollTop += normalizeDelta(e);
  }, { passive:false });
}

function bindScrollHint(){
  const trigger = () => {
    if (mode === "interactive" && projectScroll){
      projectScroll.scrollBy({ top: Math.round(window.innerHeight * 0.8), behavior:"smooth" });
    }
  };

  scrollHint?.addEventListener("click", trigger);
  scrollHint?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " "){
      e.preventDefault();
      trigger();
    }
  });
}

function bindHome(){
  homeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (mode === "interactive") exitInteractive();
    else centerIndexInstant(activeIndex);
  });
}

/* ---------- FILTER ---------- */
function computeVisibleIndices(nextFilter){
  if (nextFilter === "photo"){
    return PROJECTS.map((p,i) => p.tags?.includes("photo") ? i : -1).filter(i => i >= 0);
  }
  if (nextFilter === "video"){
    return PROJECTS.map((p,i) => p.tags?.includes("video") ? i : -1).filter(i => i >= 0);
  }
  return PROJECTS.map((_, i) => i);
}

function openFilterMenu(){
  if (!filterToggle || !filterMenu) return;
  filterToggle.style.display = "none";
  filterMenu.style.display = "flex";
  filterMenu.setAttribute("aria-hidden", "false");
}

function closeFilterMenu(){
  if (!filterToggle || !filterMenu) return;
  filterMenu.style.display = "none";
  filterMenu.setAttribute("aria-hidden", "true");
  filterToggle.style.display = "inline-flex";
}

function updateFilterUI(){
  if (!optPhoto || !optVideo) return;

  const isPhoto = (filterState === "photo");
  const isVideo = (filterState === "video");

  optPhoto.classList.toggle("active", isPhoto);
  optVideo.classList.toggle("active", isVideo);

  if (isPhoto){
    optPhoto.style.opacity = "1";
    optVideo.style.opacity = ".35";
  } else if (isVideo){
    optPhoto.style.opacity = ".35";
    optVideo.style.opacity = "1";
  } else {
    optPhoto.style.opacity = ".9";
    optVideo.style.opacity = ".9";
  }
}

function rebuildFilmstripAndTicksKeepingIndex(prevGlobalIndex){
  stopWheel();
  cancelFilmHeroBatch();

  progressEl.innerHTML = "";
  scroller.innerHTML = "";

  ticks.length = 0;
  tickX.length = 0;
  frames.length = 0;
  imgs.length = 0;

  lastTickIndex = -1;
  lastTickMode = null;

  buildTicks();
  buildFilmstrip();

  const pos = visibleIndices.indexOf(prevGlobalIndex);
  activeIndex = (pos >= 0) ? pos : 0;

  requestAnimationFrame(() => {
    updateSidePadding();
    updateStageMetrics();

    if (visibleCount() > 0) centerIndexInstant(activeIndex);
    else scroller.scrollLeft = 0;

    setActiveIndex(activeIndex);
    syncActiveIndexFromFilmstripImmediate();
    setTicks(true);

    scheduleFilmHeroesLoadAll(activeIndex);
  });
}

function applyFilter(nextFilter){
  const doApply = () => {
    const prevGlobal = (visibleCount() > 0) ? vToG(activeIndex) : 0;

    filterState = nextFilter;
    visibleIndices = computeVisibleIndices(nextFilter);

    rebuildFilmstripAndTicksKeepingIndex(prevGlobal);
    updateFilterUI();
  };

  if (mode === "interactive"){
    exitInteractive();
    requestAnimationFrame(doApply);
  } else {
    doApply();
  }
}

function bindFilterUI(){
  if (!filterToggle || !filterMenu || !optPhoto || !optVideo || !filterClose) return;

  closeFilterMenu();
  updateFilterUI();

  filterToggle.addEventListener("click", () => openFilterMenu());

  filterClose.addEventListener("click", () => {
    closeFilterMenu();
    applyFilter("all");
  });

  optPhoto.addEventListener("click", () => applyFilter("photo"));
  optVideo.addEventListener("click", () => applyFilter("video"));
}

/* ---------- init ---------- */
function initVisibleAll(){
  filterState = "all";
  visibleIndices = computeVisibleIndices("all");
  TICK_COUNT = visibleCount();
  updateFilterUI();
}

function initBuildAll(){
  cancelFilmHeroBatch();

  progressEl.innerHTML = "";
  scroller.innerHTML = "";

  ticks.length = 0;
  tickX.length = 0;
  frames.length = 0;
  imgs.length = 0;

  lastTickIndex = -1;
  lastTickMode = null;

  buildTicks();
  buildFilmstrip();

  updateSidePadding();
  updateStageMetrics();
}

async function init(){
  bindMobileGateMeasure();   // ✅ immer binden (kostet nix)

  if (isMobileLike()){
    openMobileGateAndStop();
    return; // ✅ stoppt alles: keine Bilder, kein Filmstrip, kein Fetch
  }
  // stabiler Loader-Text (Font-Metriken)
  try{
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  }catch{}

  initVisibleAll();
  initBuildAll();

  bindFilmstripWheel();
  bindInteractiveWheel();
  bindScrollHint();
  bindHome();
  bindFilterUI();

  const start = Math.min(1, Math.max(0, visibleCount() - 1));
  centerIndexInstant(start);
  setActiveIndex(start);

  syncActiveIndexFromFilmstripImmediate();
  setTicks(true);

  body.style.backgroundColor = DEFAULT_BG;

  // Filmstrip heroes batches
  requestAnimationFrame(() => {
    setFilmHeroNow(activeIndex);
    scheduleFilmHeroesLoadAll(activeIndex);
  });

  // ✅ LOADER: Prozent bis alle Filmstrip-Heroes initial geladen/fehlerhaft
  preloadFilmstripHeroesWithProgress();
}

window.addEventListener("resize", () => {
  updateSidePadding();
  updateStageMetrics();

  if (mode === "idle"){
    syncActiveIndexFromFilmstripImmediate();
    setTicks(true);

    requestAnimationFrame(() => {
      setFilmHeroNow(activeIndex);
      scheduleFilmHeroesLoadAll(activeIndex);
    });
  }
  if (mode === "interactive"){
    requestAnimationFrame(updateSideSlotMetrics);
  }
});

window.addEventListener("load", init);
init();
