import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';

export async function POST(request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse('Unauthorized', 401);
    }

    const { reviewId } = await params;
    const body = await request.json();
    const { reply } = body;

    if (!reply || !reply.trim()) {
      return errorResponse('Reply is required', 400);
    }

    const rId = parseInt(reviewId);

    // Verify the review belongs to user's salon
    const [review] = await query(
      `SELECT r.*, s.owner_id 
       FROM reviews r
       JOIN salons s ON r.salon_id = s.id
       WHERE r.id = ?`,
      [rId]
    );

    if (!review) {
      return errorResponse('Review not found', 404);
    }

    if (review.owner_id !== session.userId) {
      return errorResponse('Unauthorized', 403);
    }

    // Update review with reply
    await query(
      `UPDATE reviews 
       SET owner_reply = ?, owner_reply_at = NOW()
       WHERE id = ?`,
      [reply.trim(), rId]
    );

    return successResponse({ message: 'Reply added successfully' });
  } catch (error) {
    console.error('Error adding reply:', error);
    return errorResponse('Failed to add reply', 500);
  }
}
