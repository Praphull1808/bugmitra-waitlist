// =========================================================
// BugMitra — Supabase Client
// =========================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CONFIG } from "./config.js";

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

/** Live total signups — used for the "X Developers Joined" counter. */
export async function getWaitlistCount() {
  const { data, error } = await supabase.rpc("get_waitlist_count");
  if (error) throw error;
  return data ?? 0;
}

/** Check for a duplicate email before we even attempt insert (fast UX feedback). */
export async function emailExists(email) {
  const { data, error } = await supabase.rpc("check_email_exists", { p_email: email });
  if (error) throw error;
  return !!data;
}

/** Resolve a ?ref=CODE value to a human-readable referrer, for the "referred by" UI hint. */
export async function resolveReferralCode(code) {
  if (!code) return null;
  const { data, error } = await supabase.rpc("resolve_referral_code", { p_code: code });
  if (error || !data || data.length === 0) return null;
  return data[0]; // { owner_email, owner_name }
}

/**
 * Main signup entry point. Delegates duplicate-check, referral-code
 * generation and position snapshotting to the DB function so the
 * client never needs privileged access.
 */
export async function submitWaitlistEntry({ fullName, email, skillLevel, codingProblem, referredBy }) {
  const { data, error } = await supabase.rpc("submit_waitlist_entry", {
    p_full_name: fullName,
    p_email: email,
    p_skill_level: skillLevel,
    p_coding_problem: codingProblem,
    p_referred_by: referredBy || null,
  });

  if (error) {
    if (error.message && error.message.includes("DUPLICATE_EMAIL")) {
      throw new Error("DUPLICATE_EMAIL");
    }
    throw error;
  }

  const row = data && data[0];
  return {
    id: row.out_id,
    referralCode: row.out_referral_code,
    position: row.out_position,
  };
}

/** Real-time rank — referrers climb this over time, unlike the static join-time position. */
export async function getLivePosition(email) {
  const { data, error } = await supabase.rpc("get_live_position", { p_email: email });
  if (error) throw error;
  return data;
}

/** Top referrers, safe to show publicly (first name + count only). */
export async function getReferralLeaderboard(limit = 10) {
  const { data, error } = await supabase.rpc("get_referral_leaderboard", { p_limit: limit });
  if (error) throw error;
  return data ?? [];
}
