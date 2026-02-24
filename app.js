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
      title: "Accountability needs structure.",
      narrative: "STRIDE launched as a supervision platform for academic sports — a domain with real chains of command, compliance obligations, and outcome tracking. We built role-based oversight, structured daily records, and supervisor visibility into the platform from day one. The operating principle that emerged: you can't enforce accountability without first defining structure.",
      takeaway: "Structure before content. That principle still runs the platform.",
      final: false,
    },
    {
      years: "2022",
      phase: "Rebuild",
      title: "We built it to institutional grade.",
      narrative: "Early prototyping taught us what regulated environments actually require. We moved engineering in-house and rebuilt the platform from the ground up — establishing direct architectural control, stable multi-level permissions, and audit-grade recordkeeping. This wasn't a course correction; it was the R&D phase that made everything after it possible.",
      takeaway: "You can't govern at scale without owning the architecture beneath it.",
      final: false,
    },
    {
      years: "2022–2024",
      phase: "Education",
      title: "Certification runs on the same logic.",
      narrative: "We expanded into K–12, CTE programs, and structured learning environments. Certification tracking, compliance workflows, and hierarchical oversight all translated directly from sports. This phase deepened the platform's compliance logic and confirmed a pattern: the same governance architecture that works for coaches works for teachers, program directors, and certification bodies.",
      takeaway: "Certification and compliance run on identical operating logic.",
      final: false,
    },
    {
      years: "2022–2025",
      phase: "Regulated Systems",
      title: "High-accountability environments built the architecture.",
      narrative: "We took the platform into federal training environments — and this is where chain-of-command architecture was genuinely built and stress-tested. Large-scale curriculum digitization, hierarchical readiness analytics, multi-level oversight at enterprise scale. The operating conditions were the most demanding we'd encountered, and the platform held. This phase produced the architecture that regulated infrastructure deployment requires.",
      takeaway: "Seven years of R&D. The platform held under federal-grade scrutiny.",
      final: false,
    },
    {
      years: "2025 →",
      phase: "Infrastructure",
      title: "The landscape is shifting toward mandate.",
      narrative: "Across regulated infrastructure — utilities, public works, critical systems — operator training and oversight are moving from best practice to legal requirement. The governance logic we built across seven years maps directly to what these mandates require: defined authority, structured certification, and verified records. The platform was built for exactly this transition.",
      takeaway: "When oversight becomes law, the systems that run it become infrastructure.",
      final: true,
    },
  ];

  let current = -1;

  /* ── Build rail nodes ── */
  rail.innerHTML = DATA.map((d, i) => `
    <button
      class="ji__node${d.final ? " is-final" : ""}"
      data-index="${i}"
      aria-label="${d.years}: ${d.phase}"
    >
      <div class="ji__dot"></div>
      <div class="ji__year">${d.years}</div>
      <div class="ji__phase">${d.phase}</div>
    </button>
  `).join("");

  /* ── Render panel content ── */
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

  /* ── Activate a node with crossfade ── */
  function activate(idx, direction = 1) {
    if (idx === current) return;
    const prev = current;
    current = Math.max(0, Math.min(DATA.length - 1, idx));
    const d = DATA[current];

    /* Update nodes */
    document.querySelectorAll(".ji__node").forEach((n, i) => {
      n.classList.toggle("is-active", i === current);
    });

    /* Rail fill */
    const pct = DATA.length <= 1 ? 100 : (current / (DATA.length - 1)) * 100;
    rail.style.setProperty("--fill", `${pct}%`);

    /* Panel final state */
    panel.classList.toggle("is-final", d.final);

    /* First render: no crossfade */
    if (prev === -1) {
      content.innerHTML = renderContent(current);
    } else {
      /* Crossfade */
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
      }, 180);
    }

    /* Nav buttons */
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current === DATA.length - 1;
    if (counter) counter.textContent = `${current + 1} / ${DATA.length}`;
  }

  /* ── Node clicks ── */
  rail.addEventListener("click", (e) => {
    const btn = e.target.closest(".ji__node");
    if (!btn) return;
    activate(Number(btn.dataset.index));
  });

  /* ── Arrow nav ── */
  if (prevBtn) prevBtn.addEventListener("click", () => activate(current - 1, -1));
  if (nextBtn) nextBtn.addEventListener("click", () => activate(current + 1,  1));

  /* ── Init ── */
  activate(0);
})();
