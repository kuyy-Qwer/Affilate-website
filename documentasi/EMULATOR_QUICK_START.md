# 🚀 Firebase Emulator - Quick Start

## Perintah Cepat

### Start Emulator
```bash
npm run emulate
```

### Akses Dashboard
```
http://localhost:4000
```

### Akses Firestore Emulator
```
http://localhost:4000/firestore
```

---

## Setup Sekali Saja

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login
```bash
firebase login
```

### 3. Selesai! Siap digunakan

---

## Workflow Harian

### Development Mode (Dengan Emulator)
```bash
# Terminal 1: Start emulator
npm run emulate

# Terminal 2: Start dev server
npm run dev

# Browser 1: App → http://localhost:3000
# Browser 2: Emulator UI → http://localhost:4000
```

### Production Mode (Tanpa Emulator)
```bash
# Langsung jalankan server
npm run dev

# Akan connect ke Firebase Cloud
```

---

## Kapan Menggunakan Emulator?

### ✅ GUNAKAN Emulator Untuk:
- Testing fitur baru
- Testing fraud detection
- Testing tier system
- Eksperimen dengan data
- Development offline
- Learning & practice

### ❌ JANGAN Gunakan Emulator Untuk:
- Deploy production
- Testing dengan user asli
- Performance testing (latency)
- Testing Firebase Cloud Functions

---

## Tips Pro

### 1. Reset Data Testing
```bash
# Hapus folder data
rm -rf data

# Start emulator (akan buat data baru)
npm run emulate
```

### 2. Export Data Saat Ini
```bash
# Data otomatis tersimpan di folder data/ saat stop emulator
# Ctrl+C untuk stop
```

### 3. Share Data dengan Team
```bash
# Commit folder data/ ke Git
git add data/
git commit -m "Add testing data"
git push
```

### 4. Lihat Logs Real-time
- Buka Emulator UI: http://localhost:4000
- Klik tab "Logs"
- Lihat semua operasi database

---

## Troubleshooting Cepat

### Emulator Tidak Start
```bash
# Matikan proses yang bentrok
pkill -f firebase

# Start ulang
npm run emulate
```

### Port Sudah Digunakan
```bash
# Cek proses di port 4000
netstat -ano | findstr :4000

# Kill proses (ganti PID)
taskkill /PID <PID> /F
```

### Data Tidak Muncul
```bash
# Pastikan flag --import ada
# Cek package.json:
"emulate": "firebase emulators:start --import=./data --export-on-exit"
```

---

## Cheat Sheet

| Aksi | Command |
|------|---------|
| Start emulator | `npm run emulate` |
| Stop emulator | `Ctrl+C` |
| View UI | http://localhost:4000 |
| View Firestore | http://localhost:4000/firestore |
| View Logs | http://localhost:4000/logs |
| Reset data | `rm -rf data` |
| Check status | `firebase emulators:exec "echo ok"` |

---

## Struktur Data di Emulator

```
data/
├── firebase-export-metadata.json
└── firestore_export/
    ├── all_namespaces_all_kinds_...
    └── firestore_export.overall_export_metadata
```

**Jangan edit manual!** Gunakan Emulator UI atau app untuk mengubah data.

---

## Next Steps

1. ✅ Baca panduan lengkap: `FIREBASE_EMULATOR_GUIDE.md`
2. ✅ Start emulator: `npm run emulate`
3. ✅ Buka UI: http://localhost:4000
4. ✅ Test fitur affiliate platform Anda!

**Happy Testing! 🎉**
