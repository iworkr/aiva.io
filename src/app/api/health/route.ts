import { NextResponse } from 'next/server';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { withCacheHeaders, CachePresets } from '@/utils/api-cache-headers';

/**
 * Health Check Endpoint for Render.com and other hosting platforms
 * 
 * This endpoint verifies:
 * 1. Application is running
 * 2. Database connectivity (optional, controlled by query param)
 * 3. Returns build info and system status
 * 
 * Usage:
 * - GET /api/health - Basic health check
 * - GET /api/health?db=true - Health check with database verification
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkDb = searchParams.get('db') === 'true';

  const healthStatus = {
    status: 'healthy' as 'healthy' | 'unhealthy' | 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '3.1.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    checks: {} as Record<string, { status: string; latency?: number; message?: string }>,
  };

  // Basic application check
  healthStatus.checks.application = {
    status: 'pass',
    message: 'Application is running',
  };

  // Check required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    healthStatus.checks.environment = {
      status: 'fail',
      message: `Missing required environment variables: ${missingEnvVars.join(', ')}`,
    };
    healthStatus.status = 'unhealthy';
  } else {
    healthStatus.checks.environment = {
      status: 'pass',
      message: 'All required environment variables are set',
    };
  }

  // Optional database connectivity check
  if (checkDb) {
    const dbStartTime = Date.now();
    try {
      const supabase = await createSupabaseUserServerComponentClient();
      const { error } = await supabase.from('workspaces').select('id').limit(1);

      if (error) {
        healthStatus.checks.database = {
          status: 'fail',
          latency: Date.now() - dbStartTime,
          message: `Database query failed: ${error.message}`,
        };
        healthStatus.status = healthStatus.status === 'healthy' ? 'degraded' : healthStatus.status;
      } else {
        healthStatus.checks.database = {
          status: 'pass',
          latency: Date.now() - dbStartTime,
          message: 'Database connection successful',
        };
      }
    } catch (error) {
      healthStatus.checks.database = {
        status: 'fail',
        latency: Date.now() - dbStartTime,
        message: `Database connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
      healthStatus.status = 'degraded';
    }
  }

  // Check optional services
  const optionalEnvVars = {
    stripe: ['STRIPE_SECRET_KEY'],
    openai: ['OPENAI_API_KEY'],
    email: ['RESEND_API_KEY'],
    analytics: ['NEXT_PUBLIC_POSTHOG_API_KEY'],
  };

  const configuredServices = Object.entries(optionalEnvVars).reduce((acc, [service, vars]) => {
    const isConfigured = vars.every((varName) => process.env[varName]);
    if (isConfigured) {
      acc.push(service);
    }
    return acc;
  }, [] as string[]);

  healthStatus.checks.services = {
    status: 'info',
    message: `Configured optional services: ${configuredServices.length > 0 ? configuredServices.join(', ') : 'none'}`,
  };

  // Return appropriate HTTP status
  const httpStatus = healthStatus.status === 'healthy' ? 200 : healthStatus.status === 'degraded' ? 200 : 503;

  return NextResponse.json(healthStatus, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Status': healthStatus.status,
    },
  });
}

// Support HEAD requests for simple uptime monitoring
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

