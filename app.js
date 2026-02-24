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

/* Company Journey (scroll-activated + clickable nodes) */
(() => {
  const nodesEl = document.getElementById("journeyNodes");
  const panelsEl = document.getElementById("journeyPanels");
  const fillEl = document.getElementById("journeyFill");
  const phaseEl = document.getElementById("journeyPhase");

  const jGov = document.getElementById("jGov");
  const jExec = document.getElementById("jExec");
  const jInfra = document.getElementById("jInfra");

  if (!nodesEl || !panelsEl || !fillEl || !phaseEl) return;

  const DATA = [
    {
      years: "2018–2019",
      phase: "Sports",
      title: "Every team needs a system.",
      summary: "We started in academic sports — real chains of command, real oversight requirements. We learned quickly that accountability isn't a culture problem. It's a structure problem.",
      bullets: [
        "Built role-based oversight for coaches, athletes, and administrators",
        "Replaced scattered records with structured, verifiable daily logs",
        "Designed the chain-of-command logic the platform still runs on",
      ],
      takeaway: "Structure is what makes accountability real.",
    },
    {
      years: "2022",
      phase: "Architecture",
      title: "We rebuilt it to last.",
      summary: "We moved engineering in-house and rebuilt the platform from the ground up — designed for institutional scale, not just sports teams.",
      bullets: [
        "Full rebuild under direct engineering ownership",
        "Multi-level permissions that mirror real organizational hierarchy",
        "Stability and audit-readiness designed in from the start",
      ],
      takeaway: "If you want to govern at scale, you have to own the architecture.",
    },
    {
      years: "2022–2024",
      phase: "Education",
      title: "Schools run on the same logic.",
      summary: "We expanded into structured learning environments and found that the same system that worked for coaches worked for teachers, districts, and certification programs.",
      bullets: [
        "Adaptive learning paths and assessment tools built out",
        "Deployed across K–12, CTE, and enrichment programs",
        "Compliance infrastructure validated across structured learning environments",
      ],
      takeaway: "Certification and compliance are the same operating problem.",
    },
    {
      years: "2024–2025",
      phase: "Regulated Systems",
      title: "Proven where the stakes are highest.",
      summary: "We took the platform into high-accountability federal training environments — and confirmed it holds under the most demanding oversight conditions.",
      bullets: [
        "Large-scale curriculum digitization across regulated programs",
        "Readiness analytics deployed in high-accountability settings",
        "Hierarchical oversight validated at enterprise scale",
        "Engineering capacity scaled for government-grade deployment",
      ],
      takeaway: "The platform held. That's the point.",
    },
    {
      years: "2025 →",
      phase: "Public Infrastructure",
      title: "The landscape is shifting.",
      summary: "Across regulated infrastructure — utilities, public works, critical systems — operator training and oversight are moving from best practice to legal requirement. The platform was built for exactly this transition.",
      bullets: [
        "Workforce certification and oversight becoming statutory in key sectors",
        "Unified accountability replacing fragmented, paper-based compliance",
        "Long-horizon mandates replacing discretionary programs",
        "The same governance logic scales across every regulated sector",
      ],
      takeaway: "When oversight becomes law, governance software becomes essential infrastructure.",
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

  nodesEl.innerHTML = DATA.map(
    (d, i) => `
      <div class="journey__node" data-index="${i}" role="button" tabindex="0" aria-label="Jump to ${esc(d.years)}">
        <div class="journey__dot ${d.final ? "is-final" : ""}" id="journeyDot-${i}"></div>
        <div class="journey__year" id="journeyYear-${i}">${esc(d.years)}</div>
      </div>
    `
  ).join("");

  panelsEl.innerHTML = DATA.map(
    (d, i) => `
      <article class="journey__panel ${d.final ? "is-final" : ""}" id="journeyPanel-${i}" data-index="${i}" data-active="false">
        <div class="journey__meta">
          <span class="journey__tag">${esc(d.phase)}</span>
          <span class="journey__date">${esc(d.years)}</span>
        </div>
        <h3 class="journey__title">${esc(d.title)}</h3>
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

  function scrollToPanel(panelEl) {
    if (!panelEl) return;
    const headerOffset = 92;
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

    jGov?.classList.toggle("is-reveal", idx >= 1);
    jExec?.classList.toggle("is-reveal", idx >= 2);
    jInfra?.classList.toggle("is-reveal", idx >= 4);
  }

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

  activate(0);
})();
