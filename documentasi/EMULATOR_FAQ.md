# ❓ Firebase Emulator - FAQ (Frequently Asked Questions)

Jawaban untuk pertanyaan umum tentang Firebase Emulator.

---

## 🎯 Pertanyaan Umum

### Q1: Apa bedanya Firebase Emulator dengan Firebase Cloud?

**A:** Firebase Emulator adalah simulasi lokal yang berjalan di komputer Anda, sedangkan Firebase Cloud adalah layanan cloud Google.

```
Emulator:
- Lokal (127.0.0.1)
- Gratis unlimited
- Tidak perlu internet
- Data di folder ./data

Firebase Cloud:
- Cloud (Google servers)
- Bayar per usage
- Harus online
- Data di cloud
```

---

### Q2: Apakah data di emulator akan hilang?

**A:** Tidak, jika Anda menggunakan flag `--export-on-exit`:

```bash
# Script di package.json
"emulate": "firebase emulators:start --import=./data --export-on-exit"
```

Data otomatis tersimpan di folder `./data` setiap kali Anda stop emulator (Ctrl+C).

---

### Q3: Apakah emulator bisa diakses dari komputer lain?

**A:** Tidak secara default. Emulator hanya bisa diakses dari `localhost` (127.0.0.1).

Jika ingin akses dari komputer lain (tidak recommended):
```bash
firebase emulators:start --host=0.0.0.0
```

**Warning:** Ini membuka emulator ke network, bisa berbahaya!

---

### Q4: Apakah emulator support semua fitur Firebase?

**A:** Emulator support:
- ✅ Firestore
- ✅ Authentication
- ✅ Cloud Functions
- ✅ Realtime Database
- ✅ Cloud Storage
- ✅ Pub/Sub

Tidak support:
- ❌ Firebase Hosting
- ❌ Remote Config
- ❌ Cloud Messaging (FCM)
- ❌ Analytics

---

### Q5: Berapa banyak data yang bisa disimpan di emulator?

**A:** Unlimited! Tidak ada batasan storage atau operations.

Tapi ingat, data tersimpan di komputer Anda, jadi tergantung space disk.

---

### Q6: Apakah emulator bisa digunakan untuk production?

**A:** ❌ **TIDAK!** Emulator hanya untuk development dan testing.

Alasan:
- Hanya bisa diakses lokal
- Tidak ada backup
- Tidak ada security
- Tidak scalable

---

### Q7: Bagaimana cara reset data emulator?

**A:** Ada 2 cara:

**Cara 1: Hapus folder data**
```bash
rm -rf data
npm run emulate
```

**Cara 2: Start tanpa import**
```bash
firebase emulators:start --export-on-exit
```

---

### Q8: Apakah bisa menjalankan emulator dan production bersamaan?

**A:** Ya! Emulator dan production adalah environment terpisah.

```bash
# Terminal 1: Emulator
npm run emulate

# Terminal 2: Dev server (connect ke emulator)
npm run dev

# Terminal 3: Production server (connect ke Firebase Cloud)
NODE_ENV=production npm run dev
```

---

### Q9: Bagaimana cara share data testing dengan team?

**A:** Commit folder `data/` ke Git:

```bash
git add data/
git commit -m "Add testing data"
git push
```

Team lain tinggal pull dan start emulator:
```bash
git pull
npm run emulate
```

---

### Q10: Apakah emulator memerlukan internet?

**A:** Tidak! Emulator berjalan 100% offline.

Tapi Anda perlu internet untuk:
- Install Firebase CLI (sekali saja)
- Login Firebase (sekali saja)
- Update Firebase CLI

Setelah itu, bisa offline selamanya.

---

## 🔧 Pertanyaan Teknis

### Q11: Port apa saja yang digunakan emulator?

**A:**
```
Firestore:     localhost:8080
Auth:          localhost:9099
Functions:     localhost:5001
Emulator UI:   localhost:4000
Pub/Sub:       localhost:8085
```

---

### Q12: Bagaimana cara mengubah port emulator?

**A:** Edit `firebase.json`:

```json
{
  "emulators": {
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

---

### Q13: Apakah emulator support Firestore rules?

**A:** Ya! Emulator menggunakan rules dari file `firestore.rules`.

Test rules di emulator sebelum deploy:
```bash
npm run emulate
# Test app dengan berbagai user roles
```

---

### Q14: Bagaimana cara debug query di emulator?

**A:** Gunakan Emulator UI:

1. Buka http://localhost:4000
2. Klik tab "Logs"
3. Lihat semua query real-time
4. Filter by collection atau operation

---

### Q15: Apakah emulator support transactions?

**A:** Ya! Semua Firestore features supported:
- ✅ Transactions
- ✅ Batch writes
- ✅ Queries
- ✅ Indexes
- ✅ Security rules

---

## 🎯 Pertanyaan Spesifik Project

### Q16: Bagaimana cara test self-referral prevention di emulator?

**A:**
```bash
# 1. Start emulator
npm run emulate

# 2. Buat affiliate account
Email: affiliate@test.com
Code: AFF123

# 3. Beli produk dengan email sama
Checkout dengan: affiliate@test.com

# 4. Cek di Emulator UI
Collection: fraudAlerts
Type: self_referral
Blocked: true ✅
```

---

### Q17: Bagaimana cara test tier progression di emulator?

**A:**
```bash
# 1. Start emulator
npm run emulate

# 2. Buat affiliate baru (Starter tier)

# 3. Simulasi 5 sales
# Buat 5 purchases dengan affiliate code

# 4. Cek di Emulator UI
Collection: users/{userId}
Tier: bronze ✅ (auto-upgraded!)
```

---

### Q18: Bagaimana cara test rate limiting di emulator?

**A:**
```javascript
// test-rate-limit.js
for (let i = 1; i <= 150; i++) {
  await fetch(`http://localhost:3000/api/track-click?ref=AFF123`);
}

// Expected:
// Click 1-100: Success ✅
// Click 101+: Blocked (429) ✅
```

---

### Q19: Bagaimana cara test commission holding period di emulator?

**A:**
```bash
# 1. Buat purchase (komisi pending)

# 2. Cek di Emulator UI
Collection: commissions
Status: pending
AvailableAt: 2026-05-13 (14 hari dari sekarang)

# 3. Edit timestamp manual di Emulator UI
AvailableAt: 2026-04-29 (sekarang)

# 4. Request payout
Status: success ✅
```

---

### Q20: Bagaimana cara test payout priority di emulator?

**A:**
```bash
# 1. Buat 3 payout requests:
- Starter tier: priority "standard"
- Silver tier: priority "priority"
- Diamond tier: priority "instant"

# 2. Cek di Emulator UI
Diamond: status "completed" ✅ (instant!)
Silver: status "pending" (1-2 hari)
Starter: status "pending" (3-5 hari)
```

---

## 🐛 Troubleshooting

### Q21: Error: "Port 8080 already in use"

**A:**
```bash
# Matikan proses yang menggunakan port
pkill -f firebase

# Atau ganti port di firebase.json
{
  "emulators": {
    "firestore": {
      "port": 8081
    }
  }
}
```

---

### Q22: Error: "Cannot connect to emulator"

**A:**
```bash
# 1. Pastikan emulator running
firebase emulators:start

# 2. Cek di browser
http://localhost:4000

# 3. Cek firewall
# Pastikan port 4000 dan 8080 tidak diblock
```

---

### Q23: Error: "Data not persisting"

**A:**
```bash
# Pastikan flag --export-on-exit ada
# Cek package.json:
"emulate": "firebase emulators:start --import=./data --export-on-exit"

# Jangan kill process dengan force
# Gunakan Ctrl+C untuk graceful shutdown
```

---

### Q24: Error: "Firebase CLI not found"

**A:**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Verify installation
firebase --version

# Login
firebase login
```

---

### Q25: Emulator lambat setelah banyak data

**A:**
```bash
# Reset data
rm -rf data

# Start fresh
npm run emulate

# Atau limit data testing
# Jangan load 1 juta documents untuk testing
```

---

## 💡 Best Practices

### Q26: Berapa sering harus reset emulator?

**A:** Tergantung kebutuhan:

```
Setiap hari: ❌ Tidak perlu
Setiap minggu: ⚠️ Optional
Sebelum testing baru: ✅ Recommended
Setelah data kotor: ✅ Recommended
```

---

### Q27: Apakah harus commit folder data/ ke Git?

**A:** Tergantung:

```
✅ Commit jika:
- Data testing untuk team
- Data seed untuk development
- Data untuk reproducible testing

❌ Jangan commit jika:
- Data terlalu besar (>100MB)
- Data berisi informasi sensitif
- Data temporary/experimental
```

---

### Q28: Bagaimana cara backup data emulator?

**A:**
```bash
# Backup
cp -r data data-backup-$(date +%Y%m%d)

# Restore
rm -rf data
cp -r data-backup-20260429 data
```

---

### Q29: Apakah bisa menggunakan emulator untuk CI/CD?

**A:** Ya! Contoh GitHub Actions:

```yaml
- name: Start Firebase Emulator
  run: |
    npm install -g firebase-tools
    firebase emulators:start --import=./data &
    
- name: Run Tests
  run: npm test
```

---

### Q30: Bagaimana cara monitoring performance di emulator?

**A:**
```bash
# 1. Buka Emulator UI
http://localhost:4000

# 2. Klik tab "Logs"

# 3. Monitor:
- Query execution time
- Read/write operations
- Slow queries
- Errors
```

---

## 🎓 Learning

### Q31: Saya pemula, dari mana harus mulai?

**A:** Follow learning path ini:

```
Day 1: Setup
├─ Install Firebase CLI
├─ Start emulator
└─ Explore Emulator UI

Day 2: Basic Usage
├─ Create documents
├─ Read documents
└─ Update/delete documents

Day 3: Testing
├─ Test app features
├─ View data in UI
└─ Debug with logs

Day 4: Advanced
├─ Test fraud detection
├─ Test tier system
└─ Test commission system
```

---

### Q32: Dokumentasi mana yang harus dibaca dulu?

**A:**
```
1. EMULATOR_QUICK_START.md (10 menit)
   ↓
2. FIREBASE_EMULATOR_SUMMARY.md (15 menit)
   ↓
3. FIREBASE_EMULATOR_GUIDE.md (30 menit)
   ↓
4. EMULATOR_TESTING_SCENARIOS.md (praktik)
```

---

### Q33: Apakah ada video tutorial?

**A:** Official Firebase:
- [Firebase Emulator Suite](https://www.youtube.com/watch?v=pkgvFNPdiEs)
- [Local Development with Emulator](https://www.youtube.com/watch?v=q7xlVbvPJbE)

Untuk project ini, baca dokumentasi yang sudah saya buat:
- FIREBASE_EMULATOR_GUIDE.md
- EMULATOR_TESTING_SCENARIOS.md

---

## 🚀 Advanced

### Q34: Apakah bisa menggunakan emulator dengan Docker?

**A:** Ya! Contoh Dockerfile:

```dockerfile
FROM node:18
RUN npm install -g firebase-tools
COPY . /app
WORKDIR /app
RUN npm install
CMD ["firebase", "emulators:start", "--import=./data"]
```

---

### Q35: Apakah bisa menggunakan emulator untuk load testing?

**A:** Ya, tapi dengan catatan:

```
✅ Good for:
- Testing query performance
- Testing data structure
- Testing business logic

❌ Not good for:
- Network latency testing
- Cloud infrastructure testing
- Real-world performance
```

---

## 📞 Support

### Q36: Dimana bisa dapat bantuan?

**A:**
- 📖 Baca dokumentasi di project ini
- 🌐 [Firebase Docs](https://firebase.google.com/docs/emulator-suite)
- 💬 [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase-emulator)
- 🐛 [GitHub Issues](https://github.com/firebase/firebase-tools/issues)

---

### Q37: Bagaimana cara report bug emulator?

**A:**
```bash
# 1. Reproduce bug di emulator
# 2. Export data
# 3. Create GitHub issue
# 4. Attach data dan logs
```

---

## ✅ Kesimpulan

Firebase Emulator adalah tool yang powerful untuk development dan testing. Dengan memahami FAQ ini, Anda bisa menggunakan emulator dengan maksimal!

**Key Takeaways:**
- ✅ Emulator untuk development & testing
- ✅ Production untuk deployment
- ✅ Data tersimpan di folder ./data
- ✅ Gratis unlimited
- ✅ Tidak perlu internet

**Next Steps:**
1. ✅ Install Firebase CLI
2. ✅ Start emulator: `npm run emulate`
3. ✅ Baca dokumentasi lengkap
4. ✅ Test affiliate platform
5. ✅ Deploy dengan percaya diri!

**Happy Development! 🎉**
