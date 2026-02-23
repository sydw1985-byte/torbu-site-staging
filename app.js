/* ============================================================
   app.js — TORBU
   - Mobile drawer toggle
   - Industry accordion (single-open)
   - Hash auto-open for Water accordion
   - Contact form submit (Worker + Turnstile) [only if form exists]
   - Company Journey (scroll-activated + clickable nodes) [only if journey exists]
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

  // Close drawer when a link is clicked
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

    // Close others first
    closeAll(btn);

    // Toggle this one
    btn.setAttribute("aria-expanded", String(!isOpen));
    panel.hidden = isOpen;

    // IMPORTANT: do NOT change the "+" text here.
    // Keep "+" in markup and let CSS rotate it to form an "x".
  });

  // Ensure everything starts closed and consistent
  closeAll();
})();

/* Reads the hash and opens the Water accordion automatically (use case) */
(() => {
  // Auto-open a sector accordion from hash like #governance-open-water
  const h = window.location.hash || "";
  if (!h.includes("governance-open-water")) return;

  const root = document.getElementById("industryAccordion");
  if (!root) return;

  const gov = document.getElementById("governance");
  const btn = root.querySelector('.industryTrigger[aria-controls="panel-water"]');
  const panel = document.getElementById("panel-water");
  if (!btn || !panel) return;

  // Jump to governance first (no smooth on first jump)
  if (gov) gov.scrollIntoView({ behavior: "auto", block: "start" });

  // Close others (single-open accordion behavior)
  root.querySelectorAll('.industryTrigger[aria-expanded="true"]').forEach((b) => {
    b.setAttribute("aria-expanded", "false");
    const pid = b.getAttribute("aria-controls");
    const p = pid ? document.getElementById(pid) : null;
    if (p) p.hidden = true;
  });

  // Open water
  btn.setAttribute("aria-expanded", "true");
  panel.hidden = false;

  // Then scroll to the Water row so the user lands exactly there
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

    // Honeypot
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

    // Loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.remove("is-success");
      submitBtn.classList.add("is-loading");
    }

    // Required fields
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

      // Success micro-state before redirect
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

      // Restore button if we didn't navigate away
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove("is-loading");

        // If we didn't succeed, restore label
        if (!submitBtn.classList.contains("is-success") && label && originalLabel != null) {
          label.textContent = originalLabel;
        }
      }
    }
  });
})();

/* Company Journey (scroll-activated + clickable nodes) */
(() => {
  const nodesEl = document.getElementById("journeyNodes");
  const panelsEl = document.getElementById("journeyPanels");
  const fillEl = document.getElementById("journeyFill");
  const phaseEl = document.getElementById("journeyPhase");

  // Throughline reveals
  const jGov = document.getElementById("jGov");
  const jExec = document.getElementById("jExec");
  const jInfra = document.getElementById("jInfra");

  // If the section isn't on this page, do nothing
  if (!nodesEl || !panelsEl || !fillEl || !phaseEl) return;

  const DATA = [
    {
      years: "2018–2019",
      phase: "Foundation",
      title: "Structure first",
      summary: "We built on a simple principle: accountability flows from structure.",
      bullets: [
        "Designed role-based oversight for hierarchical systems",
        "Embedded verified records into daily workflow",
        "Modeled chains of command as governance flows",
        "Established the core logic that still runs the system",
      ],
      takeaway: "Structure drives accountability.",
    },
    {
      years: "2022",
      phase: "Architecture",
      title: "Architectural control",
      summary: "We rebuilt the system end to end and assumed full architectural ownership.",
      bullets: [
        "Consolidated engineering under direct control",
        "Implemented multi-level permissions and reporting",
        "Made stability and auditability design requirements",
        "Mirrored institutional hierarchy in software",
      ],
      takeaway: "Governance requires architectural ownership.",
    },
    {
      years: "2023",
      phase: "Expansion",
      title: "Certification & readiness",
      summary:
        "We expanded into certification systems and workforce readiness, deepening compliance logic in regulated environments.",
      bullets: [
        "Built adaptive learning and assessment engines",
        "Strengthened milestone validation and certification tracking",
        "Operationalized readiness analytics",
      ],
      takeaway: "Certification and compliance run on the same operating system.",
    },
    {
      years: "2024–2025",
      phase: "Rigor",
      title: "High-accountability environments",
      summary:
        "We prepared the system for enterprise modernization environments that demand documentation discipline and audit resilience.",
      bullets: [
        "Structured large-scale curriculum digitization",
        "Strengthened compliance and reporting infrastructure",
        "Demonstrated hierarchical oversight at enterprise scale",
        "Added elastic, AI-specialized engineering capacity",
      ],
      takeaway: "High-accountability environments sharpen architecture.",
    },
    {
      years: "2025 →",
      phase: "Infrastructure",
      title: "Statutory modernization",
      summary:
        "State legislatures are formalizing operator training, certification, and oversight into law. Modernization is shifting from discretionary programs to statutory mandate.",
      bullets: [
        "Standardized training and certification requirements",
        "Unified authority and defined accountability",
        "Long-horizon compliance environments",
      ],
      takeaway: "When modernization becomes law, governance software becomes essential infrastructure.",
      final: true,
    },
  ];

  const esc = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  // Render nodes
  nodesEl.innerHTML = DATA.map(
    (d, i) => `
      <div class="journey__node" data-index="${i}" role="button" tabindex="0" aria-label="Jump to ${esc(d.years)}">
        <div class="journey__dot ${d.final ? "is-final" : ""}" id="journeyDot-${i}"></div>
        <div class="journey__year" id="journeyYear-${i}">${esc(d.years)}</div>
      </div>
    `
  ).join("");

  // Render panels
  panelsEl.innerHTML = DATA.map(
    (d, i) => `
      <article class="journey__panel ${d.final ? "is-final" : ""}" id="journeyPanel-${i}" data-index="${i}" data-active="false">
        <div class="journey__meta">
          <span class="journey__tag">${esc(d.phase)}</span>
          <span class="journey__date">${esc(d.years)}</span>
        </div>

        <h3 class="journey__title">${esc(d.title)}</h3>
        <p class="journey__summary">${esc(d.summary)}</p>

        <ul class="journey__bullets">
          ${d.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}
        </ul>

        <div class="journey__takeaway">
          <div class="journey__takeawayLabel">Strategic takeaway</div>
          <p class="journey__takeawayText">${esc(d.takeaway)}</p>
        </div>
      </article>
    `
  ).join("");

  function setPhaseText(text) {
    phaseEl.classList.remove("is-show");
    requestAnimationFrame(() => {
      phaseEl.textContent = text;
      phaseEl.classList.add("is-show");
    });
  }

  // Header-aware scroll offset
  function scrollToPanel(panelEl) {
    if (!panelEl) return;
    const headerOffset = 92; // matches your :target scroll-margin-top
    const y = panelEl.getBoundingClientRect().top + window.pageYOffset - headerOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  let current = -1;

  function activate(idx) {
    if (idx === current) return;
    current = idx;

    DATA.forEach((_, i) => {
      const dot = document.getElementById(`journeyDot-${i}`);
      const yr = document.getElementById(`journeyYear-${i}`);
      const pn = document.getElementById(`journeyPanel-${i}`);

      dot?.classList.toggle("is-active", i === idx);
      yr?.classList.toggle("is-active", i === idx);
      if (pn) pn.dataset.active = i === idx ? "true" : "false";
    });

    const pct = DATA.length <= 1 ? 1 : idx / (DATA.length - 1);
    fillEl.style.width = `${pct * 100}%`;

    setPhaseText(DATA[idx].phase);

    // Crescendo reveals
    jGov?.classList.toggle("is-reveal", idx >= 1);
    jExec?.classList.toggle("is-reveal", idx >= 2);
    jInfra?.classList.toggle("is-reveal", idx >= 4);
  }

  // Node click -> scroll
  document.querySelectorAll(".journey__node").forEach((node) => {
    const jump = () => {
      const i = Number(node.dataset.index);
      scrollToPanel(document.getElementById(`journeyPanel-${i}`));
    };
    node.addEventListener("click", jump);
    node.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        jump();
      }
    });
  });

  // Scroll activation: pick most visible panel
  const panels = Array.from(document.querySelectorAll(".journey__panel"));
  const io = new IntersectionObserver(
    (entries) => {
      const best = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (best) activate(Number(best.target.dataset.index));
    },
    {
      root: null,
      rootMargin: "-18% 0px -52% 0px",
      threshold: [0.12, 0.25, 0.4, 0.6],
    }
  );

  panels.forEach((p) => io.observe(p));

  // Init
  activate(0);
})();
