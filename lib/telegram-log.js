const TELEGRAM_TOKEN  = "";
const TELEGRAM_CHATID = "8347420543";
const AUTO_FLUSH_DELAY = 2500;

function formatDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function esc(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function formatRp(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }

async function sendTelegram(html) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHATID, text: html, parse_mode: 'HTML', disable_web_page_preview: true })
    });
    const data = await res.json();
    if (!data.ok) {
      const plain = html.replace(/<[^>]+>/g, '');
      await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHATID, text: plain, disable_web_page_preview: true })
      });
    }
    return data.ok;
  } catch (err) { console.error('[TG] Fetch error:', err.message); return false; }
}

const sendAuto = sendTelegram;
const sendManual = sendTelegram;
let autoBuffer = [];
let autoFlushTimer = null;

function scheduleAutoFlush() {
  if (autoFlushTimer) clearTimeout(autoFlushTimer);
  autoFlushTimer = setTimeout(() => { flushAutoBuffer().catch(() => {}); }, AUTO_FLUSH_DELAY);
}

async function flushAutoBuffer() {
  if (!autoBuffer.length) return;
  const batch = autoBuffer.slice();
  autoBuffer = []; autoFlushTimer = null;
  await logAutoBatch(batch);
}

async function logBulkResult(email, success, opts = {}) {
  const { orderId, magicLink, password, error, amount } = opts;
  autoBuffer.push({
    email: email || '-', success: !!success, orderId: orderId || null,
    magicLink: magicLink || password || null, error: error || null,
    amount: amount || 0, time: formatDate()
  });
  scheduleAutoFlush();
  return true;
}

async function logAutoBatch(results = []) {
  if (!Array.isArray(results) || results.length === 0) return false;
  const total = results.length;
  const success = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const batchTime = formatDate();
  const totalAmount = success.reduce((sum, r) => sum + (r.amount || 0), 0);
  const priceAkun = success[0]?.amount || 5000;

  let html = '';
  html += `🏆 <b>EMAIL DARI WEB — ${success.length}/${total} BERHASIL</b>\n`;
  html += `━━━━━━━━━━━━━━━━━━━━\n🕒 <i>${esc(batchTime)}</i>\n`;
  if (success.length) {
    html += `💵 <b>Total:</b> <code>${esc(formatRp(totalAmount))}</code>\n`;
    html += `📦 <b>Harga:</b> ${esc(formatRp(priceAkun))}/akun\n`;
  }
  html += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  if (success.length) {
    success.forEach((r, i) => {
      html += `<b>${i + 1}. AKUN ✅</b>\n📧 Email: <code>${esc(r.email || '-')}</code>\n`;
      if (r.magicLink) html += `🔗 Magic Link: <code>${esc(r.magicLink)}</code>\n`;
      if (r.orderId) html += `🎫 Order ID: <code>${esc(r.orderId)}</code>\n`;
      html += `🕒 Waktu: <i>${esc(r.time || batchTime)}</i>\n\n`;
    });
  } else html += `<i>Tidak ada akun yang berhasil.</i>\n\n`;
  if (failed.length) {
    html += `━━━━━━━━━━━━━━━━━━━━\n❌ <b>GAGAL (${failed.length})</b>\n`;
    failed.forEach((r, i) => {
      html += `${i + 1}. <code>${esc(r.email || '-')}</code>\n   ⚠️ ${esc(String(r.error || 'unknown').slice(0, 120))}\n`;
    });
  }
  html += `━━━━━━━━━━━━━━━━━━━━`;
  return sendTelegram(html);
}

const logBulkBatch = logAutoBatch;
const flushBulkBuffer = flushAutoBuffer;

async function logManualResult(email, success, opts = {}) {
  const { orderId, magicLink, error, stage = 'send', amount } = opts;
  const stageLabel = stage === 'verif' ? 'VERIFIKASI' : 'KIRIM LINK';
  const priceLabel = amount ? formatRp(amount) : 'Rp 3.000';

  if (success) {
    let html = '';
    if (stage === 'verif') {
      html += `👑 <b>EMAIL SENDIRI — PREMIUM AKTIF</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
      html += `📧 Email: <code>${esc(email || '-')}</code>\n💵 Dibayar: <code>${esc(priceLabel)}</code>\n`;
      if (magicLink) html += `🔗 Magic Link: <code>${esc(magicLink)}</code>\n`;
      if (orderId) html += `🎫 Order ID: <code>${esc(orderId)}</code>\n`;
      html += `🕒 Waktu: <i>${esc(formatDate())}</i>\n━━━━━━━━━━━━━━━━━━━━\n✅ <b>Status: Premium berhasil diaktifkan</b>`;
    } else {
      html += `📤 <b>EMAIL SENDIRI — KIRIM LINK BERHASIL</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
      html += `📧 Email: <code>${esc(email || '-')}</code>\n💵 Dibayar: <code>${esc(priceLabel)}</code>\n`;
      html += `🕒 Waktu: <i>${esc(formatDate())}</i>\n━━━━━━━━━━━━━━━━━━━━\n📨 <i>Magic link sedang dikirim ke Gmail user</i>`;
    }
    return sendTelegram(html);
  }

  let html = '';
  html += `❌ <b>EMAIL SENDIRI — ${stageLabel} GAGAL</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
  html += `📧 Email: <code>${esc(email || '-')}</code>\n💵 Dibayar: <code>${esc(priceLabel)}</code>\n`;
  html += `⚠️ Error: <pre>${esc(String(error || 'unknown').slice(0, 250))}</pre>\n`;
  html += `🕒 Waktu: <i>${esc(formatDate())}</i>\n━━━━━━━━━━━━━━━━━━━━`;
  return sendTelegram(html);
}

async function logSewaSuccess(opts = {}) {
  const { orderId, packageName, type, groupLink, targetNumber, bonusNumbers, amount, days } = opts;
  const expiresAt = Date.now() + (days || 0) * 86400000;
  const formattedDateEnd = new Date(expiresAt).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
  const isPremium = type === 'PREMIUM';
  const isNew = type === 'NEW';

  let html = '';
  if (isPremium) {
    html += `📢 <b>TRANSAKSI PREMIUM MASUK</b> 📢\n\n💰 <b>Status:</b> LUNAS\n`;
    html += `🆔 <b>Order ID:</b> <code>${esc(orderId || '-')}</code>\n📦 <b>Paket:</b> ${esc(packageName)}\n`;
    html += `👤 <b>Target Nomor:</b> <code>${esc(targetNumber || '-')}</code>\n💵 <b>Total:</b> <b>${esc(formatRp(amount))}</b>\n`;
    html += `⏳ <b>Berlaku Sampai:</b> <i>${esc(formattedDateEnd)}</i>\n\n⚙️ <i>Sistem otomatis mengubah role user menjadi premium.</i>`;
  } else if (isNew) {
    html += `📢 <b>SEWA BARU MASUK</b> 📢\n\n💰 <b>Status:</b> LUNAS\n`;
    html += `🆔 <b>Order ID:</b> <code>${esc(orderId || '-')}</code>\n📋 <b>Paket:</b> ${esc(packageName)}\n`;
    html += `📅 <b>Durasi:</b> ${esc(days)} hari\n🔗 <b>Link Grup:</b> ${esc(groupLink || '-')}\n`;
    if (Array.isArray(bonusNumbers) && bonusNumbers.length > 0) {
      html += `\n🎁 <b>BONUS PREMIUM (${bonusNumbers.length} nomor):</b>\n`;
      bonusNumbers.forEach((num, i) => { html += `  ${i + 1}. <code>${esc(num)}</code>\n`; });
    }
    html += `\n💵 <b>Total:</b> <b>${esc(formatRp(amount))}</b>\n⏳ <b>Expired:</b> <i>${esc(formattedDateEnd)}</i>\n\n⚙️ <i>Sistem otomatis memperbarui database sewa grup.</i>`;
  } else {
    html += `📢 <b>PERPANJANG SEWA MASUK</b> 📢\n\n💰 <b>Status:</b> LUNAS\n`;
    html += `🆔 <b>Order ID:</b> <code>${esc(orderId || '-')}</code>\n📋 <b>Paket:</b> ${esc(packageName)}\n`;
    html += `📅 <b>Tambah Durasi:</b> ${esc(days)} hari\n🔗 <b>Link Grup:</b> ${esc(groupLink || '-')}\n`;
    html += `💵 <b>Total:</b> <b>${esc(formatRp(amount))}</b>\n⏳ <b>Expired Baru:</b> <i>${esc(formattedDateEnd)}</i>\n\n⚙️ <i>Sistem otomatis memperbarui database sewa grup.</i>`;
  }
  return sendTelegram(html);
}

async function logPaymentSuccess(opts = {}) {
  const { email, amount, mode = 'auto', orderId, count = 1 } = opts;
  const priceLabel = formatRp(amount);
  let html = `💰 <b>PEMBAYARAN LUNAS</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
  if (mode === 'manual') {
    html += `📦 Mode: <b>Email Sendiri</b>\n💵 Jumlah: <code>${esc(priceLabel)}</code>\n`;
    if (email) html += `📧 Email: <code>${esc(email)}</code>\n`;
  } else if (mode === 'sewa') {
    html += `📦 Mode: <b>Sewa Bot</b>\n💵 Jumlah: <code>${esc(priceLabel)}</code>\n`;
  } else {
    html += `📦 Mode: <b>Email dari Web</b>\n🔢 Jumlah Akun: <b>${esc(count)}</b>\n`;
    html += `💵 Total: <code>${esc(priceLabel)}</code>\n💵 Per akun: <code>Rp 5.000</code>\n`;
  }
  if (orderId) html += `🎫 Order ID: <code>${esc(orderId)}</code>\n`;
  html += `🕒 Waktu: <i>${esc(formatDate())}</i>\n━━━━━━━━━━━━━━━━━━━━\n⚙️ <i>Memproses akun...</i>`;
  return sendTelegram(html);
}

module.exports = {
  logBulkResult, logBulkBatch, flushBulkBuffer, logAutoBatch, flushAutoBuffer,
  logManualResult, logPaymentSuccess, logSewaSuccess,
  sendBulk: sendTelegram, sendAuto, sendManual, sendTelegram,
  formatDate, formatRp, esc, TELEGRAM_TOKEN, TELEGRAM_CHATID
};