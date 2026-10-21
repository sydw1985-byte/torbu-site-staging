/* Company story: scroll-driven four-stage timeline (company.html).
   Progressive enhancement: without this script all four stages render fully visible. */
(() => {
  const root = document.getElementById("companyStory");
  if (!root) return;

  const steps = Array.from(root.querySelectorAll(".cstory__step"));
  const navItems = Array.from(root.querySelectorAll(".cstory__navItem"));
  const fill = document.getElementById("cstoryFill");
  if (!steps.length) return;

  let active = 0;

  function setActive(i) {
    i = Math.max(0, Math.min(steps.length - 1, i));
    active = i;
    steps.forEach((s, n) => {
      s.classList.toggle("is-active", n === i);
      s.classList.toggle("is-past", n < i);
    });
    navItems.forEach((b, n) => {
      b.classList.toggle("is-active", n === i);
      b.classList.toggle("is-past", n < i);
      if (n === i) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
    });
    if (fill) fill.style.height = (steps.length > 1 ? (i / (steps.length - 1)) * 100 : 100) + "%";
  }

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  navItems.forEach((b) => {
    b.addEventListener("click", () => {
      const i = Number(b.dataset.step);
      const t = steps[i];
      if (!t) return;
      t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      setActive(i);
    });
  });

  root.classList.add("cstory--live");
  setActive(0);

  /* Active stage = the last card whose top has crossed 55% of the viewport height. */
  let ticking = false;
  function update() {
    ticking = false;
    const line = window.innerHeight * 0.55;
    let best = 0;
    steps.forEach((s, i) => {
      if (s.getBoundingClientRect().top <= line) best = i;
    });
    if (best !== active) setActive(best);
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  /* Capture phase: styles.css sets overflow on html and body, so the scrolling
     element can be the body rather than the window. */
  window.addEventListener("scroll", onScroll, { passive: true, capture: true });
  window.addEventListener("resize", onScroll);
  update();
})();
