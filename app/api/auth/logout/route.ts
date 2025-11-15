import { NextResponse } from 'next/server';

/**
 * Logout Route
 * Note: S3 credentials are stored in localStorage on client-side
 * This endpoint is kept for consistency, but logout is handled client-side
 */
export async function POST() {
  return NextResponse.json({ success: true });
}

