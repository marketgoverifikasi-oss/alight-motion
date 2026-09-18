const am = require('../../lib/alightmotion');
const emailnator = require('../../lib/emailnator');

function extractLinks(html, plainText = '') {
    const links = [];
    if (html) {
        const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
        let match;
        while ((match = hrefRegex.exec(html)) !== null) {
            links.push(match[1].replace(/&amp;/g, '&'));
        }
    }
    if (plainText) {
        const urlRegex = /(https?:\/\/[^\s"<>]+)/g;
        let match;
        while ((match = urlRegex.exec(plainText)) !== null) {
            const cleanUrl = match[1].replace(/[,.)\]}]+$/, '');
            if (!links.includes(cleanUrl)) links.push(cleanUrl);
        }
    }
    return links;
}

function findOobLink(links) {
    for (const link of links) {
        if (link.includes('oobCode=')) return link;
    }
    return null;
}

async function waitForVerifyLink(email, maxWaitMs = 25000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        try {
            const list = await emailnator.listMessages(email);
            if (list && list.status === 'success' && Array.isArray(list.messages) && list.messages.length) {
                for (const msg of list.messages) {
                    if (msg.locked) continue;
                    try {
                        const detail = await emailnator.getMessage(msg.id);
                        const content = detail.content || detail.html || '';
                        const links = extractLinks(content);
                        const oob = findOobLink(links);
                        if (oob) return oob;
                    } catch (e) {}
                }
            }
        } catch (e) {}
        await new Promise(r => setTimeout(r, 2500));
    }
    return null;
}

async function createOneAccount() {
    const gen = await emailnator.generateGmail('standard');
    if (!gen || gen.status !== 'success' || !gen.email) {
        throw new Error('Gagal generate email');
    }
    const email = gen.email;

    const sent = await am.sendMagicLink(email);
    if (!sent.success) throw new Error('Gagal kirim link: ' + sent.error);

    const verifyLink = await waitForVerifyLink(email);
    if (!verifyLink) throw new Error('Link verifikasi tidak ditemukan (timeout)');

    const verified = await am.verifyAndFetchProfile(email, verifyLink);
    if (!verified.success) throw new Error('Verifikasi gagal: ' + verified.error);

    const premium = await am.applyPremium(verified.idToken);
    if (!premium.success) throw new Error('Aktivasi premium gagal: ' + premium.error);

    return {
        success: true,
        email,
        loginLink: 'https://alightcreative.com',
        orderId: am.ORDER_ID + '-' + premium.codeorder
    };
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        let count = parseInt(req.body?.count, 10);
        if (isNaN(count) || count < 1) count = 1;
        if (count > 5) count = 5;

        const account = await createOneAccount();
        return res.status(200).json({ success: true, accounts: [account] });
    } catch (e) {
        return res.status(200).json({ success: true, accounts: [{ success: false, error: e.message }] });
    }
};
