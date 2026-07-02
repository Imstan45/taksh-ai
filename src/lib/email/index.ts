import { Resend } from "resend";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function send(to: string, subject: string, title: string, message: string, href: string, label: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    if (process.env.NODE_ENV === "production") throw new Error("Email service is not configured");
    console.info(`[Taksh AI email] ${subject}: ${href}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px"><h1 style="color:#171717">${title}</h1><p style="color:#525252;line-height:1.6">${message}</p><a href="${href}" style="display:inline-block;background:#6d28d9;color:white;padding:12px 20px;border-radius:10px;text-decoration:none">${label}</a><p style="color:#a3a3a3;font-size:12px;margin-top:28px">If you did not request this, you can safely ignore this email.</p></div>`,
  });
  if (error) throw new Error(error.message);
}

export const sendVerificationEmail = (email: string, token: string) =>
  send(email, "Verify your Taksh AI account", "Welcome to Taksh AI", "Verify your email to activate your secure account.", `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`, "Verify email");
export const sendPasswordResetEmail = (email: string, token: string) =>
  send(email, "Reset your Taksh AI password", "Reset your password", "This secure link expires in 30 minutes and can only be used once.", `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`, "Reset password");
