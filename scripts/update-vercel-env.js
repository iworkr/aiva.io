#!/usr/bin/env node

/**
 * Script to update Vercel environment variables programmatically
 * Uses Vercel API to update environment variables
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Load environment variables from .env file or use process.env
 * This script reads values from environment variables to avoid hardcoding secrets
 */
function loadEnvVars() {
  // Try to load from .env file
  const envPath = path.join(process.cwd(), '.env');
  const envVars = {};
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Remove quotes if present
          envVars[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    });
  }
  
  // Build ENV_VARS object, preferring process.env over .env file
  return {
    'NEXT_PUBLIC_SITE_URL': process.env.NEXT_PUBLIC_SITE_URL || envVars.NEXT_PUBLIC_SITE_URL || 'https://www.tryaiva.io',
    'APP_URL': process.env.APP_URL || envVars.APP_URL || 'https://www.tryaiva.io',
    'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID || envVars.GOOGLE_CLIENT_ID,
    'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET || envVars.GOOGLE_CLIENT_SECRET,
    'MICROSOFT_CLIENT_ID': process.env.MICROSOFT_CLIENT_ID || envVars.MICROSOFT_CLIENT_ID,
    'MICROSOFT_CLIENT_SECRET': process.env.MICROSOFT_CLIENT_SECRET || envVars.MICROSOFT_CLIENT_SECRET,
    'TEAMS_CLIENT_ID': process.env.TEAMS_CLIENT_ID || envVars.TEAMS_CLIENT_ID,
    'TEAMS_CLIENT_SECRET': process.env.TEAMS_CLIENT_SECRET || envVars.TEAMS_CLIENT_SECRET,
    'TEAMS_TENANT_ID': process.env.TEAMS_TENANT_ID || envVars.TEAMS_TENANT_ID,
    'AZURE_TENANT_ID': process.env.AZURE_TENANT_ID || envVars.AZURE_TENANT_ID || 'common',
    'AZURE_CLIENT_ID': process.env.AZURE_CLIENT_ID || envVars.AZURE_CLIENT_ID,
    'AZURE_CLIENT_SECRET': process.env.AZURE_CLIENT_SECRET || envVars.AZURE_CLIENT_SECRET,
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY || envVars.OPENAI_API_KEY,
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY,
    'SUPABASE_PROJECT_REF': process.env.SUPABASE_PROJECT_REF || envVars.SUPABASE_PROJECT_REF,
    'SUPABASE_JWT_SECRET': process.env.SUPABASE_JWT_SECRET || envVars.SUPABASE_JWT_SECRET,
    'SUPABASE_DATABASE_PASSWORD': process.env.SUPABASE_DATABASE_PASSWORD || envVars.SUPABASE_DATABASE_PASSWORD,
    'SLACK_CLIENT_ID': process.env.SLACK_CLIENT_ID || envVars.SLACK_CLIENT_ID,
    'SLACK_CLIENT_SECRET': process.env.SLACK_CLIENT_SECRET || envVars.SLACK_CLIENT_SECRET,
    'SLACK_SIGNING_SECRET': process.env.SLACK_SIGNING_SECRET || envVars.SLACK_SIGNING_SECRET,
    'SHOPIFY_API_KEY': process.env.SHOPIFY_API_KEY || envVars.SHOPIFY_API_KEY,
    'SHOPIFY_API_SECRET': process.env.SHOPIFY_API_SECRET || envVars.SHOPIFY_API_SECRET,
    'SCOPES': process.env.SCOPES || envVars.SCOPES || 'write_products',
    'RESEND_API_KEY': process.env.RESEND_API_KEY || envVars.RESEND_API_KEY,
    'RESEND_WEBHOOK_SECRET': process.env.RESEND_WEBHOOK_SECRET || envVars.RESEND_WEBHOOK_SECRET,
    'ADMIN_EMAIL': process.env.ADMIN_EMAIL || envVars.ADMIN_EMAIL || 'no-reply@tryaiva.io',
  };
}

const ENV_VARS = loadEnvVars();

// Get Vercel token from environment variable
// Set it before running: export VERCEL_TOKEN=your_token_here
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_API_BASE = 'https://api.vercel.com';

/**
 * Make a request to Vercel API
 */
function vercelRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    if (!VERCEL_TOKEN) {
      reject(new Error('VERCEL_TOKEN environment variable is required. Set it with: export VERCEL_TOKEN=your_token'));
      return;
    }

    const options = {
      hostname: 'api.vercel.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
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
      // vercel.json doesn't have projectId, but we can try to get it from API
    } catch (e) {
      console.warn('Could not read vercel.json:', e.message);
    }
  }

  return null;
}

/**
 * Get projects and find the one matching our project name
 */
async function findProjectId() {
  try {
    const projects = await vercelRequest('GET', '/v9/projects');
    const project = projects.projects?.find(p => p.name === 'aiva-io' || p.name === 'aiva.io');
    if (project) {
      return project.id;
    }
    // If not found, return first project (user should verify)
    if (projects.projects && projects.projects.length > 0) {
      console.warn(`⚠️  Project 'aiva-io' not found, using first project: ${projects.projects[0].name}`);
      return projects.projects[0].id;
    }
  } catch (e) {
    console.error('Error finding project:', e.message);
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
    // No team, that's okay
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
    // First, try to get existing env vars to see if this one exists
    const envs = await vercelRequest('GET', `/v10/projects/${projectId}/env${teamParam}`);
    const existing = envs.envs?.find(e => e.key === key && e.target?.includes(target));
    
    if (existing) {
      // Delete existing
      console.log(`  🔄 Updating existing ${key}...`);
      await vercelRequest('DELETE', `/v10/projects/${projectId}/env/${existing.id}${teamParam}`);
    }

    // Create new
    await vercelRequest('POST', path, {
      key,
      value,
      type: 'encrypted',
      target: [target],
    });
    console.log(`  ✅ ${key} = ${value.substring(0, 20)}... (${target})`);
    return true;
  } catch (e) {
    console.error(`  ❌ Failed to update ${key}:`, e.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Updating Vercel Environment Variables...\n');

  let projectId = getProjectId();
  if (!projectId) {
    console.log('📦 Project ID not found locally, fetching from Vercel API...');
    projectId = await findProjectId();
  }

  if (!projectId) {
    console.error('❌ Could not find Vercel project ID.');
    console.error('   Please run: vercel link');
    process.exit(1);
  }

  console.log(`📦 Project ID: ${projectId}\n`);

  const teamId = await getTeamId();
  if (teamId) {
    console.log(`👥 Team ID: ${teamId}\n`);
  }

  let successCount = 0;
  let failCount = 0;

  console.log('📝 Updating environment variables for Production...\n');

  // Filter out undefined values (secrets not provided)
  const varsToUpdate = Object.entries(ENV_VARS).filter(([key, value]) => {
    if (!value) {
      console.log(`  ⏭️  Skipping ${key} (not provided)`);
      return false;
    }
    return true;
  });

  if (varsToUpdate.length === 0) {
    console.error('❌ No environment variables provided. Set them in .env file or as environment variables.');
    process.exit(1);
  }

  console.log(`📋 Found ${varsToUpdate.length} environment variables to update\n`);

  // Update all environment variables
  for (const [key, value] of varsToUpdate) {
    const success = await updateEnvVar(projectId, teamId, key, value, 'production');
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n✅ Successfully updated ${successCount} environment variables`);
  if (failCount > 0) {
    console.log(`⚠️  ${failCount} variables failed to update`);
  }
  console.log('\n🔄 Redeploy to apply changes: vercel --prod');
  console.log('   Or trigger a new deployment from the Vercel dashboard');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { updateEnvVar, ENV_VARS };

