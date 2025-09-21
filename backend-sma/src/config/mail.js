import nodemailer from "nodemailer";

let cachedTransport = null;

export async function getTransport() {
  if (cachedTransport) return cachedTransport;

  if (process.env.USE_ETHEREAL === "true") {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {     user: 'Phumgtd@gmail.com',
    pass: 'lnvmqaioioerarhu', }
    });
  } else {
    cachedTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return cachedTransport;
}
