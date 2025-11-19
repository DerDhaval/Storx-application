/**
 * StorX API Wrapper
 * Handles all API calls to StorX services
 */

const STORX_AUTH_API_URL = process.env.STORX_AUTH_API_URL || 'https://auth.storx.io/v1';

export interface StorXFile {
  id: string;
  fileName: string;
  size: string;
  uploadedAt?: string;
  mimeType?: string;
  url?: string;
  key?: string; // S3 object key
  bucket?: string; // S3 bucket name
}

export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
}

/**
 * Exchange access grant for S3 credentials
 * POST https://auth.storx.io/v1/access
 * 
 * This is called after user grants access in StorX UI
 */
export async function getS3CredentialsFromAccessGrant(
  accessGrant: string
): Promise<S3Credentials> {
  const response = await fetch(`${STORX_AUTH_API_URL}/access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_grant: accessGrant,
      public: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get S3 credentials: ${error}`);
  }

  const data = await response.json();

  console.log('S3 credentials response:', JSON.stringify(data, null, 2));

  // Map StorX response to S3 credentials format
  // StorX API returns: access_key_id, secret_key (not secret_access_key!)
  const accessKeyId = data.access_key_id || data.accessKeyId || data.accessKey;
  const secretAccessKey = data.secret_key || data.secret_access_key || data.secretAccessKey || data.secretKey;
  const endpoint = data.endpoint || data.gateway;

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error('Missing required S3 credentials from StorX API response');
  }

  const credentials: S3Credentials = {
    accessKeyId,
    secretAccessKey,
    endpoint,
  };

  console.log('Mapped credentials:', {
    hasAccessKey: !!credentials.accessKeyId,
    hasSecret: !!credentials.secretAccessKey,
    endpoint: credentials.endpoint,
  });

  return credentials;
}

/**
 * List files using S3 credentials
 * Uses AWS S3 SDK-compatible API to list objects in bucket
 * Calls server-side API route that handles S3 operations
 */
export async function listFilesS3(credentials: S3Credentials): Promise<{
  files: StorXFile[];
  buckets: string[];
}> {
  const response = await fetch('/api/storx/s3/list', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credentials }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list files: ${error}`);
  }

  const data = await response.json();
  return {
    files: data.files || [],
    buckets: data.buckets || [],
  };
}

