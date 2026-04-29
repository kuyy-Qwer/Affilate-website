# 📋 Firebase Emulator - Cheat Sheet

Quick reference untuk Firebase Emulator. Print atau bookmark halaman ini!

---

## ⚡ Quick Commands

```bash
# Install Firebase CLI (sekali saja)
npm install -g firebase-tools

# Login (sekali saja)
firebase login

# Start emulator
npm run emulate

# Stop emulator
Ctrl+C

# Reset data
rm -rf data && npm run emulate

# Check version
firebase --version

# Logout
firebase logout
```

---

## 🌐 URLs

```
App:              http://localhost:3000
Emulator UI:      http://localhost:4000
Firestore:        http://localhost:4000/firestore
Logs:             http://localhost:4000/logs
Firestore API:    http://localhost:8080
Auth API:         http://localhost:9099
```

---

## 📁 File Structure

```
project/
├── data/                    # Emulator data
│   ├── firebase-export-metadata.json
│   └── firestore_export/
├── firebase.json            # Emulator config
├── firestore.rules          # Security rules
└── package.json
    └── "emulate": "firebase emulators:start --import=./data --export-on-exit"
```

---

## 🎯 Common Tasks

### Start Development
```bash
# Terminal 1
npm run emulate

# Terminal 2
npm run dev

# Browser 1: http://localhost:3000
# Browser 2: http://localhost:4000
```

### Reset Data
```bash
rm -rf data
npm run emulate
```

### Backup Data
```bash
cp -r data data-backup
```

### Restore Data
```bash
rm -rf data
cp -r data-backup data
```

### Share Data with Team
```bash
git add data/
git commit -m "Add testing data"
git push
```

---

## 🔍 Debugging

### View Logs
```
1. Open http://localhost:4000
2. Click "Logs" tab
3. Filter by collection/operation
```

### View Data
```
1. Open http://localhost:4000
2. Click "Firestore" tab
3. Browse collections
4. Edit documents
```

### Monitor Operations
```
Logs tab shows:
- Read operations
- Write operations
- Query execution time
- Errors
```

---

## 🧪 Testing Scenarios

### Test Self-Referral
```bash
1. Create affiliate: affiliate@test.com
2. Get code: AFF123
3. Purchase with same email
4. Check fraudAlerts collection
5. Verify commission blocked ✅
```

### Test Rate Limiting
```bash
1. Click affiliate link 150x
2. Check clicks 1-100: Success
3. Check clicks 101+: Blocked (429)
4. Check fraudAlerts collection ✅
```

### Test Tier Progression
```bash
1. Create affiliate (Starter)
2. Simulate 5 sales
3. Check tier: Bronze ✅
4. Simulate 20 sales
5. Check tier: Silver ✅
```

### Test Holding Period
```bash
1. Create purchase
2. Check commission status: pending
3. Check availableAt: +14 days
4. Edit timestamp in UI
5. Request payout: success ✅
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
pkill -f firebase
npm run emulate
```

### Cannot Connect
```bash
# Check if running
firebase emulators:start

# Check in browser
http://localhost:4000
```

### Data Not Persisting
```bash
# Check package.json has:
"emulate": "firebase emulators:start --import=./data --export-on-exit"

# Use Ctrl+C to stop (not kill)
```

### Emulator Slow
```bash
# Reset data
rm -rf data
npm run emulate
```

---

## 📊 Emulator vs Production

| Feature | Emulator | Production |
|---------|----------|------------|
| Location | Local | Cloud |
| Cost | Free | Pay per use |
| Speed | Instant | Network latency |
| Internet | Not needed | Required |
| Data | Testing | Real users |
| Reset | Easy | Dangerous |

---

## ✅ Best Practices

### DO ✅
```
✅ Use emulator for all development
✅ Test features before deploy
✅ Reset data before new tests
✅ Commit data/ for team sharing
✅ Use Ctrl+C to stop emulator
```

### DON'T ❌
```
❌ Don't use emulator in production
❌ Don't skip emulator testing
❌ Don't commit sensitive data
❌ Don't kill emulator process
❌ Don't test on production
```

---

## 🎯 Decision Tree

```
Need to test? → Use Emulator
Need to deploy? → Use Production
Need to debug? → Use Emulator
Need real users? → Use Production
Need to learn? → Use Emulator
```

---

## 📚 Documentation

```
Quick Start:     EMULATOR_QUICK_START.md
Full Guide:      FIREBASE_EMULATOR_GUIDE.md
Testing:         EMULATOR_TESTING_SCENARIOS.md
Visual Guide:    EMULATOR_VISUAL_GUIDE.md
FAQ:             EMULATOR_FAQ.md
Comparison:      EMULATOR_VS_PRODUCTION.md
Index:           FIREBASE_EMULATOR_INDEX.md
```

---

## 🚀 Workflow

```
1. Start emulator: npm run emulate
2. Start dev server: npm run dev
3. Code & test locally
4. Fix bugs
5. Test again
6. All tests pass ✅
7. Deploy to production
8. Monitor
```

---

## 💡 Pro Tips

```
Tip 1: Always start with emulator
Tip 2: Reset data before important tests
Tip 3: Use Emulator UI for debugging
Tip 4: Commit data/ for team collaboration
Tip 5: Never test destructive ops on production
```

---

## 🎓 Learning Path

```
Day 1: Install & start emulator
Day 2: Explore Emulator UI
Day 3: Test basic features
Day 4: Test advanced features
Day 5: Deploy to production
```

---

## 📞 Quick Help

```
Installation:    npm install -g firebase-tools
Login:           firebase login
Start:           npm run emulate
UI:              http://localhost:4000
Docs:            FIREBASE_EMULATOR_INDEX.md
```

---

## ⚙️ Configuration

### firebase.json
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
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

### package.json
```json
{
  "scripts": {
    "emulate": "firebase emulators:start --import=./data --export-on-exit",
    "dev": "tsx server.ts"
  }
}
```

---

## 🔑 Key Concepts

```
Emulator = Local Firebase simulation
Data = Stored in ./data folder
UI = Dashboard at localhost:4000
Import = Load data on start
Export = Save data on exit
```

---

## ✅ Pre-Deploy Checklist

```
□ All tests pass in emulator
□ No errors in console
□ Data structure validated
□ Security rules tested
□ Performance acceptable
□ Fraud detection works
□ Tier system works
□ Commission system works
□ Payout system works
□ Documentation updated
```

---

## 🎯 Summary

```
┌─────────────────────────────────────┐
│ Firebase Emulator Cheat Sheet      │
├─────────────────────────────────────┤
│ Start:  npm run emulate            │
│ UI:     http://localhost:4000      │
│ Stop:   Ctrl+C                     │
│ Reset:  rm -rf data                │
│ Docs:   FIREBASE_EMULATOR_INDEX.md │
└─────────────────────────────────────┘
```

---

**Print this page and keep it handy! 📋**

**Happy Development! 🚀**
