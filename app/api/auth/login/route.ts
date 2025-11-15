import { NextResponse } from 'next/server';
import { createJWTClientSecret } from '@/lib/crypto';

export async function GET() {
  const clientId = process.env.STORX_CLIENT_ID!;
  const clientSecret = "$2a$10$1JlVavTr/PhNtYLkJF6aDuZXMCpMksLJMMotmmRqYcSnyyPo68Zuq" //  process.env.STORX_CLIENT_SECRET!; // Raw/plain secret (not bcrypt hash)
  const redirectUri = process.env.STORX_REDIRECT_URI!;
  const oauthUrl = process.env.STORX_OAUTH_URL!;

  console.log('clientSecret:', clientSecret);
  console.log('clientId:', clientId);
  console.log('redirectUri:', redirectUri);
  console.log('oauthUrl:', oauthUrl);

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'STORX_CLIENT_ID or STORX_CLIENT_SECRET is not configured' },
      { status: 500 }
    );
  }

  // Generate JWT: payload = { client_id, exp }, signed with raw secret
  const jwtClientSecret = createJWTClientSecret(clientId, clientSecret, 30);

  const authUrl = new URL(oauthUrl);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('client_secret', jwtClientSecret);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'read,write');

  console.log('OAuth redirect URL:', authUrl.toString().substring(0, 200) + '...');
  console.log('JWT length:', jwtClientSecret.length);

  return NextResponse.redirect(authUrl.toString());
}

