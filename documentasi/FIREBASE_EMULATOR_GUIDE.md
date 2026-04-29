# 🔥 Panduan Lengkap Firebase Emulator

## Apa itu Firebase Emulator?

Firebase Emulator adalah **simulasi lokal** dari layanan Firebase yang berjalan di komputer Anda. Ini memungkinkan Anda untuk **testing dan development tanpa menyentuh database production** yang sebenarnya.

---

## 🎯 Fungsi & Kegunaan Firebase Emulator

### 1. **Testing Tanpa Risiko**
- ✅ Tidak akan merusak data production
- ✅ Tidak akan menghapus data user asli
- ✅ Tidak akan menghabiskan quota Firebase
- ✅ Bisa testing fitur berbahaya (delete, update massal) dengan aman

### 2. **Development Offline**
- ✅ Bisa coding tanpa internet
- ✅ Tidak perlu koneksi ke Firebase Cloud
- ✅ Response lebih cepat (lokal)
- ✅ Tidak ada latency network

### 3. **Data Konsisten untuk Testing**
- ✅ Import/export data testing
- ✅ Reset data kapan saja
- ✅ Semua developer punya data yang sama
- ✅ Reproducible testing environment

### 4. **Hemat Biaya**
- ✅ Tidak kena charge Firebase (gratis unlimited)
- ✅ Tidak ada batas read/write operations
- ✅ Tidak ada batas storage

---

## 📦 Konfigurasi di Project Anda

### File Konfigurasi

#### 1. **firebase.json**
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```
- Menentukan file rules dan indexes yang digunakan
- Emulator akan menggunakan rules yang sama dengan production

#### 2. **package.json - Script Emulator**
```json
"scripts": {
  "emulate": "firebase emulators:start --import=./data --export-on-exit"
}
```

**Penjelasan Parameter:**
- `firebase emulators:start` - Jalankan emulator
- `--import=./data` - Import data dari folder `./data` saat start
- `--export-on-exit` - Otomatis save data ke `./data` saat emulator ditutup

#### 3. **Folder data/**
```
data/
├── firebase-export-metadata.json    # Metadata export
└── firestore_export/                # Data Firestore
    └── firestore_export.overall_export_metadata
```
- Menyimpan snapshot data untuk testing
- Data ini di-import setiap kali emulator start
- Data otomatis di-update saat emulator stop

---

## 🚀 Cara Menggunakan Firebase Emulator

### **Langkah 1: Install Firebase CLI**
```bash
npm install -g firebase-tools
```

### **Langkah 2: Login ke Firebase**
```bash
firebase login
```

### **Langkah 3: Jalankan Emulator**
```bash
npm run emulate
```

### **Output yang Akan Muncul:**
```
┌─────────────────────────────────────────────────────────────┐
│ ✔  All emulators ready! It is now safe to connect your app. │
│ i  View Emulator UI at http://127.0.0.1:4000                │
└─────────────────────────────────────────────────────────────┘

┌────────────┬────────────────┬─────────────────────────────────┐
│ Emulator   │ Host:Port      │ View in Emulator UI             │
├────────────┼────────────────┼─────────────────────────────────┤
│ Firestore  │ 127.0.0.1:8080 │ http://127.0.0.1:4000/firestore │
└────────────┴────────────────┴─────────────────────────────────┘
```

### **Langkah 4: Akses Emulator UI**
Buka browser: **http://localhost:4000**

---

## 🖥️ Fitur Emulator UI (Dashboard)

### 1. **Firestore Tab**
- Lihat semua collections dan documents
- Edit data secara manual
- Tambah/hapus documents
- Query data dengan filter
- **Seperti Firebase Console tapi lokal!**

### 2. **Logs Tab**
- Lihat semua operasi database real-time
- Debug query yang lambat
- Monitor read/write operations
- Track errors

### 3. **Export/Import Data**
- Export data testing untuk dibagikan ke team
- Import data dari file
- Reset database ke state awal

---

## 🔧 Cara Menghubungkan App ke Emulator

### **Frontend (React) - src/lib/firebase.ts**

Tambahkan kode ini untuk connect ke emulator saat development:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Connect to emulator in development
if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  console.log('🔥 Connected to Firebase Emulator');
}

export { db, auth };
```

### **Backend (Node.js) - server.ts**

Tambahkan setelah Firebase Admin initialization:

```typescript
// Connect to emulator in development
if (process.env.NODE_ENV !== 'production') {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  console.log('🔥 Backend connected to Firestore Emulator');
}
```

---

## 📋 Workflow Development dengan Emulator

### **Skenario 1: Testing Fitur Baru**
```bash
# 1. Start emulator dengan data testing
npm run emulate

# 2. Di terminal lain, jalankan dev server
npm run dev

# 3. Test fitur di http://localhost:3000
# 4. Lihat data di Emulator UI: http://localhost:4000
# 5. Stop emulator (Ctrl+C) - data otomatis tersimpan
```

### **Skenario 2: Testing Fraud Detection**
```bash
# 1. Start emulator
npm run emulate

# 2. Buat banyak affiliate clicks dengan IP sama
# 3. Lihat fraud alerts di Emulator UI
# 4. Tidak akan merusak data production!
```

### **Skenario 3: Testing Tier Upgrade**
```bash
# 1. Start emulator
npm run emulate

# 2. Simulasi pembelian untuk upgrade tier
# 3. Cek apakah tier berubah dari Bronze → Silver
# 4. Reset data jika perlu testing ulang
```

---

## 🎓 Use Cases untuk Affiliate Platform Anda

### **1. Testing Self-Referral Prevention**
- Buat user dengan email sama sebagai affiliate dan buyer
- Cek apakah sistem block komisi
- Lihat fraud alert di collection `fraudAlerts`

### **2. Testing Commission Holding Period**
- Buat purchase baru
- Cek status komisi: `pending` → `available`
- Simulasi waktu dengan mengubah timestamp manual

### **3. Testing Rate Limiting**
- Klik affiliate link 100x dari IP sama
- Cek apakah sistem block setelah limit
- Lihat log di Emulator UI

### **4. Testing Tier Progression**
- Buat affiliate baru (Bronze)
- Simulasi 10 sales
- Cek apakah auto-upgrade ke Silver

### **5. Testing Payout System**
- Request payout dari berbagai tier
- Cek priority: Diamond (instant) vs Starter (14 hari)
- Lihat status di collection `payouts`

---

## 📊 Perbandingan: Emulator vs Production

| Aspek | Firebase Emulator | Firebase Production |
|-------|-------------------|---------------------|
| **Lokasi** | Lokal (127.0.0.1) | Cloud (Firebase) |
| **Biaya** | Gratis unlimited | Bayar per usage |
| **Kecepatan** | Sangat cepat | Tergantung internet |
| **Data** | Testing/dummy | Data user asli |
| **Risiko** | Aman, tidak ada risiko | Harus hati-hati |
| **Internet** | Tidak perlu | Harus online |
| **Reset Data** | Mudah, kapan saja | Berbahaya! |

---

## ⚠️ Penting: Jangan Lupa!

### **1. Jangan Commit Data Sensitif**
File `data/` berisi data testing, pastikan tidak ada:
- Email asli user
- Password
- API keys
- Data pribadi

### **2. Gunakan Data Dummy**
Contoh data testing yang baik:
```javascript
{
  email: "test@example.com",
  name: "Test User",
  affiliateCode: "TEST123"
}
```

### **3. Switch ke Production Saat Deploy**
Pastikan environment variable di Railway:
```
NODE_ENV=production
```
Jangan gunakan emulator di production!

---

## 🔍 Troubleshooting

### **Error: "Port 8080 already in use"**
```bash
# Matikan emulator yang masih jalan
pkill -f firebase

# Atau ganti port
firebase emulators:start --import=./data --export-on-exit --port=4001
```

### **Error: "Cannot connect to emulator"**
```bash
# Pastikan emulator jalan
firebase emulators:start

# Cek di browser: http://localhost:4000
```

### **Data Tidak Tersimpan**
Pastikan flag `--export-on-exit` ada di script:
```json
"emulate": "firebase emulators:start --import=./data --export-on-exit"
```

---

## 📚 Resources

- [Firebase Emulator Docs](https://firebase.google.com/docs/emulator-suite)
- [Firestore Emulator Guide](https://firebase.google.com/docs/emulator-suite/connect_firestore)
- [Testing with Emulator](https://firebase.google.com/docs/emulator-suite/install_and_configure)

---

## ✅ Kesimpulan

Firebase Emulator adalah **tool wajib** untuk development profesional:

1. ✅ **Safety First** - Testing tanpa risiko
2. ✅ **Fast Development** - Tidak perlu internet
3. ✅ **Cost Effective** - Gratis unlimited
4. ✅ **Team Collaboration** - Share data testing
5. ✅ **Professional Workflow** - Seperti developer enterprise

**Gunakan emulator untuk semua testing dan development, production hanya untuk deploy final!** 🚀
