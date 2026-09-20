const AlightMotionAuth = require('../lib/amp-logic');
const tg = require('../lib/telegram-log');

const am = new AlightMotionAuth();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { jobId, link } = req.body || {};
    if (!jobId) return res.status(400).json({ success: false, error: 'Job ID tidak ada.' });
    if (!link || !link.startsWith('http')) {
      return res.status(400).json({ success: false, error: 'Magic Link tidak valid.' });
    }

    let email;
    try {
      email = Buffer.from(jobId, 'base64url').toString('utf8');
    } catch (_) {
      return res.status(400).json({ success: false, error: 'Job ID tidak valid.' });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Sesi kadaluarsa / tidak valid.' });
    }

    const verify = await am.verifyAndFetchProfile(email, link);
    if (!verify.success) {
      tg.logManualResult(email, false, {
        stage: 'verif',
        amount: 3000,
        error: verify.error
      }).catch(() => {});
      return res.status(400).json({ success: false, error: verify.error });
    }

    const premium = await am.applyPremium(verify.idToken);
    if (!premium.success) {
      tg.logManualResult(email, false, {
        stage: 'verif',
        amount: 3000,
        error: premium.error
      }).catch(() => {});
      return res.status(400).json({ success: false, error: premium.error });
    }

    tg.logManualResult(email, true, {
      stage: 'verif',
      amount: 3000,
      orderId: premium.orderId,
      magicLink: link
    }).catch(() => {});

    return res.json({
      success: true,
      state: 'SUCCESS',
      email,
      orderId: premium.orderId,
      data: premium.data
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
