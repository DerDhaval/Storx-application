import { NextRequest, NextResponse } from 'next/server';
import { S3Credentials } from '@/lib/storx';
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3';

/**
 * POST /api/storx/s3/create-bucket
 * Create a new S3 bucket using OAuth credentials
 */
export async function POST(request: NextRequest) {
  try {
    const { credentials, bucketName } = await request.json() as { 
      credentials: S3Credentials;
      bucketName: string;
    };

    if (!credentials || !credentials.accessKeyId || !credentials.secretAccessKey) {
      return NextResponse.json(
        { error: 'S3 credentials are required' },
        { status: 400 }
      );
    }

    if (!bucketName || bucketName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bucket name is required' },
        { status: 400 }
      );
    }

    // Create S3 client session
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: credentials.endpoint,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      forcePathStyle: true,
    });

    // Create bucket
    try {
      const createBucketCommand = new CreateBucketCommand({
        Bucket: bucketName.trim(),
      });

      await s3Client.send(createBucketCommand);

      return NextResponse.json({
        success: true,
        message: `Bucket created successfully: ${bucketName}`,
        bucketName: bucketName.trim(),
      });
    } catch (error: any) {
      console.error('[S3-CREATE-BUCKET] ❌ Error creating bucket:', error);
      
      return NextResponse.json(
        {
          error: 'Failed to create bucket',
          message: error?.message || 'Unknown error',
          code: error?.Code || error?.code,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[S3-CREATE-BUCKET] ❌ Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create bucket',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

