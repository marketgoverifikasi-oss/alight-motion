const $ = (id) => document.getElementById(id);
const API_BASE = '';

const PRICE_MANUAL = 3000;
const PRICE_AUTO   = 5000;
const MIN_QTY = 1, MAX_QTY = 20;
const VERIF_TIMEOUT = 5 * 60 * 1000; // 5 menit

const STORAGE_KEY = 'masrey_pending_tx';

// ── LOADER ──────────────────────────────────────────────────
(function initLoader() {
  const loader = $('loader');
  const statusText = $('loaderStatus');
  if (!loader) return;
  const steps = ['Menghubungkan ke server','Memuat sistem','Cek koneksi API','Siap digunakan'];
  let i = 0;
  function next() {
    if (i >= steps.length) {
      setTimeout(() => {
        loader.classList.add('hide');
        setTimeout(() => loader.remove(), 350);
      }, 250);
      return;
    }
    if (statusText) statusText.textContent = steps[i++];
    setTimeout(next, 320);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', next);
  else next();
  setTimeout(() => {
    if (loader && !loader.classList.contains('hide')) {
      loader.classList.add('hide');
      setTimeout(() => loader.remove(), 350);
    }
  }, 2000);
})();

// ── WELCOME ─────────────────────────────────────────────────
(function initWelcome() {
  const toast = $('welcomeToast');
  const titleEl = $('welcomeTitle');
  const descEl = $('welcomeDesc');
  if (!toast) return;
  const hour = new Date().getHours();
  let greeting = 'Selamat Datang';
  if (hour >= 4 && hour < 11) greeting = 'Selamat Pagi';
  else if (hour >= 11 && hour < 15) greeting = 'Selamat Siang';
  else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';
  else greeting = 'Selamat Malam';
  if (titleEl) titleEl.textContent = `${greeting}, Sobat MAS REY`;
  if (descEl) descEl.textContent = 'Sistem siap membantu aktivasi premium Anda.';
  setTimeout(() => {
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 6000);
  }, 2400);
})();

// ── THEME ───────────────────────────────────────────────────
const THEMES = ['yellow', 'blue', 'pink', 'purple', 'lime', 'dark'];
function applyTheme(name) {
  document.body.classList.remove(...THEMES.map(t => 'theme-' + t));
  if (name !== 'yellow') document.body.classList.add('theme-' + name);
  localStorage.setItem('masrey_theme', name);
}
window.cycleTheme = function() {
  const cur = localStorage.getItem('masrey_theme') || 'yellow';
  const idx = THEMES.indexOf(cur);
  const next = THEMES[(idx + 1) % THEMES.length];
  applyTheme(next);
  log(`[THEME] Tema: ${next}`);
};
applyTheme(localStorage.getItem('masrey_theme') || 'yellow');

// ── LOG ─────────────────────────────────────────────────────
const terminalLog = $('terminalLog');
function detectLogType(text) {
  const t = text.toUpperCase();
  if (/\b(ERROR|GAGAL|FAIL|EXPIRED|INVALID|TIMEOUT)\b/.test(t)) return 'error';
  if (t.includes('[SUCCESS]') || t.includes('[OK]') || t.includes('BERHASIL') || t.includes('PREMIUM —')) return 'success';
  if (t.includes('[PAY]') || t.includes('[PAID]') || t.includes('[SEND]') || t.includes('[VERIF]') || t.includes('[AUTO]') || t.includes('MENUNGGU') || t.includes('MEMPROSES')) return 'warn';
  return 'info';
}
function log(text) {
  if (!terminalLog) return;
  const t = detectLogType(text);
  const line = document.createElement('div');
  line.className = `log-line log-${t}`;
  line.textContent = text;
  terminalLog.appendChild(line);
  while (terminalLog.children.length > 80) terminalLog.removeChild(terminalLog.firstChild);
  terminalLog.scrollTop = terminalLog.scrollHeight;
}
window.copyTerminal = function() {
  const lines = Array.from(terminalLog.querySelectorAll('.log-line')).map(l => l.textContent).join('\n');
  if (!lines.trim()) return;
  navigator.clipboard.writeText(lines).then(() => log('[COPY] Log disalin.'));
};
window.clearTerminal = function() {
  terminalLog.innerHTML = '';
  log('[SYSTEM] Log dibersihkan.');
};

// ── MODE SWITCH ─────────────────────────────────────────────
function safeSet(el, val) { if (el) el.style.display = val; }
window.switchMode = function(mode) {
  const isAuto = mode === 'auto';
  safeSet($('panelManual'), isAuto ? 'none' : 'block');
  safeSet($('panelAuto'),   isAuto ? 'block' : 'none');
  $('tabManual')?.classList.toggle('active', !isAuto);
  $('tabAuto')?.classList.toggle('active', isAuto);
  log(`[MODE] ${isAuto ? 'Email dari Web' : 'Email Sendiri'}`);
};

// ── ELEMEN ──────────────────────────────────────────────────
const emailInput     = $('emailInput');
const magicInput     = $('magicInput');
const sendBtn        = $('sendBtn');
const activateBtn    = $('activateBtn');
const btnText        = $('btnText');
const msgBox         = $('msgBox');
const msgBox2        = $('msgBox2');
const verifSection   = $('verifSection');
const verifSuccess   = $('verifSuccess');
const manualBuyState = $('manualBuyState');
const verifTimer     = $('verifTimer');
const verifCountdown = $('verifCountdown');
const verifExpiredBtn= $('verifExpiredBtn');

const paidCountEl      = $('paidCount');
const paidQtyDisplay   = $('paidQtyDisplay');
const paidTotalDisplay = $('paidTotalDisplay');
const paidPayBtn       = $('paidPayBtn');
const paidDomainSelect = $('paidDomainSelect');
const paidProgress     = $('paidProgress');
const paidSummary      = $('paidSummary');
const paidList         = $('paidList');
const paidActions      = $('paidActions');
const msgBoxPaid       = $('msgBoxPaid');

const confirmModal   = $('confirmModal');
const confirmQtyEl   = $('confirmQty');
const confirmTotalEl = $('confirmTotal');
const confirmPayBtn  = $('confirmPayBtn');

// ── HELPERS ─────────────────────────────────────────────────
function formatRp(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }
function showMessage(el, type, text) {
  if (!el) return;
  const icons = { success:'fa-circle-check', error:'fa-circle-exclamation', info:'fa-info-circle' };
  el.className = `message ${type} show`;
  el.innerHTML = `<i class="fas ${icons[type] || 'fa-info-circle'}"></i><span>${text}</span>`;
}
function hideMessage(el) { if (el) el.className = 'message'; }
function clampQty(v) {
  let n = parseInt(v);
  if (!n || isNaN(n)) n = MIN_QTY;
  if (n < MIN_QTY) n = MIN_QTY;
  if (n > MAX_QTY) n = MAX_QTY;
  return n;
}
function updatePaidPrice() {
  const v = clampQty(paidCountEl?.value);
  if (paidQtyDisplay)   paidQtyDisplay.textContent   = v;
  if (paidTotalDisplay) paidTotalDisplay.textContent = formatRp(v * PRICE_AUTO);
  const bq = $('paidBtnQty');
  if (bq) bq.textContent = v;
}
window.changePaidQty = function(delta) {
  if (!paidCountEl) return;
  paidCountEl.value = clampQty(clampQty(paidCountEl.value) + delta);
  updatePaidPrice();
};
if (paidCountEl) {
  paidCountEl.addEventListener('input', updatePaidPrice);
  paidCountEl.addEventListener('blur', () => {
    paidCountEl.value = clampQty(paidCountEl.value);
    updatePaidPrice();
  });
  updatePaidPrice();
}

// ════════════════════════════════════════════════════════════
//  STORAGE
// ════════════════════════════════════════════════════════════
function savePendingTx(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedAt: Date.now() })); } catch (e) {}
}
function loadPendingTx() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.savedAt && (Date.now() - data.savedAt) > 30 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch (e) { return null; }
}
function clearPendingTx() { try { localStorage.removeItem(STORAGE_KEY); } catch (e) {} }
function updatePendingState(patch) {
  const cur = loadPendingTx();
  if (!cur) return;
  savePendingTx({ ...cur, ...patch });
}

// ── STATE ───────────────────────────────────────────────────
const verifSession = { email: null, jobId: null, active: false };
const paidState = {
  running: false, mode: null, results: [],
  transactionId: null, accessKey: null,
  pollTimer: null, countdownRAF: null,
  verifTimer: null,
  paid: false, count: 1, pricePerUnit: 0,
  pendingEmail: null, expiredAt: null, generating: false,
  verifExpiredAt: null
};

// ── CONFIRM MODAL ───────────────────────────────────────────
function openConfirmModal(opts) {
  if (confirmQtyEl)   confirmQtyEl.textContent   = opts.qtyLabel;
  if (confirmTotalEl) confirmTotalEl.textContent = formatRp(opts.total);
  if (confirmPayBtn)  confirmPayBtn.innerHTML    = `<i class="fas fa-check"></i> Ya, Bayar ${formatRp(opts.total)}`;
  if (confirmModal)   confirmModal.classList.add('show');
  log(`[KONFIRMASI] ${opts.qtyLabel} — ${formatRp(opts.total)}`);
}
window.closeConfirmModal = function() {
  if (confirmModal) confirmModal.classList.remove('show');
};

// ── MANUAL: klik tombol beli ────────────────────────────────
if (sendBtn) sendBtn.addEventListener('click', () => {
  if (paidState.running) return;
  const email = emailInput ? emailInput.value.trim() : '';
  if (!email || !email.includes('@')) {
    showMessage(msgBox, 'error', 'Masukkan email yang valid dulu ya.');
    if (emailInput) emailInput.focus();
    return;
  }
  hideMessage(msgBox);
  paidState.mode = 'manual';
  paidState.pendingEmail = email;
  paidState.count = 1;
  paidState.pricePerUnit = PRICE_MANUAL;
  openConfirmModal({ qtyLabel: '1 akun (email pribadi)', total: PRICE_MANUAL });
});

// ── AUTO: klik tombol beli ──────────────────────────────────
if (paidPayBtn) paidPayBtn.addEventListener('click', () => {
  if (paidState.running) return;
  const count = clampQty(paidCountEl?.value);
  const total = count * PRICE_AUTO;
  paidState.mode = 'auto';
  paidState.pendingEmail = null;
  paidState.count = count;
  paidState.pricePerUnit = PRICE_AUTO;
  openConfirmModal({ qtyLabel: `${count} akun (email dari web)`, total });
});

// ── KONFIRMASI BAYAR ────────────────────────────────────────
if (confirmPayBtn) confirmPayBtn.addEventListener('click', async () => {
  closeConfirmModal();
  const mode = paidState.mode || 'auto';
  const count = mode === 'manual' ? 1 : clampQty(paidCountEl?.value);
  const pricePerUnit = mode === 'manual' ? PRICE_MANUAL : PRICE_AUTO;

  paidState.running = true;
  paidState.paid = false;
  paidState.results = [];
  paidState.count = count;
  paidState.pricePerUnit = pricePerUnit;

  if (mode === 'manual') {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Membuat QRIS...';
    hideMessage(msgBox);
  } else {
    paidPayBtn.disabled = true;
    paidPayBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Membuat QRIS...';
    hideMessage(msgBoxPaid);
  }

  log(`[PAY] Buat QRIS — ${mode} — ${count} akun — ${formatRp(count * pricePerUnit)}`);

  try {
    const res = await fetch(`${API_BASE}/api/create-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, mode })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gagal buat QRIS.');

    paidState.transactionId = data.transactionId;
    paidState.accessKey = data.accessKey;
    paidState.count = data.count || count;

    savePendingTx({
      transactionId: data.transactionId, accessKey: data.accessKey,
      mode, count, pendingEmail: paidState.pendingEmail,
      pricePerUnit, totalAmount: data.totalAmount, orderId: data.orderId,
      qrisString: data.qrisString || '', qrisImage: data.qrisImage || '',
      expiredAt: data.expiredAt, paid: false, generated: false
    });

    showPayModal(data);
    startPayCountdown(data.expiredAt);
    startPayPolling();
    log(`[PAY] ✅ QRIS siap — ${formatRp(data.totalAmount)}`);
  } catch (err) {
    log(`[PAY] ❌ ${err.message}`);
    if (mode === 'manual') {
      showMessage(msgBox, 'error', err.message);
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Beli Sekarang Rp 3.000';
    } else {
      showMessage(msgBoxPaid, 'error', err.message);
      paidPayBtn.disabled = false;
      paidPayBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Beli <span id="paidBtnQty">${count}</span> Akun Sekarang`;
    }
    paidState.running = false;
  }
});

// ── PAY MODAL — 2 STATE ─────────────────────────────────────
function showPayModal(tx, modeOverride) {
  const mode = modeOverride || paidState.mode;
  const pending = $('payStatePending');
  const success = $('payStateSuccess');
  if (pending) pending.style.display = 'block';
  if (success) success.style.display = 'none';

  const img = $('payQrisImg'), amtEl = $('payAmountValue');
  const productEl = $('payProductValue'), orderIdEl = $('payOrderId');
  const badge = $('payStatusBadge'), status = $('payStatus'), modal = $('payModal');

  if (img) {
    if (tx.qrisImage && tx.qrisImage.startsWith('data:')) img.src = tx.qrisImage;
    else if (tx.qrisString) {
      img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=10&data='
              + encodeURIComponent(tx.qrisString);
    }
  }
  if (amtEl) amtEl.textContent = formatRp(tx.totalAmount || tx.total);
  const qty = tx.count || 1;
  if (productEl) productEl.textContent = mode === 'manual' ? '1 akun (email pribadi)' : `${qty} akun (email web)`;
  if (orderIdEl) orderIdEl.textContent = tx.orderId || tx.transactionId || '—';
  if (badge) { badge.className = 'pay-badge'; badge.innerHTML = '<span class="badge-dot"></span> pending'; }
  if (status) { status.className = 'pay-status'; status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menunggu pembayaran...'; }
  if (modal) modal.classList.add('show');
}

function showPaySuccessState(tx, mode) {
  const pending = $('payStatePending');
  const success = $('payStateSuccess');
  if (pending) pending.style.display = 'none';
  if (success) success.style.display = 'block';

  const hargaEl = $('paySuccessHarga');
  const produkEl = $('paySuccessProduk');
  const orderIdEl = $('paySuccessOrderId');
  const noteEl = $('paySuccessNote');

  if (hargaEl) hargaEl.textContent = formatRp(tx.totalAmount || tx.total || 0);
  if (produkEl) produkEl.textContent = mode === 'manual'
    ? '1 akun (email pribadi)'
    : `${tx.count || 1} akun (email web)`;
  if (orderIdEl) orderIdEl.textContent = tx.orderId || tx.transactionId || '—';

  // Kalau mode auto, tidak perlu waktu 5 menit untuk verifikasi
  if (noteEl) {
    if (mode === 'manual') {
      noteEl.style.display = 'flex';
      noteEl.innerHTML = '<i class="fas fa-hourglass-half"></i><div>Buka Gmail kamu & paste magic link dalam <b>5 menit</b></div>';
    } else {
      noteEl.style.display = 'none';
    }
  }
}

window.closePayModal = function() { $('payModal')?.classList.remove('show'); };

// ── COUNTDOWN QRIS ──────────────────────────────────────────
function startPayCountdown(expiredAt) {
  stopPayCountdown();
  const cdEl = $('payCountdown');
  if (!cdEl) return;
  let endTime;
  if (expiredAt) {
    const parsed = new Date(expiredAt).getTime();
    endTime = (!isNaN(parsed) && parsed > Date.now()) ? parsed : Date.now() + 15 * 60 * 1000;
  } else endTime = Date.now() + 15 * 60 * 1000;
  paidState.expiredAt = endTime;

  let lastText = '';
  const tick = () => {
    const diff = Math.max(0, endTime - Date.now());
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const text = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (text !== lastText) { cdEl.textContent = text; lastText = text; }
    if (diff <= 0) {
      stopPayCountdown();
      const st = $('payStatus'), bd = $('payStatusBadge');
      if (st && !paidState.paid) { st.className = 'pay-status expired'; st.innerHTML = '<i class="fas fa-circle-exclamation"></i> QRIS kadaluarsa'; }
      if (bd && !paidState.paid) { bd.className = 'pay-badge expired'; bd.innerHTML = '<span class="badge-dot"></span> expired'; }
      if (paidState.transactionId && !paidState.paid) {
        fetch(`${API_BASE}/api/cancel-payment`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ transactionId: paidState.transactionId }) }).catch(() => {});
        clearPendingTx();
      }
      return;
    }
    paidState.countdownRAF = requestAnimationFrame(tick);
  };
  tick();
}
function stopPayCountdown() {
  if (paidState.countdownRAF) { cancelAnimationFrame(paidState.countdownRAF); paidState.countdownRAF = null; }
}

// ── POLLING ─────────────────────────────────────────────────
function startPayPolling() {
  stopPayPolling();
  paidState.pollTimer = setInterval(async () => {
    if (paidState.paid) return;
    try {
      const res = await fetch(`${API_BASE}/api/check-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: paidState.transactionId, accessKey: paidState.accessKey })
      });
      const data = await res.json();
      if (!data.success) return;
      if (data.paid) {
        paidState.paid = true;
        stopPayPolling();
        stopPayCountdown();
        updatePendingState({ paid: true });

        // ═══ Update modal ke SUCCESS state ═══
        showPaySuccessState({
          totalAmount: data.totalAmount,
          orderId: paidState.orderId,
          transactionId: paidState.transactionId,
          count: paidState.count
        }, paidState.mode);

        log('[PAY] ✅ Pembayaran sukses — ' + formatRp(data.totalAmount || 0));

        // Setelah 3.5 detik, close modal & lanjut
        setTimeout(() => {
          closePayModal();
          if (paidState.mode === 'manual') afterManualPaid();
          else runPaidGenerate();
        }, 3500);
      } else if (data.expired || data.cancelled) {
        stopPayPolling();
        stopPayCountdown();
        clearPendingTx();
        const st = $('payStatus');
        if (st) {
          st.className = 'pay-status expired';
          st.innerHTML = data.expired ? '<i class="fas fa-circle-exclamation"></i> QRIS kadaluarsa.' : '<i class="fas fa-xmark"></i> Transaksi dibatalkan.';
        }
      }
    } catch (_) {}
  }, 3000);
}
function stopPayPolling() { if (paidState.pollTimer) { clearInterval(paidState.pollTimer); paidState.pollTimer = null; } }

// ── CANCEL ──────────────────────────────────────────────────
window.cancelPayModal = async function() {
  if (paidState.paid) { closePayModal(); return; }
  if (paidState.transactionId) {
    fetch(`${API_BASE}/api/cancel-payment`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ transactionId: paidState.transactionId }) }).catch(() => {});
  }
  stopPayPolling(); stopPayCountdown(); closePayModal(); clearPendingTx();
  if (paidState.mode === 'manual') {
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Beli Sekarang Rp 3.000';
    showMessage(msgBox, 'info', 'Pembayaran dibatalkan.');
  } else {
    const count = clampQty(paidCountEl?.value);
    paidPayBtn.disabled = false;
    paidPayBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Beli <span id="paidBtnQty">${count}</span> Akun Sekarang`;
    showMessage(msgBoxPaid, 'info', 'Pembayaran dibatalkan.');
  }
  paidState.running = false;
  paidState.transactionId = null;
  paidState.accessKey = null;
};

// ════════════════════════════════════════════════════════════
//  MANUAL — Setelah bayar lunas → kirim magic link + timer 5 menit
// ════════════════════════════════════════════════════════════
async function afterManualPaid() {
  const email = paidState.pendingEmail;
  if (!email) {
    showMessage(msgBox, 'error', 'Email tidak ditemukan.');
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Beli Sekarang Rp 3.000';
    paidState.running = false;
    return;
  }

  log(`[MANUAL] Mengirim magic link ke ${email}...`);

  try {
    const res = await fetch(`${API_BASE}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gagal kirim magic link.');

    verifSession.email = data.email || email;
    verifSession.jobId = data.jobId;
    verifSession.active = true;

    updatePendingState({ generated: true });

    log(`[MANUAL] ✅ Magic link terkirim — timer 5 menit dimulai.`);

    // Start timer 5 menit & tampilkan form verifikasi
    startVerifTimer();
    showManualVerifSection(email);

  } catch (err) {
    log(`[MANUAL] ❌ ${err.message}`);
    showMessage(msgBox, 'error', err.message);
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Beli Sekarang Rp 3.000';
  } finally {
    paidState.running = false;
    paidState.transactionId = null;
    paidState.accessKey = null;
    paidState.pendingEmail = null;
  }
}

// ════════════════════════════════════════════════════════════
//  VERIF TIMER 5 MENIT
// ════════════════════════════════════════════════════════════
function startVerifTimer() {
  stopVerifTimer();
  const endTime = Date.now() + VERIF_TIMEOUT;
  paidState.verifExpiredAt = endTime;

  const tick = () => {
    const diff = Math.max(0, endTime - Date.now());
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const text = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (verifCountdown) verifCountdown.textContent = text;

    // Update warna
    if (verifTimer) {
      verifTimer.classList.remove('warning', 'danger', 'expired');
      if (diff <= 0)                   verifTimer.classList.add('expired');
      else if (diff < 60 * 1000)       verifTimer.classList.add('danger');
      else if (diff < 2 * 60 * 1000)   verifTimer.classList.add('warning');
    }

    if (diff <= 0) {
      stopVerifTimer();
      lockVerification();
      return;
    }
    paidState.verifTimer = requestAnimationFrame(tick);
  };
  tick();
}

function stopVerifTimer() {
  if (paidState.verifTimer) {
    cancelAnimationFrame(paidState.verifTimer);
    paidState.verifTimer = null;
  }
}

function lockVerification() {
  log('[VERIF] ⏱️ Waktu habis — verifikasi terkunci.');

  // Disable input + tombol
  if (magicInput)   { magicInput.disabled = true; magicInput.placeholder = '⏱️ Waktu habis — silakan beli lagi'; }
  if (activateBtn)  { activateBtn.disabled = true; }
  if (btnText)      { btnText.innerHTML = 'Waktu Habis'; }

  // Sembunyikan form verifikasi utama, tampilkan tombol beli lagi
  if (verifExpiredBtn) verifExpiredBtn.style.display = 'flex';

  showMessage(msgBox2, 'error', 'Waktu verifikasi 5 menit sudah habis. Silakan beli lagi untuk mendapatkan akun baru.');

  clearVerifSession();
  clearPendingTx();
}

// ════════════════════════════════════════════════════════════
//  UI SWITCH
// ════════════════════════════════════════════════════════════
function showManualVerifSection(email) {
  if (manualBuyState) manualBuyState.style.display = 'none';
  if (verifSuccess)   verifSuccess.style.display = 'none';
  if (verifSection)   verifSection.style.display = 'block';

  const ed = $('verifEmailDisplay');
  if (ed) ed.textContent = email || 'email kamu';

  setTimeout(() => {
    if (verifSection) verifSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showMessage(msgBox2, 'info', `Link sudah dikirim ke ${email}. Paste dalam 5 menit sebelum kadaluarsa.`);
    setTimeout(() => { const mi = $('magicInput'); if (mi) mi.focus(); }, 400);
  }, 500);
}

function showManualBuyState() {
  if (manualBuyState) manualBuyState.style.display = 'block';
  if (verifSection)   verifSection.style.display = 'none';
  if (verifSuccess)   verifSuccess.style.display = 'none';
  if (verifExpiredBtn) verifExpiredBtn.style.display = 'none';
  // Reset state input
  if (magicInput) { magicInput.disabled = false; magicInput.value = ''; magicInput.placeholder = 'Paste link dari Gmail di sini...'; }
  if (activateBtn) activateBtn.disabled = true;
  if (btnText) btnText.innerHTML = 'Verifikasi &amp; Aktifkan';
}

function showManualSuccess(email) {
  if (manualBuyState) manualBuyState.style.display = 'none';
  if (verifSection)   verifSection.style.display = 'none';
  if (verifSuccess)   verifSuccess.style.display = 'block';
  const em = $('vsEmail');
  if (em && email) em.textContent = email;
  if (verifSuccess) verifSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Tombol "Beli Akun Lagi" di expired state ────────────────
if (verifExpiredBtn) verifExpiredBtn.addEventListener('click', () => {
  showManualBuyState();
  if (emailInput) emailInput.value = '';
  hideMessage(msgBox); hideMessage(msgBox2);
  log('[UI] Reset — silakan beli akun baru.');
});

// ════════════════════════════════════════════════════════════
//  AUTO — Generate akun temp
// ════════════════════════════════════════════════════════════
function createPaidCard(i) {
  const el = document.createElement('div');
  el.id = `paid-card-${i}`;
  el.className = 'bulk-account-card';
  el.innerHTML = `
    <div class="bulk-account-head">
      <div class="num">AKUN ${i + 1}</div>
      <span class="tag load">proses...</span>
    </div>
    <div class="bulk-account-email email-line">Menunggu...</div>
    <div class="bulk-account-pass pass-line" style="display:none;"></div>
    <div class="bulk-account-actions action-line"></div>`;
  paidList.appendChild(el);
}
function updatePaidCard(i, d) {
  const el = document.getElementById(`paid-card-${i}`);
  if (!el) return;
  const tag = el.querySelector('.tag');
  const emailLine = el.querySelector('.email-line');
  const passLine = el.querySelector('.pass-line');
  const actionLine = el.querySelector('.action-line');
  if (d.status === 'ready') {
    tag.className = 'tag ok'; tag.textContent = 'PREMIUM';
    emailLine.innerHTML = `<b>Email:</b> ${d.email}`;
    passLine.style.display = 'block';
    passLine.innerHTML = `<b>Magic Link:</b> <span style="word-break:break-all;font-weight:400;font-size:11px;">${d.magicLink}</span>`;
    actionLine.innerHTML = `
      <button class="btn-open" onclick="window.open('${d.inboxUrl || '#'}','_blank')"><i class="fas fa-inbox"></i> Inbox</button>
      <button class="btn-copy" onclick="copyText('${d.email}')"><i class="fas fa-copy"></i> Email</button>
      <button class="btn-copy" onclick="copyText('${d.magicLink}')"><i class="fas fa-key"></i> Link</button>`;
  } else if (d.status === 'error') {
    tag.className = 'tag err'; tag.textContent = 'GAGAL';
    emailLine.innerHTML = d.email
      ? `<b>Email:</b> ${d.email}<br><span style="color:#c00;font-size:11px;">${d.error || 'Error'}</span>`
      : `<span style="color:#c00;font-size:11px;">${d.error || 'Error'}</span>`;
    passLine.style.display = 'none'; actionLine.innerHTML = '';
  }
}
window.copyText = function(text) {
  navigator.clipboard.writeText(text).then(() => log(`[COPY] ${text}`));
};

async function runPaidGenerate(fromResume) {
  if (paidState.generating) return;
  paidState.generating = true;
  const count = paidState.count;
  const domain = paidDomainSelect?.value || 'gmail.com';

  if (paidProgress) paidProgress.style.display = 'block';
  if (paidActions)  paidActions.classList.remove('show');
  if (paidList)     paidList.innerHTML = '';
  if (paidSummary)  paidSummary.textContent = `Memproses 0/${count}...`;
  for (let i = 0; i < count; i++) createPaidCard(i);

  log(`${fromResume ? '[RESUME]' : '[AUTO]'} Proses ${count} akun premium...`);
  showMessage(msgBoxPaid, 'info', `Pembayaran lunas ✅ — Membuat ${count} akun premium...`);

  let vis = 0;
  const pt = setInterval(() => {
    vis++;
    if (paidSummary) paidSummary.textContent = `Memproses ${Math.min(vis, count)}/${count}...`;
  }, 4000);

  try {
    const res = await fetch(`${API_BASE}/api/auto-start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, count })
    });
    const txt = await res.text();
    let data;
    try { data = JSON.parse(txt); }
    catch { throw new Error(`Server error (${res.status}): ${txt.slice(0, 120)}`); }
    if (!data.success) throw new Error(data.error || 'Gagal generate.');

    let ok = 0;
    data.batch.forEach((acc, i) => {
      const inboxUrl = acc.email ? `https://emailnator.com/inbox/${acc.email}` : '';
      const magicLink = acc.password || acc.magicLink || '';
      if (acc.premiumApplied && acc.email && magicLink) {
        updatePaidCard(i, { status: 'ready', email: acc.email, magicLink, inboxUrl });
        paidState.results.push({ ok: true, email: acc.email, magicLink, inboxUrl });
        log(`[AUTO ${i + 1}] PREMIUM — ${acc.email}`);
        ok++;
      } else {
        updatePaidCard(i, { status: 'error', email: acc.email, error: acc.error || 'unknown' });
        paidState.results.push({ ok: false, email: acc.email, error: acc.error });
        log(`[AUTO ${i + 1}] GAGAL — ${acc.error || 'unknown'}`);
      }
    });

    const fail = count - ok;
    if (paidSummary) paidSummary.textContent = `✅ Berhasil: ${ok} akun${fail > 0 ? ` (${fail} gagal)` : ''}`;
    if (paidActions) paidActions.classList.add('show');
    showMessage(msgBoxPaid, ok > 0 ? 'success' : 'error', `Selesai — ${ok}/${count} akun premium siap login.`);
    log(`[AUTO] Selesai — ${ok} premium, ${fail} gagal.`);

    updatePendingState({ generated: true });
    setTimeout(() => clearPendingTx(), 2000);
  } catch (err) {
    log(`[AUTO] ERROR: ${err.message}`);
    showMessage(msgBoxPaid, 'error', err.message);
    for (let i = 0; i < count; i++) updatePaidCard(i, { status: 'error', error: err.message });
  } finally {
    clearInterval(pt);
    paidPayBtn.disabled = false;
    paidPayBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Beli <span id="paidBtnQty">${count}</span> Akun Sekarang`;
    paidState.running = false;
    paidState.generating = false;
    if (paidCountEl) paidCountEl.value = count;
    updatePaidPrice();
  }
}

window.copyAllPaidEmails = function() {
  const rows = paidState.results.filter(r => r.ok);
  if (!rows.length) { showMessage(msgBoxPaid, 'error', 'Belum ada akun berhasil.'); return; }
  const text = rows.map(r => `${r.email} | ${r.magicLink}`).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    showMessage(msgBoxPaid, 'success', `${rows.length} akun disalin.`);
    log('[COPY] Semua akun disalin.');
  });
};

window.downloadPaidTxt = function() {
  const rows = paidState.results.filter(r => r.ok);
  if (!rows.length) { showMessage(msgBoxPaid, 'error', 'Belum ada akun berhasil.'); return; }
  let c = `MAS REY — Akun Premium (Auto)\n`;
  c += `Tanggal : ${new Date().toLocaleString('id-ID')}\n`;
  c += `Total   : ${rows.length} akun × Rp 5.000\n`;
  c += `${'='.repeat(50)}\n\n`;
  rows.forEach((r, i) => { c += `#${i + 1}\nEmail      : ${r.email}\nMagic Link : ${r.magicLink}\n\n`; });
  c += `Cara login:\n1. Buka app Alight Motion\n2. Sign In with Email\n3. Masukkan email\n4. Buka Magic Link untuk verifikasi\n`;
  const blob = new Blob([c], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `mas-rey-auto-${Date.now()}.txt`; a.click();
  URL.revokeObjectURL(url);
  log('[DOWNLOAD] File diunduh.');
};

// ════════════════════════════════════════════════════════════
//  VERIFIKASI MANUAL
// ════════════════════════════════════════════════════════════
function checkForm() {
  if (!activateBtn || !magicInput) return;
  const ok = verifSession.active
    && magicInput.value.trim().startsWith('http')
    && !magicInput.disabled
    && Date.now() < (paidState.verifExpiredAt || 0);
  activateBtn.disabled = !ok;
}
if (magicInput) {
  magicInput.addEventListener('input', checkForm);
}

let isVerifying = false;

async function doVerify(link) {
  if (isVerifying) return;

  if (paidState.verifExpiredAt && Date.now() >= paidState.verifExpiredAt) {
    showMessage(msgBox2, 'error', 'Waktu verifikasi sudah habis. Silakan beli lagi.');
    lockVerification();
    return;
  }
  if (!verifSession.active || !verifSession.jobId) {
    showMessage(msgBox2, 'error', 'Sesi tidak valid.'); return;
  }
  if (!link || !link.startsWith('http')) {
    showMessage(msgBox2, 'error', 'Link harus berupa URL lengkap.'); return;
  }

  isVerifying = true;
  hideMessage(msgBox2);
  if (activateBtn) activateBtn.disabled = true;
  if (btnText) btnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
  log(`[VERIF] Memverifikasi magic link untuk ${verifSession.email}...`);
  showMessage(msgBox2, 'info', 'Sedang memverifikasi & mengaktifkan premium...');

  try {
    const res = await fetch(`${API_BASE}/api/verif`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: verifSession.jobId, link }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Verifikasi gagal.');

    log(`[SUCCESS] Premium berhasil diaktifkan untuk ${verifSession.email}`);
    const savedEmail = verifSession.email;

    // Stop timer
    stopVerifTimer();

    // ✅ Kotak paste HILANG → panel sukses muncul + tombol beli lagi
    showManualSuccess(savedEmail);
    clearVerifSession();
    clearPendingTx();

  } catch (err) {
    showMessage(msgBox2, 'error', err.message || 'Gagal aktivasi.');
    log(`[ERROR] ${err.message}`);
    if (activateBtn) activateBtn.disabled = false;
    if (btnText) btnText.innerHTML = 'Verifikasi &amp; Aktifkan';
  } finally {
    isVerifying = false;
  }
}

if (activateBtn) activateBtn.addEventListener('click', () => {
  const link = magicInput ? magicInput.value.trim() : '';
  doVerify(link);
});

function clearVerifSession() {
  verifSession.email = null;
  verifSession.jobId = null;
  verifSession.active = false;
}

// ════════════════════════════════════════════════════════════
//  RESET — setelah sukses verif
// ════════════════════════════════════════════════════════════
window.resetVerifForm = function() {
  clearVerifSession();
  stopVerifTimer();
  if (magicInput) { magicInput.value = ''; magicInput.disabled = false; magicInput.placeholder = 'Paste link dari Gmail di sini...'; }
  if (activateBtn) activateBtn.disabled = true;
  if (btnText) btnText.innerHTML = 'Verifikasi &amp; Aktifkan';
  hideMessage(msgBox); hideMessage(msgBox2);
  if (emailInput) emailInput.value = '';
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Beli Sekarang Rp 3.000';
  }
  if (verifExpiredBtn) verifExpiredBtn.style.display = 'none';
  showManualBuyState();
  if (emailInput) emailInput.focus();
  log('[UI] Form direset — siap beli akun baru.');
};

// ════════════════════════════════════════════════════════════
//  RESUME — Setelah halaman load
// ════════════════════════════════════════════════════════════
(function initResume() {
  const tx = loadPendingTx();
  if (!tx) { log('[READY] Sistem siap.'); return; }

  log(`[RESUME] Transaksi pending — ${tx.mode} — ${tx.count} akun`);
  paidState.transactionId = tx.transactionId;
  paidState.accessKey     = tx.accessKey;
  paidState.mode          = tx.mode;
  paidState.count         = tx.count || 1;
  paidState.pendingEmail  = tx.pendingEmail || null;
  paidState.pricePerUnit  = tx.pricePerUnit || 0;
  paidState.paid          = !!tx.paid;
  paidState.running       = true;
  paidState.orderId       = tx.orderId;
  paidState.totalAmount   = tx.totalAmount;

  if (tx.mode === 'auto') switchMode('auto');
  else switchMode('manual');

  const expiredAt = tx.expiredAt ? new Date(tx.expiredAt).getTime() : (tx.savedAt + 15*60*1000);
  if (Date.now() >= expiredAt && !tx.paid) {
    log('[RESUME] ⚠️ expired — hapus state.');
    clearPendingTx();
    paidState.running = false;
    return;
  }

  // Kalau sudah paid & belum generate
  if (tx.paid && !tx.generated) {
    log('[RESUME] ✅ Sudah paid — melanjutkan...');
    setTimeout(() => {
      if (tx.mode === 'manual') afterManualPaid();
      else runPaidGenerate(true);
    }, 1000);
    return;
  }

  // Manual + paid + generated → tampilkan form verif lagi dengan timer
  if (tx.mode === 'manual' && tx.paid && tx.generated && tx.pendingEmail) {
    log('[RESUME] 📩 Lanjut ke form paste magic link...');
    verifSession.email = tx.pendingEmail;
    verifSession.jobId = btoa(tx.pendingEmail);
    verifSession.active = true;

    // Hitung sisa waktu
    const savedTime = tx.paidAt || tx.savedAt;
    const elapsed = Date.now() - savedTime;
    const remaining = VERIF_TIMEOUT - elapsed;

    if (remaining <= 0) {
      // Sudah expired → lock
      showManualVerifSection(tx.pendingEmail);
      stopVerifTimer();
      if (verifCountdown) verifCountdown.textContent = '00:00';
      if (verifTimer) verifTimer.classList.add('expired');
      lockVerification();
    } else {
      // Masih ada waktu → start timer
      const endTime = Date.now() + remaining;
      startVerifTimerFromEnd(endTime);
      showManualVerifSection(tx.pendingEmail);
    }
    return;
  }

  // Masih pending → tampilkan QRIS
  if (!tx.paid && tx.qrisString) {
    log('[RESUME] 📱 Menampilkan QRIS + resume polling...');
    showPayModal({
      qrisString: tx.qrisString, qrisImage: tx.qrisImage,
      totalAmount: tx.totalAmount, orderId: tx.orderId,
      transactionId: tx.transactionId, count: tx.count
    }, tx.mode);
    startPayCountdown(tx.expiredAt);
    startPayPolling();
  }
})();

function startVerifTimerFromEnd(endTime) {
  stopVerifTimer();
  paidState.verifExpiredAt = endTime;

  const tick = () => {
    const diff = Math.max(0, endTime - Date.now());
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const text = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (verifCountdown) verifCountdown.textContent = text;

    if (verifTimer) {
      verifTimer.classList.remove('warning', 'danger', 'expired');
      if (diff <= 0)                   verifTimer.classList.add('expired');
      else if (diff < 60 * 1000)       verifTimer.classList.add('danger');
      else if (diff < 2 * 60 * 1000)   verifTimer.classList.add('warning');
    }
    if (diff <= 0) { stopVerifTimer(); lockVerification(); return; }
    paidState.verifTimer = requestAnimationFrame(tick);
  };
  tick();
}

window.addEventListener('load', () => {
  setTimeout(() => log('[READY] Sistem siap.'), 2500);
});