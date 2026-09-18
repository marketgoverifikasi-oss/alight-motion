// ============================================================
//  API: /api/check-payment
// ============================================================
const paygate = require('../lib/paygate');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { transactionId, accessKey } = req.body || {};
    if (!transactionId) {
      return res.status(400).json({ success: false, error: 'transactionId wajib.' });
    }

    const s = await paygate.checkStatus(transactionId, accessKey);
    if (!s) {
      return res.json({ success: true, state: 'PENDING', paid: false });
    }

    return res.json({
      success:     true,
      state:       s.status,
      paid:        s.paid,
      expired:     s.status === 'expired',
      cancelled:   s.status === 'cancel',
      paidAt:      s.paidAt,
      orderId:     s.orderId,
      totalAmount: s.totalAmount
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};