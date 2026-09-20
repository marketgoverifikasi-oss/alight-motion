// ============================================================
//  TEMP MAIL SCRAPER — Emailnator (emailnator.com)
// ============================================================

const BASE_URL = 'https://emailnator.com';

const HEADERS = {
  'accept': 'application/json',
  'content-type': 'application/json',
  'origin': BASE_URL,
  'referer': `${BASE_URL}/`,
  'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
  'sec-ch-ua': '"Brave";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"Android"',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-mode': 'cors',
  'sec-fetch-dest': 'empty',
  'sec-gpc': '1'
};

const AVAILABLE_DOMAINS = ['gmail.com', 'googlemail.com'];

const DOMAIN_TO_ID = {
  'gmail.com':      3,
  'googlemail.com': 8
};

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...HEADERS, ...(options.headers || {}) }
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  try { return JSON.parse(text); }
  catch { throw new Error(`Response bukan JSON: ${text.slice(0, 100)}`); }
}

async function generateEmail(username, domain = 'gmail.com') {
  const id = DOMAIN_TO_ID[domain] || 3;
  const data = await request('/api/generate-email', {
    method: 'POST',
    body: JSON.stringify({ ids: [id] })
  });

  if (!data || data.status !== 'success' || !data.email) {
    throw new Error(data?.message || 'Gagal generate email Emailnator.');
  }

  const [pre, dm] = data.email.split('@');

  return {
    status: true,
    email: data.email,
    username: pre,
    domain: dm,
    type: data.type,
    email_type_id: data.email_type_id,
    provider: 'emailnator.com'
  };
}

async function getInbox(email, options = {}) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('Alamat email tidak valid.');
  }

  const limit = options.limit || 20;
  const data = await request('/api/message-list', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), limit })
  });

  if (!data || data.status !== 'success') {
    throw new Error(data?.message || 'Gagal mengambil inbox.');
  }

  const messages = (data.messages || []).map(m => ({
    mail_id: m.id,
    from: m.from,
    from_mail: m.from,
    from_name: m.from ? String(m.from).split('@')[0] : '',
    subject: m.subject || '(no subject)',
    time: m.date,
    is_new: !m.seen,
    locked: !!m.locked,
    attachments_count: m.has_attachments ? 1 : 0
  }));

  return {
    status: true,
    email: email.trim(),
    count: messages.length,
    first_id: messages.length ? messages[messages.length - 1].mail_id : null,
    last_id: messages.length ? messages[0].mail_id : null,
    has_more: false,
    messages
  };
}

async function getMail(email, mailId, epin = '') {
  if (!mailId) throw new Error('Parameter mail_id harus diisi.');

  const data = await request(`/api/message/${encodeURIComponent(mailId)}`, {
    method: 'GET'
  });

  if (!data || data.error) {
    throw new Error(data?.error || 'Gagal mengambil email.');
  }

  // Fallback: kadang field-nya beda
  const content = data.content || data.body || data.html || data.text || '';

  return {
    status: true,
    mail_id: data.id || mailId,
    from: data.from || data.sender || '',
    from_mail: data.from || data.sender || '',
    from_name: data.from ? String(data.from).split('@')[0] : '',
    to: email,
    subject: data.subject || '(no subject)',
    date: data.date || data.received_at || new Date().toISOString(),
    is_tls: true,
    text: content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    html: content,
    has_attachments: Boolean(data.has_attachments),
    attachments_count: data.has_attachments ? 1 : 0,
    attachments: []
  };
}

module.exports = {
  generateEmail,
  getInbox,
  getMail,
  AVAILABLE_DOMAINS
};