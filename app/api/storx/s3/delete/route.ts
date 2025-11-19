import { NextRequest, NextResponse } from 'next/server';
import { S3Credentials } from '@/lib/storx';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * POST /api/storx/s3/delete
 * Delete an S3 object (file) using OAuth credentials
 */
export async function POST(request: NextRequest) {
  try {
    const { credentials, key, bucket } = await request.json() as { 
      credentials: S3Credentials;
      key: string;
      bucket?: string;
    };

    if (!credentials || !credentials.accessKeyId || !credentials.secretAccessKey) {
      return NextResponse.json(
        { error: 'S3 credentials are required' },
        { status: 400 }
      );
    }

    if (!key || key.trim().length === 0) {
      return NextResponse.json(
        { error: 'Object key is required' },
        { status: 400 }
      );
    }

    if (!bucket || bucket.trim().length === 0) {
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

    // Delete object
    try {
      const deleteObjectCommand = new DeleteObjectCommand({
        Bucket: bucket.trim(),
        Key: key.trim(),
      });

      await s3Client.send(deleteObjectCommand);

      console.log(`File ${key} deleted successfully from bucket ${bucket}.\n`);

      return NextResponse.json({
        success: true,
        message: `File deleted successfully: ${key}`,
        key: key.trim(),
        bucket: bucket.trim(),
      });
    } catch (error: any) {
      console.error('[S3-DELETE] ❌ Error deleting file:', error);
      
      return NextResponse.json(
        {
          error: 'Failed to delete file',
          message: error?.message || 'Unknown error',
          code: error?.Code || error?.code,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[S3-DELETE] ❌ Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

