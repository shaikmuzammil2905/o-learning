import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass) {
    throw new Error('SMTP credentials (SMTP_USER / SMTP_PASSWORD) are not configured.');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendOtpEmail(params: {
  to: string;
  otp: string;
  purpose: 'signup' | 'forgot_password';
  name?: string;
}): Promise<void> {
  const from = process.env.SMTP_FROM || `O-Learning Platform <${process.env.SMTP_USER}>`;
  const isSignup = params.purpose === 'signup';
  const subject = isSignup
    ? `${params.otp} is your O-Learning Platform verification code`
    : `${params.otp} is your O-Learning Platform password reset code`;

  const heading = isSignup ? 'Verify Your Email Address' : 'Reset Your Password';
  const intro = isSignup
    ? 'Welcome to O-Learning Platform! Enter the verification code below to complete your registration:'
    : 'We received a request to reset your O-Learning Platform password. Enter the code below to proceed:';

  const greeting = params.name ? `Hi ${params.name},` : 'Hello,';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 20px; font-weight: 800; color: #002B7A;">O-LEARNING</span>
        <span style="font-size: 20px; font-weight: 800; color: #FF7A00;"> PLATFORM</span>
      </div>
      <h2 style="color: #002B7A; margin: 0 0 12px; font-size: 18px;">${heading}</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 12px;">${greeting}</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">${intro}</p>
      <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 20px;">
        <span style="font-size: 30px; font-weight: 800; letter-spacing: 6px; color: #0052CC;">${params.otp}</span>
      </div>
      <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
        This code expires in <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email.
      </p>
    </div>
  `;

  await getTransporter().sendMail({
    from,
    to: params.to,
    subject,
    text: `${greeting}\n\n${intro}\n\nYour OTP code is: ${params.otp}\n\nThis code expires in 10 minutes.`,
    html,
  });
}
