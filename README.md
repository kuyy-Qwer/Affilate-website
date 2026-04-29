<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🚀 Professional Affiliate Platform - DigiSell

Platform afiliasi profesional tingkat enterprise dengan fitur fraud detection, dynamic tier system, dan commission management.

View your app in AI Studio: https://ai.studio/apps/9c2520ec-ebb0-4e27-abc1-d2e6577ea659

---

## ✨ Enterprise Features

- ✅ **Dynamic Tier System** - Auto-upgrade Bronze → Diamond berdasarkan sales
- ✅ **Self-Referral Prevention** - Deteksi dan block komisi dari pembelian sendiri
- ✅ **Commission Holding Period** - 0-14 hari berdasarkan tier
- ✅ **Rate Limiting** - Max 100 clicks per IP per hour
- ✅ **Enhanced Tracking** - UTM parameters, IP, User Agent
- ✅ **Fraud Alert System** - Automated detection dengan severity levels
- ✅ **Tier-Based Payout Priority** - Instant untuk Diamond, Standard untuk Starter
- ✅ **Centralized Configuration** - Firestore-based config

---

## 🛠️ Run Locally

**Prerequisites:** Node.js, Firebase CLI

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Firebase
```bash
# Download serviceAccountKey.json dari Firebase Console
# Simpan di project root
```

### 3. Run Development Server
```bash
npm run dev
```

Server akan berjalan di: **http://localhost:3000**

---

## 🔥 Firebase Emulator (Testing Environment)

**Gunakan emulator untuk testing tanpa menyentuh database production!**

### Quick Start
```bash
# Install Firebase CLI (sekali saja)
npm install -g firebase-tools

# Login
firebase login

# Start emulator
npm run emulate
```

### Akses Emulator
- **Emulator UI**: http://localhost:4000
- **Firestore**: http://localhost:4000/firestore
- **Logs**: http://localhost:4000/logs

### Dokumentasi Lengkap
📚 **[FIREBASE_EMULATOR_INDEX.md](FIREBASE_EMULATOR_INDEX.md)** - Index semua dokumentasi emulator

Pilih dokumentasi sesuai kebutuhan:
- 📘 **[FIREBASE_EMULATOR_GUIDE.md](FIREBASE_EMULATOR_GUIDE.md)** - Panduan lengkap & mendalam
- ⚡ **[EMULATOR_QUICK_START.md](EMULATOR_QUICK_START.md)** - Quick reference & cheat sheet
- 🧪 **[EMULATOR_TESTING_SCENARIOS.md](EMULATOR_TESTING_SCENARIOS.md)** - Practical testing guide
- 🎨 **[EMULATOR_VISUAL_GUIDE.md](EMULATOR_VISUAL_GUIDE.md)** - Visual & diagram guide

---

## 📚 Documentation

### Enterprise Features
- 📖 **[PROFESSIONAL_FEATURES.md](PROFESSIONAL_FEATURES.md)** - Semua fitur profesional
- 📖 **[ENTERPRISE_UPGRADE_SUMMARY.md](ENTERPRISE_UPGRADE_SUMMARY.md)** - Ringkasan upgrade
- 📖 **[README_ENTERPRISE.md](README_ENTERPRISE.md)** - Enterprise documentation

### Technical Guides
- 🔧 **[TECHNICAL_GUIDE.md](TECHNICAL_GUIDE.md)** - Technical implementation
- 🔧 **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Implementation summary
- 🔧 **[DOKUMENTASI_LENGKAP.md](DOKUMENTASI_LENGKAP.md)** - Complete documentation (ID)

### User Guides
- 👤 **[USER_GUIDE.md](USER_GUIDE.md)** - User guide
- 🧪 **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Testing guide
- 🎨 **[DARK_MODE_GUIDE.md](DARK_MODE_GUIDE.md)** - Dark mode guide

### What's New
- 🆕 **[WHATS_NEW.md](WHATS_NEW.md)** - Latest updates
- 🆕 **[LANDING_PAGE_IMPROVEMENTS.md](LANDING_PAGE_IMPROVEMENTS.md)** - Landing page updates
- 🆕 **[SERVER_FIX_SUMMARY.md](SERVER_FIX_SUMMARY.md)** - Server fix summary

---

## 🚀 Deploy to Production

### Railway Deployment

1. **Push to GitHub**
```bash
git add .
git commit -m "Ready for production"
git push
```

2. **Setup Railway**
- Connect GitHub repository
- Add environment variables (lihat `.env.example`)
- Deploy!

3. **Environment Variables**
```
NODE_ENV=production
SERVICE_ACCOUNT_KEY=<paste serviceAccountKey.json content>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 📊 Project Structure

```
Affilate-website/
├── src/
│   ├── components/        # React components
│   ├── lib/              # Firebase config
│   ├── store/            # Zustand state management
│   └── types.ts          # TypeScript types
├── scripts/              # Initialization scripts
├── data/                 # Emulator data (testing)
├── server.ts             # Express + Firebase Admin
└── firebase.json         # Firebase config
```

---

## 🎯 Key Technologies

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Express.js, Firebase Admin SDK
- **Database**: Cloud Firestore
- **Payment**: Stripe
- **State Management**: Zustand
- **Build Tool**: Vite
- **Deployment**: Railway

---

## 🔐 Security Features

- ✅ Self-referral prevention
- ✅ Rate limiting per IP
- ✅ Fraud detection system
- ✅ Commission holding period
- ✅ Secure webhook verification
- ✅ Activity logging
- ✅ Admin access control

---

## 📞 Support

- 📧 Email: support@digisell.com
- 📖 Documentation: See files above
- 🐛 Issues: GitHub Issues

---

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ for professional affiliate marketers**
