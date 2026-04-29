# 🔧 Technical Guide - DigiSell Platform

## 📋 Table of Contents
1. [Setup & Installation](#setup--installation)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [State Management](#state-management)
4. [API Integration](#api-integration)
5. [Database Operations](#database-operations)
6. [Authentication Flow](#authentication-flow)
7. [Payment Integration](#payment-integration)
8. [Dark Mode Implementation](#dark-mode-implementation)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Setup & Installation

### Prerequisites
```bash
Node.js >= 18.0.0
npm >= 9.0.0
Firebase Account
Stripe Account
```

### Installation Steps

1. **Clone Repository**
```bash
git clone <repository-url>
cd Affilate-website
```

2. **Install Dependencies**
```bash
npm install
```

3. **Setup Environment Variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
# Firebase Client
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Server)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# App
APP_URL=http://localhost:3000
PORT=3000
```

4. **Setup Firebase**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase
firebase init
```

Select:
- Firestore
- Hosting
- Emulators (optional)

5. **Setup Firestore Security Rules**

Edit `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Products collection
    match /products/{productId} {
      allow read: if true; // Public read
      allow write: if isAdmin();
    }
    
    // Sales collection
    match /sales/{saleId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Reviews collection
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update: if isOwner(resource.data.userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Coupons collection
    match /coupons/{couponId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Withdrawals collection
    match /withdrawals/{withdrawalId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Settings collection
    match /settings/{document=**} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Activity logs
    match /activityLogs/{logId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }
  }
}
```

6. **Deploy Firestore Rules**
```bash
firebase deploy --only firestore:rules
```

7. **Create Firestore Indexes**

Edit `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "products",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "sales",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "affiliateId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "sales",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "buyerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "reviews",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "productId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

8. **Run Development Server**
```bash
npm run dev
```

Server will start at `http://localhost:3000`

---

## 🏗️ Architecture Deep Dive

### Frontend Architecture

```
┌─────────────────────────────────────────┐
│           Browser (Client)              │
├─────────────────────────────────────────┤
│  React Components                       │
│  ├── App.tsx (Main Router)              │
│  ├── Navbar                             │
│  ├── LandingPage                        │
│  ├── ProductCatalog                     │
│  ├── DashboardLayout                    │
│  ├── AdminDashboard                     │
│  └── AffiliateDashboard                 │
├─────────────────────────────────────────┤
│  State Management (Zustand)             │
│  ├── User State                         │
│  ├── Products State                     │
│  ├── UI State (Dark Mode, Active Tab)   │
│  └── Global Config                      │
├─────────────────────────────────────────┤
│  Firebase Client SDK                    │
│  ├── Authentication                     │
│  ├── Firestore (Real-time)              │
│  └── Storage                            │
└─────────────────────────────────────────┘
```

### Backend Architecture

```
┌─────────────────────────────────────────┐
│      Express Server (server.ts)         │
├─────────────────────────────────────────┤
│  Middleware                             │
│  ├── CORS                               │
│  ├── Rate Limiting                      │
│  ├── Body Parser                        │
│  └── Auth Verification                  │
├─────────────────────────────────────────┤
│  API Routes                             │
│  ├── /api/register                      │
│  ├── /api/create-checkout-session       │
│  ├── /api/webhook (Stripe)              │
│  ├── /api/products/*                    │
│  ├── /api/admin/*                       │
│  └── /api/user/*                        │
├─────────────────────────────────────────┤
│  Firebase Admin SDK                     │
│  ├── Authentication                     │
│  ├── Firestore                          │
│  └── Storage                            │
├─────────────────────────────────────────┤
│  External Services                      │
│  ├── Stripe API                         │
│  └── Nodemailer (Email)                 │
└─────────────────────────────────────────┘
```

### Data Flow

```
User Action → React Component → Zustand Store → Firebase/API
                                                      ↓
                                                 Firestore
                                                      ↓
                                            Real-time Update
                                                      ↓
                                              Zustand Store
                                                      ↓
                                            React Re-render
```

---

## 🗃️ State Management

### Zustand Store Structure

```typescript
// src/store/useStore.ts

interface AppState {
  // User State
  user: User | null;
  isAuthLoading: boolean;
  
  // Products State
  products: Product[];
  
  // UI State
  activeTab: string;
  isDarkMode: boolean;
  
  // Global Config
  globalConfig: GlobalConfig | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setProducts: (products: Product[]) => void;
  setActiveTab: (tab: string) => void;
  toggleDarkMode: () => void;
  
  // Async Actions
  initAuth: () => void;
  fetchProducts: () => Promise<void>;
  fetchGlobalConfig: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  checkVerificationStatus: () => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string>>;
}
```

### Usage Example

```typescript
// In a component
import { useStore } from './store/useStore';

function MyComponent() {
  const { user, products, isDarkMode, toggleDarkMode } = useStore();
  
  return (
    <div>
      <p>User: {user?.name}</p>
      <p>Products: {products.length}</p>
      <button onClick={toggleDarkMode}>
        Toggle Dark Mode
      </button>
    </div>
  );
}
```

### State Persistence

```typescript
// Dark mode persists to localStorage
toggleDarkMode: () => {
  const newMode = !get().isDarkMode;
  set({ isDarkMode: newMode });
  localStorage.setItem('darkMode', String(newMode));
  
  if (newMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
```

---

## 🔌 API Integration

### Authentication Middleware

```typescript
// server.ts

async function verifyAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.userId = decodedToken.uid;
    
    // Fetch user profile
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get();
    
    req.userProfile = userDoc.data();
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### API Request Example

```typescript
// Client-side API call
const { getAuthHeaders } = useStore.getState();

const response = await fetch('/api/products', {
  method: 'POST',
  headers: await getAuthHeaders(),
  body: JSON.stringify({
    name: 'New Product',
    price: 100000
  })
});

const data = await response.json();
```

### Error Handling

```typescript
try {
  const response = await fetch('/api/endpoint');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error);
  alert(error.message);
}
```

---

## 💾 Database Operations

### Firestore CRUD Operations

#### Create
```typescript
// Add new document
const docRef = await addDoc(collection(db, 'products'), {
  name: 'Product Name',
  price: 100000,
  createdAt: serverTimestamp()
});

console.log('Document ID:', docRef.id);
```

#### Read
```typescript
// Get single document
const docRef = doc(db, 'products', productId);
const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
  const product = { id: docSnap.id, ...docSnap.data() };
}

// Get multiple documents with query
const q = query(
  collection(db, 'products'),
  where('category', '==', 'ebook'),
  orderBy('createdAt', 'desc'),
  limit(10)
);

const querySnapshot = await getDocs(q);
const products = querySnapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

#### Update
```typescript
// Update document
const docRef = doc(db, 'products', productId);
await updateDoc(docRef, {
  price: 150000,
  updatedAt: serverTimestamp()
});

// Set with merge (create if not exists)
await setDoc(docRef, {
  price: 150000
}, { merge: true });
```

#### Delete
```typescript
// Delete document
const docRef = doc(db, 'products', productId);
await deleteDoc(docRef);
```

### Real-time Listeners

```typescript
// Listen to document changes
const unsubscribe = onSnapshot(
  doc(db, 'users', userId),
  (doc) => {
    const userData = doc.data();
    setUser(userData);
  }
);

// Cleanup
return () => unsubscribe();
```

### Batch Operations

```typescript
const batch = writeBatch(db);

// Update multiple documents
products.forEach(product => {
  const docRef = doc(db, 'products', product.id);
  batch.update(docRef, { featured: true });
});

// Commit batch
await batch.commit();
```

---

## 🔐 Authentication Flow

### Registration Flow

```typescript
// 1. Create Firebase Auth user
const userCredential = await createUserWithEmailAndPassword(
  auth,
  email,
  password
);

// 2. Send verification email
await sendEmailVerification(userCredential.user);

// 3. Generate referral code
const referralCode = generateReferralCode();

// 4. Create Firestore user document
await setDoc(doc(db, 'users', userCredential.user.uid), {
  email,
  name,
  role: 'affiliate',
  referralCode,
  tier: 'bronze',
  commissionEarned: 0,
  totalSales: 0,
  totalClicks: 0,
  wishlist: [],
  purchasedProducts: [],
  emailVerified: false,
  isIndonesian: true,
  createdAt: serverTimestamp()
});
```

### Login Flow

```typescript
// 1. Sign in with Firebase
const userCredential = await signInWithEmailAndPassword(
  auth,
  email,
  password
);

// 2. Get ID token
const token = await userCredential.user.getIdToken();

// 3. Fetch user profile from Firestore
const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
const userData = userDoc.data();

// 4. Update Zustand store
setUser({
  ...userData,
  emailVerified: userCredential.user.emailVerified
});
```

### Protected Routes

```typescript
// Check authentication
if (!user) {
  return <Navigate to="/login" />;
}

// Check email verification
if (!user.emailVerified) {
  return <VerificationRequired />;
}

// Check role
if (user.role !== 'admin') {
  return <div>Access Denied</div>;
}
```

---

## 💳 Payment Integration

### Stripe Checkout Flow

#### 1. Create Checkout Session (Client)

```typescript
const handlePurchase = async () => {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      productId: product.id,
      referralCode: localStorage.getItem('affiliate_ref'),
      couponId: appliedCoupon?.id,
      amount: finalPrice
    })
  });
  
  const { url } = await response.json();
  window.location.href = url; // Redirect to Stripe
};
```

#### 2. Create Checkout Session (Server)

```typescript
app.post('/api/create-checkout-session', verifyAuth, async (req, res) => {
  const { productId, referralCode, couponId, amount } = req.body;
  
  // Get product details
  const productDoc = await admin.firestore()
    .collection('products')
    .doc(productId)
    .get();
  
  const product = productDoc.data();
  
  // Create Stripe session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'idr',
        product_data: {
          name: product.name,
          description: product.description,
          images: [product.image]
        },
        unit_amount: amount * 100 // Convert to cents
      },
      quantity: 1
    }],
    mode: 'payment',
    success_url: `${APP_URL}/?success=true`,
    cancel_url: `${APP_URL}/?canceled=true`,
    metadata: {
      productId,
      buyerId: req.userId,
      referralCode: referralCode || '',
      couponId: couponId || ''
    }
  });
  
  res.json({ url: session.url });
});
```

#### 3. Webhook Handler

```typescript
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { productId, buyerId, referralCode, couponId } = session.metadata;
    
    // 1. Add product to user's purchased products
    await admin.firestore()
      .collection('users')
      .doc(buyerId)
      .update({
        purchasedProducts: admin.firestore.FieldValue.arrayUnion(productId)
      });
    
    // 2. Calculate commission
    let commission = 0;
    if (referralCode) {
      const affiliateQuery = await admin.firestore()
        .collection('users')
        .where('referralCode', '==', referralCode)
        .limit(1)
        .get();
      
      if (!affiliateQuery.empty) {
        const affiliate = affiliateQuery.docs[0];
        const tier = affiliate.data().tier;
        const commissionRate = getCommissionRate(tier);
        commission = session.amount_total / 100 * commissionRate;
        
        // Update affiliate stats
        await affiliate.ref.update({
          commissionEarned: admin.firestore.FieldValue.increment(commission),
          totalSales: admin.firestore.FieldValue.increment(1)
        });
      }
    }
    
    // 3. Create sale record
    await admin.firestore().collection('sales').add({
      productId,
      buyerId,
      affiliateId: referralCode ? affiliateQuery.docs[0].id : null,
      amount: session.amount_total / 100,
      commission,
      couponId: couponId || null,
      status: 'completed',
      stripeSessionId: session.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // 4. Send email notification
    await sendPurchaseEmail(buyerId, productId);
  }
  
  res.json({ received: true });
});
```

---

## 🌓 Dark Mode Implementation

### Tailwind Configuration

```javascript
// tailwind.config.js
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#1F6F5F',
          DEFAULT: '#2FA084',
          light: '#6FCF97'
        }
      }
    }
  }
}
```

### Store Implementation

```typescript
// src/store/useStore.ts
export const useStore = create<AppState>((set, get) => {
  // Initialize from localStorage
  const initialDarkMode = typeof window !== 'undefined' 
    ? localStorage.getItem('darkMode') === 'true' 
    : false;
  
  // Apply class immediately
  if (typeof window !== 'undefined') {
    if (initialDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  
  return {
    isDarkMode: initialDarkMode,
    
    toggleDarkMode: () => {
      const newMode = !get().isDarkMode;
      set({ isDarkMode: newMode });
      localStorage.setItem('darkMode', String(newMode));
      
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };
});
```

### Component Usage

```typescript
// Light mode: bg-white text-gray-900
// Dark mode: dark:bg-gray-800 dark:text-white

<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  <h1 className="text-gray-900 dark:text-white">Title</h1>
  <p className="text-gray-600 dark:text-gray-400">Description</p>
  <button className="bg-[#1F6F5F] dark:bg-[#2FA084] text-white">
    Button
  </button>
</div>
```

---

## ⚡ Performance Optimization

### Code Splitting

```typescript
// Lazy load components
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AffiliateDashboard = lazy(() => import('./components/AffiliateDashboard'));

// Use with Suspense
<Suspense fallback={<Loading />}>
  <AdminDashboard />
</Suspense>
```

### Memoization

```typescript
// Memo expensive calculations
const expensiveValue = useMemo(() => {
  return products.filter(p => p.price > 100000);
}, [products]);

// Memo components
const ProductCard = memo(({ product }) => {
  return <div>{product.name}</div>;
});
```

### Debouncing

```typescript
// Debounce search input
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 500);

useEffect(() => {
  if (debouncedSearch) {
    searchProducts(debouncedSearch);
  }
}, [debouncedSearch]);
```

### Image Optimization

```typescript
// Lazy load images
<img 
  src={product.image} 
  loading="lazy"
  alt={product.name}
/>

// Use srcset for responsive images
<img 
  src={product.image}
  srcSet={`${product.image}?w=400 400w, ${product.image}?w=800 800w`}
  sizes="(max-width: 768px) 400px, 800px"
/>
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Firebase Connection Error
```
Error: Firebase: Error (auth/network-request-failed)
```

**Solution:**
- Check internet connection
- Verify Firebase config in `.env.local`
- Check Firebase project status

#### 2. Stripe Webhook Not Working
```
Error: No signatures found matching the expected signature
```

**Solution:**
- Verify webhook secret in `.env.local`
- Use Stripe CLI for local testing:
```bash
stripe listen --forward-to localhost:3000/api/webhook
```

#### 3. Dark Mode Not Persisting
```
Dark mode resets on page refresh
```

**Solution:**
- Check localStorage is enabled
- Verify store initialization
- Check browser console for errors

#### 4. Products Not Loading
```
Products array is empty
```

**Solution:**
- Check Firestore rules
- Verify products collection exists
- Check browser console for errors
- Verify Firebase indexes

#### 5. Email Not Sending
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Solution:**
- Use App Password (not regular password)
- Enable "Less secure app access" (Gmail)
- Check EMAIL_USER and EMAIL_PASS in `.env.local`

### Debug Mode

Enable debug logging:

```typescript
// Add to store
console.log('[Store] Action:', action, data);

// Add to API calls
console.log('[API] Request:', endpoint, body);
console.log('[API] Response:', response);

// Add to Firebase operations
console.log('[Firebase] Query:', query);
console.log('[Firebase] Result:', result);
```

### Performance Profiling

```typescript
// React DevTools Profiler
import { Profiler } from 'react';

<Profiler id="ProductList" onRender={onRenderCallback}>
  <ProductList />
</Profiler>

function onRenderCallback(
  id, phase, actualDuration, baseDuration, startTime, commitTime
) {
  console.log(`${id} took ${actualDuration}ms to render`);
}
```

---

## 📚 Additional Resources

### Documentation
- [React Documentation](https://react.dev)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

### Tools
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Firebase Console](https://console.firebase.google.com)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Vite DevTools](https://vitejs.dev/guide/)

---

**Last Updated:** April 2026
