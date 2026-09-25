/**
 * Optional email receipt via Resend (https://resend.com).
 * If RESEND_API_KEY is not set, this is a no-op — in-app receipt still works.
 */

export type ReceiptEmailPayload = {
  to: string
  bookingId: string
  serviceTitle: string
  amount: number
  scheduledLabel: string
  reference: string
}

export async function sendReceiptEmail(payload: ReceiptEmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !payload.to) return false

  const from =
    process.env.RECEIPT_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    'Eth-Links <onboarding@resend.dev>'

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ethlink-app.vercel.app'
  const receiptUrl = `${baseUrl}/book/success?bookingId=${payload.bookingId}`

  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
    <h1 style="color:#16a34a;font-size:22px;margin:0 0 8px">Payment successful</h1>
    <p style="color:#555;margin:0 0 20px">Thank you for booking with Eth-Links.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#666">Service</td><td style="padding:8px 0;text-align:right;font-weight:600">${escapeHtml(payload.serviceTitle)}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Amount</td><td style="padding:8px 0;text-align:right;font-weight:600">${payload.amount} ETB</td></tr>
      <tr><td style="padding:8px 0;color:#666">Scheduled</td><td style="padding:8px 0;text-align:right">${escapeHtml(payload.scheduledLabel)}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Reference</td><td style="padding:8px 0;text-align:right;font-family:monospace">${escapeHtml(payload.reference)}</td></tr>
    </table>
    <p style="margin:24px 0 8px">
      <a href="${receiptUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">View receipt</a>
    </p>
    <p style="color:#999;font-size:12px;margin-top:24px">Eth-Links · Ethiopia</p>
  </div>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: `Receipt — ${payload.serviceTitle} (${payload.amount} ETB)`,
        html,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('[Receipt email] Resend failed:', res.status, body)
      return false
    }
    return true
  } catch (e) {
    console.error('[Receipt email] send failed:', e)
    return false
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
