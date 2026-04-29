# 🧪 Skenario Testing dengan Firebase Emulator

Panduan praktis untuk testing semua fitur affiliate platform menggunakan emulator.

---

## 🎯 Persiapan

### 1. Start Emulator
```bash
npm run emulate
```

### 2. Start Dev Server (Terminal Baru)
```bash
npm run dev
```

### 3. Buka 3 Tab Browser
- Tab 1: **App** → http://localhost:3000
- Tab 2: **Emulator UI** → http://localhost:4000
- Tab 3: **Firestore Data** → http://localhost:4000/firestore

---

## 📋 Skenario 1: Testing Self-Referral Prevention

### Tujuan
Memastikan affiliate tidak bisa dapat komisi dari pembelian sendiri.

### Langkah Testing

#### 1. Buat Affiliate Account
```
Email: affiliate@test.com
Password: test123
Name: Test Affiliate
```

#### 2. Dapatkan Affiliate Code
- Login sebagai affiliate
- Copy affiliate code (misal: `AFF123`)

#### 3. Buat Purchase dengan Email Sama
- Buka link: `http://localhost:3000?ref=AFF123`
- Checkout dengan email: `affiliate@test.com`

#### 4. Cek di Emulator UI
**Collection: `fraudAlerts`**
```json
{
  "type": "self_referral",
  "affiliateId": "...",
  "buyerEmail": "affiliate@test.com",
  "severity": "high",
  "blocked": true,
  "timestamp": "2026-04-29T..."
}
```

#### 5. Cek Commission
**Collection: `commissions`**
```json
{
  "status": "blocked",
  "reason": "Self-referral detected"
}
```

### ✅ Expected Result
- ❌ Komisi TIDAK dibuat
- ✅ Fraud alert tercatat
- ✅ Purchase tetap berhasil (buyer dapat produk)

---

## 📋 Skenario 2: Testing Rate Limiting

### Tujuan
Memastikan sistem block spam clicks dari IP yang sama.

### Langkah Testing

#### 1. Buat Script Auto-Click
Buat file `test-rate-limit.js`:
```javascript
const axios = require('axios');

async function testRateLimit() {
  const affiliateCode = 'AFF123';
  
  for (let i = 1; i <= 150; i++) {
    try {
      await axios.get(`http://localhost:3000/api/track-click?ref=${affiliateCode}`);
      console.log(`Click ${i}: Success`);
    } catch (error) {
      console.log(`Click ${i}: Blocked - ${error.response?.status}`);
    }
    
    // Delay 100ms
    await new Promise(r => setTimeout(r, 100));
  }
}

testRateLimit();
```

#### 2. Jalankan Script
```bash
node test-rate-limit.js
```

#### 3. Cek Output
```
Click 1: Success
Click 2: Success
...
Click 100: Success
Click 101: Blocked - 429
Click 102: Blocked - 429
```

#### 4. Cek di Emulator UI
**Collection: `fraudAlerts`**
```json
{
  "type": "rate_limit_exceeded",
  "ip": "127.0.0.1",
  "clicks": 150,
  "limit": 100,
  "severity": "medium",
  "timestamp": "2026-04-29T..."
}
```

### ✅ Expected Result
- ✅ Click 1-100: Berhasil
- ❌ Click 101+: Diblock (HTTP 429)
- ✅ Fraud alert tercatat

---

## 📋 Skenario 3: Testing Tier Progression

### Tujuan
Memastikan affiliate auto-upgrade tier berdasarkan sales.

### Langkah Testing

#### 1. Buat Affiliate Baru
```
Email: newbie@test.com
Tier: Starter (default)
Commission Rate: 10%
```

#### 2. Cek Tier Requirements di Emulator
**Collection: `settings/affiliate_config`**
```json
{
  "tiers": {
    "starter": { "minSales": 0, "commissionRate": 10 },
    "bronze": { "minSales": 5, "commissionRate": 15 },
    "silver": { "minSales": 20, "commissionRate": 20 },
    "gold": { "minSales": 50, "commissionRate": 25 },
    "diamond": { "minSales": 100, "commissionRate": 30 }
  }
}
```

#### 3. Simulasi 5 Sales
Buat 5 purchases dengan affiliate code:
```bash
# Purchase 1
curl "http://localhost:3000/api/track-click?ref=NEWBIE123"
# Checkout...

# Purchase 2-5
# Repeat...
```

#### 4. Cek Tier di Emulator
**Collection: `users/{userId}`**
```json
{
  "email": "newbie@test.com",
  "tier": "bronze",  // ✅ Auto-upgraded!
  "commissionRate": 15,
  "totalSales": 5,
  "tierUpgradedAt": "2026-04-29T..."
}
```

#### 5. Lanjutkan ke 20 Sales
Setelah 20 sales total:
```json
{
  "tier": "silver",  // ✅ Upgraded lagi!
  "commissionRate": 20,
  "totalSales": 20
}
```

### ✅ Expected Result
- ✅ 0-4 sales: Starter (10%)
- ✅ 5-19 sales: Bronze (15%)
- ✅ 20-49 sales: Silver (20%)
- ✅ 50-99 sales: Gold (25%)
- ✅ 100+ sales: Diamond (30%)

---

## 📋 Skenario 4: Testing Commission Holding Period

### Tujuan
Memastikan komisi ditahan sesuai tier sebelum bisa ditarik.

### Langkah Testing

#### 1. Buat Purchase
```
Affiliate: starter@test.com (Starter tier)
Product: Digital Course ($100)
Commission: $10 (10%)
```

#### 2. Cek Status Komisi
**Collection: `commissions`**
```json
{
  "affiliateId": "...",
  "amount": 10,
  "status": "pending",
  "holdingPeriodDays": 14,  // Starter = 14 hari
  "availableAt": "2026-05-13T...",  // 14 hari dari sekarang
  "createdAt": "2026-04-29T..."
}
```

#### 3. Coba Request Payout (Sebelum Holding Period)
```bash
curl -X POST http://localhost:3000/api/request-payout \
  -H "Content-Type: application/json" \
  -d '{"affiliateId": "...", "amount": 10}'
```

**Response:**
```json
{
  "error": "Commission still in holding period",
  "availableAt": "2026-05-13T..."
}
```

#### 4. Simulasi Waktu (Manual di Emulator)
- Buka Emulator UI → Firestore
- Edit document `commissions/{id}`
- Ubah `availableAt` ke waktu sekarang

#### 5. Request Payout Lagi
```bash
curl -X POST http://localhost:3000/api/request-payout \
  -H "Content-Type: application/json" \
  -d '{"affiliateId": "...", "amount": 10}'
```

**Response:**
```json
{
  "success": true,
  "payoutId": "...",
  "status": "processing"
}
```

### ✅ Expected Result
- ❌ Payout sebelum holding period: Ditolak
- ✅ Payout setelah holding period: Berhasil
- ✅ Holding period berbeda per tier:
  - Starter: 14 hari
  - Bronze: 10 hari
  - Silver: 7 hari
  - Gold: 3 hari
  - Diamond: 0 hari (instant)

---

## 📋 Skenario 5: Testing Payout Priority

### Tujuan
Memastikan Diamond tier dapat instant payout, tier lain harus antri.

### Langkah Testing

#### 1. Buat 3 Payout Request Bersamaan
```javascript
// Starter tier
await requestPayout({ tier: 'starter', amount: 10 });

// Silver tier
await requestPayout({ tier: 'silver', amount: 20 });

// Diamond tier
await requestPayout({ tier: 'diamond', amount: 30 });
```

#### 2. Cek di Emulator UI
**Collection: `payouts`**

**Payout 1 (Starter):**
```json
{
  "tier": "starter",
  "amount": 10,
  "priority": "standard",
  "processingTime": "3-5 business days",
  "status": "pending"
}
```

**Payout 2 (Silver):**
```json
{
  "tier": "silver",
  "amount": 20,
  "priority": "priority",
  "processingTime": "1-2 business days",
  "status": "pending"
}
```

**Payout 3 (Diamond):**
```json
{
  "tier": "diamond",
  "amount": 30,
  "priority": "instant",
  "processingTime": "instant",
  "status": "completed",  // ✅ Langsung completed!
  "completedAt": "2026-04-29T..."
}
```

### ✅ Expected Result
- ✅ Diamond: Instant (langsung completed)
- ✅ Gold: Priority (1-2 hari)
- ✅ Silver: Priority (1-2 hari)
- ✅ Bronze: Standard (3-5 hari)
- ✅ Starter: Standard (3-5 hari)

---

## 📋 Skenario 6: Testing UTM Tracking

### Tujuan
Memastikan sistem track sumber traffic affiliate.

### Langkah Testing

#### 1. Buat Link dengan UTM Parameters
```
http://localhost:3000?ref=AFF123&utm_source=facebook&utm_medium=social&utm_campaign=summer_sale
```

#### 2. Klik Link & Checkout

#### 3. Cek di Emulator UI
**Collection: `clicks`**
```json
{
  "affiliateCode": "AFF123",
  "utmSource": "facebook",
  "utmMedium": "social",
  "utmCampaign": "summer_sale",
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2026-04-29T..."
}
```

**Collection: `purchases`**
```json
{
  "affiliateCode": "AFF123",
  "utmSource": "facebook",
  "utmMedium": "social",
  "utmCampaign": "summer_sale",
  "conversionSource": "facebook_social"
}
```

### ✅ Expected Result
- ✅ UTM parameters tersimpan di clicks
- ✅ UTM parameters tersimpan di purchases
- ✅ Affiliate bisa lihat traffic source terbaik

---

## 🎓 Tips Testing dengan Emulator

### 1. Reset Data Cepat
```bash
# Stop emulator (Ctrl+C)
rm -rf data
npm run emulate
```

### 2. Clone Data untuk Testing Berbeda
```bash
# Backup data saat ini
cp -r data data-backup-scenario1

# Restore data
rm -rf data
cp -r data-backup-scenario1 data
```

### 3. Lihat Logs Real-time
- Emulator UI → Tab "Logs"
- Filter by collection
- Search by field

### 4. Export Data untuk Bug Report
- Emulator UI → Firestore
- Select collection
- Export to JSON
- Attach ke GitHub issue

---

## ✅ Checklist Testing Lengkap

Sebelum deploy ke production, pastikan semua skenario ini pass:

- [ ] Self-referral prevention works
- [ ] Rate limiting blocks spam
- [ ] Tier progression auto-upgrade
- [ ] Commission holding period enforced
- [ ] Payout priority by tier
- [ ] UTM tracking accurate
- [ ] Fraud alerts created
- [ ] Email notifications sent
- [ ] Dashboard shows correct stats
- [ ] Admin can approve/reject payouts

---

## 📚 Next Steps

1. ✅ Jalankan semua skenario di atas
2. ✅ Catat hasil testing
3. ✅ Fix bugs yang ditemukan
4. ✅ Test ulang
5. ✅ Deploy ke production dengan percaya diri!

**Happy Testing! 🚀**
