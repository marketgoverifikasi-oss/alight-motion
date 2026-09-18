// ============================================================
//  API: /api/create-payment
//  - Manual (email sendiri): Rp 3.000 flat
//  - Auto (email dari web):  Rp 5.000 × jumlah akun
// ============================================================
const paygate = require('../lib/paygate');

const PRICE_MANUAL = 3000;
const PRICE_AUTO   = 5000;
const MIN_QTY = 1;
const MAX_QTY = 20;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let { count, mode } = req.body || {};

    // Tentukan harga berdasarkan mode
    const isManual = mode === 'manual';

    let qty = parseInt(count);
    if (!qty || isNaN(qty)) qty = MIN_QTY;
    if (qty < MIN_QTY) qty = MIN_QTY;
    if (qty > MAX_QTY) qty = MAX_QTY;

    // Mode manual selalu 1 akun (email pribadi)
    if (isManual) qty = 1;

    const pricePerUnit = isManual ? PRICE_MANUAL : PRICE_AUTO;
    const amount       = qty * pricePerUnit;
    const productLabel = isManual
      ? 'Alight Motion Premium (Email Pribadi)'
      : `${qty} Akun Alight Motion Premium (Email Web)`;

    const orderId = `MASREY-${isManual ? 'M' : 'A'}-${Date.now()}-${qty}`;

    const tx = await paygate.createTransaction(amount, {
      orderId,
      fee: 0,
      timeout: 15 * 60 * 1000,
      notes: productLabel,
      extraMetadata: {
        mode: isManual ? 'manual' : 'auto',
        count: qty,
        product: isManual ? 'am_manual' : 'am_auto',
        pricePer: pricePerUnit
      }
    });

    paygate.log(`TX: ${tx.transactionId} — ${mode} — ${qty} akun × ${paygate.toRupiah(pricePerUnit)} = ${paygate.toRupiah(amount)}`);

    const expiredAt = tx.expiredAt && new Date(tx.expiredAt).getTime() > Date.now()
      ? tx.expiredAt
      : new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return res.json({
      success:         true,
      transactionId:   tx.transactionId,
      accessKey:       tx.accessKey,
      amount:          tx.amount,
      fee:             tx.fee,
      totalAmount:     tx.totalAmount,
      qrisString:      tx.qrisString,
      qrisImage:       tx.qrisImage,
      paymentUrl:      tx.paymentUrl,
      expiredAt,
      count:           qty,
      pricePerAccount: pricePerUnit,
      orderId,
      mode:            isManual ? 'manual' : 'auto'
    });
  } catch (err) {
    paygate.logError('create-payment:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};