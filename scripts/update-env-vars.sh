#!/bin/bash

# Script to update Vercel environment variables
# Requires Vercel CLI: npm i -g vercel
# Usage: ./scripts/update-env-vars.sh

set -e

echo "🚀 Updating Vercel Environment Variables..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it with: npm i -g vercel"
    exit 1
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Run: vercel login"
    exit 1
fi

# Get project name from package.json or use default
PROJECT_NAME=$(node -p "require('./package.json').name" 2>/dev/null || echo "aiva-io")

echo "📦 Project: $PROJECT_NAME"
echo ""

# Environment variables to set
# IMPORTANT: Update the values below with your actual secrets before running
# Or set them as environment variables and this script will use them
declare -A ENV_VARS=(
    ["NEXT_PUBLIC_SITE_URL"]="${NEXT_PUBLIC_SITE_URL:-https://www.tryaiva.io}"
    ["GOOGLE_CLIENT_ID"]="${GOOGLE_CLIENT_ID:-YOUR_GOOGLE_CLIENT_ID}"
    ["GOOGLE_CLIENT_SECRET"]="${GOOGLE_CLIENT_SECRET:-YOUR_GOOGLE_CLIENT_SECRET}"
    ["MICROSOFT_CLIENT_ID"]="${MICROSOFT_CLIENT_ID:-YOUR_MICROSOFT_CLIENT_ID}"
    ["MICROSOFT_CLIENT_SECRET"]="${MICROSOFT_CLIENT_SECRET:-YOUR_MICROSOFT_CLIENT_SECRET}"
    ["TEAMS_CLIENT_ID"]="${TEAMS_CLIENT_ID:-YOUR_TEAMS_CLIENT_ID}"
    ["TEAMS_CLIENT_SECRET"]="${TEAMS_CLIENT_SECRET:-YOUR_TEAMS_CLIENT_SECRET}"
    ["TEAMS_TENANT_ID"]="${TEAMS_TENANT_ID:-YOUR_TEAMS_TENANT_ID}"
    ["AZURE_TENANT_ID"]="${AZURE_TENANT_ID:-common}"
    ["AZURE_CLIENT_ID"]="${AZURE_CLIENT_ID:-YOUR_AZURE_CLIENT_ID}"
    ["AZURE_CLIENT_SECRET"]="${AZURE_CLIENT_SECRET:-YOUR_AZURE_CLIENT_SECRET}"
    ["OPENAI_API_KEY"]="${OPENAI_API_KEY:-YOUR_OPENAI_API_KEY}"
    ["NEXT_PUBLIC_SUPABASE_URL"]="${NEXT_PUBLIC_SUPABASE_URL:-YOUR_SUPABASE_URL}"
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-YOUR_SUPABASE_ANON_KEY}"
    ["SUPABASE_SERVICE_ROLE_KEY"]="${SUPABASE_SERVICE_ROLE_KEY:-YOUR_SUPABASE_SERVICE_ROLE_KEY}"
    ["SUPABASE_PROJECT_REF"]="${SUPABASE_PROJECT_REF:-YOUR_SUPABASE_PROJECT_REF}"
    ["SUPABASE_JWT_SECRET"]="${SUPABASE_JWT_SECRET:-YOUR_SUPABASE_JWT_SECRET}"
    ["SUPABASE_DATABASE_PASSWORD"]="${SUPABASE_DATABASE_PASSWORD:-YOUR_SUPABASE_DATABASE_PASSWORD}"
    ["SLACK_CLIENT_ID"]="${SLACK_CLIENT_ID:-YOUR_SLACK_CLIENT_ID}"
    ["SLACK_CLIENT_SECRET"]="${SLACK_CLIENT_SECRET:-YOUR_SLACK_CLIENT_SECRET}"
    ["SLACK_SIGNING_SECRET"]="${SLACK_SIGNING_SECRET:-YOUR_SLACK_SIGNING_SECRET}"
    ["SHOPIFY_API_KEY"]="${SHOPIFY_API_KEY:-YOUR_SHOPIFY_API_KEY}"
    ["SHOPIFY_API_SECRET"]="${SHOPIFY_API_SECRET:-YOUR_SHOPIFY_API_SECRET}"
    ["SCOPES"]="${SCOPES:-write_products}"
    ["RESEND_API_KEY"]="${RESEND_API_KEY:-YOUR_RESEND_API_KEY}"
    ["RESEND_WEBHOOK_SECRET"]="${RESEND_WEBHOOK_SECRET:-YOUR_RESEND_WEBHOOK_SECRET}"
    ["ADMIN_EMAIL"]="${ADMIN_EMAIL:-no-reply@tryaiva.io}"
    ["APP_URL"]="${APP_URL:-https://www.tryaiva.io}"
)

# Update each environment variable
for key in "${!ENV_VARS[@]}"; do
    value="${ENV_VARS[$key]}"
    echo "📝 Setting $key..."
    vercel env add "$key" production <<< "$value" 2>/dev/null || \
    vercel env rm "$key" production --yes 2>/dev/null && \
    vercel env add "$key" production <<< "$value" || \
    echo "⚠️  Failed to update $key (may already be set)"
done

echo ""
echo "✅ Environment variables updated!"
echo ""
echo "🔍 Verify in Vercel dashboard: https://vercel.com/dashboard"
echo "🔄 Redeploy to apply changes: vercel --prod"

