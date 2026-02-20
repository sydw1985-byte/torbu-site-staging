const form = document.getElementById("contactForm");

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

  // scroll to governance section
  const gov = document.getElementById("governance");
  if (gov) gov.scrollIntoView({ behavior: "smooth", block: "start" });

  // open water panel
  const btn = root.querySelector('.industryTrigger[aria-controls="panel-water"]');
  const panel = document.getElementById("panel-water");
  if (!btn || !panel) return;

  // close others if your accordion is one-open-at-a-time
  root.querySelectorAll('.industryTrigger[aria-expanded="true"]').forEach(b => {
    b.setAttribute("aria-expanded", "false");
    const pid = b.getAttribute("aria-controls");
    const p = pid ? document.getElementById(pid) : null;
    if (p) p.hidden = true;
  });

  btn.setAttribute("aria-expanded", "true");
  panel.hidden = false;
})();

/* Contact form submit (Worker + Turnstile) */
if (form) {
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

    // Put button into loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.remove("is-success");
      submitBtn.classList.add("is-loading");
      if (label && originalLabel == null) label.textContent = "Send";
    }

    // Required fields
    const name = form.name.value.trim();
    const org = (form.org?.value || "").trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

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

        // Brief pause so the user sees confirmation
        await new Promise((r) => setTimeout(r, 450));
      }

      window.location.href = "./thank-you.html";
    } catch (err) {
      console.error(err);
      alert(err?.message || "Could not send. Please try again.");
    } finally {
      try { window.turnstile.reset(widget); } catch {}

      // Restore button if we didn't navigate away
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove("is-loading");

        // If we didn't succeed, ensure label is restored
        if (!submitBtn.classList.contains("is-success") && label && originalLabel != null) {
          label.textContent = originalLabel;
        }
      }
    }
  });
}
