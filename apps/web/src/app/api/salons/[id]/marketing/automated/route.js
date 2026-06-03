import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { decodeId } from '@/lib/id';

export async function GET(request, context) {
  try {
    const { id } = await context.params;
    const salonId = decodeId(id);
    const session = await verifyAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const automated = await query(
      `SELECT * FROM automated_campaigns WHERE salon_id = ? ORDER BY trigger_type ASC`,
      [salonId]
    );

    return NextResponse.json({ data: automated });
  } catch (error) {
    console.error('Fetch automated campaigns error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const { id } = await context.params;
    const salonId = decodeId(id);
    const session = await verifyAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, trigger_type, trigger_days_offset, is_active, type, subject, content } = body;

    if (!name || !trigger_type || !content) {
      return NextResponse.json({ error: 'Name, trigger type, and content are required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO automated_campaigns 
       (salon_id, name, trigger_type, trigger_days_offset, is_active, type, subject, content) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [salonId, name, trigger_type, trigger_days_offset || 0, is_active ? 1 : 0, type || 'email', subject || null, content]
    );

    const [newAuto] = await query(`SELECT * FROM automated_campaigns WHERE id = ?`, [result.insertId]);

    return NextResponse.json({ data: newAuto });
  } catch (error) {
    console.error('Create automated campaign error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
