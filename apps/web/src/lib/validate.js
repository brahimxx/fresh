import { z } from "zod";

// ============================================================
// Common Schemas
// ============================================================

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .max(255, "Email is too long")
  .email("Invalid email address")
  .regex(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    "Invalid email format",
  )
  .refine(
    (email) => !email.includes("..") && !email.startsWith("."),
    "Invalid email format",
  )
  .transform((email) => email.toLowerCase());
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number")
  .optional()
  .nullable();
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^a-zA-Z0-9]/,
    "Password must contain at least one special character",
  );
export const idSchema = z.coerce.number().int().positive("Invalid ID");
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)");
export const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format (HH:MM)");
// local: true allows "YYYY-MM-DDTHH:mm:ss" without a Z/offset suffix.
// This is needed because the frontend sends local-time strings (no UTC conversion)
// to avoid the 1-hour shift that .toISOString() would introduce for UTC+1 Algeria.
export const datetimeSchema = z
  .string()
  .datetime({ local: true, message: "Invalid datetime format" });

// ============================================================
// Auth Schemas
// ============================================================

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: phoneSchema,
  role: z.enum(["client", "owner"]).default("client"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

// ============================================================
// Booking Schemas
// ============================================================

export const createBookingSchema = z.object({
  salonId: idSchema,
  clientId: idSchema,
  staffId: idSchema,
  serviceIds: z.array(idSchema).min(1, "At least one service is required"),
  startDatetime: datetimeSchema,
  // endDatetime is intentionally absent — the backend derives it from
  // service durations and buffer times fetched from the DB.
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
  source: z.enum(["marketplace", "direct", "widget"]).default("marketplace"),
  discountCode: z.string().max(50).optional().nullable(),
  giftCardCode: z.string().max(50).optional().nullable(),
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
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(2000).optional(),
  phone: phoneSchema,
  email: emailSchema.optional(),
  address: z.string().max(500).optional(),
  city: z.string().min(1, "City is required").max(100),
  country: z.string().min(1, "Country is required").max(100),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isMarketplaceEnabled: z.boolean().default(true),
});

export const updateSalonSchema = createSalonSchema.partial();

export const updateSalonStatusSchema = z.object({
  isActive: z.boolean({
    required_error: "isActive flag is required",
    invalid_type_error: "isActive must be a boolean",
  }),
});

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
  name: z.string().min(1, "Name is required").max(255),
  categoryId: idSchema.optional().nullable(),
  duration: z
    .number()
    .int()
    .min(5, "Duration must be at least 5 minutes")
    .max(480),
  price: z.number().min(0, "Price must be positive"),
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
  role: z.enum(["staff", "manager"]).default("staff"),
});

export const workingHoursSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "End time must be after start time",
  });

export const timeOffSchema = z
  .object({
    startDatetime: datetimeSchema,
    endDatetime: datetimeSchema,
    reason: z.string().max(255).optional(),
  })
  .refine((data) => new Date(data.startDatetime) < new Date(data.endDatetime), {
    message: "End datetime must be after start datetime",
  });

// ============================================================
// Payment Schemas
// ============================================================

export const createPaymentIntentSchema = z.object({
  bookingId: idSchema,
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3).default("eur"),
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
  code: z.string().min(1, "Code is required").max(50),
  salonId: idSchema,
  subtotal: z.number().min(0).default(0),
  hasServices: z.boolean().default(true),
  hasProducts: z.boolean().default(false),
});

export const createDiscountSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50)
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  type: z.enum(["percentage", "fixed"]),
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
// Campaign Schemas
// ============================================================

export const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(255),
  type: z.enum(["email", "sms", "push"]).default("email"),
  subject: z.string().max(255).optional(),
  content: z.string().min(1, "Campaign content is required"),
  targetAudience: z.enum(["all", "new", "returning", "inactive"]).default("all"),
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

export const replyReviewSchema = z.object({
  reply: z.string().min(1, "Reply cannot be empty").max(2000),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
});

// ============================================================
// Widget Booking Schema (Requires authentication)
// ============================================================

export const widgetBookingSchema = z.object({
  serviceId: idSchema,
  staffId: idSchema,
  startTime: datetimeSchema,
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
    const path = issue.path.join(".") || "_root";
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
      if (field === "_root") return messages.join(", ");
      return `${field}: ${messages.join(", ")}`;
    })
    .join("; ");
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
        details: result.errors,
      };
    }
    return { data: result.data };
  };
}

/**
 * Validate staff working hours shifts
 * Rules:
 * - start_time < end_time
 * - no overlapping shifts same day
 * - day_of_week correct (0-6)
 * @param {Array<{day_of_week: number, start_time: string, end_time: string}>} shifts
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateShifts(shifts) {
  const dayShifts = {};

  for (const shift of shifts) {
    const { day_of_week, start_time, end_time } = shift;

    if (day_of_week < 0 || day_of_week > 6) {
      return { valid: false, error: `Invalid day of week: ${day_of_week}` };
    }

    if (start_time >= end_time) {
      return { valid: false, error: `Start time must be before end time for day ${day_of_week}` };
    }

    if (!dayShifts[day_of_week]) {
      dayShifts[day_of_week] = [];
    }

    // Check for overlaps
    for (const existing of dayShifts[day_of_week]) {
      // Overlap condition: start1 < end2 AND start2 < end1
      if (start_time < existing.end_time && existing.start_time < end_time) {
        return { valid: false, error: `Overlapping shifts detected for day ${day_of_week}` };
      }
    }

    dayShifts[day_of_week].push({ start_time, end_time });
  }

  return { valid: true };
}

// ============================================================
// Checkout Schemas
// ============================================================

export const addBookingProductSchema = z.object({
  productId: idSchema,
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(100),
});

export const checkoutSchema = z.object({
  method: z.enum(["cash", "card"]),
  tipAmount: z.number().min(0).default(0),
});
