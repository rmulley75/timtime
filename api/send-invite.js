export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { to, toName, eventName, eventDesc, dates, eventId, type, eventDate, eventTime } = req.body;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://timtime.vercel.app';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const apiKey = process.env.RESEND_API_KEY;

  const voteUrl = `${baseUrl}?event=${eventId}`;

  function formatDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function formatTime(t) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  let bodyContent = '';

  if (type === 'rsvp') {
    const dateStr = formatDate(eventDate) + (eventTime ? ' at ' + formatTime(eventTime) : '');
    bodyContent = `
      <p style="margin:0 0 20px;font-size:16px;color:#333;">
        Hey ${toName} — you've been invited to <strong style="color:#0f0e0d;">${eventName}</strong>.
        ${eventDesc ? `<br><br><em style="color:#8a8278;">${eventDesc}</em>` : ''}
      </p>
      <div style="background:#f5f2ec;border-radius:12px;padding:16px 20px;margin-bottom:28px;font-size:17px;font-weight:700;color:#0f0e0d;">
        📅 ${dateStr}
      </div>
      <p style="margin:0 0 20px;font-size:15px;color:#333;">Let the organiser know if you can make it.</p>
      <a href="${voteUrl}" style="display:inline-block;background:#e8623a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;">
        RSVP Now →
      </a>`;
  } else {
    const dateList = (dates || []).map(d => `<li style="padding:4px 0;color:#333;">${formatDate(d)}</li>`).join('');
    bodyContent = `
      <p style="margin:0 0 20px;font-size:16px;color:#333;">
        Hey ${toName} — you've been invited to <strong style="color:#0f0e0d;">${eventName}</strong>.
        ${eventDesc ? `<br><br><em style="color:#8a8278;">${eventDesc}</em>` : ''}
      </p>
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8a8278;">Potential Dates</p>
      <ul style="margin:0 0 28px;padding:0 0 0 20px;">${dateList}</ul>
      <p style="margin:0 0 20px;font-size:15px;color:#333;">Pick which dates work for you — it only takes a minute.</p>
      <a href="${voteUrl}" style="display:inline-block;background:#e8623a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;">
        Pick My Dates →
      </a>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f2ec;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1.5px solid #d6cfc0;">
        <tr><td style="background:#0f0e0d;padding:24px 36px;">
          <span style="font-size:22px;font-weight:800;color:#ffffff;">Tim <span style="color:#e8623a;">Time</span></span>
        </td></tr>
        <tr><td style="padding:36px;">
          <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:#0f0e0d;">You're invited! 🎉</h1>
          ${bodyContent}
        </td></tr>
        <tr><td style="padding:20px 36px;border-top:1.5px solid #ede9df;">
          <p style="margin:0;font-size:12px;color:#8a8278;">You received this because someone used Tim Time to organise an event. If you weren't expecting this, you can safely ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject: `You're invited to ${eventName} 📅`,
        html
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
