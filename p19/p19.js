window.JG.project.title.t1 = "Recruiting / Reels";
window.JG.project.title.t2 = "HolzART Briegel";

window.JGSetHeroTitle(
  window.JG.project.title.t1,
  window.JG.project.title.t2
);

window.JGProject = { destroy(){} };

(() => {
  const JG = window.JG;
  if (!JG) return;

  const { mount, project, svgDataURI } = JG;

  // Optional: falls du zusätzlich Bilder (b/c/...) drin hast
  mount.querySelectorAll('img[data-seed]').forEach(img => {
    const seed = img.getAttribute('data-seed') || 'x';
    const real = `${project.dir}/images/${seed}.jpg`;

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

  // Video controls
  const wrap = mount.querySelector('.p19VideoWrap');
  const video = mount.querySelector('.p19VideoEl');
  const btn = mount.querySelector('.p19VideoBtn');

  if (!wrap || !video || !btn) return;

  const setUI = () => {
    wrap.classList.toggle('isPlaying', !video.paused && !video.ended);
  };

  const toggle = async () => {
    try{
      if (video.paused || video.ended) await video.play();
      else video.pause();
    }catch{
      // autoplay restrictions – ignore
    }
    setUI();
  };

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    toggle();
  });

  // Click on video toggles too (nice for reels)
  video.addEventListener('click', toggle);

  video.addEventListener('play', setUI);
  video.addEventListener('pause', setUI);
  video.addEventListener('ended', setUI);

  setUI();
})();
