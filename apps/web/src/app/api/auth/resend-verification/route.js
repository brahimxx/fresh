import { query, getOne } from '@/lib/db';
import { getSession, createToken } from '@/lib/auth';
import { success, error, unauthorized } from '@/lib/response';
import { sendEmail } from '@/lib/email';
import rateLimiter, { RateLimitPresets } from '@/lib/rate-limit';
import { getVerificationEmailTemplate } from '@/lib/constants/email-templates';

// POST /api/auth/resend-verification - Resend verification email
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorized();
    }

    const { userId } = session;

    // Strict 1-minute cooldown per user
    const cooldownLimit = rateLimiter.check(
      `resend-cooldown:${userId}`,
      1, // 1 time per window
      60 * 1000 // 60 seconds
    );

    if (!cooldownLimit.success) {
      return error(
        `Please wait ${cooldownLimit.retryAfter} seconds before requesting a new email.`,
        429
      );
    }

    // Rate limiting to prevent spamming resend (long term limit)
    const rateLimit = rateLimiter.check(
      `resend-verify:${userId}`,
      3, // 3 times per window
      60 * 60 * 1000 // 1 hour
    );

    if (!rateLimit.success) {
      return error(
        `Too many resend attempts. Please try again in ${Math.ceil(rateLimit.retryAfter / 60)} minutes.`,
        429
      );
    }

    const user = await getOne(
      'SELECT id, email, first_name, email_verified FROM users WHERE id = ? AND deleted_at IS NULL',
      [userId]
    );

    if (!user) {
      return unauthorized();
    }

    if (user.email_verified) {
      return error('Email is already verified', 400);
    }

    // Create Email Verification Token
    const verificationToken = await createToken(
      { type: 'email_verification', userId: user.id, email: user.email },
      { expiresIn: '24h' }
    );

    // Send Verification Email
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Verify your email address - Fresh',
      html: getVerificationEmailTemplate(user.first_name, verifyUrl),
      text: `Hello ${user.first_name}! Please verify your email by clicking the following link: ${verifyUrl}`
    }).catch(e => console.error("Email resend failed:", e));

    return success({ sent: true }, 200, 'Verification email sent');
  } catch (err) {
    console.error('Resend verification error:', err);
    return error('An unexpected error occurred while resending the verification email. Please try again.', 500);
  }
}