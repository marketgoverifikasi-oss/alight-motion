// ============================================================
//  API: /api/auto-poll — Cek 1 session, verifikasi + apply premium
// ============================================================
const flow = require('../lib/auto-flow');
const AlightMotionAuth = require('../lib/amp-logic');

global.__sessions = global.__sessions || {};

const am = new AlightMotionAuth();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { sessionId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Session ID tidak ada.' });
    }

    const session = global.__sessions?.[sessionId];
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session tidak ditemukan.' });
    }

    if (session.status === 'FAILED') {
      return res.json({
        success: false,
        state: 'ERROR',
        error: session.sendError || 'Gagal kirim magic link.'
      });
    }

    if (session.status === 'DONE') {
      return res.json({
        success: true,
        state: 'DONE',
        email: session.email,
        orderId: session.orderId,
        loginUrl: session.loginUrl
      });
    }

    const inbox = await flow.pollInboxOnce(session.email, session.knownIds);
    session.knownIds = inbox.knownIds || session.knownIds;

    if (!inbox.hasNew || !inbox.messages || !inbox.messages.length) {
      return res.json({
        success: true,
        state: 'WAITING',
        message: 'Menunggu email masuk...'
      });
    }

    const found = flow.findMagicLink(inbox.messages);
    if (!found) {
      return res.json({
        success: true,
        state: 'WAITING',
        message: 'Email masuk, link belum ketemu.'
      });
    }

    const verify = await am.verifyAndFetchProfile(session.email, found.magicLink);
    if (!verify.success) {
      return res.json({ success: false, state: 'ERROR', error: verify.error });
    }

    const premium = await am.applyPremium(verify.idToken);
    if (!premium.success) {
      return res.json({ success: false, state: 'ERROR', error: premium.error });
    }

    session.loginUrl = found.magicLink;
    session.orderId = premium.orderId;
    session.status = 'DONE';
    session.applied = true;

    return res.json({
      success: true,
      state: 'DONE',
      email: session.email,
      orderId: session.orderId,
      loginUrl: session.loginUrl
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};