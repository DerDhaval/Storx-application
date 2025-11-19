import { NextRequest, NextResponse } from 'next/server';
import { S3Credentials } from '@/lib/storx';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * POST /api/storx/s3/upload
 * Upload a file to S3 bucket using S3 credentials
 * This runs server-side to keep credentials secure
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const credentialsJson = formData.get('credentials') as string;
    const bucketName = formData.get('bucketName') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!credentialsJson) {
      return NextResponse.json(
        { error: 'S3 credentials are required' },
        { status: 400 }
      );
    }

    let credentials: S3Credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid credentials format' },
        { status: 400 }
      );
    }

    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
      return NextResponse.json(
        { error: 'S3 credentials are required' },
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

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use file name as key, or allow custom key
    const key = file.name;

    // If bucketName is provided, use it; otherwise, we'll need to list buckets and use the first one
    // or extract from user's email/bucket pattern
    let targetBucket = bucketName;

    if (!targetBucket) {
      // Try to get bucket from credentials or use a default pattern
      // For now, we'll require bucketName to be provided
      return NextResponse.json(
        { error: 'Bucket name is required' },
        { status: 400 }
      );
    }

    // Upload file using PutObject (similar to Go's svc.PutObject)
    try {
      const putObjectCommand = new PutObjectCommand({
        Bucket: targetBucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
      });

      await s3Client.send(putObjectCommand);

      console.log(`[S3-UPLOAD] ✅ File uploaded successfully: ${key} to bucket: ${targetBucket}`);

      return NextResponse.json({
        success: true,
        message: `File uploaded successfully: ${key}`,
        key,
        bucket: targetBucket,
        fileName: file.name,
        size: file.size,
      });
    } catch (error: any) {
      console.error('[S3-UPLOAD] ❌ Error uploading file:', error);
      
      return NextResponse.json(
        {
          error: 'Failed to upload file',
          message: error?.message || 'Unknown error',
          code: error?.Code || error?.code,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[S3-UPLOAD] ❌ Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

