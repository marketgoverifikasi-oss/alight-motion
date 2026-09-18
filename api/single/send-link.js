const am = require('../../lib/alightmotion');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(200).json({ success: false, error: 'Method not allowed' });

    try {
        const { email } = req.body || {};
        if (!email) return res.status(200).json({ success: false, error: 'Email wajib diisi' });

        const result = await am.sendMagicLink(email);
        return res.status(200).json(result);
    } catch (e) {
        return res.status(200).json({ success: false, error: e.message });
    }
};
