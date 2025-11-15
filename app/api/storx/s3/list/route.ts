import { NextRequest, NextResponse } from 'next/server';
import { S3Credentials } from '@/lib/storx';
import { S3Client, ListObjectsCommand, ListBucketsCommand } from '@aws-sdk/client-s3';

/**
 * POST /api/storx/s3/list
 * List files from S3 bucket using S3 credentials
 * This runs server-side to keep credentials secure
 */
export async function POST(request: NextRequest) {
  try {
    const { credentials } = await request.json() as { credentials: S3Credentials };

    if (!credentials || !credentials.accessKeyId || !credentials.secretAccessKey) {
      return NextResponse.json(
        { error: 'S3 credentials are required' },
        { status: 400 }
      );
    }

    // Create S3 client
    const s3Client = new S3Client({
      region: credentials.region || 'us-east-1',
      endpoint: credentials.endpoint,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
      forcePathStyle: true, // Required for S3-compatible services
    });

    // StorX doesn't provide bucket name - try to list buckets first
    let bucketName = credentials.bucket;
    
    if (!bucketName) {
      console.log('No bucket in credentials, listing available buckets...');
      try {
        const listBucketsCommand = new ListBucketsCommand({});
        const bucketsResponse = await s3Client.send(listBucketsCommand);
        const buckets = bucketsResponse.Buckets || [];
        
        if (buckets.length === 0) {
          // No buckets found - return empty file list
          console.log('No buckets found, returning empty file list');
          return NextResponse.json({ files: [] });
        }
        
        // Use the first available bucket
        bucketName = buckets[0].Name!;
        console.log(`Using bucket: ${bucketName}`);
      } catch (listError) {
        console.error('Failed to list buckets:', listError);
        // If we can't list buckets, return empty list instead of error
        return NextResponse.json({ files: [] });
      }
    }

    // List objects in bucket using ListObjectsCommand
    const command = new ListObjectsCommand({
      Bucket: bucketName,
    });

    const response = await s3Client.send(command);

    // Transform S3 objects to StorXFile format
    const files = (response.Contents || []).map((object) => ({
      id: object.Key || '',
      fileName: object.Key?.split('/').pop() || '',
      size: `${((object.Size || 0) / 1024 / 1024).toFixed(2)} MB`,
      uploadedAt: object.LastModified?.toISOString(),
      key: object.Key,
    }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error listing S3 files:', error);
    return NextResponse.json(
      {
        error: 'Failed to list files',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

