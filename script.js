// ============================================================
//  MAS REY — AM Generator
// ============================================================

const $ = (id) => document.getElementById(id);
const API_BASE = '';

const PRICE_MANUAL = 3000;
const PRICE_AUTO   = 5000;
const MIN_QTY = 1, MAX_QTY = 20;
const VERIF_TIMEOUT = 5 * 60 * 1000;

const STORAGE_KEY = 'masrey_pending_tx';

// ── LOADER ──────────────────────────────────────────────────
(function initLoader() {
  const loader = $('loader');
  const statusText = $('loaderStatus');
  const progressFill = $('loaderProgressFill');
  if (!loader) return;

  const steps = [
    'Menghubungkan ke server',
    'Memuat sistem',
    'Cek koneksi API',
    'Siap digunakan'
  ];
  let i = 0;

  function next() {
    if (i >= steps.length) {
      setTimeout(() => {
        loader.classList.add('hide');
        setTimeout(() => loader.remove(), 350);
      }, 300);
      return;
    }

    // Update teks status
    if (statusText) statusText.textContent = steps[i];

    // Update lebar progress bar
    if (progressFill) {
      const percent = ((i + 1) / steps.length) * 100;
      progressFill.style.width = `${percent}%`;
    }

    i++;
    setTimeout(next, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', next);
  } else {
    next();
  }

  // Fallback jika loading terlalu lama
  setTimeout(() => {
    if (loader && !loader.classList.contains('hide')) {
      loader.classList.add('hide');
      setTimeout(() => loader.remove(), 350);
    }
  }, 3500);
})();

// ── WELCOME ─────────────────────────────────────────────────
(function initWelcome() {
  const toast = $('welcomeToast');
  const titleEl = $('welcomeTitle');
  const descEl = $('welcomeDesc');
  if (!toast) return;
  const hour = new Date().getHours();
  let greeting = 'Selamat Datang';
  if (hour >= 4 && hour < 11) greeting = 'Pagi';
  else if (hour >= 11 && hour < 15) greeting = 'Siang';
  else if (hour >= 15 && hour < 18) greeting = 'Sore';
  else greeting = 'Malam';
  if (titleEl) titleEl.textContent = `Selamat ${greeting}, Sobat MAS REY`;
  if (descEl) descEl.textContent = 'Ada yang bisa dibantu?';
  setTimeout(() => {
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 6000);
  }, 3400);
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

// ── DASHBOARD ───────────────────────────────────────────────
(function initDashboard() {
  const timeEl     = $('dashTime');
  const dayEl      = $('dashDay');
  const dateEl     = $('dashDate');
  const yearEl     = $('dashYear');
  const statusEl   = $('dashStatus');
  const dotEl      = $('dashDot');
  const statusItem = $('dashStatusItem');
  const statusIcon = $('dashStatusIcon');

  if (!timeEl) return;

  const DAYS   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni',
                  'Juli','Agustus','September','Oktober','November','Desember'];

  function tick() {
    const now = new Date();
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
    if (dayEl)  dayEl.textContent  = DAYS[now.getDay()];
    if (dateEl) dateEl.textContent = `${now.getDate()} ${MONTHS[now.getMonth()]}`;
    if (yearEl) yearEl.textContent = now.getFullYear();
  }
  tick();
  setInterval(tick, 1000);

  function updateStatus() {
    const online = navigator.onLine;
    if (statusEl) statusEl.textContent = online ? 'Online' : 'Offline';
    if (dotEl)    dotEl.classList.toggle('offline', !online);
    if (statusItem) statusItem.classList.toggle('offline', !online);
    if (statusIcon) {
      statusIcon.innerHTML = online
        ? '<i class="fas fa-wifi"></i>'
        : '<i class="fas fa-wifi-slash"></i>';
    }
  }
  updateStatus();
  window.addEventListener('online',  updateStatus);
  window.addEventListener('offline', updateStatus);
  setInterval(updateStatus, 5000);
})();

// ── LOG ─────────────────────────────────────────────────────
const terminalLog = $('terminalLog');

const SILENT_PREFIXES = [
  '[SYSTEM]', '[READY]', '[THEME]', '[MODE]', '[UI]',
  '[COPY]', '[DOWNLOAD]', '[KONFIRMASI]', '[FAQ]',
  '[DONASI]', '[INFO]', '[GUIDE]'
];

function shouldLog(text) {
  const upper = String(text || '').toUpperCase();
  for (const prefix of SILENT_PREFIXES) {
    if (upper.startsWith(prefix)) return false;
  }
  return true;
}

function detectLogType(text) {
  const t = text.toUpperCase();
  if (/\b(ERROR|GAGAL|FAIL|EXPIRED|INVALID|TIMEOUT)\b/.test(t)) return 'error';
  if (t.includes('[SUCCESS]') || t.includes('[OK]') || t.includes('BERHASIL') ||
      t.includes('PREMIUM —') || t.includes('PREMIUM AKTIF')) return 'success';
  if (t.includes('[PAY]') || t.includes('[PAID]') || t.includes('[SEND]') ||
      t.includes('[VERIF]') || t.includes('[MANUAL]') || t.includes('[AUTO]') ||
      t.includes('[SEWA]') || t.includes('[RESUME]') ||
      t.includes('MENUNGGU') || t.includes('MEMPROSES'))
    return 'warn';
  return 'info';
}

function log(text, type) {
  if (!terminalLog) return;
  if (!shouldLog(text)) return;

  const t = type || detectLogType(text);
  const line = document.createElement('div');
  line.className = `log-line log-${t}`;
  line.textContent = text;
  terminalLog.appendChild(line);
  while (terminalLog.children.length > 80) terminalLog.removeChild(terminalLog.firstChild);
  terminalLog.scrollTop = terminalLog.scrollHeight;
}

window.copyTerminal = function() {
  if (!terminalLog) return;
  const lines = Array.from(terminalLog.querySelectorAll('.log-line')).map(l => l.textContent).join('\n');
  if (!lines.trim()) return;
  navigator.clipboard.writeText(lines);
};

window.clearTerminal = function() {
  if (!terminalLog) return;
  terminalLog.innerHTML = '';
  const line = document.createElement('div');
  line.className = 'log-line log-info';
  line.textContent = '[INFO] Log dibersihkan.';
  terminalLog.appendChild(line);
};

// ── MODE SWITCH ─────────────────────────────────────────────
function safeSet(el, val) { if (el) el.style.display = val; }
window.switchMode = function(mode) {
  const isAuto   = mode === 'auto';
  const isSewa   = mode === 'sewa';
  const isManual = !isAuto && !isSewa;

  safeSet($('panelManual'), isManual ? 'block' : 'none');
  safeSet($('panelAuto'),   isAuto   ? 'block' : 'none');
  safeSet($('panelSewa'),   isSewa   ? 'block' : 'none');

  $('tabManual')?.classList.toggle('active', isManual);
  $('tabAuto')?.classList.toggle('active', isAuto);
  $('tabSewa')?.classList.toggle('active', isSewa);

  log(`[MODE] ${isSewa ? 'Sewa Bot' : isAuto ? 'Email dari Web' : 'Email Sendiri'}`);
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
const confirmProductEl = $('confirmProduct');
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
//  PANDUAN
// ════════════════════════════════════════════════════════════
const GUIDE_DATA = {
  manual: {
    title: 'Beli Alight Motion',
    sub: 'Pakai email sendiri · Rp 3.000',
    body: `
      <p>Metode ini paling simpel kalau kamu udah punya Gmail dan mau akunnya nempel di email itu sendiri.</p>

      <div class="g-item">
        <div class="g-num">1</div>
        <div>
          <b>Isi email kamu</b>
          <span>Masukin Gmail yang aktif dan masih bisa dibuka. Kalau salah ketik, magic link-nya bakal nyasar.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">2</div>
        <div>
          <b>Klik tombol beli</b>
          <span>Nanti muncul konfirmasi, cek lagi totalnya Rp 3.000. Kalau udah bener, lanjut bayar.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">3</div>
        <div>
          <b>Scan QRIS</b>
          <span>Bisa pakai DANA, OVO, GoPay, ShopeePay, atau m-banking. Tinggal scan aja, nominalnya udah otomatis.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">4</div>
        <div>
          <b>Buka Gmail</b>
          <span>Setelah bayar, tunggu bentar terus buka Gmail. Cari email dari <i>Alight Motion</i>. Kalau gak ada di inbox, cek folder spam/promosi.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">5</div>
        <div>
          <b>Copy link verifikasi</b>
          <span>Di dalam email ada tombol atau link panjang. Tekan lama → copy, atau buka emailnya terus salin URL-nya.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">6</div>
        <div>
          <b>Paste & klik verifikasi</b>
          <span>Balik ke web ini, paste link ke kolom yang tersedia, terus klik <b>Verifikasi & Aktifkan</b>.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">7</div>
        <div>
          <b>Selesai</b>
          <span>Kalau sukses, muncul notif hijau "Premium Aktif". Tinggal buka Alight Motion, sign in pakai Gmail yang sama.</span>
        </div>
      </div>

      <div class="g-warn">
        <b>Perhatian:</b> link verifikasi cuma berlaku 5 menit. Kalau lewat, harus beli ulang. Jangan di-share ke orang lain juga, link-nya cuma bisa dipakai sekali.
      </div>
    `
  },
  auto: {
    title: 'Beli Alight Motion',
    sub: 'Email digenerate sistem · Rp 5.000/akun',
    body: `
      <p>Kalau gak mau ribet pakai email pribadi, pilih metode ini. Sistem yang bikin akunnya, kamu tinggal terima beres.</p>

      <div class="g-item">
        <div class="g-num">1</div>
        <div>
          <b>Tentukan jumlah akun</b>
          <span>Bisa beli 1 sampai 20 akun sekaligus. Harga Rp 5.000 per akun.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">2</div>
        <div>
          <b>Pilih domain</b>
          <span>Bisa gmail.com atau googlemail.com. Dua-duanya jalan normal.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">3</div>
        <div>
          <b>Bayar via QRIS</b>
          <span>Scan QRIS kayak biasa. Totalnya ngikutin jumlah akun yang kamu pilih.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">4</div>
        <div>
          <b>Sistem kerja otomatis</b>
          <span>Setelah bayar, sistem bakal langsung generate akun + apply premium. Kamu tinggal duduk manis.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">5</div>
        <div>
          <b>Simpan hasilnya</b>
          <span>Email + magic link muncul di bawah. Bisa disalin semua atau download TXT. Simpan baik-baik.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">6</div>
        <div>
          <b>Login di Alight Motion</b>
          <span>Buka aplikasinya, sign in pakai email hasil generate, terus buka magic link buat verifikasi.</span>
        </div>
      </div>

      <div class="g-info">
        Proses generate bisa makan 20–60 detik tergantung jumlah akun. Kalau ada yang gagal, kolom di bawah bakal nunjukin error-nya.
      </div>
    `
  },
  sewa: {
    title: 'Sewa Bot WhatsApp',
    sub: 'Bot masuk grup otomatis',
    body: `
      <p>Ada 3 pilihan: <b>sewa baru</b> kalau mau bot masuk grup baru, <b>perpanjang</b> kalau masa aktifnya udah mau habis, atau <b>premium user</b> kalau mau upgrade akun kamu.</p>

      <div class="g-head">Sewa Baru / Perpanjang</div>

      <div class="g-item">
        <div class="g-num">1</div>
        <div>
          <b>Pilih kategori</b>
          <span>Tentukan mau sewa baru atau perpanjang. Tiap kategori punya paket sendiri.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">2</div>
        <div>
          <b>Isi link grup</b>
          <span>Masukin link undangan grup WhatsApp kamu (yang ada <i>chat.whatsapp.com</i>-nya). Pastikan linknya masih aktif.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">3</div>
        <div>
          <b>Pilih durasi</b>
          <span>Sewa baru mulai Rp 12.000 (30 hari), perpanjang mulai Rp 10.000. Makin lama makin murah per harinya.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">4</div>
        <div>
          <b>Isi nomor bonus premium</b>
          <span>Khusus sewa baru, ada bonus premium yang jumlahnya ngikut durasi. Contoh: sewa 30 hari = 1 nomor bonus, 60 hari = 2 nomor, dst. Format nomor wajib pakai <b>62</b> di depan, jangan 08.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">5</div>
        <div>
          <b>Bayar QRIS</b>
          <span>Scan QRIS, bayar sesuai nominal. Prosesnya cepet.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">6</div>
        <div>
          <b>Tinggal nunggu</b>
          <span>Bot bakal masuk grup otomatis setelah admin approve. Biasanya 1–5 menit. Notifikasi juga dikirim ke admin lewat Telegram.</span>
        </div>
      </div>

      <div class="g-head">Premium User</div>

      <div class="g-item">
        <div class="g-num">1</div>
        <div>
          <b>Masukin nomor target</b>
          <span>Nomor WhatsApp kamu yang mau di-upgrade jadi premium. Pakai format 62 juga.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">2</div>
        <div>
          <b>Pilih durasi & bayar</b>
          <span>Pilih paket, bayar QRIS, selesai. Role premium kamu langsung aktif.</span>
        </div>
      </div>

      <div class="g-info">
        Riwayat sewa kamu bakal kesimpen di bagian <b>List Grup Sewa</b> di bawah form. Bisa cek kapan expired dan berapa yang udah dibayar.
      </div>
    `
  },
  verif: {
    title: 'Verifikasi Magic Link',
    sub: 'Aktifkan premium pakai link dari email',
    body: `
      <p>Ini step terakhir buat metode email sendiri. Gampang kok, cuma butuh copy paste.</p>

      <div class="g-item">
        <div class="g-num">1</div>
        <div>
          <b>Buka Gmail</b>
          <span>Klik tombol "Buka Gmail Sekarang" atau langsung buka aplikasinya dari HP kamu.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">2</div>
        <div>
          <b>Cari email dari Alight Motion</b>
          <span>Ada email masuk dari <i>Alight Motion</i> atau <i>Alight Creative</i>. Kalau gak muncul, cek folder Spam atau Promotions.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">3</div>
        <div>
          <b>Copy link di dalamnya</b>
          <span>Ada tombol verifikasi atau link panjang. Tekan lama → copy link.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">4</div>
        <div>
          <b>Paste & klik verifikasi</b>
          <span>Balik ke sini, paste link ke kolom, terus klik tombol <b>Verifikasi & Aktifkan</b>. Tunggu 3–10 detik.</span>
        </div>
      </div>

      <div class="g-item">
        <div class="g-num">5</div>
        <div>
          <b>Premium aktif</b>
          <span>Kalau sukses, muncul kartu hijau. Buka Alight Motion, sign in pakai email itu.</span>
        </div>
      </div>

      <div class="g-warn">
        Batas waktunya 5 menit. Kalau lewat, link expired dan kamu harus beli ulang. Link juga cuma bisa dipakai sekali.
      </div>
    `
  }
};

let guideState = { currentTab: 'manual' };

function renderGuide(tab) {
  const data = GUIDE_DATA[tab];
  if (!data) return;

  const titleEl = $('guideTitle');
  const subEl = $('guideSubtitle');
  const content = $('guideContent');

  if (titleEl) titleEl.textContent = data.title;
  if (subEl)   subEl.textContent   = data.sub;
  if (content) content.innerHTML   = data.body;

  document.querySelectorAll('.guide-tab').forEach((el) => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });

  if (content) content.scrollTop = 0;
}

window.switchGuideTab = function(tab) {
  if (!GUIDE_DATA[tab]) return;
  guideState.currentTab = tab;
  renderGuide(tab);
};

window.openGuide = function(tab) {
  if (!tab) {
    if ($('panelAuto')?.style.display === 'block')       tab = 'auto';
    else if ($('panelSewa')?.style.display === 'block')  tab = 'sewa';
    else if (verifSection?.style.display === 'block')    tab = 'verif';
    else                                                  tab = 'manual';
  }
  if (tab && GUIDE_DATA[tab]) guideState.currentTab = tab;
  const modal = $('guideModal');
  if (modal) modal.classList.add('show');
  renderGuide(guideState.currentTab);
  log(`[GUIDE] Buka panduan: ${guideState.currentTab}`);
};

window.closeGuide = function() {
  const modal = $('guideModal');
  if (modal) modal.classList.remove('show');
};

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
  verifExpiredAt: null,
  orderId: null, totalAmount: 0,
  pendingSewa: null
};

// ════════════════════════════════════════════════════════════
//  SEWA BOT
// ════════════════════════════════════════════════════════════
const SEWA_PACKAGES = {
  1:  { name: "Sewa Bot 30 Hari",   days: 30,  price: 12000, type: "NEW",     bonusPrem: 1 },
  2:  { name: "Sewa Bot 60 Hari",   days: 60,  price: 20000, type: "NEW",     bonusPrem: 2 },
  3:  { name: "Sewa Bot 90 Hari",   days: 90,  price: 30000, type: "NEW",     bonusPrem: 3 },
  4:  { name: "Sewa Bot 120 Hari",  days: 120, price: 40000, type: "NEW",     bonusPrem: 4 },
  5:  { name: "Sewa Bot 150 Hari",  days: 150, price: 50000, type: "NEW",     bonusPrem: 5 },
  6:  { name: "Sewa Bot 180 Hari",  days: 180, price: 60000, type: "NEW",     bonusPrem: 6 },
  11: { name: "Perpanjang 30 Hari",  days: 30,  price: 10000, type: "RENEW", bonusPrem: 0 },
  12: { name: "Perpanjang 60 Hari",  days: 60,  price: 20000, type: "RENEW", bonusPrem: 0 },
  13: { name: "Perpanjang 90 Hari",  days: 90,  price: 30000, type: "RENEW", bonusPrem: 0 },
  14: { name: "Perpanjang 120 Hari", days: 120, price: 40000, type: "RENEW", bonusPrem: 0 },
  15: { name: "Perpanjang 150 Hari", days: 150, price: 50000, type: "RENEW", bonusPrem: 0 },
  16: { name: "Perpanjang 180 Hari", days: 180, price: 60000, type: "RENEW", bonusPrem: 0 },
  "new_1":  { name: "Premium 1 Hari",   days: 1,   price: 1000,   type: "PREMIUM", bonusPrem: 0 },
  "new_2":  { name: "Premium 3 Hari",   days: 3,   price: 3000,   type: "PREMIUM", bonusPrem: 0 },
  "new_3":  { name: "Premium 5 Hari",   days: 5,   price: 5000,   type: "PREMIUM", bonusPrem: 0 },
  "new_4":  { name: "Premium 8 Hari",   days: 8,   price: 8000,   type: "PREMIUM", bonusPrem: 0 },
  "new_5":  { name: "Premium 1 Month",  days: 30,  price: 10000,  type: "PREMIUM", bonusPrem: 0 },
  "new_6":  { name: "Premium 2 Month",  days: 60,  price: 20000,  type: "PREMIUM", bonusPrem: 0 },
  "new_7":  { name: "Premium 3 Month",  days: 90,  price: 30000,  type: "PREMIUM", bonusPrem: 0 },
  "new_8":  { name: "Premium 4 Month",  days: 120, price: 40000,  type: "PREMIUM", bonusPrem: 0 },
  "new_9":  { name: "Premium 5 Month",  days: 150, price: 50000,  type: "PREMIUM", bonusPrem: 0 },
  "new_10": { name: "Premium 6 Month",  days: 180, price: 60000,  type: "PREMIUM", bonusPrem: 0 },
  "new_11": { name: "Premium 7 Month",  days: 210, price: 70000,  type: "PREMIUM", bonusPrem: 0 },
  "new_12": { name: "Premium 8 Month",  days: 240, price: 80000,  type: "PREMIUM", bonusPrem: 0 },
  "new_13": { name: "Premium 9 Month",  days: 270, price: 90000,  type: "PREMIUM", bonusPrem: 0 },
  "new_14": { name: "Premium 10 Month", days: 300, price: 100000, type: "PREMIUM", bonusPrem: 0 }
};

const SEWA_LIST_KEY = 'masrey_sewa_list';

const sewaState = {
  category: 'NEW',
  packageId: null,
  groupLink: '',
  targetNumber: '',
  bonusNumbers: []
};

function getSewaPackagesByCategory(cat) {
  return Object.entries(SEWA_PACKAGES)
    .filter(([, p]) => p.type === cat)
    .map(([id, p]) => ({ id, ...p }));
}

function renderSewaGrid() {
  const grid = $('sewaGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const pkgs = getSewaPackagesByCategory(sewaState.category);
  pkgs.forEach((p) => {
    const card = document.createElement('button');
    card.className = 'sewa-pkg' + (String(sewaState.packageId) === String(p.id) ? ' selected' : '');
    card.dataset.id = String(p.id);
    const bonus = p.bonusPrem > 0
      ? `<span class="sewa-bonus"><i class="fas fa-gift"></i> +${p.bonusPrem} bonus</span>`
      : '';
    card.innerHTML = `
      <div class="sewa-pkg-days">${p.days} hari</div>
      <div class="sewa-pkg-name">${p.name}</div>
      <div class="sewa-pkg-price">${formatRp(p.price)}</div>
      ${bonus}
    `;
    card.addEventListener('click', () => selectSewaPackage(p.id));
    grid.appendChild(card);
  });
}

function selectSewaPackage(id) {
  sewaState.packageId = id;
  sewaState.bonusNumbers = [];
  document.querySelectorAll('.sewa-pkg').forEach((el) => {
    el.classList.toggle('selected', el.dataset.id === String(id));
  });
  renderBonusFields();
  updateSewaSummary();
  const p = SEWA_PACKAGES[id];
  log(`[SEWA] Paket — ${p.name} (${formatRp(p.price)})`);
}

function renderBonusFields() {
  const wrap = $('sewaBonusWrap');
  const box  = $('sewaBonusFields');
  const cnt  = $('sewaBonusCount');
  if (!wrap || !box) return;

  const pid = sewaState.packageId;
  const pkg = pid ? SEWA_PACKAGES[pid] : null;

  if (!pkg || pkg.type !== 'NEW' || pkg.bonusPrem <= 0) {
    wrap.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  wrap.style.display = 'block';
  if (cnt) cnt.textContent = `(maks ${pkg.bonusPrem})`;

  box.innerHTML = '';
  for (let i = 0; i < pkg.bonusPrem; i++) {
    const input = document.createElement('input');
    input.type = 'tel';
    input.className = 'input sewa-bonus-input';
    input.placeholder = `bonus ${i + 1} contoh: 6285256833258`;
    input.inputMode = 'numeric';
    input.dataset.index = String(i);
    input.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^\d]/g, '');
      sewaState.bonusNumbers[i] = e.target.value;
      validateBonusFormat(e.target);
      updateSewaSummary();
    });
    input.addEventListener('blur', (e) => validateBonusFormat(e.target));
    box.appendChild(input);
  }
}

function validateBonusFormat(el) {
  const v = (el.value || '').trim();
  const err = $('msgBoxSewa');
  el.classList.remove('input-error');

  if (!v) return true;

  if (v.startsWith('0') || v.startsWith('8')) {
    el.classList.add('input-error');
    showMessage(err, 'error', `Nomor "${v}" gak valid. Pakai 62 di depan ya (contoh: 628xxx), jangan 08.`);
    return false;
  }
  if (!v.startsWith('62')) {
    el.classList.add('input-error');
    showMessage(err, 'error', `Nomor "${v}" harus pakai kode negara 62. Contoh: 628xxx`);
    return false;
  }
  if (v.length < 10 || v.length > 15) {
    el.classList.add('input-error');
    showMessage(err, 'error', `Nomor "${v}" panjangnya gak wajar.`);
    return false;
  }
  hideMessage(err);
  return true;
}

function updateSewaSummary() {
  const box = $('sewaSelected');
  const btn = $('sewaPayBtn');
  if (!box || !btn) return;

  if (!sewaState.packageId) {
    box.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Pilih Paket Dulu';
    return;
  }
  const p = SEWA_PACKAGES[sewaState.packageId];
  if (!p) return;

  box.style.display = 'block';
  $('sewaSelectedName').textContent = p.name;

  const bonusRow = $('sewaBonusRow');
  if (p.bonusPrem > 0) {
    bonusRow.style.display = 'flex';
    $('sewaSelectedBonus').textContent = `${p.bonusPrem} nomor premium`;
  } else {
    bonusRow.style.display = 'none';
  }

  $('sewaSelectedPrice').textContent = formatRp(p.price);
  btn.disabled = false;
  btn.innerHTML = `<i class="fas fa-shopping-cart"></i> Beli ${formatRp(p.price)}`;
}

window.changeSewaCategory = function(cat) {
  sewaState.category = cat;
  sewaState.packageId = null;
  sewaState.bonusNumbers = [];
  document.querySelectorAll('.sewa-cat').forEach((el) => {
    el.classList.toggle('active', el.dataset.cat === cat);
  });
  const isPremium = cat === 'PREMIUM';
  safeSet($('sewaLinkWrap'),   isPremium ? 'none' : 'block');
  safeSet($('sewaTargetWrap'), isPremium ? 'block' : 'none');
  renderSewaGrid();
  renderBonusFields();
  updateSewaSummary();
  hideMessage($('msgBoxSewa'));
  log(`[SEWA] Kategori — ${cat}`);
};

if ($('sewaPayBtn')) $('sewaPayBtn').addEventListener('click', () => {
  if (paidState.running) return;
  if (!sewaState.packageId) {
    showMessage($('msgBoxSewa'), 'error', 'Pilih paket dulu ya.');
    return;
  }

  const cat = sewaState.category;
  const pkg = SEWA_PACKAGES[sewaState.packageId];

  let groupLink = '', targetNumber = '', bonusNumbers = [];

  if (cat === 'PREMIUM') {
    targetNumber = ($('sewaTargetNumber')?.value || '').trim();
    if (!targetNumber || targetNumber.length < 8) {
      showMessage($('msgBoxSewa'), 'error', 'Masukin nomor WhatsApp target dengan bener.');
      return;
    }
    if (!targetNumber.startsWith('62')) {
      showMessage($('msgBoxSewa'), 'error', 'Nomor target wajib pakai kode negara 62 (contoh: 628xxx).');
      return;
    }
  } else {
    groupLink = ($('sewaGroupLink')?.value || '').trim();
    if (!groupLink || !groupLink.includes('chat.whatsapp.com')) {
      showMessage($('msgBoxSewa'), 'error', 'Link grup WhatsApp gak valid.');
      return;
    }

    if (cat === 'NEW' && pkg.bonusPrem > 0) {
      bonusNumbers = [];
      const inputs = document.querySelectorAll('.sewa-bonus-input');
      for (let i = 0; i < inputs.length; i++) {
        const val = (inputs[i].value || '').trim();
        if (!val) {
          showMessage($('msgBoxSewa'), 'error', `Nomor bonus #${i + 1} belum diisi.`);
          inputs[i].focus();
          return;
        }
        if (!val.startsWith('62')) {
          showMessage($('msgBoxSewa'), 'error', `Nomor bonus #${i + 1} harus pakai 62 di depan.`);
          inputs[i].focus();
          return;
        }
        bonusNumbers.push(val);
      }
    }
  }

  hideMessage($('msgBoxSewa'));
  sewaState.groupLink = groupLink;
  sewaState.targetNumber = targetNumber;
  sewaState.bonusNumbers = bonusNumbers;

  paidState.mode = 'sewa';
  paidState.count = 1;
  paidState.pricePerUnit = pkg.price;
  paidState.pendingSewa = {
    packageId: sewaState.packageId,
    category: sewaState.category,
    groupLink,
    targetNumber,
    bonusNumbers,
    packageName: pkg.name
  };

  let productLabel = 'Sewa Bot WhatsApp';
  if (cat === 'PREMIUM') productLabel = 'Premium User';

  openConfirmModal({
    qtyLabel: pkg.name,
    total: pkg.price,
    product: productLabel
  });
});

window.resetSewaForm = function() {
  sewaState.packageId = null;
  sewaState.bonusNumbers = [];
  const gl = $('sewaGroupLink');   if (gl) gl.value = '';
  const tn = $('sewaTargetNumber'); if (tn) tn.value = '';
  const bf = $('sewaBonusFields'); if (bf) bf.innerHTML = '';
  const bw = $('sewaBonusWrap');   if (bw) bw.style.display = 'none';
  hideMessage($('msgBoxSewa'));
  renderSewaGrid();
  updateSewaSummary();
};

(function initSewa() {
  if ($('sewaGrid')) {
    renderSewaGrid();
    updateSewaSummary();
  }
})();

async function startSewaPayment() {
  const ps = paidState.pendingSewa;
  if (!ps) {
    showMessage($('msgBoxSewa'), 'error', 'Data paket hilang.');
    return;
  }

  paidState.running = true;
  paidState.paid = false;

  const btn = $('sewaPayBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Membuat QRIS...'; }

  log(`[SEWA] Buat QRIS — ${ps.packageName}`);

  try {
    const res = await fetch(`${API_BASE}/api/create-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'sewa',
        packageId: ps.packageId,
        groupLink: ps.groupLink,
        targetNumber: ps.targetNumber,
        bonusNumbers: ps.bonusNumbers
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gagal buat QRIS.');

    paidState.transactionId = data.transactionId;
    paidState.accessKey = data.accessKey;
    paidState.orderId = data.orderId;
    paidState.totalAmount = data.totalAmount;

    savePendingTx({
      transactionId: data.transactionId, accessKey: data.accessKey,
      mode: 'sewa', count: 1,
      pricePerUnit: SEWA_PACKAGES[ps.packageId].price,
      totalAmount: data.totalAmount, orderId: data.orderId,
      qrisString: data.qrisString || '', qrisImage: data.qrisImage || '',
      expiredAt: data.expiredAt, paid: false, generated: false,
      pendingSewa: ps
    });

    showPayModal(data, 'sewa');
    startPayCountdown(data.expiredAt);
    startPayPolling();
    log(`[SEWA] ✅ QRIS siap — ${formatRp(data.totalAmount)}`);
  } catch (err) {
    log(`[SEWA] ❌ ${err.message}`);
    showMessage($('msgBoxSewa'), 'error', err.message);
    if (btn) updateSewaSummary();
    paidState.running = false;
  }
}

async function afterSewaPaid() {
  const ps = paidState.pendingSewa;
  if (!ps) { paidState.running = false; return; }

  log(`[SEWA] Verifikasi & kirim notifikasi...`);

  try {
    const res = await fetch(`${API_BASE}/api/sewa-activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: paidState.transactionId,
        accessKey: paidState.accessKey,
        packageId: ps.packageId,
        groupLink: ps.groupLink,
        targetNumber: ps.targetNumber,
        bonusNumbers: ps.bonusNumbers
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Aktivasi gagal.');

    showMessage($('msgBoxSewa'), 'success',
      `✅ ${ps.packageName} berhasil diproses! Notifikasi sudah dikirim ke admin.`);

    log(`[SEWA] ✅ ${ps.packageName} aktif — ${data.days} hari`);

    saveSewaToHistory({
      orderId: paidState.orderId,
      packageName: ps.packageName,
      category: ps.category,
      days: data.days,
      groupLink: ps.groupLink,
      targetNumber: ps.targetNumber,
      bonusNumbers: ps.bonusNumbers,
      amount: paidState.totalAmount,
      date: new Date().toISOString(),
      expiresAt: data.expiresAt
    });

    setTimeout(() => {
      resetSewaForm();
      clearPendingTx();
      renderSewaList();
    }, 800);

  } catch (err) {
    log(`[SEWA] ❌ ${err.message}`);
    showMessage($('msgBoxSewa'), 'error', err.message);
  } finally {
    paidState.running = false;
    paidState.pendingSewa = null;
    paidState.transactionId = null;
    paidState.accessKey = null;
  }
}

// ════════════════════════════════════════════════════════════
//  LIST GRUP SEWA
// ════════════════════════════════════════════════════════════
function loadSewaList() {
  try {
    const raw = localStorage.getItem(SEWA_LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}
function saveSewaToHistory(entry) {
  try {
    const list = loadSewaList();
    list.unshift(entry);
    if (list.length > 50) list.length = 50;
    localStorage.setItem(SEWA_LIST_KEY, JSON.stringify(list));
  } catch (_) {}
}
function renderSewaList() {
  const box = $('sewaListContent');
  if (!box) return;
  const list = loadSewaList();

  if (!list.length) {
    box.innerHTML = `
      <div class="sewa-list-empty">
        <i class="fas fa-inbox"></i>
        <div>Belum ada riwayat sewa</div>
        <span>Riwayatnya bakal muncul di sini setelah kamu sewa.</span>
      </div>`;
    return;
  }

  box.innerHTML = list.map((item) => {
    const date = new Date(item.date).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const expires = item.expiresAt
      ? new Date(item.expiresAt).toLocaleDateString('id-ID', {
          day: 'numeric', month: 'short', year: 'numeric'
        })
      : '-';

    let linkHtml = '';
    if (item.category === 'PREMIUM') {
      linkHtml = `<div class="sewa-list-row"><span>Target</span><b>${item.targetNumber || '-'}</b></div>`;
    } else {
      linkHtml = `<div class="sewa-list-row"><span>Link Grup</span><b><a href="${item.groupLink}" target="_blank">${item.groupLink || '-'}</a></b></div>`;
      if (Array.isArray(item.bonusNumbers) && item.bonusNumbers.length) {
        linkHtml += `<div class="sewa-list-row"><span>Bonus</span><b>${item.bonusNumbers.join(', ')}</b></div>`;
      }
    }

    return `
      <div class="sewa-list-item">
        <div class="sewa-list-head">
          <span class="sewa-list-badge">${item.category}</span>
          <span class="sewa-list-date">${date}</span>
        </div>
        <div class="sewa-list-title">${item.packageName}</div>
        ${linkHtml}
        <div class="sewa-list-row"><span>Durasi</span><b>${item.days} hari</b></div>
        <div class="sewa-list-row"><span>Expired</span><b>${expires}</b></div>
        <div class="sewa-list-row"><span>Total</span><b>${formatRp(item.amount)}</b></div>
      </div>`;
  }).join('');
}
window.toggleSewaList = function() {
  const box = $('sewaListBox');
  const icon = $('sewaListToggleIcon');
  if (!box) return;
  const isHidden = box.style.display === 'none' || !box.style.display;
  box.style.display = isHidden ? 'block' : 'none';
  if (icon) icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
  if (isHidden) renderSewaList();
};
renderSewaList();

// ════════════════════════════════════════════════════════════
//  DONASI DINAMIS
// ════════════════════════════════════════════════════════════
const MIN_DONATE = 1000;
const MAX_DONATE = 10000000;

function parseDonateAmount() {
  const raw = ($('donateAmount')?.value || '').replace(/\D/g, '');
  return parseInt(raw, 10) || 0;
}

function formatRibuan(str) {
  const digits = String(str || '').replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
}

window.setDonateAmount = function(n) {
  const el = $('donateAmount');
  if (!el) return;
  el.value = Number(n).toLocaleString('id-ID');
  hideMessage($('msgBoxDonate'));
  el.focus();
  try { el.setSelectionRange(el.value.length, el.value.length); } catch (_) {}
};

(function initDonateInput() {
  const el = $('donateAmount');
  if (!el) return;

  el.addEventListener('input', (e) => {
    const before = e.target.value;
    const cursor = e.target.selectionStart || before.length;
    const digitsBefore = before.slice(0, cursor).replace(/\D/g, '').length;
    const formatted = formatRibuan(before);
    e.target.value = formatted;

    let pos = 0, count = 0;
    while (pos < formatted.length && count < digitsBefore) {
      if (/\d/.test(formatted[pos])) count++;
      pos++;
    }
    try { e.target.setSelectionRange(pos, pos); } catch (_) {}

    hideMessage($('msgBoxDonate'));
  });

  el.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      $('donatePayBtn')?.click();
    }
  });
})();

if ($('donatePayBtn')) $('donatePayBtn').addEventListener('click', async () => {
  if (paidState.running) return;

  const amt = parseDonateAmount();
  if (!amt || amt < MIN_DONATE) {
    showMessage($('msgBoxDonate'), 'error', `Minimal donasi Rp ${MIN_DONATE.toLocaleString('id-ID')} ya 🙏`);
    return;
  }
  if (amt > MAX_DONATE) {
    showMessage($('msgBoxDonate'), 'error', 'Nominal terlalu besar.');
    return;
  }

  hideMessage($('msgBoxDonate'));

  const btn = $('donatePayBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Membuat QRIS...';

  paidState.mode = 'donasi';
  paidState.running = true;
  paidState.paid = false;
  paidState.count = 1;
  paidState.pricePerUnit = amt;
  paidState.pendingEmail = null;
  paidState.pendingSewa = null;

  log(`[DONASI] Buat QRIS — ${formatRp(amt)}`);

  try {
    const res = await fetch(`${API_BASE}/api/create-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'donasi', amount: amt })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gagal buat QRIS.');

    paidState.transactionId = data.transactionId;
    paidState.accessKey     = data.accessKey;
    paidState.orderId       = data.orderId;
    paidState.totalAmount   = data.totalAmount;

    savePendingTx({
      transactionId: data.transactionId, accessKey: data.accessKey,
      mode: 'donasi', count: 1, pricePerUnit: amt,
      totalAmount: data.totalAmount, orderId: data.orderId,
      qrisString: data.qrisString || '', qrisImage: data.qrisImage || '',
      expiredAt: data.expiredAt, paid: false, generated: false
    });

    closeDonate();
    showPayModal(data, 'donasi');
    startPayCountdown(data.expiredAt);
    startPayPolling();
    log(`[DONASI] ✅ QRIS siap — ${formatRp(data.totalAmount)}`);
  } catch (err) {
    log(`[DONASI] ❌ ${err.message}`);
    showMessage($('msgBoxDonate'), 'error', err.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-heart"></i> Donasi Sekarang';
    paidState.running = false;
  }
});

async function afterDonatePaid() {
  const amt = paidState.totalAmount || paidState.pricePerUnit || 0;
  log(`[DONASI] 💛 Terima kasih! Donasi ${formatRp(amt)} diterima.`);

  try {
    await fetch(`${API_BASE}/api/donasi-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: paidState.orderId,
        transactionId: paidState.transactionId,
        amount: amt
      })
    });
  } catch (_) {}

  paidState.running = false;
  paidState.transactionId = null;
  paidState.accessKey = null;
  clearPendingTx();
}

// ── CONFIRM MODAL ───────────────────────────────────────────
function openConfirmModal(opts) {
  if (confirmQtyEl)   confirmQtyEl.textContent   = opts.qtyLabel;
  if (confirmTotalEl) confirmTotalEl.textContent = formatRp(opts.total);
  if (confirmProductEl && opts.product) confirmProductEl.textContent = opts.product;
  if (confirmPayBtn)  confirmPayBtn.innerHTML    = `<i class="fas fa-check"></i> Ya, Bayar ${formatRp(opts.total)}`;
  if (confirmModal)   confirmModal.classList.add('show');
  log(`[KONFIRMASI] ${opts.qtyLabel} — ${formatRp(opts.total)}`);
}
window.closeConfirmModal = function() {
  if (confirmModal) confirmModal.classList.remove('show');
};

// ── MANUAL ──────────────────────────────────────────────────
if (sendBtn) sendBtn.addEventListener('click', () => {
  if (paidState.running) return;
  const email = emailInput ? emailInput.value.trim() : '';
  if (!email || !email.includes('@')) {
    showMessage(msgBox, 'error', 'Isi email yang valid dulu ya.');
    if (emailInput) emailInput.focus();
    return;
  }
  hideMessage(msgBox);
  paidState.mode = 'manual';
  paidState.pendingEmail = email;
  paidState.count = 1;
  paidState.pricePerUnit = PRICE_MANUAL;
  openConfirmModal({
    qtyLabel: '1 akun (email pribadi)',
    total: PRICE_MANUAL,
    product: 'Alight Motion Premium'
  });
});

// ── AUTO ────────────────────────────────────────────────────
if (paidPayBtn) paidPayBtn.addEventListener('click', () => {
  if (paidState.running) return;
  const count = clampQty(paidCountEl?.value);
  const total = count * PRICE_AUTO;
  paidState.mode = 'auto';
  paidState.pendingEmail = null;
  paidState.count = count;
  paidState.pricePerUnit = PRICE_AUTO;
  openConfirmModal({
    qtyLabel: `${count} akun (email dari web)`,
    total,
    product: 'Alight Motion Premium'
  });
});

// ── KONFIRMASI BAYAR ────────────────────────────────────────
if (confirmPayBtn) confirmPayBtn.addEventListener('click', async () => {
  closeConfirmModal();
  const mode = paidState.mode || 'auto';

  if (mode === 'sewa') {
    return startSewaPayment();
  }

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
    paidState.orderId = data.orderId;
    paidState.totalAmount = data.totalAmount;

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

// ── PAY MODAL ───────────────────────────────────────────────
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
  let productText = '1 akun (email pribadi)';
  if (mode === 'auto')   productText = `${qty} akun (email web)`;
  if (mode === 'sewa')   productText = paidState.pendingSewa?.packageName || 'Sewa Bot';
  if (mode === 'donasi') productText = 'Donasi MAS REY';
  if (productEl) productEl.textContent = productText;

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

  let productText = '1 akun (email pribadi)';
  if (mode === 'auto')   productText = `${tx.count || 1} akun (email web)`;
  if (mode === 'sewa')   productText = paidState.pendingSewa?.packageName || 'Sewa Bot';
  if (mode === 'donasi') productText = 'Donasi MAS REY';
  if (produkEl) produkEl.textContent = productText;

  if (orderIdEl) orderIdEl.textContent = tx.orderId || tx.transactionId || '—';

  if (noteEl) {
    if (mode === 'manual') {
      noteEl.style.display = 'flex';
      noteEl.innerHTML = '<i class="fas fa-hourglass-half"></i><span>Buka Gmail kamu &amp; paste magic link dalam <b>5 menit</b></span>';
    } else if (mode === 'sewa') {
      noteEl.style.display = 'flex';
      noteEl.innerHTML = '<i class="fas fa-paper-plane"></i><span>Notifikasi otomatis dikirim ke admin. Bot akan segera diproses.</span>';
    } else if (mode === 'donasi') {
      noteEl.style.display = 'flex';
      noteEl.innerHTML = '<i class="fas fa-hands-heart"></i><span>Terima kasih atas donasinya! Semoga dibalas berlipat ganda 🙏</span>';
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

        showPaySuccessState({
          totalAmount: data.totalAmount || paidState.totalAmount,
          orderId: paidState.orderId,
          transactionId: paidState.transactionId,
          count: paidState.count
        }, paidState.mode);

        log('[PAY] ✅ Pembayaran sukses — ' + formatRp(data.totalAmount || paidState.totalAmount || 0));

        setTimeout(() => {
          closePayModal();
          if (paidState.mode === 'manual')       afterManualPaid();
          else if (paidState.mode === 'sewa')    afterSewaPaid();
          else if (paidState.mode === 'donasi')  afterDonatePaid();
          else                                    runPaidGenerate();
        }, 3500);
      } else if (data.expired || data.cancelled) {
        stopPayPolling();
        stopPayCountdown();
        clearPendingTx();
        const st = $('payStatus');
        if (st) {
          st.className = 'pay-status expired';
          st.innerHTML = data.expired
            ? '<i class="fas fa-circle-exclamation"></i> QRIS kadaluarsa.'
            : '<i class="fas fa-xmark"></i> Transaksi dibatalkan.';
        }
      }
    } catch (_) {}
  }, 3000);
}
function stopPayPolling() { if (paidState.pollTimer) { clearInterval(paidState.pollTimer); paidState.pollTimer = null; } }

// ── CANCEL PAY ──────────────────────────────────────────────
window.cancelPayModal = async function() {
  if (paidState.paid) { closePayModal(); return; }

  const savedMode = paidState.mode;

  if (paidState.transactionId) {
    fetch(`${API_BASE}/api/cancel-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: paidState.transactionId })
    }).catch(() => {});
  }

  stopPayPolling();
  stopPayCountdown();
  closePayModal();
  clearPendingTx();

  if (savedMode === 'manual') {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Beli Sekarang Rp 3.000';
    }
  } else if (savedMode === 'sewa') {
    if ($('sewaPayBtn')) updateSewaSummary();
  } else if (savedMode === 'donasi') {
    const db = $('donatePayBtn');
    if (db) {
      db.disabled = false;
      db.innerHTML = '<i class="fas fa-heart"></i> Donasi Sekarang';
    }
  } else {
    const count = clampQty(paidCountEl?.value);
    if (paidPayBtn) {
      paidPayBtn.disabled = false;
      paidPayBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Beli <span id="paidBtnQty">${count}</span> Akun Sekarang`;
    }
  }

  paidState.running = false;
  paidState.transactionId = null;
  paidState.accessKey = null;

  log('[PAY] Transaksi dibatalkan oleh user.');
  showCancelModal();
};

function showCancelModal() {
  const m = $('cancelModal');
  if (m) m.classList.add('show');
}
window.closeCancelModal = function() {
  const m = $('cancelModal');
  if (m) m.classList.remove('show');
};
window.retryFromCancel = function() {
  closeCancelModal();
  if (paidState.mode === 'manual') {
    const el = $('sendBtn');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (emailInput) emailInput.focus();
  } else if (paidState.mode === 'sewa') {
    const el = $('sewaPayBtn');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (paidState.mode === 'donasi') {
    // tidak ada scroll khusus, biar user buka lagi modalnya
  } else {
    const el = $('paidPayBtn');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

// ════════════════════════════════════════════════════════════
//  MANUAL — After payment
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
//  VERIF TIMER
// ════════════════════════════════════════════════════════════
function startVerifTimer() {
  stopVerifTimer();
  const endTime = Date.now() + VERIF_TIMEOUT;
  paidState.verifExpiredAt = endTime;
  runVerifTick(endTime);
}
function startVerifTimerFromEnd(endTime) {
  stopVerifTimer();
  paidState.verifExpiredAt = endTime;
  runVerifTick(endTime);
}
function runVerifTick(endTime) {
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
function stopVerifTimer() {
  if (paidState.verifTimer) {
    cancelAnimationFrame(paidState.verifTimer);
    paidState.verifTimer = null;
  }
}
function lockVerification() {
  log('[VERIF] ⏱️ Waktu habis — verifikasi terkunci.');
  if (magicInput)   { magicInput.disabled = true; magicInput.placeholder = 'Waktu habis, silakan beli lagi'; }
  if (activateBtn)  { activateBtn.disabled = true; }
  if (btnText)      { btnText.innerHTML = 'Waktu Habis'; }
  if (verifExpiredBtn) verifExpiredBtn.style.display = 'flex';

  showMessage(msgBox2, 'error', 'Waktu verifikasi 5 menit sudah habis. Beli lagi buat dapetin akun baru.');
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

if (verifExpiredBtn) verifExpiredBtn.addEventListener('click', () => {
  showManualBuyState();
  if (emailInput) emailInput.value = '';
  hideMessage(msgBox); hideMessage(msgBox2);
  log('[UI] Reset — silakan beli akun baru.');
});

// ════════════════════════════════════════════════════════════
//  AUTO — Generate
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
if (magicInput) magicInput.addEventListener('input', checkForm);

let isVerifying = false;

async function doVerify(link) {
  if (isVerifying) return;

  if (paidState.verifExpiredAt && Date.now() >= paidState.verifExpiredAt) {
    showMessage(msgBox2, 'error', 'Waktu verifikasi sudah habis. Beli lagi ya.');
    lockVerification();
    return;
  }
  if (!verifSession.active || !verifSession.jobId) {
    showMessage(msgBox2, 'error', 'Sesi gak valid.'); return;
  }
  if (!link || !link.startsWith('http')) {
    showMessage(msgBox2, 'error', 'Link-nya harus URL lengkap.'); return;
  }

  isVerifying = true;
  hideMessage(msgBox2);
  if (activateBtn) activateBtn.disabled = true;
  if (btnText) btnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
  log(`[VERIF] Memverifikasi magic link untuk ${verifSession.email}...`);
  showMessage(msgBox2, 'info', 'Sedang verifikasi & aktifin premium...');

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

    stopVerifTimer();
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
  log('[UI] Form direset.');
};

// ════════════════════════════════════════════════════════════
//  RESUME
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
  paidState.pendingSewa   = tx.pendingSewa || null;

  if (tx.mode === 'auto')        switchMode('auto');
  else if (tx.mode === 'sewa')   switchMode('sewa');
  else if (tx.mode === 'donasi') { /* modal-based, tidak ada tab */ }
  else                            switchMode('manual');

  const expiredAt = tx.expiredAt ? new Date(tx.expiredAt).getTime() : (tx.savedAt + 15*60*1000);
  if (Date.now() >= expiredAt && !tx.paid) {
    log('[RESUME] ⚠️ expired, hapus state.');
    clearPendingTx();
    paidState.running = false;
    return;
  }

  if (tx.paid && !tx.generated) {
    if (tx.mode === 'donasi') {
      log('[RESUME] 💛 Donasi sudah lunas.');
      clearPendingTx();
      paidState.running = false;
      return;
    }
    log('[RESUME] ✅ Sudah paid, melanjutkan...');
    setTimeout(() => {
      if (tx.mode === 'manual') afterManualPaid();
      else if (tx.mode === 'sewa') afterSewaPaid();
      else runPaidGenerate(true);
    }, 1000);
    return;
  }

  if (tx.mode === 'manual' && tx.paid && tx.generated && tx.pendingEmail) {
    log('[RESUME] 📩 Lanjut ke form paste magic link...');
    verifSession.email = tx.pendingEmail;
    verifSession.jobId = btoa(tx.pendingEmail);
    verifSession.active = true;

    const savedTime = tx.paidAt || tx.savedAt;
    const elapsed = Date.now() - savedTime;
    const remaining = VERIF_TIMEOUT - elapsed;

    if (remaining <= 0) {
      showManualVerifSection(tx.pendingEmail);
      stopVerifTimer();
      if (verifCountdown) verifCountdown.textContent = '00:00';
      if (verifTimer) verifTimer.classList.add('expired');
      lockVerification();
    } else {
      const endTime = Date.now() + remaining;
      startVerifTimerFromEnd(endTime);
      showManualVerifSection(tx.pendingEmail);
    }
    return;
  }

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

window.addEventListener('load', () => {
  setTimeout(() => log('[READY] Sistem siap.'), 2500);
});