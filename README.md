# Alight Motion Premium Generator

Frontend + serverless backend untuk generate Alight Motion Premium.

## Struktur
- `index.html` — frontend UI
- `api/*.js` — Vercel serverless functions
- `netlify/functions/*.js` — Netlify (mirror dari api/)

## ENV Variables (WAJIB diisi)
Set di dashboard Vercel / Netlify:

| Key | Value |
|-----|-------|
| `GOOGLE_API_KEY` | API key Firebase dari Alight Motion |
| `AM_TOKEN` | Token purchase Alight Motion |
| `AM_PRODUCT_ID` | `am.full.sub.annual.19q4` |
| `AM_ORDER_ID` | `POWERED-BY-BARIKZ` |
| `FIREBASE_IID` | Firebase Instance ID token |

## Deploy ke Vercel
1. Push project ke GitHub
2. Import ke vercel.com/new
3. Set ENV di Settings → Environment Variables
4. Deploy

## Deploy ke Netlify
1. Push project ke GitHub
2. Import ke app.netlify.com
3. Build command: (kosongkan)
4. Publish directory: `.`
5. Functions directory: `netlify/functions`
6. Set ENV di Site settings → Environment
7. Deploy

## Catatan
- Vercel/Netlify free tier: function max 10 detik
- Bulk mode 1 request = 1 akun biar gak timeout
- Polling inbox jalan di client-side (interval 2.5s)
