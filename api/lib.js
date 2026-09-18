// api/_lib.js
const axios = require('axios');
const crypto = require('crypto');

const CONFIG = {
  API_KEY: process.env.GOOGLE_API_KEY || '',
  PRODUCT_ID: process.env.AM_PRODUCT_ID || 'am.full.sub.annual.19q4',
  AM_TOKEN: process.env.AM_TOKEN || '',
  ORDER_ID: process.env.AM_ORDER_ID || 'POWERED-BY-BARIKZ',
  FIREBASE_INSTANCE_ID_TOKEN: process.env.FIREBASE_IID || '',
  SKU_TYPE: 'subs',
};

const HEADERS = {
  'Content-Type': 'application/json',
  'X-Android-Package': 'com.alightcreative.motion',
  'X-Android-Cert': 'ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8',
  'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 15; 23127PN0CC Build/BP1A.250505.005)',
};

// ---------- CORS helper ----------
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function handlePreflight(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

// ---------- Alight Motion functions ----------
async function sendMagicLink(email) {
  if (!CONFIG.API_KEY) throw new Error('GOOGLE_API_KEY belum di-set di env');

  await axios.post(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/createAuthUri?key=${CONFIG.API_KEY}`,
    { identifier: email, continueUri: 'http://localhost' },
    { headers: HEADERS }
  );

  await axios.post(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobConfirmationCode?key=${CONFIG.API_KEY}`,
    {
      requestType: 6,
      email: email,
      androidInstallApp: true,
      canHandleCodeInApp: true,
      continueUrl: 'https://alightcreative.com?ui_sid=0366624874&ui_sd=0',
      iosBundleId: 'com.alightcreative.motion',
      androidPackageName: 'com.alightcreative.motion',
      androidMinimumVersion: '585',
      clientType: 'CLIENT_TYPE_ANDROID',
    },
    { headers: HEADERS }
  );

  return { success: true, message: 'Magic link terkirim ke ' + email };
}

function extractOobCode(fullUrl) {
  if (!fullUrl) return null;
  try {
    let cleanUrl = fullUrl.replace(/&amp;/g, '&');
    try { cleanUrl = decodeURIComponent(cleanUrl); } catch (e) {}

    try {
      const urlObj = new URL(cleanUrl);
      let oobCode = urlObj.searchParams.get('oobCode');
      if (!oobCode) {
        const nested = urlObj.searchParams.get('link') || urlObj.searchParams.get('q') || urlObj.searchParams.get('url');
        if (nested) {
          try {
            const inner = new URL(nested);
            oobCode = inner.searchParams.get('oobCode');
          } catch (e) {}
        }
      }
      if (oobCode) return oobCode.replace(/[^a-zA-Z0-9_-]/g, '');
    } catch (e) {}

    const m = cleanUrl.match(/[?&]oobCode=([a-zA-Z0-9_-]+)/i) || cleanUrl.match(/oobCode=([a-zA-Z0-9_-]+)/i);
    return m ? m[1] : null;
  } catch (e) {
    return null;
  }
}

async function verifyAndFetchProfile(email, rawLink) {
  if (!CONFIG.API_KEY) throw new Error('GOOGLE_API_KEY belum di-set');
  const oobCode = extractOobCode(rawLink);
  if (!oobCode) throw new Error('Gagal extract oobCode dari link');

  const signinRes = await axios.post(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/emailLinkSignin?key=${CONFIG.API_KEY}`,
    { email, oobCode, clientType: 'CLIENT_TYPE_ANDROID' },
    { headers: HEADERS }
  );

  const accountRes = await axios.post(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${CONFIG.API_KEY}`,
    { idToken: signinRes.data.idToken },
    { headers: HEADERS }
  );

  return {
    success: true,
    idToken: signinRes.data.idToken,
    user: accountRes.data.users[0],
  };
}

async function applyPremium(idToken) {
  if (!CONFIG.AM_TOKEN) throw new Error('AM_TOKEN belum di-set');
  if (!CONFIG.FIREBASE_INSTANCE_ID_TOKEN) throw new Error('FIREBASE_IID belum di-set');

  const codeorder = crypto.randomInt(10000, 99999).toString();
  const url = 'https://us-central1-alight-creative.cloudfunctions.net/verifyPurchase';

  const response = await axios.post(
    url,
    {
      data: {
        productId: CONFIG.PRODUCT_ID,
        token: CONFIG.AM_TOKEN,
        skuType: CONFIG.SKU_TYPE,
        orderId: `${CONFIG.ORDER_ID}-${codeorder}`,
      },
    },
    {
      headers: {
        authorization: 'Bearer ' + idToken,
        'firebase-instance-id-token': CONFIG.FIREBASE_INSTANCE_ID_TOKEN,
        'content-type': 'application/json; charset=utf-8',
        'accept-encoding': 'gzip',
        'user-agent': 'okhttp/3.12.1',
      },
    }
  );

  return { success: true, data: response.data, codeorder };
}

// ---------- Emailnator (temp mail) ----------
const EN_HEADERS = {
  accept: 'application/json',
  'content-type': 'application/json',
  origin: 'https://emailnator.com',
  referer: 'https://emailnator.com/',
  'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
};

async function emailnatorGenerate(variant = 'standard') {
  const idMap = { alias: 2, standard: 3, googlemail: 8 };
  const id = idMap[variant] || 3;

  const res = await axios.post(
    'https://emailnator.com/api/generate-email',
    { ids: [id] },
    { headers: EN_HEADERS }
  );
  return res.data;
}

async function emailnatorList(email, limit = 20) {
  const res = await axios.post(
    'https://emailnator.com/api/message-list',
    { email, limit },
    { headers: EN_HEADERS }
  );
  return res.data;
}

async function emailnatorGet(messageId) {
  const res = await axios.get(
    `https://emailnator.com/api/message/${encodeURIComponent(messageId)}`,
    { headers: EN_HEADERS }
  );
  return res.data;
}

// ---------- Extract link dari HTML email ----------
function extractLinks(html, plainText) {
  const links = [];
  if (html) {
    const regex = /href=["'](https?:\/\/[^"']+)["']/gi;
    let m;
    while ((m = regex.exec(html)) !== null) links.push(m[1].replace(/&amp;/g, '&'));
  }
  if (plainText) {
    const regex = /(https?:\/\/[^\s]+)/g;
    let m;
    while ((m = regex.exec(plainText)) !== null) {
      const clean = m[1].replace(/[,.)\]}]+$/, '');
      if (!links.includes(clean)) links.push(clean);
    }
  }
  return links;
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  cors,
  handlePreflight,
  sendMagicLink,
  verifyAndFetchProfile,
  applyPremium,
  emailnatorGenerate,
  emailnatorList,
  emailnatorGet,
  extractLinks,
  stripHtml,
  CONFIG,
};
