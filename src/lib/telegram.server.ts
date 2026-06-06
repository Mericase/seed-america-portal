// Telegram helper (via connector gateway). Server-only.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

// Admin chat where all user support messages are forwarded.
export const ADMIN_CHAT_ID = "6048752790";

async function tg(method: string, body: Record<string, unknown>) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
    throw new Error("Telegram not configured");
  }
  const res = await fetch(`${GATEWAY_URL}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(`telegram_${method}_failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data.result;
}

export async function sendTelegramSupportMessage(opts: {
  userName: string;
  userEmail: string;
  userId: string;
  text: string;
}): Promise<{ messageId: number }> {
  const header = `📨 <b>${escapeHtml(opts.userName)}</b>\n<code>${escapeHtml(opts.userEmail)}</code>\n<i>uid: ${escapeHtml(opts.userId)}</i>\n\n`;
  const result = await tg("sendMessage", {
    chat_id: ADMIN_CHAT_ID,
    text: header + escapeHtml(opts.text),
    parse_mode: "HTML",
  });
  return { messageId: result.message_id as number };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
