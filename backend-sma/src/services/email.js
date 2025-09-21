import { getTransport } from "../config/mail.js";

export async function sendVerificationEmail({ to, verifyUrl }) {
  const transport = await getTransport();
  const info = await transport.sendMail({
    from: process.env.SMTP_FROM || '"No Reply" <no-reply@example.com>',
    to,
    subject: "Verify your email",
    html: `
      <h1>Confirm your email</h1>
      <p>Thanks for signing up. Click the link below to verify your email:</p>
      <p><a href="${verifyUrl}">Verify Email</a></p>
      <p>If you did not create an account, you can ignore this email.</p>
    `
  });
  return info;
}

export async function sendPasswordResetEmail({ to, resetUrl }) {
  const transport = await getTransport();
  const info = await transport.sendMail({
    from: process.env.SMTP_FROM || '"No Reply" <no-reply@example.com>',
    to,
    subject: "Reset your password",
    html: `
      <h1>Password reset</h1>
      <p>Click the link below to set a new password. This link expires soon.</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
    `
  });
  return info;
}
