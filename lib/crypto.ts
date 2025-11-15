import * as jwt from 'jsonwebtoken';

interface JWTClaims {
  client_id: string;
  exp: number;
}

/**
 * Create JWT client secret
 * JWT payload: { client_id, exp }
 * Signed with: raw client secret (not bcrypt hash)
 */
export function createJWTClientSecret(
  clientId: string,
  clientSecret: string, // Raw/plain secret (not bcrypt hash)
  expiryMinutes: number = 10
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + (expiryMinutes * 60);
  
  const payload: JWTClaims = {
    client_id: clientId,
    exp: expiresAt,
  };

  // Sign with raw secret (StorX should verify with raw secret, not bcrypt hash)
  return jwt.sign(payload, clientSecret, {
    algorithm: 'HS256',
  });
}

