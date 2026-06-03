import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { decodeId } from '@/lib/id';

export async function PUT(request, context) {
  try {
    const { id, autoId } = await context.params;
    const salonId = decodeId(id);
    const session = await verifyAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Validate that the automation belongs to the salon
    const [existing] = await query(
      `SELECT * FROM automated_campaigns WHERE id = ? AND salon_id = ?`,
      [autoId, salonId]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Automated campaign not found' }, { status: 404 });
    }

    const body = await request.json();
    
    // We only update specific editable fields
    const updates = [];
    const values = [];

    if (body.subject !== undefined) {
      updates.push('subject = ?');
      values.push(body.subject);
    }
    
    if (body.content !== undefined) {
      updates.push('content = ?');
      values.push(body.content);
    }
    
    if (body.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(body.is_active ? 1 : 0);
    }
    
    if (body.trigger_days_offset !== undefined) {
      updates.push('trigger_days_offset = ?');
      values.push(Number(body.trigger_days_offset));
    }

    if (updates.length > 0) {
      values.push(autoId);
      await query(
        `UPDATE automated_campaigns SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    const [updated] = await query(
      `SELECT * FROM automated_campaigns WHERE id = ?`,
      [autoId]
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Update automated campaign error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
