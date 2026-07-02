// =========================================================
// Supabase Edge Function: email-all-users
// Called only from the admin dashboard, with the admin's Supabase
// Auth JWT attached — verified below before anything is sent.
// Deploy with: supabase functions deploy email-all-users
// =========================================================
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("re_DSND9Lbb_JatdMeUKU2ZA2SKe6RQG9btu")!;
const SUPABASE_URL = Deno.env.get("https://tttqtpfyfiuttwbhpody.supabase.co")!;
const SERVICE_ROLE_KEY = Deno.env.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0dHF0cGZ5Zml1dHR3Ymhwb2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4Nzg2ODMsImV4cCI6MjA5ODQ1NDY4M30.eFsXcnz2UKtIQXS9IUFEFH1Vez0AKu7fK-znosX-gFo")!;
const FROM_ADDRESS = "BugMitra <hello@bugmitra.com>";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace("Bearer ", "");

  // Verify the caller is a logged-in admin before doing anything.
  const authedClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await authedClient.auth.getUser(jwt);
  if (userErr || !userData?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { data: admin } = await authedClient
    .from("admins")
    .select("email")
    .eq("email", userData.user.email)
    .maybeSingle();

  if (!admin) {
    return new Response(JSON.stringify({ error: "Forbidden: not an admin" }), { status: 403 });
  }

  const { subject, message } = await req.json();
  if (!subject || !message) {
    return new Response(JSON.stringify({ error: "subject and message are required" }), { status: 400 });
  }

  const { data: users, error: usersErr } = await authedClient
    .from("waitlist")
    .select("email, full_name");

  if (usersErr) {
    return new Response(JSON.stringify({ error: usersErr.message }), { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  // Resend's batch endpoint caps at 100/request — chunk accordingly.
  const chunkSize = 100;
  for (let i = 0; i < users.length; i += chunkSize) {
    const chunk = users.slice(i, i + chunkSize);
    const batch = chunk.map((u) => ({
      from: FROM_ADDRESS,
      to: u.email,
      subject,
      html: `<p>Hi ${String(u.full_name).split(" ")[0]},</p><p>${message}</p><p>— Team BugMitra</p>`,
    }));

    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch),
    });

    if (res.ok) sent += chunk.length;
    else failed += chunk.length;
  }

  return new Response(JSON.stringify({ sent, failed, total: users.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
