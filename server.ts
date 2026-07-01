/**
 * server.ts
 *
 * Full-stack Express backend serving both transactional APIs (database, email, admin controls)
 * and the Vite dev server/production asset pipeline.
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
// Load environment variables from .env early so `config` picks them up
dotenv.config();
console.log("ENV:", process.env.ADMIN_PASSCODE);
import { waitlistDb } from './src/lib/supabase';
import { generateReferralCode } from './src/lib/referral';
import { sendWelcomeEmail } from './src/lib/email';
import { config } from './src/lib/config';
import { Resend } from 'resend';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON and urlencoded body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ----------------- MIDDLEWARE: ADMIN ROUTE PROTECTION -----------------
  const authenticateAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawPass = req.headers['x-admin-passcode'] || req.query.passcode;
    const normalize = (v: any) => {
      if (v == null) return '';
      const s = Array.isArray(v) ? v[0] : String(v);
      return s.trim().replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
    };
    const adminPasscode = normalize(rawPass);
    const expected = normalize(config.ADMIN_PASSCODE);

    if (!adminPasscode || adminPasscode !== expected) {
      console.warn(`🔒 Admin auth failed. Provided="${adminPasscode}" expected="${expected}"`);
      res.status(401).json({ success: false, message: 'Unauthorized. Invalid admin passcode.' });
      return;
    }
    next();
  };

  // ----------------- API ENDPOINTS -----------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // DEV-ONLY: expose effective ADMIN_PASSCODE for local debugging
  if (process.env.NODE_ENV !== 'production') {
    app.get('/__debug/admin-passcode', (req, res) => {
      // Only allow local requests for safety
      const host = req.hostname || req.ip || '';
      if (!host.includes('localhost') && host !== '127.0.0.1' && host !== '::1') {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }
      res.json({ success: true, adminPasscode: config.ADMIN_PASSCODE });
    });
  }

  // POST: Create Waitlist Entry (Sign up)
  app.post('/api/waitlist', async (req, res) => {
    try {
      const { full_name, email, skill_level, coding_problem, referred_by } = req.body;

      // 1. Basic validation
      if (!full_name || !email || !skill_level || !coding_problem) {
        res.status(400).json({ success: false, message: 'All form fields are required.' });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();

      // 2. Check for duplicate email
      const existingUser = await waitlistDb.getByEmail(cleanEmail);
      if (existingUser) {
        res.status(200).json({
          success: true,
          isNew: false,
          message: 'Welcome back! You are already on our waitlist.',
          user: existingUser
        });
        return;
      }

      // 3. Setup referral code and register
      const referralCode = generateReferralCode(full_name);
      
      // Save entry to the database (handles Supabase insert, increments referral if referred_by is supplied)
      const user = await waitlistDb.create({
        full_name: full_name.trim(),
        email: cleanEmail,
        skill_level,
        coding_problem,
        referred_by: referred_by || null,
        referral_code: referralCode
      });

      // 4. Send Welcome Email via Resend
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const referralLink = `${appUrl}/?ref=${referralCode}`;
      await sendWelcomeEmail(user, referralLink);

      res.status(201).json({
        success: true,
        isNew: true,
        message: 'Thank you! You are on the BugMitra early access list.',
        user
      });
    } catch (error: any) {
      console.error('Error handling waitlist signup:', error);
      res.status(500).json({ success: false, message: error.message || 'Server error occurred during signup.' });
    }
  });

  // GET: Public Stats (Dynamic count and leaderboards)
  app.get('/api/stats', async (req, res) => {
    try {
      const allUsers = await waitlistDb.getAll();
      
      const totalUsers = allUsers.length;
      
      // Calculate today's signups
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todaySignups = allUsers.filter(u => new Date(u.joined_at).getTime() >= startOfToday.getTime()).length;

      // Build leaderboard: top users by referral count
      const referralLeaderboard = allUsers
        .filter(u => u.referral_count > 0)
        .sort((a, b) => b.referral_count - a.referral_count)
        .slice(0, 5)
        .map(u => ({
          full_name: u.full_name,
          referral_count: u.referral_count,
          position: u.position
        }));

      res.json({
        totalUsers: Math.max(totalUsers, 128), // Ensure it feels alive, starting with at least 128 if newly provisioned
        realCount: totalUsers,
        todaySignups,
        referralLeaderboard
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve stats.' });
    }
  });

  // POST: Admin Login Auth
  app.post('/api/admin/login', (req, res) => {
    const normalize = (v: any) => {
      if (v == null) return '';
      return String(v).trim().replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
    };
    const provided = normalize(req.body?.passcode);
    const expected = normalize(config.ADMIN_PASSCODE);

    if (provided === expected) {
      res.json({ success: true, message: 'Admin authentication successful.' });
    } else {
      console.warn(`🔒 Admin login failed POST. Provided="${provided}" expected="${expected}"`);
      res.status(401).json({ success: false, message: 'Invalid passcode.' });
    }
  });

  // GET: Admin Fetch Users List (Secured)
  app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
      const users = await waitlistDb.getAll();
      res.json({ success: true, users });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch users.' });
    }
  });

  // DELETE: Admin Delete User (Secured)
  app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await waitlistDb.delete(id);
      res.json({ success: true, message: 'User deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to delete user.' });
    }
  });

  // POST: Admin Broadcast Email to All (Secured)
  app.post('/api/admin/email-all', authenticateAdmin, async (req, res) => {
    try {
      const { subject, body } = req.body;
      if (!subject || !body) {
        res.status(400).json({ success: false, message: 'Subject and email body are required.' });
        return;
      }

      const users = await waitlistDb.getAll();
      if (users.length === 0) {
        res.status(400).json({ success: false, message: 'No registered users to email.' });
        return;
      }

      let emailsSent = 0;
      
      if (config.RESEND_API_KEY) {
        const resend = new Resend(config.RESEND_API_KEY);
        // Resend API allows sending emails (batching or single)
        for (const user of users) {
          try {
            await resend.emails.send({
              from: 'BugMitra Announcement <onboarding@resend.dev>',
              to: user.email,
              subject: subject,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0b0f19; color: #f1f5f9; border-radius: 12px; border: 1px solid #1e293b;">
                  <h2 style="color: #3b82f6;">BugMitra Update</h2>
                  <p>Hi ${user.full_name},</p>
                  <div style="line-height: 1.6; color: #cbd5e1; font-size: 15px; white-space: pre-wrap;">${body}</div>
                  <hr style="border: 0; border-top: 1px solid #1e293b; margin: 20px 0;" />
                  <p style="font-size: 12px; color: #64748b; text-align: center;">
                    BugMitra © 2026 | Noida, India. You received this because you signed up for the BugMitra waitlist.
                  </p>
                </div>
              `
            });
            emailsSent++;
          } catch (err) {
            console.error(`Failed to send broadcast email to ${user.email}:`, err);
          }
        }
      } else {
        console.log(`📡 [EMAIL BROADCAST SIMULATION] Subject: ${subject}`);
        console.log(`Content:\n${body}`);
        emailsSent = users.length;
      }

      res.json({ success: true, message: `Broadcast message dispatched to ${emailsSent} users.` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to broadcast emails.' });
    }
  });

  // ----------------- VITE DEVELOPMENT & STATIC ASSETS HANDLERS -----------------

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log("CONFIG:", config.ADMIN_PASSCODE);
  console.log(`🚀 Server successfully launched on port ${PORT}`);
  console.log(`🌐 Development URL: http://localhost:${PORT}`);
  console.log(`🔐 Debug: ADMIN_PASSCODE = "${config.ADMIN_PASSCODE}"`);
  console.log(`🔐 ENV ADMIN_PASSCODE = "${process.env.ADMIN_PASSCODE}"`);
});
}

startServer();
