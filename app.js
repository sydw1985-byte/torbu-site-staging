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

/* Industry accordion (one open at a time) */
(() => {
  const root = document.getElementById("industryAccordion");
  if (!root) return;

  function getPanel(btn) {
    const panelId = btn.getAttribute("aria-controls");
    return panelId ? document.getElementById(panelId) : null;
  }

  function closeAll(exceptBtn = null) {
    root
      .querySelectorAll('.industryTrigger[aria-expanded="true"]')
      .forEach((btn) => {
        if (btn === exceptBtn) return;
        const panel = getPanel(btn);
        btn.setAttribute("aria-expanded", "false");
        if (panel) panel.hidden = true;
      });
  }

  root.addEventListener("click", (e) => {
    const btn = e.target.closest(".industryTrigger");
    if (!btn || !root.contains(btn)) return;

    const panel = getPanel(btn);
    if (!panel) return;

    const isOpen = btn.getAttribute("aria-expanded") === "true";

    closeAll(btn);

    btn.setAttribute("aria-expanded", String(!isOpen));
    panel.hidden = isOpen;
  });

  closeAll();
})();

/* Reads the hash and opens the Water accordion automatically (use case) */
(() => {
  const h = window.location.hash || "";
  if (!h.includes("governance-open-water")) return;

  const root = document.getElementById("industryAccordion");
  if (!root) return;

  const gov = document.getElementById("governance");
  const btn = root.querySelector('.industryTrigger[aria-controls="panel-water"]');
  const panel = document.getElementById("panel-water");
  if (!btn || !panel) return;

  if (gov) gov.scrollIntoView({ behavior: "auto", block: "start" });

  root.querySelectorAll('.industryTrigger[aria-expanded="true"]').forEach((b) => {
    b.setAttribute("aria-expanded", "false");
    const pid = b.getAttribute("aria-controls");
    const p = pid ? document.getElementById(pid) : null;
    if (p) p.hidden = true;
  });

  btn.setAttribute("aria-expanded", "true");
  panel.hidden = false;

  setTimeout(() => {
    btn.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);
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

/* Company Journey — inline component for company.html
   Replaces the full journey page.
   Paste this IIFE at the end of app.js.
   Add the HTML snippet (below) to company.html.
   Add journey-inline.css to the <head>.
============================================================ */

(() => {
  const rail    = document.getElementById("jiRail");
  const panel   = document.getElementById("jiPanel");
  const content = document.getElementById("jiContent");
  const prevBtn = document.getElementById("jiPrev");
  const nextBtn = document.getElementById("jiNext");
  const counter = document.getElementById("jiCounter");

  if (!rail || !panel || !content) return;

  /* ── Data: corrected arc from actual timeline ── */
  const DATA = [
    {
      years: "2018–2019",
      phase: "Foundation",
      title: "Every team needs a system.",
      narrative: "TORBU began as STRIDE, a supervision platform for academic sports. We built a role-based system that captured daily activity, records, and supervisor visibility from day one.",
      takeaway: "First principle: Accountability requires defined structure.",
      final: false,
    },
    {
      years: "2022",
      phase: "Institutional",
      title: "We built it to an institutional standard.",
      narrative: "Early prototypes exposed what regulated environments demand. We moved engineering in-house and consolidated the system under full architectural control — establishing stable multi-level permissions and audit-ready records. We rebranded as TORBU.",
      takeaway: "Second principle: Governance at scale requires architectural ownership.",
      final: false,
    },
    {
      years: "2022–2024",
      phase: "Education",
      title: "Learning and training follow the same logic.",
      narrative: "We expanded into K–12, CTE programs, and structured learning environments. Training tracking, compliance workflows, and hierarchical oversight translated directly.",
      takeaway: "Third principle: Supervisory architecture transcends domain.",
      final: false,
    },
    {
      years: "2022–2025",
      phase: "Regulated Systems",
      title: "High-accountability environments refined the system.",
      narrative: "We tested chain-of-command architecture at scale in federal training environments. We digitized large curriculum systems, structured readiness analytics, and enabled multi-level oversight across complex institutions.",
      takeaway: "Fourth principle: Durable architecture withstands demanding conditions.",
      final: false,
    },
    {
      years: "2025 →",
      phase: "Infrastructure",
      title: "The landscape is shifting toward mandate.",
      narrative: "Across utilities, public works, and critical systems, operator training and oversight are moving from practice to requirement. The governance logic built over seven years aligns directly with this shift. Defined authority. Structured certification. Verified records.",
      takeaway: "Fifth principle: When oversight becomes law, supervisory software becomes infrastructure.",
      final: true,
    },
  ];

  let current = -1;

  /* ── Build vertical nav items ── */
  rail.innerHTML = DATA.map((d, i) => `
    <button
      class="ji__navItem${d.final ? " is-final" : ""}"
      data-index="${i}"
      aria-label="${d.years}: ${d.phase}"
    >
      <div class="ji__navDot"></div>
      <div class="ji__navText">
        <span class="ji__navPhase">${d.phase}</span>
        <span class="ji__navYear">${d.years}</span>
      </div>
    </button>
  `).join("");

  /* ── Detect mobile ── */
  function isMobile() {
    return window.innerWidth <= 640;
  }

  /* ── Render single panel (desktop) ── */
  function renderContent(idx) {
    const d = DATA[idx];
    return `
      <div class="ji__header">
        <span class="ji__tag">${d.phase}</span>
        <span class="ji__date">${d.years}</span>
      </div>
      <h3 class="ji__title">${d.title}</h3>
      <p class="ji__narrative">${d.narrative}</p>
      <div class="ji__takeaway">${d.takeaway}</div>
    `;
  }

  /* ── Render all cards stacked (mobile) ── */
  function renderAllCards() {
    return DATA.map((d) => `
      <div class="ji__card${d.final ? " is-final" : ""}">
        <div class="ji__cardYear">${d.years} · ${d.phase}</div>
        <h3 class="ji__title">${d.title}</h3>
        <p class="ji__narrative">${d.narrative}</p>
        <div class="ji__takeaway">${d.takeaway}</div>
      </div>
    `).join("");
  }

  /* ── Init based on viewport ── */
  function init() {
    if (isMobile()) {
      content.innerHTML = renderAllCards();
      current = 0; /* satisfy guard */
    } else {
      activate(0);
    }
  }

  /* ── Activate (desktop only) ── */
  function activate(idx) {
    if (idx === current) return;
    const prev = current;
    current = Math.max(0, Math.min(DATA.length - 1, idx));
    const d = DATA[current];

    /* Update nav items */
    document.querySelectorAll(".ji__navItem").forEach((n, i) => {
      n.classList.toggle("is-active", i === current);
    });

    /* Panel final state */
    panel.classList.toggle("is-final", d.final);

    /* First render: no crossfade */
    if (prev === -1) {
      content.innerHTML = renderContent(current);
    } else {
      content.classList.add("is-leaving");
      setTimeout(() => {
        content.innerHTML = renderContent(current);
        content.classList.remove("is-leaving");
        content.classList.add("is-entering");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            content.classList.remove("is-entering");
          });
        });
      }, 160);
    }

    /* Nav buttons */
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current === DATA.length - 1;
    if (counter) counter.textContent = `${current + 1} / ${DATA.length}`;
  }

  /* ── Clicks ── */
  rail.addEventListener("click", (e) => {
    const btn = e.target.closest(".ji__navItem");
    if (!btn) return;
    activate(Number(btn.dataset.index));
  });

  /* ── Arrow nav ── */
  if (prevBtn) prevBtn.addEventListener("click", () => activate(current - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => activate(current + 1));

  /* ── Init ── */
  init();

  /* Re-init on resize crossing the breakpoint */
  let wasM = isMobile();
  window.addEventListener("resize", () => {
    const isM = isMobile();
    if (isM !== wasM) { wasM = isM; current = -1; init(); }
  });
})();
