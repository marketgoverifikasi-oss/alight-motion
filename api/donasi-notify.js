const telegram = require('../lib/telegram-log');
const MIN_DONATE = 1000;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { orderId, amount, transactionId } = req.body || {};
    const amt = Number(amount || 0);
    if (!amt || amt < MIN_DONATE) return res.status(400).json({ success: false, error: 'Nominal tidak valid.' });

    const html =
      `💛 <b>DONASI MASUK</b> 💛\n━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Nominal: <b>${telegram.formatRp(amt)}</b>\n` +
      (orderId ? `🎫 Order ID: <code>${telegram.esc(orderId)}</code>\n` : '') +
      (transactionId ? `🔗 TxID: <code>${telegram.esc(transactionId)}</code>\n` : '') +
      `🕒 Waktu: <i>${telegram.formatDate()}</i>\n━━━━━━━━━━━━━━━━━━━━\n🙏 <b>Terima kasih atas dukungannya!</b>`;

    await telegram.sendTelegram(html);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};