import { created, error, notFound, success } from '@/lib/response';
import { decodeId } from '@/lib/id';
import { getOne, query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { checkStaffAccess } from '@/lib/permissions-server';

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]*$/;
const PHONE_PATTERN = /^[+()\d\s.-]{7,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validationError(message) {
  return error({ code: 'VALIDATION_ERROR', message }, 400);
}



function mapContact(contact) {
  return {
    id: contact.id,
    staffId: contact.staff_id,
    contactName: contact.contact_name,
    relationship: contact.relationship,
    phonePrimary: contact.phone_primary,
    phoneSecondary: contact.phone_secondary,
    email: contact.email,
    isPrimary: !!contact.is_primary,
    notes: contact.notes,
    createdAt: contact.created_at,
    updatedAt: contact.updated_at,
  };
}

export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawStaffId } = await params;
    const staffId = decodeId(rawStaffId);

    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return notFound('Staff member not found or access denied');
    }

    const contacts = await query(
      `SELECT id, staff_id, contact_name, relationship, phone_primary, phone_secondary, email, is_primary, notes, created_at, updated_at
       FROM staff_emergency_contacts
       WHERE staff_id = ?
       ORDER BY is_primary DESC, created_at ASC`,
      [staffId]
    );

    return success({
      staffId,
      contacts: contacts.map(mapContact),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') {
      return error('Unauthorized', 401);
    }
    console.error('Get staff emergency contacts error:', err);
    return error('Failed to get emergency contacts', 500);
  }
}

export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawStaffId } = await params;
    const staffId = decodeId(rawStaffId);

    if (!Number.isInteger(staffId) || staffId <= 0) {
      return validationError('Invalid staff id');
    }

    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return notFound('Staff member not found or access denied');
    }

    const body = await request.json();
    const contactName = typeof body.contactName === 'string' ? body.contactName.trim() : '';
    const phonePrimary = typeof body.phonePrimary === 'string' ? body.phonePrimary.trim() : '';
    const relationship = typeof body.relationship === 'string' ? body.relationship.trim() : '';
    const phoneSecondary = typeof body.phoneSecondary === 'string' ? body.phoneSecondary.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const isPrimary = !!body.isPrimary;

    if (!contactName || !phonePrimary) {
      return validationError('Contact name and primary phone are required');
    }

    if (contactName.length > 150) {
      return validationError('Contact name must be 150 characters or less');
    }

    if (!NAME_PATTERN.test(contactName)) {
      return validationError('Contact name can only include letters, spaces, apostrophes, periods, and hyphens');
    }

    if (relationship && relationship.length > 100) {
      return validationError('Relationship must be 100 characters or less');
    }

    if (phonePrimary.length > 20 || !PHONE_PATTERN.test(phonePrimary)) {
      return validationError('Primary phone must be a valid phone number');
    }

    if (phoneSecondary && (phoneSecondary.length > 20 || !PHONE_PATTERN.test(phoneSecondary))) {
      return validationError('Secondary phone must be a valid phone number');
    }

    if (email && (email.length > 255 || !EMAIL_PATTERN.test(email))) {
      return validationError('Email must be a valid email address');
    }

    if (notes.length > 5000) {
      return validationError('Notes are too long');
    }

    const existingContact = await getOne(
      `SELECT id
       FROM staff_emergency_contacts
       WHERE staff_id = ? AND contact_name = ? AND phone_primary = ?
       LIMIT 1`,
      [staffId, contactName, phonePrimary]
    );

    if (existingContact) {
      return validationError('This emergency contact already exists');
    }

    if (isPrimary) {
      await query('UPDATE staff_emergency_contacts SET is_primary = 0 WHERE staff_id = ?', [staffId]);
    }

    const result = await query(
      `INSERT INTO staff_emergency_contacts
        (staff_id, contact_name, relationship, phone_primary, phone_secondary, email, is_primary, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        staffId,
        contactName,
        relationship || null,
        phonePrimary,
        phoneSecondary || null,
        email || null,
        isPrimary ? 1 : 0,
        notes || null,
      ]
    );

    const insertedContact = await getOne(
      `SELECT id, staff_id, contact_name, relationship, phone_primary, phone_secondary, email, is_primary, notes, created_at, updated_at
       FROM staff_emergency_contacts
       WHERE id = ?`,
      [result.insertId]
    );

    return created({
      contact: mapContact(insertedContact),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') {
      return error('Unauthorized', 401);
    }
    if (err?.code === 'ER_DATA_TOO_LONG') {
      return validationError('One of the fields is too long');
    }
    console.error('Create staff emergency contact error:', err);
    return error('Failed to add emergency contact', 500);
  }
}