import { error, notFound, success } from '@/lib/response';
import { decodeId } from '@/lib/id';
import { getOne, query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]*$/;
const PHONE_PATTERN = /^[+()\d\s.-]{7,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validationError(message) {
  return error({ code: 'VALIDATION_ERROR', message }, 400);
}

async function checkStaffAccess(staffId, userId, role) {
  if (role === 'admin') return true;

  const staff = await getOne(
    `SELECT s.*, sal.owner_id
     FROM staff s
     JOIN salons sal ON sal.id = s.salon_id
     WHERE s.id = ?`,
    [staffId]
  );

  if (!staff) return null;

  if (Number(staff.owner_id) === Number(userId) || Number(staff.user_id) === Number(userId)) return staff;

  const manager = await getOne(
    `SELECT id FROM staff
     WHERE salon_id = ? AND user_id = ? AND role IN ('manager', 'owner') AND is_active = 1`,
    [staff.salon_id, userId]
  );

  return manager ? staff : null;
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

async function getContactForAccess(staffId, contactId) {
  return getOne(
    `SELECT id, staff_id, contact_name, relationship, phone_primary, phone_secondary, email, is_primary, notes, created_at, updated_at
     FROM staff_emergency_contacts
     WHERE id = ? AND staff_id = ?`,
    [contactId, staffId]
  );
}

export async function PATCH(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawStaffId, contactId: rawContactId } = await params;
    const staffId = decodeId(rawStaffId);
    const contactId = decodeId(rawContactId);

    if (!Number.isInteger(staffId) || staffId <= 0 || !Number.isInteger(contactId) || contactId <= 0) {
      return validationError('Invalid id');
    }

    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return notFound('Staff member not found or access denied');
    }

    const existingContact = await getContactForAccess(staffId, contactId);
    if (!existingContact) {
      return notFound('Emergency contact not found');
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

    if (contactName.length > 150 || !NAME_PATTERN.test(contactName)) {
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

    const duplicateContact = await getOne(
      `SELECT id
       FROM staff_emergency_contacts
       WHERE staff_id = ? AND contact_name = ? AND phone_primary = ? AND id != ?
       LIMIT 1`,
      [staffId, contactName, phonePrimary, contactId]
    );

    if (duplicateContact) {
      return validationError('This emergency contact already exists');
    }

    if (isPrimary) {
      await query('UPDATE staff_emergency_contacts SET is_primary = 0 WHERE staff_id = ?', [staffId]);
    }

    await query(
      `UPDATE staff_emergency_contacts
       SET contact_name = ?, relationship = ?, phone_primary = ?, phone_secondary = ?, email = ?, is_primary = ?, notes = ?, updated_at = NOW()
       WHERE id = ? AND staff_id = ?`,
      [
        contactName,
        relationship || null,
        phonePrimary,
        phoneSecondary || null,
        email || null,
        isPrimary ? 1 : 0,
        notes || null,
        contactId,
        staffId,
      ]
    );

    const updatedContact = await getContactForAccess(staffId, contactId);
    return success({ contact: mapContact(updatedContact) });
  } catch (err) {
    if (err.message === 'Unauthorized') {
      return error('Unauthorized', 401);
    }
    console.error('Update staff emergency contact error:', err);
    return error('Failed to update emergency contact', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawStaffId, contactId: rawContactId } = await params;
    const staffId = decodeId(rawStaffId);
    const contactId = decodeId(rawContactId);

    if (!Number.isInteger(staffId) || staffId <= 0 || !Number.isInteger(contactId) || contactId <= 0) {
      return validationError('Invalid id');
    }

    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return notFound('Staff member not found or access denied');
    }

    const existingContact = await getContactForAccess(staffId, contactId);
    if (!existingContact) {
      return notFound('Emergency contact not found');
    }

    await query('DELETE FROM staff_emergency_contacts WHERE id = ? AND staff_id = ?', [contactId, staffId]);
    return success({ deleted: true });
  } catch (err) {
    if (err.message === 'Unauthorized') {
      return error('Unauthorized', 401);
    }
    console.error('Delete staff emergency contact error:', err);
    return error('Failed to delete emergency contact', 500);
  }
}