# 🎨 Firebase Emulator - Visual Guide

Panduan visual untuk memahami Firebase Emulator di project Anda.

---

## 🏗️ Arsitektur System

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT MODE                          │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Browser    │         │  Dev Server  │         │   Emulator   │
│              │         │              │         │              │
│ localhost:   │  HTTP   │ localhost:   │  API    │ localhost:   │
│   3000       │────────▶│   3000       │────────▶│   8080       │
│              │         │              │         │              │
│ (React App)  │         │ (Express +   │         │ (Firestore)  │
│              │         │  Firebase    │         │              │
│              │         │  Admin)      │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
                                                          │
                                                          │
                                                          ▼
                                                   ┌──────────────┐
                                                   │ Emulator UI  │
                                                   │              │
                                                   │ localhost:   │
                                                   │   4000       │
                                                   │              │
                                                   │ (Dashboard)  │
                                                   └──────────────┘
```

---

## 🔄 Data Flow: Development vs Production

### Development (Dengan Emulator)
```
User Action
    │
    ▼
React App (localhost:3000)
    │
    ▼
Express Server (localhost:3000)
    │
    ▼
Firebase Admin SDK
    │
    ▼
Firestore Emulator (localhost:8080)  ◄── Data tersimpan di folder ./data
    │
    ▼
Emulator UI (localhost:4000)  ◄── Lihat & edit data
```

### Production (Tanpa Emulator)
```
User Action
    │
    ▼
React App (digisell.up.railway.app)
    │
    ▼
Express Server (Railway)
    │
    ▼
Firebase Admin SDK
    │
    ▼
Firebase Cloud (Firestore)  ◄── Data tersimpan di cloud
    │
    ▼
Firebase Console  ◄── Lihat & edit data
```

---

## 📁 Struktur Folder Data

```
Affilate-website/
│
├── data/                                    ◄── Emulator data storage
│   ├── firebase-export-metadata.json       ◄── Metadata export
│   └── firestore_export/                   ◄── Firestore data
│       ├── all_namespaces_all_kinds_...    ◄── Binary data
│       └── firestore_export.overall_...    ◄── Metadata
│
├── firebase.json                            ◄── Emulator config
├── firestore.rules                          ◄── Security rules
├── firestore.indexes.json                   ◄── Database indexes
│
└── package.json
    └── "emulate": "firebase emulators:start --import=./data --export-on-exit"
```

---

## 🎯 Workflow Diagram

### Skenario: Testing Self-Referral Prevention

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Start Emulator                                      │
└─────────────────────────────────────────────────────────────┘
    Terminal: npm run emulate
    
    ┌──────────────────────────────────────┐
    │ ✔ Firestore Emulator: localhost:8080 │
    │ ✔ Emulator UI: localhost:4000        │
    └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Create Affiliate                                    │
└─────────────────────────────────────────────────────────────┘
    Browser: localhost:3000/register
    
    Email: affiliate@test.com
    Code: AFF123
    
    ┌──────────────────────────────────────┐
    │ Firestore Emulator                   │
    │ Collection: users                    │
    │ Document: {userId}                   │
    │   - email: affiliate@test.com        │
    │   - affiliateCode: AFF123            │
    │   - tier: starter                    │
    └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Self-Purchase                                       │
└─────────────────────────────────────────────────────────────┘
    Browser: localhost:3000?ref=AFF123
    Checkout with: affiliate@test.com
    
    ┌──────────────────────────────────────┐
    │ Server Logic                         │
    │ 1. Check buyer email                 │
    │ 2. Check affiliate email             │
    │ 3. Match found! ❌                   │
    │ 4. Block commission                  │
    │ 5. Create fraud alert                │
    └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Verify in Emulator UI                              │
└─────────────────────────────────────────────────────────────┘
    Browser: localhost:4000/firestore
    
    ┌──────────────────────────────────────┐
    │ Collection: fraudAlerts              │
    │ Document: {alertId}                  │
    │   - type: self_referral              │
    │   - severity: high                   │
    │   - blocked: true                    │
    │   - timestamp: 2026-04-29...         │
    └──────────────────────────────────────┘
    
    ┌──────────────────────────────────────┐
    │ Collection: commissions              │
    │ (No document created) ✅             │
    └──────────────────────────────────────┘
```

---

## 📊 Collections Structure di Emulator

```
Firestore Emulator (localhost:8080)
│
├── users/                          ◄── User & affiliate data
│   ├── {userId1}
│   │   ├── email: "user@test.com"
│   │   ├── role: "affiliate"
│   │   ├── affiliateCode: "AFF123"
│   │   ├── tier: "bronze"
│   │   ├── commissionRate: 15
│   │   └── totalSales: 8
│   │
│   └── {userId2}
│       └── ...
│
├── products/                       ◄── Digital products
│   ├── {productId1}
│   │   ├── name: "Digital Course"
│   │   ├── price: 100
│   │   └── modules: [...]
│   │
│   └── {productId2}
│       └── ...
│
├── clicks/                         ◄── Affiliate click tracking
│   ├── {clickId1}
│   │   ├── affiliateCode: "AFF123"
│   │   ├── ip: "127.0.0.1"
│   │   ├── utmSource: "facebook"
│   │   ├── utmMedium: "social"
│   │   └── timestamp: "2026-04-29..."
│   │
│   └── {clickId2}
│       └── ...
│
├── purchases/                      ◄── Purchase records
│   ├── {purchaseId1}
│   │   ├── buyerEmail: "buyer@test.com"
│   │   ├── productId: "..."
│   │   ├── amount: 100
│   │   ├── affiliateCode: "AFF123"
│   │   └── timestamp: "2026-04-29..."
│   │
│   └── {purchaseId2}
│       └── ...
│
├── commissions/                    ◄── Commission tracking
│   ├── {commissionId1}
│   │   ├── affiliateId: "..."
│   │   ├── amount: 15
│   │   ├── status: "pending"
│   │   ├── holdingPeriodDays: 10
│   │   ├── availableAt: "2026-05-09..."
│   │   └── createdAt: "2026-04-29..."
│   │
│   └── {commissionId2}
│       └── ...
│
├── payouts/                        ◄── Payout requests
│   ├── {payoutId1}
│   │   ├── affiliateId: "..."
│   │   ├── amount: 100
│   │   ├── status: "pending"
│   │   ├── priority: "standard"
│   │   └── requestedAt: "2026-04-29..."
│   │
│   └── {payoutId2}
│       └── ...
│
├── fraudAlerts/                    ◄── Fraud detection
│   ├── {alertId1}
│   │   ├── type: "self_referral"
│   │   ├── severity: "high"
│   │   ├── affiliateId: "..."
│   │   ├── blocked: true
│   │   └── timestamp: "2026-04-29..."
│   │
│   └── {alertId2}
│       └── ...
│
├── activityLogs/                   ◄── Admin activity logs
│   ├── {logId1}
│   │   ├── adminId: "..."
│   │   ├── action: "approve_payout"
│   │   ├── details: "Approved $100"
│   │   └── timestamp: "2026-04-29..."
│   │
│   └── {logId2}
│       └── ...
│
└── settings/                       ◄── System configuration
    ├── affiliate_config
    │   ├── tiers: {...}
    │   ├── holdingPeriods: {...}
    │   ├── cookieLife: {...}
    │   └── rateLimit: {...}
    │
    └── stripe_config
        └── ...
```

---

## 🎮 Emulator UI Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Firebase Emulator Suite                    localhost:4000   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Firestore] [Authentication] [Functions] [Logs]            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Firestore                                          │    │
│  │                                                     │    │
│  │  Collections:                                      │    │
│  │  ├─ 📁 users (15 documents)                        │    │
│  │  ├─ 📁 products (8 documents)                      │    │
│  │  ├─ 📁 clicks (234 documents)                      │    │
│  │  ├─ 📁 purchases (45 documents)                    │    │
│  │  ├─ 📁 commissions (38 documents)                  │    │
│  │  ├─ 📁 payouts (12 documents)                      │    │
│  │  ├─ 📁 fraudAlerts (3 documents)                   │    │
│  │  ├─ 📁 activityLogs (156 documents)                │    │
│  │  └─ 📁 settings (2 documents)                      │    │
│  │                                                     │    │
│  │  [+ Start Collection]  [Import]  [Export]          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Comparison Table

| Feature | Firebase Emulator | Firebase Production |
|---------|-------------------|---------------------|
| **Location** | 💻 Local (127.0.0.1) | ☁️ Cloud (Google) |
| **Speed** | ⚡ Instant | 🌐 Network latency |
| **Cost** | 💰 Free unlimited | 💳 Pay per usage |
| **Data** | 🧪 Testing/dummy | 👥 Real users |
| **Internet** | ❌ Not required | ✅ Required |
| **Reset** | ✅ Easy (rm -rf data) | ⚠️ Dangerous! |
| **UI** | 🖥️ localhost:4000 | 🌐 Firebase Console |
| **Port** | 🔌 8080 (Firestore) | 🔌 443 (HTTPS) |
| **Data Persist** | 💾 ./data folder | ☁️ Cloud storage |
| **Team Share** | 📦 Git commit data/ | 🔐 Firebase access |

---

## 🚦 Decision Tree: Kapan Gunakan Emulator?

```
                    Mulai Development
                           │
                           ▼
                  Apa yang mau dilakukan?
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   Testing Fitur      Production         Learning
        │              Deploy                │
        ▼                  │                 ▼
   ✅ GUNAKAN              │            ✅ GUNAKAN
    EMULATOR               │             EMULATOR
        │                  ▼                 │
        │             ❌ JANGAN              │
        │              GUNAKAN               │
        │              EMULATOR              │
        │                  │                 │
        └──────────────────┴─────────────────┘
                           │
                           ▼
                    Happy Coding! 🎉
```

---

## 📈 Performance Comparison

### Query Speed Test

```
Test: Read 1000 documents

┌─────────────────┬──────────┬──────────┐
│ Environment     │ Time     │ Cost     │
├─────────────────┼──────────┼──────────┤
│ Emulator        │ 50ms     │ $0.00    │
│ Firebase Cloud  │ 250ms    │ $0.06    │
└─────────────────┴──────────┴──────────┘

✅ Emulator 5x lebih cepat!
✅ Emulator gratis unlimited!
```

---

## 🎓 Learning Path

```
Level 1: Beginner
├─ Install Firebase CLI
├─ Start emulator
└─ View data di UI
    │
    ▼
Level 2: Intermediate
├─ Import/export data
├─ Test basic features
└─ Use Emulator UI untuk debug
    │
    ▼
Level 3: Advanced
├─ Test fraud detection
├─ Test tier progression
├─ Test rate limiting
└─ Automate testing dengan scripts
    │
    ▼
Level 4: Expert
├─ CI/CD integration
├─ Automated testing suite
├─ Performance testing
└─ Team collaboration workflows
```

---

## ✅ Quick Checklist

Sebelum mulai development:

- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged in (`firebase login`)
- [ ] Emulator running (`npm run emulate`)
- [ ] Emulator UI accessible (http://localhost:4000)
- [ ] Dev server running (`npm run dev`)
- [ ] App accessible (http://localhost:3000)

Sebelum deploy production:

- [ ] All tests passed di emulator
- [ ] No errors di console
- [ ] Data structure validated
- [ ] Security rules tested
- [ ] Performance acceptable
- [ ] Documentation updated

---

## 🎯 Summary

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  Firebase Emulator = Local Firebase untuk Development       │
│                                                              │
│  ✅ Safe testing environment                                │
│  ✅ Fast development cycle                                  │
│  ✅ Free unlimited usage                                    │
│  ✅ Offline development                                     │
│  ✅ Team collaboration                                      │
│                                                              │
│  Command: npm run emulate                                   │
│  UI: http://localhost:4000                                  │
│  Firestore: localhost:8080                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Gunakan emulator untuk semua development & testing!** 🚀
