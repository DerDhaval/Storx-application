import { NextRequest, NextResponse } from 'next/server';
import { S3Credentials } from '@/lib/storx';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * POST /api/storx/s3/download
 * Generate a presigned URL for downloading a file from S3
 * This runs server-side to keep credentials secure
 */
export async function POST(request: NextRequest) {
  try {
    const { key, bucket, credentials } = await request.json() as { 
      key: string; 
      bucket?: string;
      credentials: S3Credentials;
    };

    if (!key) {
      return NextResponse.json(
        { error: 'File key is required' },
        { status: 400 }
      );
    }

    if (!credentials || !credentials.accessKeyId || !credentials.secretAccessKey) {
      return NextResponse.json(
        { error: 'S3 credentials are required' },
        { status: 400 }
      );
    }

    if (!bucket) {
      return NextResponse.json(
        { error: 'Bucket name is required' },
        { status: 400 }
      );
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: credentials.endpoint,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      forcePathStyle: true,
    });

    // Create GetObject command
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    // Generate presigned URL (valid for 1 hour)
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate download URL',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

