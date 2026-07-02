// =========================================================
// BugMitra — Main
// UI markup/animations are unchanged; this file only replaces
// the old localStorage logic with real backend calls.
// =========================================================
import { initAnalytics, Analytics } from "./analytics.js";
import {
  getWaitlistCount,
  submitWaitlistEntry,
  getLivePosition,
  resolveReferralCode,
} from "./supabaseClient.js";
import {
  getReferralCodeFromURL,
  stashReferralCode,
  getStashedReferralCode,
  buildReferralLink,
  nextTierProgress,
  shareLinks,
} from "./referral.js";
import { sendWelcomeEmail } from "./email.js";
import { sanitizeText, isValidEmail, honeypotTripped, isRateLimited, markSubmitted } from "./security.js";

initAnalytics();

// ---------- Scroll reveal (unchanged) ----------
const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
}, { threshold: 0.12 });
revealEls.forEach((el) => io.observe(el));

// ---------- FAQ accordion (unchanged) ----------
document.querySelectorAll(".faq-item").forEach((item) => {
  item.querySelector(".faq-q").addEventListener("click", () => {
    const isOpen = item.classList.contains("open");
    document.querySelectorAll(".faq-item").forEach((i) => i.classList.remove("open"));
    if (!isOpen) item.classList.add("open");
  });
});

// ---------- CTA click tracking ----------
document.querySelectorAll('a[href="#waitlist"]').forEach((el) => {
  el.addEventListener("click", () => Analytics.ctaClick(el.textContent.trim()));
});

// ---------- Live "Developers Joined" counter ----------
async function refreshLiveCounter() {
  const el = document.getElementById("liveCount");
  if (!el) return;
  try {
    const count = await getWaitlistCount();
    animateCount(el, count);
  } catch (err) {
    console.warn("Could not load live count:", err.message);
  }
}

function animateCount(el, target) {
  const start = 0;
  const duration = 900;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.round(start + (target - start) * progress).toLocaleString("en-IN");
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ---------- Referral capture on landing ----------
const refFromURL = getReferralCodeFromURL();
if (refFromURL) stashReferralCode(refFromURL);

async function showReferrerHint() {
  const code = getStashedReferralCode();
  const hint = document.getElementById("referrerHint");
  if (!code || !hint) return;
  const referrer = await resolveReferralCode(code).catch(() => null);
  if (referrer && referrer.owner_name) {
    hint.textContent = `You were invited by ${referrer.owner_name.split(" ")[0]} 👋`;
    hint.style.display = "block";
  }
}

// ---------- Waitlist form ----------
const form = document.getElementById("waitlistForm");
const formState = document.getElementById("formState");
const successState = document.getElementById("successState");
const waitlistPosition = document.getElementById("waitlistPosition");
const submitBtn = form.querySelector(".submit-btn");
const submitBtnLabel = submitBtn ? submitBtn.textContent : "Join Early Access";

function setFieldError(fieldId, show) {
  const field = document.getElementById(fieldId);
  field.classList.toggle("invalid", show);
}

function setLoading(isLoading) {
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
  submitBtn.innerHTML = isLoading
    ? `<span class="btn-spinner"></span> Joining...`
    : submitBtnLabel;
}

function showFormLevelError(message) {
  let el = document.getElementById("formLevelError");
  if (!el) {
    el = document.createElement("p");
    el.id = "formLevelError";
    el.className = "field-error";
    el.style.display = "block";
    el.style.textAlign = "center";
    el.style.marginTop = "10px";
    form.appendChild(el);
  }
  el.textContent = message;
}

function clearFormLevelError() {
  const el = document.getElementById("formLevelError");
  if (el) el.remove();
}

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  clearFormLevelError();

  // Honeypot — silently succeed-looking but do nothing, so bots don't learn to adapt.
  if (honeypotTripped(form)) return;

  if (isRateLimited()) {
    showFormLevelError("You've already joined recently. Check your inbox for confirmation.");
    return;
  }

  const name = sanitizeText(document.getElementById("name").value);
  const email = sanitizeText(document.getElementById("email").value).toLowerCase();
  const skill = document.getElementById("skill").value;
  const problem = document.getElementById("problem").value;

  let valid = true;
  setFieldError("field-name", name.length === 0); if (name.length === 0) valid = false;
  setFieldError("field-email", !isValidEmail(email)); if (!isValidEmail(email)) valid = false;
  setFieldError("field-skill", skill.length === 0); if (skill.length === 0) valid = false;
  setFieldError("field-problem", problem.length === 0); if (problem.length === 0) valid = false;

  if (!valid) return;

  setLoading(true);

  try {
    const referredBy = getStashedReferralCode();
    const result = await submitWaitlistEntry({
      fullName: name,
      email,
      skillLevel: skill,
      codingProblem: problem,
      referredBy,
    });

    markSubmitted();
    Analytics.formSubmit(true);
    Analytics.conversion(result.position);

    const referralLink = buildReferralLink(result.referralCode);

    // Best-effort welcome email — never blocks the success UI.
    sendWelcomeEmail({
      fullName: name,
      email,
      position: result.position,
      referralCode: result.referralCode,
      referralLink,
    });

    renderSuccess({ name, email, position: result.position, referralLink });
    refreshLiveCounter();
  } catch (err) {
    Analytics.formSubmit(false);
    if (err.message === "DUPLICATE_EMAIL") {
      setFieldError("field-email", true);
      document.querySelector("#field-email .field-error").textContent =
        "This email is already on the waitlist.";
      setFieldError("field-email", true);
    } else {
      showFormLevelError("Something went wrong. Please try again in a moment.");
      console.error(err);
    }
  } finally {
    setLoading(false);
  }
});

function renderSuccess({ name, position, referralLink }) {
  waitlistPosition.textContent = `You're #${position} on the waitlist`;

  const firstName = name.split(" ")[0];
  const heading = successState.querySelector("h3");
  if (heading) heading.textContent = `🎉 Welcome ${firstName}!`;

  populateReferralBlock(referralLink);

  formState.style.display = "none";
  successState.style.display = "block";
  fireConfetti();
}

function populateReferralBlock(referralLink) {
  let block = document.getElementById("referralBlock");
  if (!block) {
    block = document.createElement("div");
    block.id = "referralBlock";
    block.className = "referral-block";
    successState.appendChild(block);
  }

  const progress = nextTierProgress(0);
  const links = shareLinks(referralLink, "Main BugMitra join kar liya — Hindi/Hinglish coding help community. Tum bhi join karo:");

  block.innerHTML = `
    <div class="referral-link-row">
      <input type="text" readonly value="${referralLink}" id="referralLinkInput" />
      <button type="button" class="copy-btn" id="copyReferralBtn">Copy</button>
    </div>
    <p class="referral-note">Refer friends to move up the list. ${progress ? `${progress.remaining} more to unlock ${progress.tier.label}.` : ""}</p>
    <div class="share-row">
      <a href="${links.whatsapp}" target="_blank" rel="noopener" class="share-btn wa" data-channel="whatsapp"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
      <a href="${links.linkedin}" target="_blank" rel="noopener" class="share-btn li" data-channel="linkedin"><i class="fa-brands fa-linkedin"></i> LinkedIn</a>
      <a href="${links.twitter}" target="_blank" rel="noopener" class="share-btn tw" data-channel="twitter"><i class="fa-brands fa-x-twitter"></i> X</a>
    </div>
  `;

  document.getElementById("copyReferralBtn").addEventListener("click", async () => {
    await navigator.clipboard.writeText(referralLink);
    const btn = document.getElementById("copyReferralBtn");
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = "Copy"), 1800);
  });

  block.querySelectorAll(".share-btn").forEach((btn) => {
    btn.addEventListener("click", () => Analytics.referralClick(btn.dataset.channel));
  });
}

function fireConfetti() {
  if (typeof window.confetti !== "function") return;
  window.confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#5b7cff", "#a25bff", "#34d399", "#ffffff"],
  });
}

// ---------- Boot ----------
refreshLiveCounter();
showReferrerHint();
