// src/lib/config.ts

export const config = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  ADMIN_PASSCODE: process.env.ADMIN_PASSCODE || 'Jaish_18',
  GA_TRACKING_ID: process.env.GA_TRACKING_ID || '',
  CLARITY_PROJECT_ID: process.env.CLARITY_PROJECT_ID || '',
};