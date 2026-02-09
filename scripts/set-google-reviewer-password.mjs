#!/usr/bin/env node

/**
 * One-time script: Set password for Google verification reviewer account (junsnow.2024@gmail.com).
 * Run once so they can log in with email + password 123456 as well as SSO (Google).
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

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const GOOGLE_REVIEWER_EMAIL = 'junsnow.2024@gmail.com';
const GOOGLE_REVIEWER_PASSWORD = '123456';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function setPassword() {
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list users:', listError);
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
