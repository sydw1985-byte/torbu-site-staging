/* ============================================================
   app.js — TORBU
   - Mobile drawer toggle
   - Industry accordion (single-open)
   - Hash auto-open for Water accordion
   - Contact form submit (Worker + Turnstile) [only if form exists]
   - Company Journey inline component (click-to-swap, company page)
============================================================ */

/* Mobile drawer toggle */
(() => {
  const navBtn = document.getElementById("navToggle");
  const drawer = document.getElementById("drawer");
  if (!navBtn || !drawer) return;

  navBtn.addEventListener("click", () => {
    const isOpen = navBtn.getAttribute("aria-expanded") === "true";
    navBtn.setAttribute("aria-expanded", String(!isOpen));
    drawer.hidden = isOpen;
  });

  drawer.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      drawer.hidden = true;
      navBtn.setAttribute("aria-expanded", "false");
    }
  });
})();

/* Industry accordion (one open at a time), animated to match
   the Company Journey accordion's max-height technique. */
(() => {
  const root = document.getElementById("industryAccordion");
  if (!root) return;

  function getPanel(btn) {
    const panelId = btn.getAttribute("aria-controls");
    return panelId ? document.getElementById(panelId) : null;
  }

  function open(btn) {
    const item = btn.closest(".industryItem");
    const panel = getPanel(btn);
    if (!panel) return;
    const inner = panel.querySelector(".industryPanelInner");

    btn.setAttribute("aria-expanded", "true");
    if (item) item.classList.add("is-open");
    panel.hidden = false;
    panel.style.maxHeight = (inner ? inner.offsetHeight : panel.scrollHeight) + "px";
  }

  function close(btn) {
    const item = btn.closest(".industryItem");
    const panel = getPanel(btn);
    if (!panel) return;

    btn.setAttribute("aria-expanded", "false");
    if (item) item.classList.remove("is-open");
    panel.style.maxHeight = "0";
    panel.addEventListener("transitionend", () => {
      if (btn.getAttribute("aria-expanded") !== "true") panel.hidden = true;
    }, { once: true });
  }

  function closeAll(exceptBtn = null) {
    root
      .querySelectorAll('.industryTrigger[aria-expanded="true"]')
      .forEach((btn) => {
        if (btn === exceptBtn) return;
        close(btn);
      });
  }

  root.addEventListener("click", (e) => {
    const btn = e.target.closest(".industryTrigger");
    if (!btn || !root.contains(btn)) return;

    const isOpen = btn.getAttribute("aria-expanded") === "true";
    closeAll(btn);

    if (isOpen) {
      close(btn);
    } else {
      open(btn);

      /* Click-only feedback: trigger pulse + brief lime flash
         on the panel that was just opened. Not applied to the
         default-open-on-load or hash-triggered auto-open below,
         so it only fires in direct response to a user click. */
      btn.classList.remove("is-pulse");
      void btn.offsetWidth; /* restart animation if clicked again quickly */
      btn.classList.add("is-pulse");
      btn.addEventListener("animationend", () => {
        btn.classList.remove("is-pulse");
      }, { once: true });

      const panel = getPanel(btn);
      const inner = panel ? panel.querySelector(".industryPanelInner") : null;
      if (inner) {
        inner.classList.add("is-flash");
        setTimeout(() => inner.classList.remove("is-flash"), 350);
      }
    }
  });

  /* Open Water by default on page load */
  const waterBtn = root.querySelector('.industryTrigger[aria-controls="panel-water"]');
  if (waterBtn) {
    open(waterBtn);
  } else {
    closeAll();
  }

  /* Reads the hash and opens the Water accordion automatically (use case) */
  const h = window.location.hash || "";
  if (h.includes("governance-open-water")) {
    const gov = document.getElementById("governance");
    const panel = document.getElementById("panel-water");

    if (waterBtn && panel) {
      if (gov) gov.scrollIntoView({ behavior: "auto", block: "start" });

      closeAll(waterBtn);
      open(waterBtn);

      setTimeout(() => {
        waterBtn.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  }
})();

/* Callout tap highlight (mobile touch) */
(() => {
  const HIGHLIGHT_MS = 600;

  function bindCallouts(selector) {
    document.querySelectorAll(selector).forEach((el) => {
      el.addEventListener("touchstart", () => {
        el.classList.add("is-tapped");
      }, { passive: true });

      el.addEventListener("touchend", () => {
        setTimeout(() => el.classList.remove("is-tapped"), HIGHLIGHT_MS);
      }, { passive: true });

      el.addEventListener("touchcancel", () => {
        el.classList.remove("is-tapped");
      }, { passive: true });
    });
  }

  bindCallouts(".company__callout");
  bindCallouts(".jia__takeaway");
  bindCallouts(".usecase__callout");
  bindCallouts(".usecase__emphasis");
})();

/* Contact form submit (Worker + Turnstile) */
(() => {
  const form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (form.company && form.company.value.trim() !== "") return;

    if (!window.turnstile) {
      alert("Security check not loaded. Please refresh and try again.");
      return;
    }

    const widget = form.querySelector(".cf-turnstile");
    if (!widget) {
      alert("Missing Turnstile widget (.cf-turnstile) in the form.");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const label = submitBtn ? submitBtn.querySelector(".btn__text") : null;
    const originalLabel = label ? label.textContent : null;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.remove("is-success");
      submitBtn.classList.add("is-loading");
    }

    const name = (form.name?.value || "").trim();
    const org = (form.org?.value || "").trim();
    const email = (form.email?.value || "").trim();
    const message = (form.message?.value || "").trim();

    if (!name || !org || !email || !message) {
      alert("Please complete name, organization, email, and message.");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove("is-loading");
      }
      return;
    }

    try {
      const tsToken = await new Promise((resolve, reject) => {
        window.turnstile.execute(widget, {
          callback: resolve,
          "error-callback": () => reject(new Error("Security check failed")),
          "expired-callback": () => reject(new Error("Security check expired")),
        });
      });

      const payload = { name, org, email, message, tsToken };

      const res = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not send.");

      if (submitBtn) {
        submitBtn.classList.remove("is-loading");
        submitBtn.classList.add("is-success");
        if (label) label.textContent = "Sent";
        await new Promise((r) => setTimeout(r, 450));
      }

      window.location.href = "./thank-you.html";
    } catch (err) {
      console.error(err);
      alert(err?.message || "Could not send. Please try again.");
    } finally {
      try {
        window.turnstile.reset(widget);
      } catch {}

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove("is-loading");

        if (!submitBtn.classList.contains("is-success") && label && originalLabel != null) {
          label.textContent = originalLabel;
        }
      }
    }
  });
})();


/* Company Story — scroll-driven timeline, company.html
   Desktop: sticky rail + active story stage.
   Mobile: simple vertical timeline with active-stage emphasis.
============================================================ */

(() => {
  const story = document.getElementById("journeyStory");
  if (!story) return;

  const steps = Array.from(story.querySelectorAll(".journey-story__step"));
  const navItems = Array.from(story.querySelectorAll(".journey-story__navItem"));
  const fill = document.getElementById("journeyLineFill");
  if (!steps.length) return;

  let activeIndex = 0;

  function setActive(index) {
    index = Math.max(0, Math.min(steps.length - 1, index));
    activeIndex = index;

    steps.forEach((step, i) => {
      step.classList.toggle("is-active", i === index);
      step.classList.toggle("is-past", i < index);
    });

    navItems.forEach((item, i) => {
      item.classList.toggle("is-active", i === index);
      item.classList.toggle("is-past", i < index);
      if (i === index) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });

    if (fill) {
      const pct = steps.length > 1 ? (index / (steps.length - 1)) * 100 : 100;
      fill.style.height = pct + "%";
    }
  }

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const index = Number(item.dataset.step);
      const target = steps[index];
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setActive(index);
    });
  });

  if (!("IntersectionObserver" in window)) {
    setActive(0);
    return;
  }

  const ratios = new Map();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const index = Number(entry.target.dataset.step);
      ratios.set(index, entry.isIntersecting ? entry.intersectionRatio : 0);
    });

    let bestIndex = activeIndex;
    let bestRatio = -1;
    ratios.forEach((ratio, index) => {
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestIndex = index;
      }
    });

    if (bestRatio > 0) setActive(bestIndex);
  }, {
    threshold: [0.15, 0.3, 0.5, 0.7, 0.9],
    rootMargin: "-18% 0px -28% 0px"
  });

  steps.forEach((step) => observer.observe(step));
  setActive(0);
})();


/* Scroll-reveal — Architecture diagram cards (Supervisory /
   Execution / Physical Layer). Applied entirely from JS: the
   .reveal class is added here, not in the HTML, so if this
   script fails to load or run, the cards are never hidden —
   they just render normally with no animation. Respects
   prefers-reduced-motion via the CSS transition-duration
   override in styles.css; no separate check needed here since
   an instant 0.001ms transition looks the same as no reveal.

   Staggered via a per-card transition-delay (120ms apart) so
   the three cards visually reveal in sequence — reinforcing
   "authority moves downward" — even though all three usually
   cross the intersection threshold in the same frame, since
   they're stacked close together. */
(() => {
  const cards = document.querySelectorAll(".integrate__card");
  if (!cards.length) return;

  if (!("IntersectionObserver" in window)) return;

  cards.forEach((card, i) => {
    card.classList.add("reveal");
    card.style.transitionDelay = (i * 120) + "ms";
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
  );

  cards.forEach((card) => observer.observe(card));
})();
