#!/usr/bin/env node

/**
 * Script to update Vercel environment variables programmatically
 * Uses Vercel API to update environment variables
 * 
 * Usage:
 *   node scripts/update-env-vars.js
 * 
 * Requires:
 *   - VERCEL_TOKEN environment variable (get from https://vercel.com/account/tokens)
 *   - VERCEL_PROJECT_ID (optional, will try to detect from vercel.json or .vercel)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Environment variables to set
// IMPORTANT: These will use environment variables if set, otherwise use placeholders
// Set environment variables before running: export GOOGLE_CLIENT_ID=... etc.
const ENV_VARS = {
  'NEXT_PUBLIC_SITE_URL': process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tryaiva.io',
  'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
  'MICROSOFT_CLIENT_ID': process.env.MICROSOFT_CLIENT_ID || 'YOUR_MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET': process.env.MICROSOFT_CLIENT_SECRET || 'YOUR_MICROSOFT_CLIENT_SECRET',
  'TEAMS_CLIENT_ID': process.env.TEAMS_CLIENT_ID || 'YOUR_TEAMS_CLIENT_ID',
  'TEAMS_CLIENT_SECRET': process.env.TEAMS_CLIENT_SECRET || 'YOUR_TEAMS_CLIENT_SECRET',
  'TEAMS_TENANT_ID': process.env.TEAMS_TENANT_ID || 'YOUR_TEAMS_TENANT_ID',
  'AZURE_TENANT_ID': process.env.AZURE_TENANT_ID || 'common',
  'AZURE_CLIENT_ID': process.env.AZURE_CLIENT_ID || 'YOUR_AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET': process.env.AZURE_CLIENT_SECRET || 'YOUR_AZURE_CLIENT_SECRET',
  'OPENAI_API_KEY': process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_PROJECT_REF': process.env.SUPABASE_PROJECT_REF || 'YOUR_SUPABASE_PROJECT_REF',
  'SUPABASE_JWT_SECRET': process.env.SUPABASE_JWT_SECRET || 'YOUR_SUPABASE_JWT_SECRET',
  'SUPABASE_DATABASE_PASSWORD': process.env.SUPABASE_DATABASE_PASSWORD || 'YOUR_SUPABASE_DATABASE_PASSWORD',
  'SLACK_CLIENT_ID': process.env.SLACK_CLIENT_ID || 'YOUR_SLACK_CLIENT_ID',
  'SLACK_CLIENT_SECRET': process.env.SLACK_CLIENT_SECRET || 'YOUR_SLACK_CLIENT_SECRET',
  'SLACK_SIGNING_SECRET': process.env.SLACK_SIGNING_SECRET || 'YOUR_SLACK_SIGNING_SECRET',
  'SHOPIFY_API_KEY': process.env.SHOPIFY_API_KEY || 'YOUR_SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET': process.env.SHOPIFY_API_SECRET || 'YOUR_SHOPIFY_API_SECRET',
  'SCOPES': process.env.SCOPES || 'write_products',
  'RESEND_API_KEY': process.env.RESEND_API_KEY || 'YOUR_RESEND_API_KEY',
  'RESEND_WEBHOOK_SECRET': process.env.RESEND_WEBHOOK_SECRET || 'YOUR_RESEND_WEBHOOK_SECRET',
  'ADMIN_EMAIL': process.env.ADMIN_EMAIL || 'no-reply@tryaiva.io',
  'APP_URL': process.env.APP_URL || 'https://www.tryaiva.io',
};

const VERCEL_API_BASE = 'https://api.vercel.com';

/**
 * Make a request to Vercel API
 */
function vercelRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const token = process.env.VERCEL_TOKEN;
    if (!token) {
      reject(new Error('VERCEL_TOKEN environment variable is required. Get it from https://vercel.com/account/tokens'));
      return;
    }

    const options = {
      hostname: 'api.vercel.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Get project ID from .vercel/project.json or vercel.json
 */
function getProjectId() {
  // Try .vercel/project.json first
  const vercelProjectPath = path.join(process.cwd(), '.vercel', 'project.json');
  if (fs.existsSync(vercelProjectPath)) {
    try {
      const project = JSON.parse(fs.readFileSync(vercelProjectPath, 'utf8'));
      return project.projectId;
    } catch (e) {
      console.warn('Could not read .vercel/project.json:', e.message);
    }
  }

  // Try vercel.json
  const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
  if (fs.existsSync(vercelJsonPath)) {
    try {
      const vercel = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
      return vercel.projectId;
    } catch (e) {
      console.warn('Could not read vercel.json:', e.message);
    }
  }

  return null;
}

/**
 * Get team ID (optional)
 */
async function getTeamId() {
  try {
    const teams = await vercelRequest('GET', '/v2/teams');
    if (teams.teams && teams.teams.length > 0) {
      return teams.teams[0].id;
    }
  } catch (e) {
    console.warn('Could not get team ID:', e.message);
  }
  return null;
}

/**
 * Update environment variable
 */
async function updateEnvVar(projectId, teamId, key, value, target = 'production') {
  const teamParam = teamId ? `?teamId=${teamId}` : '';
  const path = `/v10/projects/${projectId}/env${teamParam}`;

  try {
    // Try to create/update
    await vercelRequest('POST', path, {
      key,
      value,
      type: 'encrypted',
      target: [target],
    });
    console.log(`✅ Set ${key} for ${target}`);
    return true;
  } catch (e) {
    // If it exists, try to update
    if (e.message.includes('already exists') || e.message.includes('409')) {
      try {
        // Get existing env var ID
        const envs = await vercelRequest('GET', `/v10/projects/${projectId}/env${teamParam}`);
        const existing = envs.envs?.find(e => e.key === key && e.target?.includes(target));
        if (existing) {
          // Delete and recreate
          await vercelRequest('DELETE', `/v10/projects/${projectId}/env/${existing.id}${teamParam}`);
          await vercelRequest('POST', path, {
            key,
            value,
            type: 'encrypted',
            target: [target],
          });
          console.log(`✅ Updated ${key} for ${target}`);
          return true;
        }
      } catch (e2) {
        console.error(`❌ Failed to update ${key}:`, e2.message);
        return false;
      }
    } else {
      console.error(`❌ Failed to set ${key}:`, e.message);
      return false;
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Updating Vercel Environment Variables...\n');

  const projectId = getProjectId();
  if (!projectId) {
    console.error('❌ Could not find Vercel project ID.');
    console.error('   Please set VERCEL_PROJECT_ID environment variable or run: vercel link');
    process.exit(1);
  }

  console.log(`📦 Project ID: ${projectId}\n`);

  const teamId = await getTeamId();
  if (teamId) {
    console.log(`👥 Team ID: ${teamId}\n`);
  }

  let successCount = 0;
  let failCount = 0;

  // Update all environment variables
  for (const [key, value] of Object.entries(ENV_VARS)) {
    const success = await updateEnvVar(projectId, teamId, key, value, 'production');
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Updated ${successCount} environment variables`);
  if (failCount > 0) {
    console.log(`⚠️  ${failCount} variables failed to update`);
  }
  console.log('\n🔄 Redeploy to apply changes: vercel --prod');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { updateEnvVar, ENV_VARS };

