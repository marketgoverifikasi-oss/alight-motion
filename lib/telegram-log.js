// ============================================================
//  lib/telegram-log.js — Telegram Logger (CLEAN)
//  - Email Sendiri (Manual): Rp 3.000
//  - Email dari Web (Auto):  Rp 5.000 × N
// ============================================================

const AUTO_BOT_TOKEN   = process.env.BOT_TOKEN      || '8958286790:AAGG2yHukA_8cMQG-XM-FMqjj8doaVtJx5w';
const MANUAL_BOT_TOKEN = process.env.LOG_BOT_TOKEN  || '8958286790:AAGG2yHukA_8cMQG-XM-FMqjj8doaVtJx5w';
const OWNER_ID         = process.env.OWNER_ID       || '8347420543';

const AUTO_FLUSH_DELAY = 2500;

// ── Helper ──────────────────────────────────────────────────
function formatDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function esc(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatRp(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

// ── Kirim pesan via Telegram ────────────────────────────────
async function sendVia(token, html) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: OWNER_ID,
        text: html,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const data = await res.json();
    if (!data.ok) {
      // Fallback plain text
      const plain = html.replace(/<[^>]+>/g, '');
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: OWNER_ID,
          text: plain,
          disable_web_page_preview: true
        })
      });
    }
    return data.ok;
  } catch (err) {
    console.error('[TG] Fetch error:', err.message);
    return false;
  }
}

function sendAuto(html)   { return sendVia(AUTO_BOT_TOKEN, html); }
function sendManual(html) { return sendVia(MANUAL_BOT_TOKEN, html); }

// ============================================================
//  EMAIL DARI WEB (AUTO) — Buffer + auto flush
// ============================================================
let autoBuffer     = [];
let autoFlushTimer = null;

function scheduleAutoFlush() {
  if (autoFlushTimer) clearTimeout(autoFlushTimer);
  autoFlushTimer = setTimeout(() => {
    flushAutoBuffer().catch(() => {});
  }, AUTO_FLUSH_DELAY);
}

async function flushAutoBuffer() {
  if (!autoBuffer.length) return;
  const batch = autoBuffer.slice();
  autoBuffer = [];
  autoFlushTimer = null;
  await logAutoBatch(batch);
}

// ── Per akun (dipanggil dari api/auto-start.js) ─────────────
async function logBulkResult(email, success, opts = {}) {
  const { orderId, magicLink, password, error, amount } = opts;

  autoBuffer.push({
    email: email || '-',
    success: !!success,
    orderId: orderId || null,
    magicLink: magicLink || password || null,
    error: error || null,
    amount: amount || 0,
    time: formatDate()
  });

  scheduleAutoFlush();
  return true;
}

// ── Kirim 1 pesan batch ─────────────────────────────────────
async function logAutoBatch(results = []) {
  if (!Array.isArray(results) || results.length === 0) return false;

  const total       = results.length;
  const success     = results.filter(r => r.success);
  const failed      = results.filter(r => !r.success);
  const batchTime   = formatDate();
  const totalAmount = success.reduce((sum, r) => sum + (r.amount || 0), 0);
  const priceAkun   = success[0]?.amount || 5000;

  let html = '';
  html += `🏆 <b>EMAIL DARI WEB — ${success.length}/${total} BERHASIL</b>\n`;
  html += `━━━━━━━━━━━━━━━━━━━━\n`;
  html += `🕒 <i>${esc(batchTime)}</i>\n`;
  if (success.length) {
    html += `💵 <b>Total:</b> <code>${esc(formatRp(totalAmount))}</code>\n`;
    html += `📦 <b>Harga:</b> ${esc(formatRp(priceAkun))}/akun\n`;
  }
  html += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (success.length) {
    success.forEach((r, i) => {
      html += `<b>${i + 1}. AKUN ✅</b>\n`;
      html += `📧 Email: <code>${esc(r.email || '-')}</code>\n`;
      if (r.magicLink) html += `🔗 Magic Link: <code>${esc(r.magicLink)}</code>\n`;
      if (r.orderId)   html += `🎫 Order ID: <code>${esc(r.orderId)}</code>\n`;
      html += `🕒 Waktu: <i>${esc(r.time || batchTime)}</i>\n\n`;
    });
  } else {
    html += `<i>Tidak ada akun yang berhasil.</i>\n\n`;
  }

  if (failed.length) {
    html += `━━━━━━━━━━━━━━━━━━━━\n`;
    html += `❌ <b>GAGAL (${failed.length})</b>\n`;
    failed.forEach((r, i) => {
      const errMsg = String(r.error || 'unknown').slice(0, 120);
      html += `${i + 1}. <code>${esc(r.email || '-')}</code>\n`;
      html += `   ⚠️ ${esc(errMsg)}\n`;
    });
  }

  html += `━━━━━━━━━━━━━━━━━━━━`;
  return sendAuto(html);
}

// ── Alias biar kompatibel dengan api/auto-start.js lama ─────
const logBulkBatch    = logAutoBatch;
const flushBulkBuffer = flushAutoBuffer;

// ============================================================
//  EMAIL SENDIRI (MANUAL) — Kirim Link / Verifikasi
// ============================================================
async function logManualResult(email, success, opts = {}) {
  const { orderId, magicLink, error, stage = 'send', amount } = opts;
  const stageLabel = stage === 'verif' ? 'VERIFIKASI' : 'KIRIM LINK';
  const priceLabel = amount ? formatRp(amount) : 'Rp 3.000';

  if (success) {
    let html = '';
    if (stage === 'verif') {
      html += `👑 <b>EMAIL SENDIRI — PREMIUM AKTIF</b>\n`;
      html += `━━━━━━━━━━━━━━━━━━━━\n`;
      html += `📧 Email: <code>${esc(email || '-')}</code>\n`;
      html += `💵 Dibayar: <code>${esc(priceLabel)}</code>\n`;
      if (magicLink) html += `🔗 Magic Link: <code>${esc(magicLink)}</code>\n`;
      if (orderId)   html += `🎫 Order ID: <code>${esc(orderId)}</code>\n`;
      html += `🕒 Waktu: <i>${esc(formatDate())}</i>\n`;
      html += `━━━━━━━━━━━━━━━━━━━━\n`;
      html += `✅ <b>Status: Premium berhasil diaktifkan</b>`;
    } else {
      html += `📤 <b>EMAIL SENDIRI — KIRIM LINK BERHASIL</b>\n`;
      html += `━━━━━━━━━━━━━━━━━━━━\n`;
      html += `📧 Email: <code>${esc(email || '-')}</code>\n`;
      html += `💵 Dibayar: <code>${esc(priceLabel)}</code>\n`;
      html += `🕒 Waktu: <i>${esc(formatDate())}</i>\n`;
      html += `━━━━━━━━━━━━━━━━━━━━\n`;
      html += `📨 <i>Magic link sedang dikirim ke Gmail user</i>`;
    }
    return sendManual(html);
  }

  let html = '';
  html += `❌ <b>EMAIL SENDIRI — ${stageLabel} GAGAL</b>\n`;
  html += `━━━━━━━━━━━━━━━━━━━━\n`;
  html += `📧 Email: <code>${esc(email || '-')}</code>\n`;
  html += `💵 Dibayar: <code>${esc(priceLabel)}</code>\n`;
  html += `⚠️ Error: <pre>${esc(String(error || 'unknown').slice(0, 250))}</pre>\n`;
  html += `🕒 Waktu: <i>${esc(formatDate())}</i>\n`;
  html += `━━━━━━━━━━━━━━━━━━━━`;
  return sendManual(html);
}

// ============================================================
//  PAYMENT NOTIFICATION (Opsional)
// ============================================================
async function logPaymentSuccess(opts = {}) {
  const { email, amount, mode = 'auto', orderId, count = 1 } = opts;
  const priceLabel = formatRp(amount);

  let html = '';
  html += `💰 <b>PEMBAYARAN LUNAS</b>\n`;
  html += `━━━━━━━━━━━━━━━━━━━━\n`;
  if (mode === 'manual') {
    html += `📦 Mode: <b>Email Sendiri</b>\n`;
    html += `💵 Jumlah: <code>${esc(priceLabel)}</code>\n`;
    if (email) html += `📧 Email: <code>${esc(email)}</code>\n`;
  } else {
    html += `📦 Mode: <b>Email dari Web</b>\n`;
    html += `🔢 Jumlah Akun: <b>${esc(count)}</b>\n`;
    html += `💵 Total: <code>${esc(priceLabel)}</code>\n`;
    html += `💵 Per akun: <code>Rp 5.000</code>\n`;
  }
  if (orderId) html += `🎫 Order ID: <code>${esc(orderId)}</code>\n`;
  html += `🕒 Waktu: <i>${esc(formatDate())}</i>\n`;
  html += `━━━━━━━━━━━━━━━━━━━━\n`;
  html += `⚙️ <i>Memproses akun...</i>`;

  return sendManual(html);
}

// ── Export ──────────────────────────────────────────────────
module.exports = {
  // Auto (Email dari Web)
  logBulkResult,       // dipanggil per akun dari api/auto-start.js
  logBulkBatch,        // alias
  flushBulkBuffer,     // alias
  logAutoBatch,        // versi baru
  flushAutoBuffer,     // versi baru
  // Manual (Email Sendiri)
  logManualResult,
  // Payment
  logPaymentSuccess,
  // Low-level
  sendBulk:   sendAuto,   // alias biar kompatibel
  sendAuto,               // versi baru
  sendManual,
  // Helper
  formatDate,
  formatRp,
  esc
};