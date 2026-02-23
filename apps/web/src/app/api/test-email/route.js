import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const toEmail = searchParams.get('email') || 'delivered@resend.dev'; // Resend test email

    const { success, error } = await sendNotification({
      userId: 187, // Valid User ID from DB
      email: toEmail,
      type: 'email',
      title: 'Fresh Notification Test 🚀',
      message: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #0f172a;">Fresh Notifications Test</h2>
          <p style="color: #334155;">Hello!</p>
          <p style="color: #334155;">This is a test email sent directly from your Fresh application using the Resend API integration.</p>
          <p style="color: #334155;">If you are reading this, <strong>your API key and email integration are working perfectly!</strong> 🎉</p>
          <br>
          <p style="color: #94a3b8; font-size: 12px;">Sent automatically by Antigravity</p>
        </div>
      `,
      data: { test: true }
    });

    return NextResponse.json({ 
      success, 
      message: success ? "Email sent! Check your Resend logs." : "Failed to send email.",
      error,
      sentTo: toEmail
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
