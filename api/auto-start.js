// ============================================================
//  API: /api/auto-start — Email dari Web (Rp 5.000 × N)
// ============================================================
const flow = require('../lib/auto-flow');
const AlightMotionAuth = require('../lib/amp-logic');
const tg = require('../lib/telegram-log');

const am = new AlightMotionAuth();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const POLL_INTERVAL = 2500;
const POLL_TIMEOUT  = 20000;
const PRICE_PER_ACCOUNT = 5000;

async function waitForMagicLink(email) {
  const start = Date.now();
  let knownIds = [];

  while (Date.now() - start < POLL_TIMEOUT) {
    await sleep(POLL_INTERVAL);
    let inbox;
    try {
      inbox = await flow.pollInboxOnce(email, knownIds);
    } catch (err) {
      continue;
    }
    knownIds = inbox.knownIds || knownIds;

    if (inbox.hasNew && inbox.messages?.length) {
      const found = flow.findMagicLink(inbox.messages);
      if (found) return found;
    }
  }
  return null;
}

async function processOneAccount(domain) {
  let email = null;
  try {
    const acc = await flow.createTempEmail({ domain });
    email = acc.email;

    const sendRes = await am.sendMagicLink(acc.email);
    if (!sendRes.success) {
      const errMsg = 'Kirim magic link gagal: ' + sendRes.error;
      tg.logBulkResult(email, false, {
        amount: PRICE_PER_ACCOUNT,
        error: errMsg
      }).catch(() => {});
      return { email, error: errMsg };
    }

    const found = await waitForMagicLink(acc.email);
    if (!found) {
      const errMsg = 'Magic link tidak diterima (timeout)';
      tg.logBulkResult(email, false, {
        amount: PRICE_PER_ACCOUNT,
        error: errMsg
      }).catch(() => {});
      return { email, error: errMsg };
    }

    const verify = await am.verifyAndFetchProfile(acc.email, found.magicLink);
    if (!verify.success) {
      const errMsg = 'Verifikasi gagal: ' + verify.error;
      tg.logBulkResult(email, false, {
        amount: PRICE_PER_ACCOUNT,
        error: errMsg
      }).catch(() => {});
      return { email, error: errMsg };
    }

    const premium = await am.applyPremium(verify.idToken);
    if (!premium.success) {
      const errMsg = 'Apply premium gagal: ' + premium.error;
      tg.logBulkResult(email, false, {
        amount: PRICE_PER_ACCOUNT,
        error: errMsg
      }).catch(() => {});
      return { email, error: errMsg };
    }

    // ✅ SUKSES → log
    tg.logBulkResult(email, true, {
      amount: PRICE_PER_ACCOUNT,
      orderId: premium.orderId,
      magicLink: found.magicLink
    }).catch(() => {});

    return {
      email: acc.email,
      password: found.magicLink,
      premiumApplied: true,
      orderId: premium.orderId,
      loginUrl: found.magicLink
    };
  } catch (err) {
    tg.logBulkResult(email, false, {
      amount: PRICE_PER_ACCOUNT,
      error: err.message
    }).catch(() => {});
    return { email, error: err.message };
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { domain, count } = req.body || {};
    const total = flow.clampBatch(count);

    const promises = [];
    for (let i = 0; i < total; i++) {
      promises.push(sleep(i * 400).then(() => processOneAccount(domain)));
    }

    const results = await Promise.all(promises);

    const batch = results.map(r => ({
      email: r.email,
      password: r.password,
      premiumApplied: !!r.premiumApplied,
      orderId: r.orderId || null,
      loginUrl: r.loginUrl || null,
      error: r.error || null
    }));

    const successCount = batch.filter(b => b.premiumApplied).length;

    return res.json({
      success: true,
      total: batch.length,
      successCount,
      batch
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};