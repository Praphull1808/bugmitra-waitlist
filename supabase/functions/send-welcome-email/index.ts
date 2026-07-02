// =========================================================
// Supabase Edge Function: send-welcome-email
// Deploy with: supabase functions deploy send-welcome-email
// Set the secret with: supabase secrets set RESEND_API_KEY=re_xxxxx
// =========================================================
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("re_S8RQrkcr_8WpEatyCD2d9Uh8HdeprXmmu")!;
const FROM_ADDRESS = "BugMitra <hello@bugmitra.com>"; // must be a domain verified in Resend

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { fullName, email, position, referralCode, referralLink } = await req.json();

    if (!email || !fullName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const firstName = String(fullName).split(" ")[0];

    const html = `
      <div style="font-family:Arial,sans-serif;background:#0a0b12;padding:32px;color:#eef0f7;">
        <div style="max-width:480px;margin:0 auto;background:#12131e;border-radius:16px;padding:32px;border:1px solid #23253a;">
          <h1 style="font-size:20px;margin-bottom:12px;">🚀 Welcome to BugMitra Early Access</h1>
          <p style="color:#9498b3;font-size:14px;line-height:1.6;">
            Hi ${firstName}, thanks for joining the BugMitra waitlist —
            the Hindi/Hinglish coding help community for beginners.
          </p>
          <p style="margin:20px 0;font-size:15px;">
            You're currently <strong>#${position}</strong> on the waitlist.
          </p>
          <p style="color:#9498b3;font-size:14px;">Move up by referring friends:</p>
          <p style="margin:12px 0;">
            <a href="${referralLink}" style="color:#8fa4ff;word-break:break-all;">${referralLink}</a>
          </p>
          <p style="color:#666b8a;font-size:12px;margin-top:24px;">
            Discord community: Coming Soon 👀<br/>
            We'll email you the moment BugMitra launches.
          </p>
          <p style="color:#666b8a;font-size:12px;margin-top:20px;">— Team BugMitra · Fix Bugs. Learn Together.</p>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: email,
        subject: "🚀 Welcome to BugMitra Early Access",
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: errText }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
