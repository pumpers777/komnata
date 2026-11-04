document.querySelectorAll('.nav a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const id = link.getAttribute("href");
    const target = id && document.querySelector(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.pushState(null, "", id);
  });
});

const videos = [...document.querySelectorAll(".reel-video")];
videos.forEach((video) => {
  video.muted = true;
  const play = () => video.play().catch(() => {});
  video.addEventListener("canplay", play);
  document.addEventListener("touchstart", play, { once: true, passive: true });
});
if (videos.length) {
  const watch = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      });
    },
    { threshold: 0.45 }
  );
  videos.forEach((video) => watch.observe(video));
}

const bindReel = (root) => {
  const view = root.querySelector(".reel-view");
  const track = root.querySelector(".reel-track");
  if (!view || !track) return;
  const slidesOf = () =>
    [...track.children].filter((slide) => getComputedStyle(slide).display !== "none");

  let index = 0;
  let drag = null;
  let wheelLock = 0;

  const widthOf = () => view.clientWidth || 1;

  const size = () => {
    const width = widthOf();
    slidesOf().forEach((slide) => {
      slide.style.flex = `0 0 ${width}px`;
      slide.style.width = `${width}px`;
    });
  };

  const render = (live) => {
    size();
    track.classList.toggle("is-live", Boolean(live));
    const shift = drag && drag.axis === "x" ? drag.dx : 0;
    track.style.transform = `translate3d(${-index * widthOf() + shift}px, 0, 0)`;
  };

  const go = (next) => {
    const last = Math.max(0, slidesOf().length - 1);
    index = Math.max(0, Math.min(last, next));
    drag = null;
    view.classList.remove("is-drag");
    render(false);
  };

  render(false);

  view.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) return;
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      const now = performance.now();
      if (now - wheelLock < 520) return;
      if (event.deltaX > 8) {
        wheelLock = now;
        go(index + 1);
      } else if (event.deltaX < -8) {
        wheelLock = now;
        go(index - 1);
      }
    },
    { passive: false }
  );

  view.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      dx: 0,
      t: performance.now(),
      axis: null,
    };
  });

  view.addEventListener(
    "pointermove",
    (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.axis) {
        if (Math.hypot(dx, dy) < 8) return;
        drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (drag.axis === "x") {
          view.setPointerCapture(event.pointerId);
          view.classList.add("is-drag");
        }
      }
      if (drag.axis !== "x") return;
      event.preventDefault();
      drag.dx = dx;
      render(true);
    },
    { passive: false }
  );

  const release = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const { dx, t, axis } = drag;
    const velocity = dx / Math.max(16, performance.now() - t);
    const width = widthOf();
    drag = null;
    view.classList.remove("is-drag");
    if (axis !== "x") {
      render(false);
      return;
    }
    if (dx < -width * 0.14 || velocity < -0.4) go(index + 1);
    else if (dx > width * 0.14 || velocity > 0.4) go(index - 1);
    else go(index);
  };

  view.addEventListener("pointerup", release);
  view.addEventListener("pointercancel", release);
  window.addEventListener("resize", () => {
    go(index);
  });
};

document.querySelectorAll(".reel").forEach(bindReel);

if (location.hash) {
  const target = document.querySelector(location.hash);
  if (target) target.scrollIntoView({ block: "start" });
}
