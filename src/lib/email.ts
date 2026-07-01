/**
 * src/lib/email.ts
 *
 * This file handles email notifications using the Resend API.
 * In development / preview mode where RESEND_API_KEY is not set,
 * it safely logs the email contents to the console so that the application does not crash.
 */

import { Resend } from 'resend';
import { config } from './config';
import { WaitlistUser } from '../types';

let resendClient: Resend | null = null;

if (config.RESEND_API_KEY) {
  try {
    resendClient = new Resend(config.RESEND_API_KEY);
    console.log('🚀 Resend client initialized successfully.');
  } catch (error) {
    console.error('⚠️ Failed to initialize Resend client:', error);
  }
} else {
  console.log('📦 Resend API key not set. Email notifications will be printed to server logs during preview.');
}

/**
 * Sends a welcome email to the newly signed-up user.
 */
export async function sendWelcomeEmail(user: WaitlistUser, referralLink: string): Promise<boolean> {
  const subject = '🚀 Welcome to BugMitra Early Access';
  
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #0b0f19; color: #f1f5f9; border-radius: 16px; border: 1px solid #1e293b; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #1e293b; padding-bottom: 20px;">
        <span style="font-size: 32px; font-weight: bold; background: linear-gradient(to right, #3b82f6, #8b5cf6); -webkit-background-clip: text; color: #3b82f6; display: inline-block;">BugMitra</span>
        <p style="color: #94a3b8; font-size: 14px; margin: 5px 0 0 0; letter-spacing: 0.5px;">Fix Bugs. Learn Together.</p>
      </div>
      
      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 20px; color: #ffffff; margin-top: 0; font-weight: 600;">Namaste ${user.full_name}! 👋</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px;">
          Thank you for joining the early access waitlist for <strong>BugMitra</strong> - India's premium Hindi/Hinglish coding error-solving community designed specifically for beginner developers.
        </p>
        
        <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
          <span style="font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: #93c5fd; display: block; margin-bottom: 8px; font-weight: 500;">Your Waitlist Position</span>
          <strong style="font-size: 42px; color: #ffffff; text-shadow: 0 0 10px rgba(59, 130, 246, 0.5); font-family: 'Courier New', Courier, monospace;">#${user.position}</strong>
          <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">Refer friends to move higher up the rank and secure your spot!</p>
        </div>
      </div>
      
      <div style="background-color: rgba(30, 41, 59, 0.3); border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #a78bfa; font-size: 16px; margin-top: 0; margin-bottom: 12px; font-weight: 600;">🔥 Referral System & Milestone Tiers</h3>
        <p style="font-size: 13.5px; line-height: 1.5; color: #94a3b8; margin-bottom: 15px;">
          For every developer that joins using your referral link, you jump ahead of other users and unlock exclusive founder badges:
        </p>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #f1f5f9;"><strong>3 Referrals</strong></td>
            <td style="padding: 10px 0; color: #60a5fa; text-align: right;">🚀 Early Access Beta</td>
          </tr>
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #f1f5f9;"><strong>10 Referrals</strong></td>
            <td style="padding: 10px 0; color: #c084fc; text-align: right;">✨ Lifetime Pro Badge</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #f1f5f9;"><strong>25 Referrals</strong></td>
            <td style="padding: 10px 0; color: #f59e0b; text-align: right;">👑 Exclusive Founder Badge</td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <p style="font-size: 14px; color: #94a3b8; margin-bottom: 12px;">Share your custom link to start climbing:</p>
        <a href="${referralLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 14px; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);">Copy Referral Link</a>
        <p style="font-size: 11px; color: #64748b; margin-top: 10px; word-break: break-all;">${referralLink}</p>
      </div>
      
      <div style="border-top: 1px solid #1e293b; padding-top: 20px; font-size: 13px; color: #94a3b8; line-height: 1.6;">
        <p style="margin: 5px 0;"><strong>👾 Discord Server:</strong> Coming soon! We will send you an exclusive Discord invite in a separate email shortly.</p>
        <p style="margin: 5px 0;"><strong>📅 Launch Update:</strong> Expected Q3 2026. Get ready to fix code, share screenshots, and level up with peer support.</p>
      </div>
      
      <div style="text-align: center; margin-top: 35px; border-top: 1px solid #1e293b; padding-top: 15px; font-size: 11px; color: #475569;">
        <p style="margin: 0;">BugMitra © 2026 | Noida, India</p>
        <p style="margin: 5px 0 0 0;">If you did not sign up for this list, please ignore this email.</p>
      </div>
    </div>
  `;

  if (resendClient) {
    try {
      // Since Resend has a default sender 'onboarding@resend.dev' for free sandboxes, we default to it.
      // If the user configures their domain they can customize it.
      const fromEmail = 'BugMitra <onboarding@resend.dev>';
      await resendClient.emails.send({
        from: fromEmail,
        to: user.email,
        subject: subject,
        html: htmlContent,
      });
      console.log(`📧 Successful Welcome Email sent via Resend API to: ${user.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send transactional email via Resend:', error);
      // Fail gracefully so as not to abort waitlist insertion
    }
  }

  // Debug/Sandbox Logging
  console.log(`
========================================================================
📧 [EMAIL SIMULATION LOG]
------------------------------------------------------------------------
To: ${user.email}
Subject: ${subject}
Waitlist Rank: #${user.position}
Referral Link: ${referralLink}
========================================================================
  `);
  return true;
}
