global.__sessions = global.__sessions || {};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { sessionId } = req.body || {};
    if (sessionId && global.__sessions[sessionId]) delete global.__sessions[sessionId];
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};