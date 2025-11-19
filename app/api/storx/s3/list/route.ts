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

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: credentials.endpoint,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      forcePathStyle: true,
    });

    // List all available buckets
    let buckets: string[] = [];

    try {
      const listBucketsCommand = new ListBucketsCommand({});
      const bucketsResponse = await s3Client.send(listBucketsCommand);
      buckets = (bucketsResponse.Buckets || []).map(b => b.Name!).filter(Boolean);
      console.log('ListBucketsCommand returned buckets:', buckets);
      if (buckets.length === 0) {
        return NextResponse.json({ files: [], buckets: [] });
      }
    } catch (listError) {
      console.error('Error listing buckets:', listError);
      return NextResponse.json({ files: [], buckets: [] });
    }

    // List files from all buckets
    const allFiles: any[] = [];
    const bucketsWithFiles = new Set<string>(buckets);
    
    for (const bucketName of buckets) {
      try {
        const command = new ListObjectsCommand({
          Bucket: bucketName,
        });
        
        const response = await s3Client.send(command);
        
        if (response.Contents && response.Contents.length > 0) {
          const bucketFiles = response.Contents.map((object) => ({
            id: object.Key || '',
            fileName: object.Key?.split('/').pop() || '',
            size: `${((object.Size || 0) / 1024 / 1024).toFixed(2)} MB`,
            uploadedAt: object.LastModified?.toISOString(),
            key: object.Key,
            bucket: bucketName, // Add bucket name to each file
          }));
          
          allFiles.push(...bucketFiles);
        }
      } catch (bucketError) {
        console.error(`Error listing files from bucket ${bucketName}:`, bucketError);
        continue;
      }
    }

    // Also check for any additional buckets that might have files
    // Extract unique bucket names from file keys (in case bucket name is in the key path)
    // But more importantly, ensure all buckets from files are included
    allFiles.forEach(file => {
      if (file.bucket && !bucketsWithFiles.has(file.bucket)) {
        bucketsWithFiles.add(file.bucket);
      }
    });

    const files = allFiles;
    const allBuckets = Array.from(bucketsWithFiles);

    console.log('List API - Buckets found:', allBuckets);
    console.log('List API - Files count:', files.length);
    console.log('List API - Files by bucket:', files.reduce((acc, f) => {
      const b = f.bucket || 'unknown';
      acc[b] = (acc[b] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));

    return NextResponse.json({ 
      files,
      buckets: allBuckets, // Return all buckets including those with files
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to list files',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

