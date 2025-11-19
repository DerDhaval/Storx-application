import { NextRequest, NextResponse } from 'next/server';
import { createJWTClientSecret } from '@/lib/crypto';

// Constants
const JWT_EXPIRY_MINUTES = 30;
const ACCESS_PARAM_VALUE = 'readwrite'; // Not used by backend, included for compatibility

// Environment variable keys
const ENV_KEYS = {
  CLIENT_ID: 'STORX_CLIENT_ID',
  CLIENT_SECRET: 'STORX_CLIENT_SECRET',
  REDIRECT_URI: 'STORX_REDIRECT_URI',
  OAUTH_URL: 'STORX_OAUTH_URL',
  OAUTH_SCOPES: 'STORX_OAUTH_SCOPES',
} as const;

/**
 * Parse comma-separated scopes string into array
 */
function parseScopes(scopesString: string): string[] {
  return scopesString
    .split(',')
    .map(scope => scope.trim())
    .filter(Boolean);
}

/**
 * Get OAuth scopes from query parameter or environment variable
 * Priority: Query parameter > Environment variable
 */
function getOAuthScopes(queryScopes: string | null): string[] {
  if (queryScopes) {
    return parseScopes(queryScopes);
  }
  
  const envScopes = process.env[ENV_KEYS.OAUTH_SCOPES];
  if (envScopes) {
    return parseScopes(envScopes);
  }
  
  return [];
}

/**
 * Validate required environment variables
 */
function validateEnvironmentVariables(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  oauthUrl: string;
} {
  const clientId = process.env[ENV_KEYS.CLIENT_ID];
  const clientSecret = process.env[ENV_KEYS.CLIENT_SECRET]; 
  const redirectUri = process.env[ENV_KEYS.REDIRECT_URI];
  const oauthUrl = process.env[ENV_KEYS.OAUTH_URL];

  if (!clientId || !clientSecret || !redirectUri || !oauthUrl) {
    const missing = [
      !clientId && ENV_KEYS.CLIENT_ID,
      !clientSecret && ENV_KEYS.CLIENT_SECRET,
      !redirectUri && ENV_KEYS.REDIRECT_URI,
      !oauthUrl && ENV_KEYS.OAUTH_URL,
    ].filter(Boolean);

    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  return { clientId, clientSecret, redirectUri, oauthUrl };
}

/**
 * Build OAuth authorization URL with scopes
 */
function buildOAuthUrl(
  oauthUrl: string,
  clientId: string,
  jwtClientSecret: string,
  redirectUri: string,
  scopes: string[]
): URL {
  const authUrl = new URL(oauthUrl);
  
  // Required OAuth parameters
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('client_secret', jwtClientSecret);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  
  // Add each scope as a separate parameter
  // Backend expects: scope=read&scope=write&scope=list format
  scopes.forEach(scope => {
    authUrl.searchParams.append('scope', scope);
  });
  
  // Access parameter (not used by backend, included for compatibility)
  authUrl.searchParams.set('access', ACCESS_PARAM_VALUE);

  return authUrl;
}

/**
 * GET /api/auth/login
 * Initiates OAuth2 flow by redirecting to StorX authorization server
 * 
 * Query Parameters:
 *   - scopes (optional): Comma-separated list of OAuth scopes (e.g., "read,write,list")
 *                        Overrides STORX_OAUTH_SCOPES environment variable
 */
export async function GET(request: NextRequest) {
  try {
    // Validate required environment variables
    const { clientId, clientSecret, redirectUri, oauthUrl } = 
      validateEnvironmentVariables();

    // Get OAuth scopes (query parameter takes priority over env var)
    const queryScopes = request.nextUrl.searchParams.get('scopes');
    const scopes = getOAuthScopes(queryScopes);

    // Validate scopes are provided
    if (scopes.length === 0) {
      return NextResponse.json(
        {
          error: 'OAuth scopes are required',
          message: 'Please configure OAuth scopes using one of the following methods:',
          methods: [
            `Set ${ENV_KEYS.OAUTH_SCOPES} in your environment variables (e.g., ${ENV_KEYS.OAUTH_SCOPES}=read,write,list)`,
            `Pass scopes as query parameter: /api/auth/login?scopes=read,write,list`,
          ],
          example: `Set in .env.local: ${ENV_KEYS.OAUTH_SCOPES}=read,write,list`,
        },
        { status: 400 }
      );
    }

    // Generate JWT client secret
    // JWT payload: { client_id, exp }, signed with raw client secret
    const jwtClientSecret = createJWTClientSecret(
      clientId,
      clientSecret,
      JWT_EXPIRY_MINUTES
    );

    // Build OAuth authorization URL
    const authUrl = buildOAuthUrl(
      oauthUrl,
      clientId,
      jwtClientSecret,
      redirectUri,
      scopes
    );

    // Log OAuth request (without sensitive data)
    console.log('[LOGIN] OAuth authorization request:', {
      clientId,
      redirectUri,
      clientSecret,
      scopes,
      scopeCount: scopes.length,
      oauthUrl: oauthUrl,
      jwtLength: jwtClientSecret.length,
    });

    // Redirect to StorX OAuth authorization server
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('[LOGIN] Error initiating OAuth flow:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to initiate OAuth flow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

