const am = require('../../lib/alightmotion');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(200).json({ success: false, error: 'Method not allowed' });

    try {
        const { email, link } = req.body || {};
        if (!email || !link) return res.status(200).json({ success: false, error: 'Email & link wajib diisi' });

        const verified = await am.verifyAndFetchProfile(email, link);
        if (!verified.success) return res.status(200).json({ success: false, error: verified.error });

        const premium = await am.applyPremium(verified.idToken);
        if (!premium.success) return res.status(200).json({ success: false, error: premium.error });

        return res.status(200).json({
            success: true,
            email,
            orderId: am.ORDER_ID + '-' + premium.codeorder
        });
    } catch (e) {
        return res.status(200).json({ success: false, error: e.message });
    }
};
