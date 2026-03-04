# Deployment Guide - Crypto Tracker v3.1

## 🚀 Deploy to refatishere.free.nf

### Prerequisites
- FTP/File Manager access to your web hosting
- No server-side requirements needed
- No database setup required

---

## 📦 Step 1: Prepare Files

Ensure your project structure is:
```
Crypto_Exchange_Viewer/
├── crypto.html
├── backend/
│   └── api.php (PHP backend for Binance API)
├── src/
│   ├── css/
│   │   └── main.css
│   └── js/
│       ├── core/
│       │   └── app.js
│       └── services/
│           ├── api.js (Binance API client)
│           └── config.js
├── docs/ (optional)
├── README.md
└── LICENSE
```

---

## 🌐 Step 2: Upload to Website

### Option A: Via FTP Client (FileZilla, WinSCP)

1. Connect to your hosting:
   - Host: `ftp.refatishere.free.nf`
   - Username: Your hosting username
   - Password: Your hosting password

2. Navigate to `public_html` or `htdocs`

3. Create folder: `crypto`

4. Upload entire `Crypto_Exchange_Viewer` contents to `/crypto/`

### Option B: Via cPanel File Manager

1. Login to cPanel
2. Open File Manager
3. Navigate to `public_html`
4. Click "Upload"
5. Select all files from `Crypto_Exchange_Viewer` folder
6. Upload and extract if zipped

---

## 🔗 Step 3: Set File Permissions

Set permissions via FTP or File Manager:
- **Files** (HTML, CSS, JS, PHP): `644`
- **Folders**: `755`
- **backend/api.php**: `644` (important!)

---

## 🧪 Step 4: Test Deployment

1. Open browser and visit:
   ```
   https://refatishere.free.nf/crypto/crypto.html
   ```

2. Open Developer Console (F12) and check:
   - ✅ No 404 errors
   - ✅ WebSocket connected
   - ✅ Chart.js loaded
   - ✅ CSS applied correctly

3. Test features:
   - ✅ Price ticker scrolling
   - ✅ Market data displaying
   - ✅ Charts loading
   - ✅ Theme toggle working
   - ✅ All tabs functional

---

## 🔗 Step 5: Add to Main Website

Add navigation link to your main site:

```html
<!-- In your main website navigation -->
<nav>
  <a href="/crypto/crypto.html">Crypto Tracker</a>
</nav>
```

Or create a button:
```html
<a href="/crypto/crypto.html" class="btn">
  📊 Live Crypto Tracker
</a>
```

---

## 📱 Step 6: Mobile Optimization (Optional)

The app is already responsive, but verify:
1. Test on mobile devices
2. Check viewport meta tag is present
3. Verify touch interactions work

---

## 🔍 Step 7: SEO & Sitemap (Optional)

Add to `sitemap.xml`:
```xml
<url>
  <loc>https://refatishere.free.nf/crypto/crypto.html</loc>
  <lastmod>2024-01-01</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
```

---

## 🛠️ Troubleshooting

### Issue: Blank Page
**Solution:** Check browser console for errors. Verify all file paths are correct.

### Issue: WebSocket Not Connecting
**Solution:** Ensure HTTPS is enabled. Binance WebSocket requires secure connection.

### Issue: Charts Not Loading
**Solution:** Verify Chart.js CDN is accessible. Check internet connection.

### Issue: CSS Not Applied
**Solution:** Check file path in `<link>` tag. Verify CSS file uploaded correctly.

### Issue: 404 Errors
**Solution:** Verify folder structure matches exactly. Check file permissions.

---

## 📊 Access URLs

After deployment, access at:
- **Main App:** `https://refatishere.free.nf/crypto/crypto.html`
- **Direct Link:** `https://refatishere.free.nf/crypto/`

---

## 🔒 Security Notes

- ✅ All data stored locally (localStorage)
- ✅ PHP backend for Binance API (bypasses CORS)
- ✅ API keys sent via POST (not stored on server)
- ✅ `X-API-Token` required for backend requests
- ✅ Configure `ALLOWED_ORIGINS` and `API_TOKEN_LEGACY` for `/api/*`
- ✅ Configure `ALLOWED_ORIGINS` and `API_TOKEN_CRYPTO` for `/crypto/backend/*`
- ✅ Use testnet for API testing
- ⚠️ Never share API keys publicly
- ⚠️ Enable HTTPS for production
---

## 📈 Performance Tips

1. Enable GZIP compression on server
2. Set browser caching headers
3. Use CDN for Chart.js (already implemented)
4. Minify CSS/JS for production (optional)

---

## 🎉 Success!

Your Crypto Tracker is now live at:
**https://refatishere.free.nf/crypto/crypto.html**

Share it with the world! 🚀

---

## 📞 Support

For issues or questions:
- Check browser console (F12)
- Review documentation in `/docs/`
- Verify all files uploaded correctly

---

**Last Updated:** 2026-02-25
**Version:** 3.1.0




