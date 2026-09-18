const { handlePreflight, cors, emailnatorGenerate } = require('./_lib');

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  cors(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { variant = 'standard' } = req.body || {};

  try {
    const result = await emailnatorGenerate(variant);
    if (result.status !== 'success') {
      return res.status(502).json({ success: false, error: 'Emailnator gagal generate' });
    }
    return res.status(200).json({
      success: true,
      email: result.email,
      type: result.type || variant,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
