import { NextRequest, NextResponse } from 'next/server';
import { S3Credentials } from '@/lib/storx';
import { S3Client, DeleteBucketCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * POST /api/storx/s3/delete-bucket
 * Delete an S3 bucket using OAuth credentials
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

    // Delete bucket (first delete all files in the bucket)
    try {
      // Step 1: List all objects in the bucket
      let objectsToDelete: string[] = [];
      let continuationToken: string | undefined;
      
      do {
        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName.trim(),
          ContinuationToken: continuationToken,
        });
        
        const listResponse = await s3Client.send(listCommand);
        
        if (listResponse.Contents && listResponse.Contents.length > 0) {
          objectsToDelete.push(...listResponse.Contents.map(obj => obj.Key!).filter(Boolean));
        }
        
        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      // Step 2: Delete all objects in the bucket
      if (objectsToDelete.length > 0) {
        console.log(`Deleting ${objectsToDelete.length} files from bucket ${bucketName}...`);
        
        // Delete objects in batches (S3 allows up to 1000 objects per delete)
        const batchSize = 1000;
        for (let i = 0; i < objectsToDelete.length; i += batchSize) {
          const batch = objectsToDelete.slice(i, i + batchSize);
          
          // Delete each object
          await Promise.all(
            batch.map(key => 
              s3Client.send(new DeleteObjectCommand({
                Bucket: bucketName.trim(),
                Key: key,
              }))
            )
          );
        }
        
        console.log(`Deleted ${objectsToDelete.length} files from bucket ${bucketName}`);
      }

      // Step 3: Delete the bucket itself
      const deleteBucketCommand = new DeleteBucketCommand({
        Bucket: bucketName.trim(),
      });

      await s3Client.send(deleteBucketCommand);

      console.log(`${bucketName} deleted successfully.\n`);

      return NextResponse.json({
        success: true,
        message: `Bucket deleted successfully: ${bucketName}${objectsToDelete.length > 0 ? ` (${objectsToDelete.length} files deleted)` : ''}`,
        bucketName: bucketName.trim(),
        filesDeleted: objectsToDelete.length,
      });
    } catch (error: any) {
      console.error('[S3-DELETE-BUCKET] ❌ Error deleting bucket:', error);
      
      return NextResponse.json(
        {
          error: 'Failed to delete bucket',
          message: error?.message || 'Unknown error',
          code: error?.Code || error?.code,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[S3-DELETE-BUCKET] ❌ Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete bucket',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

