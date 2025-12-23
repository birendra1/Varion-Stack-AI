import { Resend } from 'resend';

let resend;

export async function sendOTPEmail(email, otp, type) {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }

  const subject = type === 'registration'
    ? 'Verify Your Email - Ollama Chat'
    : 'Password Reset Code - Ollama Chat';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #1976d2; margin: 0 0 24px 0; font-size: 24px;">
          ${type === 'registration' ? 'Welcome to Ollama Chat!' : 'Password Reset Request'}
        </h1>

        <p style="color: #333; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
          ${type === 'registration'
            ? 'Thanks for signing up! Please use the verification code below to complete your registration.'
            : 'We received a request to reset your password. Use the code below to proceed.'}
        </p>

        <div style="background: linear-gradient(135deg, #1976d2, #1565c0); padding: 24px; border-radius: 8px; text-align: center; margin: 0 0 24px 0;">
          <span style="font-size: 36px; letter-spacing: 8px; font-weight: bold; color: white; font-family: monospace;">
            ${otp}
          </span>
        </div>

        <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 0 0 8px 0;">
          This code expires in <strong>10 minutes</strong>.
        </p>

        <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 24px 0 0 0; padding-top: 16px; border-top: 1px solid #eee;">
          If you didn't request this, please ignore this email. Your account is safe.
        </p>
      </div>
    </body>
    </html>
  `;

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject,
      html: htmlContent
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error('Failed to send email');
    }

    console.log(`📧 Email sent to ${email}: ${data?.id}`);
    return data;
  } catch (err) {
    console.error('Email service error:', err);
    throw err;
  }
}
