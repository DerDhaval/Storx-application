import { NextRequest, NextResponse } from 'next/server';
import { getS3CredentialsFromAccessGrant } from '@/lib/storx';

/**
 * OAuth Callback Route
 * Step 1: Receives access grant from StorX after user grants permission
 * Step 2: Exchange access grant for S3 credentials
 * Step 3: Return S3 credentials to frontend (will be stored in localStorage)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accessGrant = searchParams.get('access_grant');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  // Check for access grant
  if (!accessGrant) {
    return NextResponse.redirect(
      new URL('/?error=missing_access_grant', request.url)
    );
  }

  try {
    // Step 2: Exchange access grant for S3 credentials
    const s3Credentials = await getS3CredentialsFromAccessGrant(accessGrant);

    // Step 3: Return S3 credentials to frontend
    // Frontend will store in localStorage
    const dashboardUrl = new URL('/dashboard', request.url);
    dashboardUrl.searchParams.set(
      's3_creds',
      encodeURIComponent(JSON.stringify(s3Credentials))
    );

    return NextResponse.redirect(dashboardUrl.toString());
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/?error=${encodeURIComponent(
          error instanceof Error ? error.message : 'authentication_failed'
        )}`,
        request.url
      )
    );
  }
}

