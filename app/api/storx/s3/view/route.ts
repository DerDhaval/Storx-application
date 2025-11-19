import { NextRequest, NextResponse } from 'next/server';
import { S3Credentials } from '@/lib/storx';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * POST /api/storx/s3/view
 * Fetch file content for preview (especially for Gmail JSON files)
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

    // Get file content
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    // Read the file content
    const chunks: Uint8Array[] = [];
    if (response.Body) {
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
    }
    
    const buffer = Buffer.concat(chunks);
    const content = buffer.toString('utf-8');

    // Check if it's a Gmail JSON file
    let parsedContent: any = null;
    let isGmail = false;
    let htmlContent: string | null = null;
    let emailSubject: string | null = null;
    let emailFrom: string | null = null;
    let emailDate: string | null = null;

    try {
      parsedContent = JSON.parse(content);
      
      // Check if it looks like Gmail API response
      if (parsedContent.payload) {
        isGmail = true;
        
        // Extract email metadata from payload headers
        if (parsedContent.payload.headers) {
          const headers = parsedContent.payload.headers;
          const subjectHeader = headers.find((h: any) => h.name === 'Subject');
          const fromHeader = headers.find((h: any) => h.name === 'From');
          const dateHeader = headers.find((h: any) => h.name === 'Date');
          
          emailSubject = subjectHeader?.value || null;
          emailFrom = fromHeader?.value || null;
          emailDate = dateHeader?.value || null;
        }
        
        // Helper function to recursively find HTML content in parts
        const findHtmlContent = (parts: any[]): string | null => {
          for (const part of parts) {
            // Check if this part has HTML content
            if (part.mimeType === 'text/html' && part.body?.data) {
              try {
                return Buffer.from(part.body.data, 'base64').toString('utf-8');
              } catch (e) {
                continue;
              }
            }
            
            // Check nested parts (for multipart/alternative, etc.)
            if (part.parts && Array.isArray(part.parts)) {
              const nestedHtml = findHtmlContent(part.parts);
              if (nestedHtml) return nestedHtml;
            }
          }
          return null;
        };
        
        // Try to get HTML content
        if (parsedContent.payload.body?.data) {
          // Direct HTML in body
          try {
            htmlContent = Buffer.from(parsedContent.payload.body.data, 'base64').toString('utf-8');
          } catch (e) {
            // Failed to decode
          }
        }
        
        // If no HTML found, check parts
        if (!htmlContent && parsedContent.payload.parts) {
          htmlContent = findHtmlContent(parsedContent.payload.parts);
        }
        
        // Fallback to plain text if no HTML found
        if (!htmlContent && parsedContent.payload.parts) {
          const findPlainText = (parts: any[]): string | null => {
            for (const part of parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                try {
                  return Buffer.from(part.body.data, 'base64').toString('utf-8');
                } catch (e) {
                  continue;
                }
              }
              if (part.parts && Array.isArray(part.parts)) {
                const nestedText = findPlainText(part.parts);
                if (nestedText) return nestedText;
              }
            }
            return null;
          };
          
          const plainText = findPlainText(parsedContent.payload.parts);
          if (plainText) {
            htmlContent = `<div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; white-space: pre-wrap;">${plainText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
          }
        }
      }
    } catch (e) {
      // Not JSON, return as plain text
    }

    return NextResponse.json({
      content: isGmail ? null : content,
      isGmail,
      htmlContent,
      emailSubject,
      emailFrom,
      emailDate,
      rawContent: content.substring(0, 1000), // First 1000 chars for preview
    });
  } catch (error) {
    console.error('View file error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch file content',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

