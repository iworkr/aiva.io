#!/usr/bin/env node

/**
 * One-time script: Set password for Google verification reviewer account (junsnow.2024@gmail.com).
 * Run once so they can log in with email + password 12345678 (8 chars) as well as SSO (Google).
 *
 * Usage: node scripts/set-google-reviewer-password.mjs
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root (script dir parent or cwd)
const envPath = join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  dotenv.config({ path: join(process.cwd(), '.env.local') });
}

const GOOGLE_REVIEWER_EMAIL = 'junsnow.2024@gmail.com';
const GOOGLE_REVIEWER_PASSWORD = '12345678';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('Tried loading from:', envPath);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function setPassword() {
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list users:', listError.message);
    if (listError.status === 401) {
      console.error('\nInvalid API key. Check:');
      console.error('  1. Supabase Dashboard → Project (lgyewlqzelxkpawnmiog) → Settings → API');
      console.error('  2. Use the "service_role" key (secret), NOT the anon key');
      console.error('  3. NEXT_PUBLIC_SUPABASE_URL must match this project (e.g. https://lgyewlqzelxkpawnmiog.supabase.co)');
      console.error('  4. If you rotated the key, copy the new service_role key into .env.local');
    }
    process.exit(1);
  }
  const user = users?.find((u) => u.email?.toLowerCase() === GOOGLE_REVIEWER_EMAIL.toLowerCase());
  if (!user) {
    console.error(`User not found: ${GOOGLE_REVIEWER_EMAIL}`);
    process.exit(1);
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: GOOGLE_REVIEWER_PASSWORD,
  });
  if (error) {
    console.error('Failed to set password:', error);
    process.exit(1);
  }
  console.log(`Password set for ${GOOGLE_REVIEWER_EMAIL}. They can log in with email + password "${GOOGLE_REVIEWER_PASSWORD}" or with Sign in with Google.`);
}

setPassword();
