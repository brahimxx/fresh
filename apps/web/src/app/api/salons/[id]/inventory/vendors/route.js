import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(request, context) {
  try {
    const { id } = await context.params;
    const session = await verifyAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const vendors = await query(
      `SELECT * FROM product_vendors WHERE salon_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
      [id]
    );

    return NextResponse.json({ data: vendors });
  } catch (error) {
    console.error('Fetch vendors error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const { id } = await context.params;
    const session = await verifyAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, contact_name, contact_email, contact_phone, website, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO product_vendors 
       (salon_id, name, contact_name, contact_email, contact_phone, website, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, contact_name, contact_email, contact_phone, website, notes]
    );

    const newVendor = await query(`SELECT * FROM product_vendors WHERE id = ?`, [result.insertId]);

    return NextResponse.json({ data: newVendor[0] });
  } catch (error) {
    console.error('Create vendor error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
