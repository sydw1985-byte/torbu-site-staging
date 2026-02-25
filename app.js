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

  /* Open Water by default on page load */
  const waterBtn = root.querySelector('.industryTrigger[aria-controls="panel-water"]');
  const waterPanel = document.getElementById("panel-water");
  if (waterBtn && waterPanel) {
    waterBtn.setAttribute("aria-expanded", "true");
    waterPanel.hidden = false;
  } else {
    closeAll();
  }
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

/* Company Journey — accordion, company.html
   Single interaction model across desktop + mobile.
============================================================ */

(() => {
  const wrap = document.getElementById("jiAccordion");
  if (!wrap) return;

  const DATA = [
    {
      years: "2018–2019",
      phase: "Foundation",
      title: "Defined oversight.",
      narrative: "We formalized role-based supervision, daily records, and tiered visibility. Authority was embedded into workflow from inception.",
      takeaway: "Accountability requires defined structure.",
      final: false,
    },
    {
      years: "2022",
      phase: "Control",
      title: "Architectural ownership.",
      narrative: "We consolidated engineering under direct architectural control. We established stable multi-level permissions and audit-ready records.",
      takeaway: "Governance at scale requires architectural ownership.",
      final: false,
    },
    {
      years: "2022–2024",
      phase: "Expansion",
      title: "Domain-neutral supervision.",
      narrative: "We extended the architecture into structured training environments across sectors. Instructional oversight, documented workflows, and tiered supervision translated directly.",
      takeaway: "Supervisory architecture applies across institutions.",
      final: false,
    },
    {
      years: "2022–2025",
      phase: "Validation",
      title: "High-accountability environments.",
      narrative: "We validated chain-of-command architecture in federal training environments. We digitized a large curriculum system and built a purpose-specific delivery platform.",
      takeaway: "Supervisory systems must hold under stress.",
      final: false,
    },
    {
      years: "2025 →",
      phase: "Implementation",
      title: "Statutory alignment.",
      narrative: "Infrastructure statutes now formalize operator oversight requirements. We scale seven years of architectural discipline into a purpose-built governance framework.",
      takeaway: "When oversight becomes law, supervisory software becomes infrastructure.",
      final: true,
    },
  ];

  const esc = (s) => String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  /* ── Build accordion HTML ── */
  wrap.innerHTML = DATA.map((d, i) => `
    <div class="jia__item${d.final ? " is-final" : ""}" data-index="${i}">
      <button
        class="jia__trigger"
        aria-expanded="false"
        aria-controls="jia-panel-${i}"
        id="jia-btn-${i}"
      >
        <div class="jia__triggerLeft">
          <span class="jia__years">${esc(d.years)}</span>
          <span class="jia__phase">${esc(d.phase)}</span>
        </div>
        <div class="jia__chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </button>
      <div
        class="jia__body"
        id="jia-panel-${i}"
        role="region"
        aria-labelledby="jia-btn-${i}"
        hidden
      >
        <div class="jia__bodyInner">
          <h3 class="jia__title">${esc(d.title)}</h3>
          <p class="jia__narrative">${esc(d.narrative)}</p>
          <div class="jia__takeaway">
            <p class="jia__takeawayText">${esc(d.takeaway)}</p>
          </div>
        </div>
      </div>
    </div>
  `).join("");

  /* ── Open / close logic ── */
  function open(item) {
    const btn = item.querySelector(".jia__trigger");
    const body = item.querySelector(".jia__body");
    btn.setAttribute("aria-expanded", "true");
    item.classList.add("is-open");
    body.hidden = false;
    /* Animate height */
    const inner = body.querySelector(".jia__bodyInner");
    body.style.maxHeight = inner.offsetHeight + "px";
  }

  function close(item) {
    const btn = item.querySelector(".jia__trigger");
    const body = item.querySelector(".jia__body");
    btn.setAttribute("aria-expanded", "false");
    item.classList.remove("is-open");
    body.style.maxHeight = "0";
    /* Hide after transition */
    body.addEventListener("transitionend", () => {
      if (!item.classList.contains("is-open")) body.hidden = true;
    }, { once: true });
  }

  function toggle(item) {
    const isOpen = item.classList.contains("is-open");
    /* Close all */
    wrap.querySelectorAll(".jia__item.is-open").forEach(close);
    /* Open clicked if it was closed */
    if (!isOpen) open(item);
  }

  /* ── Event delegation ── */
  wrap.addEventListener("click", (e) => {
    const trigger = e.target.closest(".jia__trigger");
    if (!trigger) return;
    const item = trigger.closest(".jia__item");
    if (item) toggle(item);
  });

  /* ── Keyboard support ── */
  wrap.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const trigger = e.target.closest(".jia__trigger");
    if (!trigger) return;
    e.preventDefault();
    const item = trigger.closest(".jia__item");
    if (item) toggle(item);
  });

  /* ── Open first on load ── */
  const first = wrap.querySelector(".jia__item");
  if (first) open(first);
})();
