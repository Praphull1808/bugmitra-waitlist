// =========================================================
// BugMitra — Referral helpers (client-side)
// =========================================================
import { CONFIG } from "./config.js";

/** Reads ?ref=CODE from the current URL, if present. */
export function getReferralCodeFromURL() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  return ref ? ref.trim().toUpperCase() : null;
}

/** Persist the referral code for the session so it survives a page reload before signup. */
export function stashReferralCode(code) {
  if (code) sessionStorage.setItem("bugmitra_ref", code);
}

export function getStashedReferralCode() {
  return sessionStorage.getItem("bugmitra_ref");
}

/** Builds the shareable referral link for a given code. */
export function buildReferralLink(code) {
  return `${CONFIG.SITE_URL}/?ref=${encodeURIComponent(code)}`;
}

/** Which reward tier a referral count currently qualifies for. */
export function currentTier(referralCount) {
  const tiers = CONFIG.REFERRAL_TIERS;
  let unlocked = null;
  for (const tier of tiers) {
    if (referralCount >= tier.count) unlocked = tier;
  }
  return unlocked; // null if below the first tier
}

/** Referrals needed to hit the next tier, for "2 more referrals to unlock X" messaging. */
export function nextTierProgress(referralCount) {
  const tiers = CONFIG.REFERRAL_TIERS;
  for (const tier of tiers) {
    if (referralCount < tier.count) {
      return { tier, remaining: tier.count - referralCount };
    }
  }
  return null; // all tiers unlocked
}

export function shareLinks(referralLink, message) {
  const text = encodeURIComponent(message);
  const url = encodeURIComponent(referralLink);
  return {
    whatsapp: `https://wa.me/?text=${text}%20${url}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
  };
}
