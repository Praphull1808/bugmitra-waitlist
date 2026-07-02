// =========================================================
// BugMitra — Central Config
// Fill these in with your own project values.
// Never put a service_role key here — only the public anon key.
// =========================================================

export const CONFIG = {
  SUPABASE_URL: "https://tttqtpfyfiuttwbhpody.supabase.co",        // e.g. https://xxxxx.supabase.co
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0dHF0cGZ5Zml1dHR3Ymhwb2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4Nzg2ODMsImV4cCI6MjA5ODQ1NDY4M30.eFsXcnz2UKtIQXS9IUFEFH1Vez0AKu7fK-znosX-gFo",

  // Google Analytics 4 measurement ID (e.g. "G-XXXXXXXXXX")
  GA_MEASUREMENT_ID: "G-XXXXXXXXXX",

  // Microsoft Clarity project ID
  CLARITY_PROJECT_ID: "YOUR_CLARITY_ID",

  SITE_URL: "https://bugmitra-waitlist.vercel.app/",

  // Referral reward thresholds (kept in sync with schema.sql triggers)
  REFERRAL_TIERS: [
    { count: 3, label: "Early Access", badge: "early_access" },
    { count: 10, label: "Lifetime Pro Badge", badge: "lifetime_pro" },
    { count: 25, label: "Exclusive Founder Badge", badge: "founder" },
  ],

  // Basic client-side spam guard: min seconds between two submits from this browser
  SUBMIT_COOLDOWN_SECONDS: 30,
};
