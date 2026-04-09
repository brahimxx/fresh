import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123456');

export async function sendEmail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("No RESEND_API_KEY set, skipping email delivery. Mock dispatch:", { to, subject });
    return { id: "mock_id_dev" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Fresh <onboarding@resend.dev>',
      to,
      subject,
      html,
      text,
    });
    
    if (error) {
      console.error('Resend API returned an error:', error);
    }
    
    return data;
  } catch (error) {
    console.error('Resend email error:', error);
    throw error;
  }
}
