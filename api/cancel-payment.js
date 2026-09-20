// ============================================================
//  API: /api/cancel-payment
// ============================================================
const paygate = require('../lib/paygate');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { transactionId } = req.body || {};
    if (!transactionId) return res.status(400).json({ success: false, error: 'transactionId wajib.' });

    const r = await paygate.cancelTransaction(transactionId, 'user_cancelled');
    return res.json(r);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};