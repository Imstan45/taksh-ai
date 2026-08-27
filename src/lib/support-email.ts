type SupportEmail = {
  ticketNumber: string;
  name: string;
  email: string;
  role: string;
  category: string;
  subject: string;
  message: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);
}

export async function notifySupport(ticket: SupportEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SUPPORT_EMAIL ?? "support.takshai@gmail.com";
  const from = process.env.SUPPORT_FROM_EMAIL ?? "Taksh AI Support <onboarding@resend.dev>";
  if (!apiKey) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: ticket.email,
      subject: `[${ticket.ticketNumber}] ${ticket.subject}`,
      html: `<h2>New Taksh AI support ticket</h2><p><b>Reference:</b> ${escapeHtml(ticket.ticketNumber)}</p><p><b>From:</b> ${escapeHtml(ticket.name)} (${escapeHtml(ticket.email)})</p><p><b>Role:</b> ${escapeHtml(ticket.role)}</p><p><b>Category:</b> ${escapeHtml(ticket.category)}</p><p><b>Subject:</b> ${escapeHtml(ticket.subject)}</p><hr><p style="white-space:pre-wrap">${escapeHtml(ticket.message)}</p>`,
    }),
  });
  return response.ok;
}
