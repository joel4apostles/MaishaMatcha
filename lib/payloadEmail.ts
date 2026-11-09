import type { EmailAdapter } from "payload";
import { sendEmail } from "@/lib/email";

/**
 * Payload's own emails (password reset) through the same Resend HTTP call
 * as everything else. Without RESEND_API_KEY nothing is sent and the admin
 * still works (invitations then show the link to pass on by hand).
 */
export const resendEmail: EmailAdapter<{ sent: boolean; status: string }> = () => ({
  name: "resend-http",
  defaultFromAddress: "hola@maishamatcha.es",
  defaultFromName: "maisha matcha",
  sendEmail: async (message) => {
    const to = Array.isArray(message.to) ? message.to.map(String).join(",") : String(message.to ?? "");
    if (!to) return { sent: false, status: "no-recipient" };
    return sendEmail(to, String(message.subject ?? ""), String(message.html ?? ""));
  },
});
