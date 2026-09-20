const axios  = require('axios');
const crypto = require('crypto');

class AlightMotionAuth {
  constructor() {
    this.API_KEY    = 'AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0';
    this.PRODUCT_ID = 'am.full.sub.annual.19q4';
    this.SKU_TYPE   = 'subs';
    this.ORDER_ID   = 'AKU-MAS-REY-LO';
    this.PURCHASE_TOKEN = 'mmgaobamlahbbeccfplmbkbb.AO-J1OzqG0or_GJJIx-ms8GrTm-jaglCRfhQSRPUZKpl2YspYS-oN7_94uv8RC5vQbvd_Ios2pPDStZ2n7F0hLE3FiOU7HS3R6Fquulv5xLXFECSv4ctElw';
    this.FIREBASE_IID   = 'cSDnCyp3T-uwp07z3tL86T:APA91bFkmvvsHw5nnqa1SBFci-99DRsKClLiETdRrVcJjS5yBx1v_FbCb1d8WhBuea_zmwnYBktyTIzcRhN4b6uNOUur9wPc0gKXmJDoZic0LhNq5V2s0xI';
    this.ANDROID_HEADERS = {
      'Content-Type': 'application/json',
      'X-Android-Package': 'com.alightcreative.motion',
      'X-Android-Cert': 'ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8',
      'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 15; 23127PN0CC Build/BP1A.250505.005)',
    };
    this.IDENTITY_BASE = 'https://www.googleapis.com/identitytoolkit/v3/relyingparty';
    this.VERIFY_PURCHASE_URL = 'https://us-central1-alight-creative.cloudfunctions.net/verifyPurchase';
  }

  _genOrderCode() { return crypto.randomInt(10000, 99999).toString(); }

  _cleanErr(error) {
    if (error.response?.data) {
      const d = error.response.data;
      if (typeof d === 'object') return d.error?.message || d.message || JSON.stringify(d);
      return String(d);
    }
    return error.message || 'Unknown error';
  }

  async sendMagicLink(email) {
    try {
      if (!email || !email.includes('@')) return { success: false, error: 'Email tidak valid.' };
      const cleanEmail = email.trim().toLowerCase();
      await axios.post(`${this.IDENTITY_BASE}/createAuthUri?key=${this.API_KEY}`,
        { identifier: cleanEmail, continueUri: 'http://localhost' },
        { headers: this.ANDROID_HEADERS, timeout: 15000 });
      await axios.post(`${this.IDENTITY_BASE}/getOobConfirmationCode?key=${this.API_KEY}`,
        {
          requestType: 'EMAIL_SIGNIN', email: cleanEmail, androidInstallApp: true, canHandleCodeInApp: true,
          continueUrl: 'https://alightcreative.com?ui_sid=0366624874&ui_sd=0',
          iosBundleId: 'com.alightcreative.motion', androidPackageName: 'com.alightcreative.motion',
          androidMinimumVersion: '585', clientType: 'CLIENT_TYPE_ANDROID',
        }, { headers: this.ANDROID_HEADERS, timeout: 15000 });
      return { success: true, message: 'Magic Link berhasil dikirim.' };
    } catch (error) { return { success: false, error: this._cleanErr(error) }; }
  }

  extractOobCode(rawUrl) {
    if (!rawUrl) return null;
    try {
      let url = rawUrl.replace(/&amp;/g, '&');
      try { url = decodeURIComponent(url); } catch (_) {}
      try {
        const u = new URL(url);
        let oob = u.searchParams.get('oobCode');
        if (oob) return oob.replace(/[^a-zA-Z0-9_-]/g, '');
        const nested = u.searchParams.get('link') || u.searchParams.get('q') || u.searchParams.get('url');
        if (nested) {
          try {
            const inner = new URL(nested);
            oob = inner.searchParams.get('oobCode');
            if (oob) return oob.replace(/[^a-zA-Z0-9_-]/g, '');
          } catch (_) {}
        }
      } catch (_) {}
      const m = url.match(/[?&]oobCode=([a-zA-Z0-9_-]+)/i) || url.match(/oobCode=([a-zA-Z0-9_-]+)/i);
      if (m?.[1]) return m[1].replace(/[^a-zA-Z0-9_-]/g, '');
      return null;
    } catch (_) { return null; }
  }

  async verifyAndFetchProfile(email, rawLink) {
    try {
      const oobCode = this.extractOobCode(rawLink);
      if (!oobCode) return { success: false, error: 'oobCode tidak ditemukan di link.' };
      const cleanEmail = email.trim().toLowerCase();
      const signinRes = await axios.post(`${this.IDENTITY_BASE}/emailLinkSignin?key=${this.API_KEY}`,
        { email: cleanEmail, oobCode, clientType: 'CLIENT_TYPE_ANDROID' },
        { headers: this.ANDROID_HEADERS, timeout: 15000 });
      const idToken = signinRes.data?.idToken;
      if (!idToken) return { success: false, error: 'Gagal mendapatkan idToken.' };
      let user = null;
      try {
        const accRes = await axios.post(`${this.IDENTITY_BASE}/getAccountInfo?key=${this.API_KEY}`,
          { idToken }, { headers: this.ANDROID_HEADERS, timeout: 15000 });
        user = accRes.data?.users?.[0] || null;
      } catch (_) {}
      return { success: true, idToken, user, email: cleanEmail };
    } catch (error) { return { success: false, error: this._cleanErr(error) }; }
  }

  async applyPremium(idToken) {
    try {
      const orderCode = this._genOrderCode();
      const orderId = `${this.ORDER_ID}-${orderCode}`;
      const headers = {
        authorization: `Bearer ${idToken}`,
        'firebase-instance-id-token': this.FIREBASE_IID,
        'content-type': 'application/json; charset=utf-8',
        'accept-encoding': 'gzip', 'user-agent': 'okhttp/3.12.1',
      };
      const response = await axios.post(this.VERIFY_PURCHASE_URL,
        { data: { productId: this.PRODUCT_ID, token: this.PURCHASE_TOKEN, skuType: this.SKU_TYPE, orderId } },
        { headers, timeout: 20000 });
      return { success: true, data: response.data, codeorder: orderCode, orderId };
    } catch (error) { return { success: false, error: this._cleanErr(error) }; }
  }
}

module.exports = AlightMotionAuth;
