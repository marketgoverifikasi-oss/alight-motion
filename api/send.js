const AlightMotionAuth = require('../lib/amp-logic');
const tg = require('../lib/telegram-log');

const am = new AlightMotionAuth();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body || {};
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Email tidak valid.' });
    }

    const clean = email.trim().toLowerCase();
    const result = await am.sendMagicLink(clean);

    if (!result.success) {
      tg.logManualResult(clean, false, {
        stage: 'send',
        amount: 3000,
        error: result.error
      }).catch(() => {});
      return res.status(500).json({ success: false, error: result.error });
    }

    tg.logManualResult(clean, true, {
      stage: 'send',
      amount: 3000
    }).catch(() => {});

    const jobId = Buffer.from(clean).toString('base64url');

    return res.json({
      success: true,
      jobId,
      email: clean,
      message: 'Magic Link terkirim! Cek inbox email kamu.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};