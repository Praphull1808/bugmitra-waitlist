/**
 * src/lib/supabase.ts
 *
 * This file handles database operations for the BugMitra waitlist.
 * It features a dual-mode storage solution:
 * 1. SUPABASE MODE: If SUPABASE_URL and SUPABASE_ANON_KEY are provided, it uses the official Supabase JS SDK.
 * 2. LOCAL DEV MODE: If keys are missing, it falls back to a clean local file database (`src/db/waitlist_db.json`)
 *    so that the app runs flawlessly in the AI Studio preview sandbox without immediate setup!
 *
 * ==========================================
 * SUPABASE SQL SCHEMA:
 * ==========================================
 * Run this SQL script in your Supabase SQL Editor:
 *
 * CREATE TABLE waitlist (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   full_name TEXT NOT NULL,
 *   email TEXT NOT NULL UNIQUE,
 *   skill_level TEXT NOT NULL CHECK (skill_level IN ('Beginner', 'Student', 'Freelancer', 'Developer')),
 *   coding_problem TEXT NOT NULL CHECK (coding_problem IN ('HTML', 'CSS', 'JavaScript', 'Python', 'React', 'Other')),
 *   referral_code TEXT NOT NULL UNIQUE,
 *   referred_by TEXT,
 *   referral_count INTEGER DEFAULT 0 NOT NULL,
 *   position INTEGER DEFAULT 0 NOT NULL,
 *   joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
 * );
 *
 * -- Enable Row Level Security
 * ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
 *
 * -- Create standard policies
 * CREATE POLICY "Allow public insert" ON waitlist FOR INSERT WITH CHECK (true);
 * CREATE POLICY "Allow public select" ON waitlist FOR SELECT USING (true);
 * CREATE POLICY "Allow public update" ON waitlist FOR UPDATE USING (true);
 * CREATE POLICY "Allow public delete" ON waitlist FOR DELETE USING (true);
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WaitlistUser } from '../types';
import { config } from './config';
import * as path from 'path';
import * as fs from 'fs/promises';

const DB_PATH = path.join(process.cwd(), 'src/db/waitlist_db.json');

// Initialize Supabase Client if keys are provided
let supabaseClient: SupabaseClient | null = null;
const useSupabase = !!(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && config.SUPABASE_URL !== 'https://your-project.supabase.co');

if (useSupabase) {
  try {
    supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    console.log('🚀 Supabase client initialized successfully.');
  } catch (error) {
    console.error('⚠️ Failed to initialize Supabase client:', error);
  }
} else {
  console.log('📦 Supabase keys not set. Falling back to local file-based database for preview mode.');
}

// ----------------- LOCAL FILE DATABASE IMPLEMENTATION -----------------
async function ensureLocalDbDir(): Promise<void> {
  const dir = path.dirname(DB_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    // Ignore if directory exists
  }
}

async function readLocalUsers(): Promise<WaitlistUser[]> {
  await ensureLocalDbDir();
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data) as WaitlistUser[];
  } catch (err) {
    // Return empty array if file doesn't exist
    return [];
  }
}

async function writeLocalUsers(users: WaitlistUser[]): Promise<void> {
  await ensureLocalDbDir();
  await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2), 'utf-8');
}

// Re-calculate positions for all users
// Sort users by referral_count (descending), then by joined_at (ascending)
function recalculatePositions(users: WaitlistUser[]): WaitlistUser[] {
  const sorted = [...users].sort((a, b) => {
    if (b.referral_count !== a.referral_count) {
      return b.referral_count - a.referral_count;
    }
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });

  return users.map(user => {
    const idx = sorted.findIndex(u => u.id === user.id);
    return {
      ...user,
      position: idx + 1
    };
  });
}

// ----------------- EXPORTED DATABASE ADAPTER -----------------
export const waitlistDb = {
  /**
   * Get all users in the waitlist
   */
  async getAll(): Promise<WaitlistUser[]> {
    if (useSupabase && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('waitlist')
        .select('*');
      
      if (error) {
        console.error('Supabase error in getAll:', error);
        throw error;
      }
      
      // Sort in-memory or return
      const mapped = (data || []) as WaitlistUser[];
      return recalculatePositions(mapped);
    } else {
      const users = await readLocalUsers();
      return recalculatePositions(users);
    }
  },

  /**
   * Find a user by their email address
   */
  async getByEmail(email: string): Promise<WaitlistUser | null> {
    const trimmedEmail = email.trim().toLowerCase();
    if (useSupabase && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('waitlist')
        .select('*')
        .eq('email', trimmedEmail)
        .maybeSingle();
      
      if (error) {
        console.error('Supabase error in getByEmail:', error);
        throw error;
      }
      
      if (!data) return null;
      // Get all users to calculate current dynamic position
      const all = await this.getAll();
      return all.find(u => u.id === data.id) || (data as WaitlistUser);
    } else {
      const users = await readLocalUsers();
      const all = recalculatePositions(users);
      return all.find(u => u.email.toLowerCase() === trimmedEmail) || null;
    }
  },

  /**
   * Find a user by their referral code
   */
  async getByReferralCode(code: string): Promise<WaitlistUser | null> {
    if (!code) return null;
    if (useSupabase && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('waitlist')
        .select('*')
        .eq('referral_code', code)
        .maybeSingle();
      
      if (error) {
        console.error('Supabase error in getByReferralCode:', error);
        throw error;
      }
      
      if (!data) return null;
      const all = await this.getAll();
      return all.find(u => u.id === data.id) || (data as WaitlistUser);
    } else {
      const users = await readLocalUsers();
      const all = recalculatePositions(users);
      return all.find(u => u.referral_code === code) || null;
    }
  },

  /**
   * Create a new waitlist user sign-up
   */
  async create(user: {
    full_name: string;
    email: string;
    skill_level: string;
    coding_problem: string;
    referred_by: string | null;
    referral_code: string;
  }): Promise<WaitlistUser> {
    const trimmedEmail = user.email.trim().toLowerCase();
    
    // Check if duplicate exists
    const existing = await this.getByEmail(trimmedEmail);
    if (existing) {
      throw new Error('This email is already registered on the waitlist.');
    }

    if (useSupabase && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('waitlist')
        .insert({
          full_name: user.full_name,
          email: trimmedEmail,
          skill_level: user.skill_level,
          coding_problem: user.coding_problem,
          referral_code: user.referral_code,
          referred_by: user.referred_by || null,
          referral_count: 0,
          position: 0, // Will recalculate
          joined_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error in create:', error);
        throw error;
      }

      // If referred by someone, increment their referral count
      if (user.referred_by) {
        await this.incrementReferralCount(user.referred_by);
      }

      const all = await this.getAll();
      return all.find(u => u.id === data.id) || (data as WaitlistUser);
    } else {
      const users = await readLocalUsers();
      const newUser: WaitlistUser = {
        id: Math.random().toString(36).substring(2, 15),
        full_name: user.full_name,
        email: trimmedEmail,
        skill_level: user.skill_level as any,
        coding_problem: user.coding_problem as any,
        referral_code: user.referral_code,
        referred_by: user.referred_by || null,
        referral_count: 0,
        position: users.length + 1,
        joined_at: new Date().toISOString()
      };

      users.push(newUser);
      
      // If referred by someone, increment their count
      let updatedUsers = users;
      if (user.referred_by) {
        const referrerIdx = updatedUsers.findIndex(u => u.referral_code === user.referred_by);
        if (referrerIdx !== -1) {
          updatedUsers[referrerIdx].referral_count += 1;
        }
      }

      const recalced = recalculatePositions(updatedUsers);
      await writeLocalUsers(recalced);
      return recalced.find(u => u.id === newUser.id)!;
    }
  },

  /**
   * Increment the referral count of the user who owns the given code
   */
  async incrementReferralCount(code: string): Promise<void> {
    if (!code) return;
    
    if (useSupabase && supabaseClient) {
      // Find the user with this code
      const referrer = await this.getByReferralCode(code);
      if (referrer) {
        const { error } = await supabaseClient
          .from('waitlist')
          .update({ referral_count: referrer.referral_count + 1 })
          .eq('id', referrer.id);

        if (error) {
          console.error('Supabase error in incrementReferralCount:', error);
          throw error;
        }
      }
    } else {
      const users = await readLocalUsers();
      const idx = users.findIndex(u => u.referral_code === code);
      if (idx !== -1) {
        users[idx].referral_count += 1;
        const recalced = recalculatePositions(users);
        await writeLocalUsers(recalced);
      }
    }
  },

  /**
   * Delete a user by ID
   */
  async delete(id: string): Promise<void> {
    if (useSupabase && supabaseClient) {
      const { error } = await supabaseClient
        .from('waitlist')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error in delete:', error);
        throw error;
      }
    } else {
      const users = await readLocalUsers();
      const filtered = users.filter(u => u.id !== id);
      const recalced = recalculatePositions(filtered);
      await writeLocalUsers(recalced);
    }
  }
};
