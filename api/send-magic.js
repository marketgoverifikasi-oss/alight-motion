const { handlePreflight, cors, sendMagicLink } = require('./_lib');

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  cors(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Email tidak valid' });
  }

  try {
    const result = await sendMagicLink(email);
    return res.status(200).json(result);
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.response?.data || err.message;
    return res.status(500).json({ success: false, error: String(msg) });
  }
};
