// ============================================================
//  lib/paygate.js — Wrapper SDK betabotz-paygate
//  Dokumentasi: https://www.npmjs.com/package/betabotz-paygate
// ============================================================
const BetabotzPaygate = require('betabotz-paygate');

const API_KEY = process.env.BETABOTZ_APIKEY
  || 'APIKEY-YOUR';

const client = new BetabotzPaygate({
  apiKey: API_KEY,
  baseURL: 'https://web.btzpay.my.id',
  timeout: 30000
});

// ── Helper ──────────────────────────────────────────────────
function log(...a)      { console.log('[Paygate]', ...a); }
function logError(...a) { console.error('[Paygate ERROR]', ...a); }
function toRupiah(v)    { return 'Rp ' + Number(v || 0).toLocaleString('id-ID'); }

// ── CREATE TRANSACTION ──────────────────────────────────────
//  Signature kompatibel dengan endpoint:
//    createTransaction(amount, metadata)
//  metadata: { orderId, fee, timeout, extraMetadata, notes, callbackUrl, returnUrl, paymentMethod }
async function createTransaction(amount, metadata = {}) {
  const orderId = metadata.orderId || `MASREY-${Date.now()}`;
  const fee     = typeof metadata.fee === 'number' ? metadata.fee : 0;

  const params = {
    amount: Number(amount),
    fee,
    notes: metadata.notes || `Pembelian ${metadata.extraMetadata?.count || 1} akun AM Premium`,
    metadata: {
      orderId,
      ...(metadata.extraMetadata || {})
    }
  };

  if (metadata.timeout)       params.timeout        = metadata.timeout;
  if (metadata.callbackUrl)   params.callback_url   = metadata.callbackUrl;
  if (metadata.returnUrl)     params.return_url     = metadata.returnUrl;
  if (metadata.paymentMethod) params.paymentMethod  = metadata.paymentMethod;

  log('CREATE:', JSON.stringify({ amount: params.amount, orderId, fee }));

  const res = await client.createTransaction(params);
  const d   = res?.data || res || {};

  if (!d.transactionId) {
    throw new Error('SDK tidak mengembalikan transactionId.');
  }

  return {
    success:       true,
    transactionId: d.transactionId,
    accessKey:     d.accessKey,
    amount:        d.amount,
    fee:           d.fee || 0,
    totalAmount:   d.totalAmount || d.amount,
    qrisString:    d.qrisString || '',
    qrisImage:     d.qrisImage || '',
    paymentUrl:    d.paymentUrl || '',
    status:        d.status || 'pending',
    expiredAt:     d.expiredAt,
    createdAt:     d.createdAt,
    orderId,
    raw:           d
  };
}

// ── CHECK STATUS ────────────────────────────────────────────
async function checkStatus(transactionId, accessKey) {
  try {
    const res = await client.getTransaction(transactionId, accessKey);
    const d   = res?.data || res || {};
    if (!d || !d.status) return null;

    return {
      status:        d.status,                                  // pending | sukses | expired | cancel | gagal
      paid:          d.status === 'sukses' || d.status === 'success',
      transactionId: d.transactionId,
      amount:        d.amount,
      totalAmount:   d.totalAmount,
      paidAt:        d.paidAt || null,
      expiredAt:     d.expiredAt,
      orderId:       d.metadata?.orderId || d.orderId || null,
      raw:           d
    };
  } catch (e) {
    logError('checkStatus:', e.message);
    return null;
  }
}

// ── CANCEL ──────────────────────────────────────────────────
async function cancelTransaction(transactionId, reason = 'cancelled_by_user') {
  try {
    const res = await client.cancelTransaction(transactionId, reason);
    return { success: true, data: res?.data || res };
  } catch (e) {
    logError('cancel:', e.message);
    return { success: false, message: e.message };
  }
}

// ── PAYMENT URL HELPER ──────────────────────────────────────
function getPaymentUrl(transactionId, accessKey) {
  if (typeof client.getPaymentUrl === 'function') {
    return client.getPaymentUrl(transactionId, accessKey);
  }
  return `https://web.btzpay.my.id/transaction/${transactionId}?key=${accessKey || ''}`;
}

module.exports = {
  createTransaction,
  checkStatus,
  cancelTransaction,
  getPaymentUrl,
  toRupiah,
  log,
  logError
};