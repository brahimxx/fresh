import { z } from 'zod';

// ============================================================
// Common Schemas
// ============================================================

export const emailSchema = z.string().email('Invalid email address');
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional().nullable();
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const idSchema = z.coerce.number().int().positive('Invalid ID');
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');
export const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM)');
export const datetimeSchema = z.string().datetime({ message: 'Invalid datetime format' });

// ============================================================
// Auth Schemas
// ============================================================

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: phoneSchema,
  role: z.enum(['client', 'owner']).default('client'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

// ============================================================
// Booking Schemas
// ============================================================

export const createBookingSchema = z.object({
  salonId: idSchema,
  staffId: idSchema,
  serviceIds: z.array(idSchema).min(1, 'At least one service is required'),
  startDatetime: datetimeSchema,
  notes: z.string().max(500).optional(),
  source: z.enum(['marketplace', 'direct', 'widget']).default('marketplace'),
});

export const rescheduleBookingSchema = z.object({
  startDatetime: datetimeSchema,
  staffId: idSchema.optional(),
});

export const assignStaffSchema = z.object({
  staffId: idSchema,
});

// ============================================================
// Salon Schemas
// ============================================================

export const createSalonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000).optional(),
  phone: phoneSchema,
  email: emailSchema.optional(),
  address: z.string().max(500).optional(),
  city: z.string().min(1, 'City is required').max(100),
  country: z.string().min(1, 'Country is required').max(100),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isMarketplaceEnabled: z.boolean().default(true),
});

export const updateSalonSchema = createSalonSchema.partial();

export const salonSettingsSchema = z.object({
  cancellationPolicyHours: z.number().int().min(0).max(168).optional(),
  noShowFee: z.number().min(0).optional(),
  depositRequired: z.boolean().optional(),
  depositPercentage: z.number().int().min(0).max(100).optional(),
  onlineBookingEnabled: z.boolean().optional(),
  autoConfirmBookings: z.boolean().optional(),
  sendReminders: z.boolean().optional(),
  reminderHoursBefore: z.number().int().min(1).max(72).optional(),
});

// ============================================================
// Service Schemas
// ============================================================

export const createServiceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  categoryId: idSchema.optional().nullable(),
  duration: z.number().int().min(5, 'Duration must be at least 5 minutes').max(480),
  price: z.number().min(0, 'Price must be positive'),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().default(true),
  staffIds: z.array(idSchema).optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

// ============================================================
// Staff Schemas
// ============================================================

export const addStaffSchema = z.object({
  userId: idSchema,
  role: z.enum(['staff', 'manager']).default('staff'),
});

export const workingHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeSchema,
  endTime: timeSchema,
}).refine(data => data.startTime < data.endTime, {
  message: 'End time must be after start time',
});

export const timeOffSchema = z.object({
  startDatetime: datetimeSchema,
  endDatetime: datetimeSchema,
  reason: z.string().max(255).optional(),
}).refine(data => new Date(data.startDatetime) < new Date(data.endDatetime), {
  message: 'End datetime must be after start datetime',
});

// ============================================================
// Payment Schemas
// ============================================================

export const createPaymentIntentSchema = z.object({
  bookingId: idSchema,
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('eur'),
});

export const refundSchema = z.object({
  paymentId: idSchema,
  amount: z.number().positive().optional(),
  reason: z.string().max(500).optional(),
});

// ============================================================
// Discount Schemas
// ============================================================

export const validateDiscountSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  salonId: idSchema,
  subtotal: z.number().min(0).default(0),
  hasServices: z.boolean().default(true),
  hasProducts: z.boolean().default(false),
});

export const createDiscountSchema = z.object({
  code: z.string().min(1).max(50).transform(v => v.toUpperCase()),
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().positive(),
  minPurchase: z.number().min(0).optional(),
  maxDiscount: z.number().positive().optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  maxUses: z.number().int().positive().optional(),
  appliesToServices: z.boolean().default(true),
  appliesToProducts: z.boolean().default(true),
});

// ============================================================
// Review Schemas
// ============================================================

export const createReviewSchema = z.object({
  salonId: idSchema,
  bookingId: idSchema.optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
});

// ============================================================
// Widget Booking Schema (Public)
// ============================================================

export const widgetBookingSchema = z.object({
  serviceId: idSchema,
  staffId: idSchema,
  startTime: datetimeSchema,
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: emailSchema,
  phone: phoneSchema,
  notes: z.string().max(500).optional(),
});

// ============================================================
// Pagination Schema
// ============================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================
// Validation Helper
// ============================================================

/**
 * Validate data against a Zod schema
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @param {unknown} data - The data to validate
 * @returns {{ success: true, data: T } | { success: false, errors: Record<string, string[]> }}
 */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }
  
  return { success: false, errors };
}

/**
 * Get formatted error message from validation errors
 * @param {Record<string, string[]>} errors 
 * @returns {string}
 */
export function formatValidationErrors(errors) {
  return Object.entries(errors)
    .map(([field, messages]) => {
      if (field === '_root') return messages.join(', ');
      return `${field}: ${messages.join(', ')}`;
    })
    .join('; ');
}

/**
 * Middleware-style validator for API routes
 * @param {z.ZodSchema} schema 
 * @returns {(data: unknown) => { data: T } | Response}
 */
export function createValidator(schema) {
  return (data) => {
    const result = validate(schema, data);
    if (!result.success) {
      return { 
        error: formatValidationErrors(result.errors),
        details: result.errors 
      };
    }
    return { data: result.data };
  };
}
