const paygate = require('../lib/paygate');
const { logSewaSuccess } = require('../lib/telegram-log');
const { SEWA_PACKAGES } = require('../lib/sewa-packages');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { transactionId, accessKey, packageId, groupLink, targetNumber, bonusNumbers } = req.body || {};
    if (!transactionId || !packageId) return res.status(400).json({ success: false, error: 'Parameter tidak lengkap.' });

    const pkg = SEWA_PACKAGES[packageId];
    if (!pkg) return res.status(400).json({ success: false, error: 'Paket tidak valid.' });

    const status = await paygate.checkStatus(transactionId, accessKey);
    if (!status || !status.paid) return res.status(400).json({ success: false, error: 'Pembayaran belum lunas.' });

    const bonusList = Array.isArray(bonusNumbers) ? bonusNumbers.filter(Boolean) : [];
    if (pkg.type === 'NEW' && pkg.bonusPrem > 0) {
      if (bonusList.length !== pkg.bonusPrem) {
        return res.status(400).json({ success: false, error: `Paket ini butuh ${pkg.bonusPrem} nomor bonus premium.` });
      }
      for (const num of bonusList) {
        const clean = String(num).replace(/\D/g, '');
        if (!clean.startsWith('62')) {
          return res.status(400).json({ success: false, error: `Nomor "${num}" harus pakai kode negara 62.` });
        }
      }
    }

    await logSewaSuccess({
      orderId: status.orderId, packageName: pkg.name, type: pkg.type,
      groupLink: groupLink || '-', targetNumber: targetNumber || '-',
      bonusNumbers: bonusList, amount: status.totalAmount || pkg.price,
      days: pkg.days, bonusPrem: pkg.bonusPrem
    }).catch(() => {});

    const expiresAt = new Date(Date.now() + pkg.days * 86400000).toISOString();
    return res.json({
      success: true, package: pkg, days: pkg.days, bonusPrem: pkg.bonusPrem,
      bonusNumbers: bonusList, expiresAt, orderId: status.orderId
    });
  } catch (err) {
    paygate.logError('sewa-activate:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};