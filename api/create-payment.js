// ============================================================
//  API: /api/create-payment
//  - Manual (email sendiri): Rp 3.000 flat
//  - Auto (email dari web):  Rp 5.000 × jumlah akun
//  - Sewa (sewa bot):        harga sesuai paket
//  - Donasi:                 nominal bebas (min Rp 1.000)
// ============================================================
const paygate = require('../lib/paygate');
const { SEWA_PACKAGES } = require('../lib/sewa-packages');

const PRICE_MANUAL = 3000;
const PRICE_AUTO   = 5000;
const MIN_QTY = 1;
const MAX_QTY = 20;

const MIN_DONATE = 1000;
const MAX_DONATE = 10000000;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let { count, mode, packageId, amount: rawAmount } = req.body || {};

    let amount = 0;
    let qty = 1;
    let pricePerUnit = 0;
    let productLabel = '';
    let orderPrefix = 'MASREY';

    // ── DONASI ──────────────────────────────────────────────
    if (mode === 'donasi') {
      const amt = parseInt(rawAmount, 10);
      if (!amt || isNaN(amt) || amt < MIN_DONATE) {
        return res.status(400).json({
          success: false,
          error: `Minimal donasi Rp ${MIN_DONATE.toLocaleString('id-ID')}.`
        });
      }
      if (amt > MAX_DONATE) {
        return res.status(400).json({
          success: false,
          error: 'Nominal donasi terlalu besar.'
        });
      }
      qty = 1;
      pricePerUnit = amt;
      amount = amt;
      productLabel = 'Donasi MAS REY';
      orderPrefix = 'MASREY-D';
    }
    // ── SEWA BOT ────────────────────────────────────────────
    else if (mode === 'sewa') {
      const pkg = SEWA_PACKAGES[packageId];
      if (!pkg) return res.status(400).json({ success: false, error: 'Paket tidak valid.' });

      qty = 1;
      pricePerUnit = pkg.price;
      amount = pkg.price;
      productLabel = pkg.name;
      orderPrefix = 'MASREY-S';
    }
    // ── MANUAL / AUTO ──────────────────────────────────────
    else {
      const isManual = mode === 'manual';
      qty = parseInt(count);
      if (!qty || isNaN(qty)) qty = MIN_QTY;
      if (qty < MIN_QTY) qty = MIN_QTY;
      if (qty > MAX_QTY) qty = MAX_QTY;
      if (isManual) qty = 1;

      pricePerUnit = isManual ? PRICE_MANUAL : PRICE_AUTO;
      amount = qty * pricePerUnit;
      productLabel = isManual
        ? 'Alight Motion Premium (Email Pribadi)'
        : `${qty} Akun Alight Motion Premium (Email Web)`;
      orderPrefix = `MASREY-${isManual ? 'M' : 'A'}`;
    }

    const orderId = `${orderPrefix}-${Date.now()}-${qty}`;

    const tx = await paygate.createTransaction(amount, {
      orderId,
      fee: 0,
      timeout: 15 * 60 * 1000,
      notes: productLabel,
      extraMetadata: {
        mode:      mode || 'auto',
        count:     qty,
        product:   mode === 'sewa' ? 'sewa_bot'
                 : mode === 'donasi' ? 'donation'
                 : (mode === 'manual' ? 'am_manual' : 'am_auto'),
        pricePer:  pricePerUnit,
        packageId: packageId || null
      }
    });

    paygate.log(`TX: ${tx.transactionId} — ${mode} — ${productLabel} = ${paygate.toRupiah(amount)}`);

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
      mode:            mode || 'auto'
    });
  } catch (err) {
    paygate.logError('create-payment:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};