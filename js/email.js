// =========================================================
// BugMitra — Email trigger (client side)
// The Resend API key must never be exposed in browser JS, so this
// just invokes a Supabase Edge Function that holds the real key.
// See: supabase/functions/send-welcome-email/index.ts
// =========================================================
import { supabase } from "./supabaseClient.js";

export async function sendWelcomeEmail({ fullName, email, position, referralCode, referralLink }) {
  const { error } = await supabase.functions.invoke("send-welcome-email", {
    body: { fullName, email, position, referralCode, referralLink },
  });

  if (error) {
    // Non-fatal: the signup itself already succeeded. Log and move on
    // so a flaky email provider never blocks the user's confirmation.
    console.warn("Welcome email failed to send:", error.message);
    return false;
  }
  return true;
}
