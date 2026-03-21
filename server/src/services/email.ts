/**
 * Email service abstraction.
 * In production, swap the transport to SendGrid / Resend / AWS SES.
 * For now, logs emails to stderr (development mode).
 */

import { env } from '../config/env.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<void> {
  if (env.NODE_ENV === 'production' && env.EMAIL_FROM) {
    // Production: use configured transport
    // When ready, replace with actual email provider SDK
    // e.g. SendGrid, Resend, AWS SES
    await sendViaProvider(options);
  } else {
    // Development: log to stderr
    console.error('[email] Would send email:');
    console.error(`  To: ${options.to}`);
    console.error(`  Subject: ${options.subject}`);
    console.error(`  Body: ${options.html.slice(0, 200)}...`);
  }
}

async function sendViaProvider(options: EmailOptions): Promise<void> {
  // Placeholder for production email provider integration
  // Install and configure your provider of choice:
  //
  // SendGrid: npm install @sendgrid/mail
  // Resend:   npm install resend
  // AWS SES:  npm install @aws-sdk/client-ses
  //
  // For now, fall back to logging
  console.warn(`[email] Production email transport not configured. Email to ${options.to} not sent.`);
  console.warn(`[email] Subject: ${options.subject}`);
  void options;
}

// ─── Email Templates ──────────────────────────────────────────────────

const APP_NAME = 'Apex Live';

export async function sendVerificationEmail(
  to: string,
  token: string,
): Promise<void> {
  const verifyUrl = `${env.APP_URL}/verify-email?token=${token}`;

  await sendEmail({
    to,
    subject: `${APP_NAME} - Verify your email address`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:2rem">
        <h1 style="color:#6C63FF;font-size:28px;margin-bottom:0.5rem">${APP_NAME}</h1>
        <h2 style="color:#333;font-size:20px">Verify your email</h2>
        <p style="color:#555;line-height:1.6">
          Thanks for signing up! Please verify your email address by entering
          the following code in the app:
        </p>
        <div style="background:#f0f0f0;border-radius:8px;padding:1.5rem;text-align:center;margin:1.5rem 0">
          <span style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#333">${token}</span>
        </div>
        <p style="color:#999;font-size:0.85rem">
          This code expires in 24 hours. If you didn't create an account, ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
): Promise<void> {
  await sendEmail({
    to,
    subject: `${APP_NAME} - Reset your password`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:2rem">
        <h1 style="color:#6C63FF;font-size:28px;margin-bottom:0.5rem">${APP_NAME}</h1>
        <h2 style="color:#333;font-size:20px">Reset your password</h2>
        <p style="color:#555;line-height:1.6">
          We received a request to reset your password. Enter the following
          code in the app to set a new password:
        </p>
        <div style="background:#f0f0f0;border-radius:8px;padding:1.5rem;text-align:center;margin:1.5rem 0">
          <span style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#333">${token}</span>
        </div>
        <p style="color:#999;font-size:0.85rem">
          This code expires in 1 hour. If you didn't request a password reset,
          ignore this email — your password will remain unchanged.
        </p>
      </div>
    `,
  });
}
