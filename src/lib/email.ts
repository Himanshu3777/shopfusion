/**
 * Email sender. In dev/test this is a MOCK that logs instead of sending.
 * Swap with a real provider (Resend/SES/etc.) via env config for production.
 */

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendMail(input: MailInput): Promise<void> {
  if (process.env.NODE_ENV === "production" && process.env.SMTP_HOST) {
    // Production hook: integrate nodemailer/Resend here using env credentials.
    throw new Error("SMTP not configured — set SMTP_HOST and mailer implementation");
  }
  console.log(`[mock-email] to=${input.to} subject=${input.subject}`);
}

export function passwordResetMail(to: string, resetUrl: string) {
  return sendMail({
    to,
    subject: "Reset your ShopFusion password",
    html: `<p>Click the link below to reset your password. It expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    text: `Reset your password: ${resetUrl}`,
  });
}

export function orderConfirmationMail(to: string, orderNumber: string, total: string, note?: string) {
  return sendMail({
    to,
    subject: `Order ${orderNumber} confirmed`,
    html: `<p>Thanks for shopping with ShopFusion! Your order <b>${orderNumber}</b> (${total}) is confirmed.</p>${note ? `<p>${note}</p>` : ""}`,
    text: `Order ${orderNumber} (${total}) confirmed.${note ? ` ${note}` : ""}`,
  });
}
