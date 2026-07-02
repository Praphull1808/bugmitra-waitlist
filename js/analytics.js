// =========================================================
// BugMitra — Analytics (GA4 + Microsoft Clarity)
// =========================================================
import { CONFIG } from "./config.js";

let gaReady = false;

/** Injects the GA4 + Clarity snippets. Call once on page load. */
export function initAnalytics() {
  if (CONFIG.GA_MEASUREMENT_ID && !CONFIG.GA_MEASUREMENT_ID.includes("XXXX")) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA_MEASUREMENT_ID}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", CONFIG.GA_MEASUREMENT_ID);
    gaReady = true;
  }

  if (CONFIG.CLARITY_PROJECT_ID && !CONFIG.CLARITY_PROJECT_ID.includes("YOUR_")) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", CONFIG.CLARITY_PROJECT_ID);
  }

  trackScrollDepth();
}

/** Generic event tracker — fans out to GA4 (Clarity auto-captures its own events). */
export function trackEvent(name, params = {}) {
  if (gaReady && window.gtag) {
    window.gtag("event", name, params);
  }
}

export const Analytics = {
  ctaClick: (label) => trackEvent("cta_click", { label }),
  formSubmit: (success) => trackEvent("form_submit", { success }),
  referralClick: (channel) => trackEvent("referral_click", { channel }),
  conversion: (position) => trackEvent("conversion", { position }),
};

/** Fires scroll_depth events at 25/50/75/100%, once each per page load. */
function trackScrollDepth() {
  const fired = new Set();
  const thresholds = [25, 50, 75, 100];

  window.addEventListener("scroll", () => {
    const scrollPercent = Math.round(
      ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100
    );
    thresholds.forEach((t) => {
      if (scrollPercent >= t && !fired.has(t)) {
        fired.add(t);
        trackEvent("scroll_depth", { percent: t });
      }
    });
  }, { passive: true });
}
