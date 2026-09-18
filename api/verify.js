const { handlePreflight, cors, verifyAndFetchProfile, applyPremium } = require('./_lib');

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  cors(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, link } = req.body || {};
  if (!email || !link) {
    return res.status(400).json({ success: false, error: 'Email dan link wajib diisi' });
  }

  try {
    const profile = await verifyAndFetchProfile(email, link);
    const premium = await applyPremium(profile.idToken);

    return res.status(200).json({
      success: true,
      user: profile.user,
      premium: premium.data,
      orderId: premium.codeorder,
    });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.response?.data || err.message;
    return res.status(500).json({ success: false, error: String(msg) });
  }
};
