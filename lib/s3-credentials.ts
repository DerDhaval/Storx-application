/**
 * S3 Credentials Management
 * Stores and retrieves S3 credentials from localStorage
 */

export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  bucket?: string; // Optional - might not be in StorX response
  region: string;
  endpoint?: string;
  expiresAt?: number;
}

const STORAGE_KEY = 'storx_s3_credentials';

/**
 * Save S3 credentials to localStorage
 */
export function saveS3Credentials(credentials: S3Credentials): void {
  if (typeof window === 'undefined') {
    throw new Error('localStorage is only available in browser');
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

/**
 * Get S3 credentials from localStorage
 */
export function getS3Credentials(): S3Credentials | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const credentials: S3Credentials = JSON.parse(stored);

    // Check expiration
    if (credentials.expiresAt && Date.now() > credentials.expiresAt) {
      clearS3Credentials();
      return null;
    }

    return credentials;
  } catch (error) {
    console.error('Error reading S3 credentials:', error);
    return null;
  }
}

/**
 * Clear S3 credentials from localStorage
 */
export function clearS3Credentials(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if S3 credentials exist and are valid
 */
export function hasValidS3Credentials(): boolean {
  const creds = getS3Credentials();
  return creds !== null;
}

