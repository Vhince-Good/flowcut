import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth: env.smtpUser && env.smtpPass ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
});

function configuredMailValues() {
  return [env.smtpPass, env.smtpUser, env.mailFrom, env.mongoUri, env.jwtSecret]
    .filter((value) => typeof value === 'string' && value.length > 0);
}

function safeSmtpError(err) {
  let message = String(err?.message || 'SMTP request failed');
  for (const secret of configuredMailValues()) {
    message = message.replaceAll(secret, '[REDACTED]');
  }
  return {
    code: typeof err?.code === 'string' ? err.code : 'UNKNOWN',
    responseCode: Number.isInteger(err?.responseCode) ? err.responseCode : undefined,
    command: typeof err?.command === 'string' ? err.command : undefined,
    message,
  };
}

export async function verifyMailTransport() {
  if (!env.smtpUser || !env.smtpPass || !env.mailFrom) {
    return {
      ok: false,
      missing: {
        SMTP_USER: !env.smtpUser,
        SMTP_PASS: !env.smtpPass,
        MAIL_FROM: !env.mailFrom,
      },
    };
  }

  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeSmtpError(err) };
  }
}

export async function sendOtpEmail(email, otp) {
  if (!env.smtpUser || !env.smtpPass || !env.mailFrom) {
    throw new AppError(503, 'Gmail verification is temporarily unavailable. Please configure email delivery.');
  }

  try {
    await transporter.sendMail({
      from: env.mailFrom,
      to: email,
      subject: 'Your FlowCut verification code',
      text: `Your FlowCut verification code is ${otp}. It expires in 10 minutes.`,
      html: `<p>Your FlowCut verification code is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`,
    });
  } catch (err) {
    const safe = safeSmtpError(err);
    console.error('[mail] OTP email send failed:', JSON.stringify(safe));
    throw new AppError(503, 'We could not send your verification email. Check the email settings and try again.');
  }
}
