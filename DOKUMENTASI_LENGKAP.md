# 📚 DOKUMENTASI LENGKAP - DigiSell Platform

## 🎯 Deskripsi Aplikasi

**DigiSell** adalah platform marketplace produk digital dengan sistem afiliasi terintegrasi. Platform ini memungkinkan:
- **Admin** untuk mengelola produk digital, user, penjualan, dan sistem
- **Affiliate** untuk mempromosikan produk dan mendapatkan komisi
- **Customer** untuk membeli produk digital dengan sistem pembayaran Stripe

---

## 🏗️ Arsitektur Aplikasi

### Stack Teknologi

#### **Frontend**
- **React 19** - Library UI modern dengan concurrent features
- **TypeScript** - Type safety dan better developer experience
- **Vite** - Build tool yang sangat cepat
- **Tailwind CSS v4** - Utility-first CSS framework
- **Zustand** - State management yang ringan dan simple
- **Motion (Framer Motion)** - Animasi dan transisi yang smooth
- **Recharts** - Library untuk visualisasi data (charts)
- **React Hook Form** - Form management dengan validasi
- **React Helmet Async** - SEO management
- **Lucide React** - Icon library modern

#### **Backend**
- **Node.js + Express** - Server backend
- **TypeScript** - Type safety di backend
- **Firebase Admin SDK** - Server-side Firebase operations
- **Stripe** - Payment gateway untuk transaksi
- **Nodemailer** - Email service untuk notifikasi

#### **Database & Auth**
- **Firebase Firestore** - NoSQL database real-time
- **Firebase Authentication** - User authentication & authorization
- **Firebase Storage** - File storage untuk gambar produk

#### **Deployment & Tools**
- **Vite PWA Plugin** - Progressive Web App support
- **Express Rate Limit** - API rate limiting
- **Zod** - Schema validation
- **dotenv** - Environment variable management

---

## 📁 Struktur Folder

```
Affilate-website/
├── src/
│   ├── components/          # React components
│   │   ├── AdminDashboard.tsx
│   │   ├── AuthForms.tsx
│   │   ├── DashboardLayout.tsx
│   │   ├── DarkModeInfo.tsx
│   │   ├── Navbar.tsx
│   │   ├── PurchasesView.tsx
│   │   └── UserAccessManager.tsx
│   ├── lib/
│   │   └── firebase.ts      # Firebase configuration
│   ├── store/
│   │   └── useStore.ts      # Zustand global state
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   ├── index.css            # Global styles
│   └── types.ts             # TypeScript type definitions
├── public/                  # Static assets
├── dist/                    # Build output
├── server.ts                # Express backend server
├── .env.local               # Environment variables (local)
├── .env.example             # Environment variables template
├── firebase.json            # Firebase configuration
├── firestore.rules          # Firestore security rules
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── vite.config.ts           # Vite configuration
```

---

## 🎨 Fitur Utama

### 1. **Sistem Autentikasi**

#### Registrasi User
- Email & password authentication
- Email verification otomatis
- Auto-generate referral code unik
- Role assignment (affiliate/admin)

#### Login
- Email & password login
- Session management dengan Firebase Auth
- Auto-redirect ke dashboard sesuai role

#### Email Verification
- Email verifikasi otomatis saat registrasi
- Resend verification email
- Blocking akses fitur premium sebelum verifikasi

**Teknologi:**
- Firebase Authentication
- Nodemailer untuk email
- Zustand untuk state management

---

### 2. **Dashboard Admin**

#### Manajemen Produk
- **CRUD Produk Digital**
  - Create: Upload gambar, set harga, kategori, deskripsi
  - Read: List semua produk dengan search & filter
  - Update: Edit detail produk
  - Delete: Hapus produk (soft delete)
  
- **Fitur Produk:**
  - Upload gambar produk
  - Set harga & kategori
  - Deskripsi lengkap
  - Marketing kit (banner, swipe files)
  - Review & rating system
  - Stock management

#### Manajemen User
- View semua user (affiliate & customer)
- Edit user role & tier
- Block/unblock user
- View user statistics
- Export user data (CSV)

#### Manajemen Penjualan
- View semua transaksi
- Filter by date, product, user
- Export sales report (CSV, PDF)
- Sales analytics & charts
- Commission tracking

#### Manajemen Kupon
- Create discount coupons
- Set discount type (percentage/fixed)
- Set expiry date
- Usage limit per user
- Track coupon usage

#### Manajemen Withdrawal
- View withdrawal requests
- Approve/reject withdrawals
- Track payment status
- Export withdrawal reports

#### Event Management
- Create promotional events
- Set event duration
- Global discount settings
- Geo-pricing (Indonesia vs International)

#### Activity Logs
- Track all admin actions
- User activity monitoring
- System event logging
- Export logs for audit

**Teknologi:**
- React components dengan TypeScript
- Firestore untuk database
- Recharts untuk visualisasi data
- jsPDF untuk export PDF
- PapaParse untuk export CSV

---

### 3. **Dashboard Affiliate**

#### Statistik Real-time
- Total clicks on referral link
- Total sales generated
- Total commission earned
- Conversion rate (CTR)

#### Referral System
- Unique referral link
- Cookie tracking (30 days)
- Auto-commission calculation
- Multi-tier commission (Bronze, Silver, Gold, Diamond)

#### Marketing Tools
- Pre-made banners
- Swipe files (copywriting templates)
- Social media templates
- Email templates

#### Leaderboard
- Top 10 affiliates ranking
- Real-time updates
- Gamification elements

#### Withdrawal System
- Request commission withdrawal
- Multiple payment methods
- Track withdrawal status
- Minimum withdrawal amount

#### Sales History
- View all referred sales
- Filter by date & product
- Commission breakdown
- Export reports

**Teknologi:**
- Zustand untuk state management
- Recharts untuk charts
- Motion untuk animasi
- Firebase real-time updates

---

### 4. **Landing Page & Marketplace**

#### Hero Section
- Animated hero dengan gradient
- CTA buttons
- Feature highlights
- Responsive design

#### Product Catalog
- Grid layout produk
- Product cards dengan hover effects
- Quick view modal
- Add to wishlist
- Filter & search (coming soon)

#### Product Detail Modal
- Full product information
- Image gallery
- Reviews & ratings
- Related products
- Buy now CTA

#### Pricing Plans
- 3 tier plans (Starter, Business, Enterprise)
- Feature comparison table
- Commission rates
- Upgrade options

#### Features Section
- Platform features showcase
- Icon-based layout
- Animated on scroll

#### About Page
- Company mission & vision
- Team members
- Statistics showcase
- Contact information

**Teknologi:**
- Motion untuk animasi
- Tailwind CSS untuk styling
- React Helmet untuk SEO
- Lazy loading untuk performance

---

### 5. **Sistem Pembayaran**

#### Stripe Integration
- Secure checkout session
- Multiple payment methods
- Automatic invoice generation
- Webhook untuk payment confirmation

#### Payment Flow
1. User klik "Beli Sekarang"
2. Modal checkout muncul
3. Apply coupon (optional)
4. Redirect ke Stripe checkout
5. Payment processing
6. Webhook confirmation
7. Product access granted
8. Email notification sent

#### Commission Calculation
- Auto-calculate affiliate commission
- Multi-tier commission rates
- Coupon discount handling
- Geo-pricing support

**Teknologi:**
- Stripe API
- Express webhook handler
- Firebase Cloud Functions (optional)
- Nodemailer untuk notifikasi

---

### 6. **Sistem Review & Rating**

#### Features
- 5-star rating system
- Text review
- Only verified buyers can review
- Average rating calculation
- Review count display

#### Review Display
- Product detail modal
- Product cards
- Sorting by date/rating
- Helpful votes (coming soon)

**Teknologi:**
- Firestore untuk storage
- React state management
- Real-time updates

---

### 7. **Wishlist System**

#### Features
- Add/remove products
- Persistent storage
- Quick access from navbar
- Empty state handling
- Direct purchase from wishlist

**Teknologi:**
- Firestore user document
- Zustand state management
- Optimistic UI updates

---

### 8. **Dark Mode**

#### Features
- Toggle light/dark theme
- Persistent preference (localStorage)
- Smooth transitions
- All components support dark mode
- System preference detection (coming soon)

#### Implementation
- Tailwind CSS dark mode classes
- Zustand state management
- localStorage persistence
- Document class manipulation

**Teknologi:**
- Tailwind CSS `dark:` variants
- Zustand store
- localStorage API

---

### 9. **Responsive Design**

#### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

#### Features
- Mobile-first approach
- Touch-friendly UI
- Hamburger menu
- Responsive grids
- Adaptive typography

**Teknologi:**
- Tailwind CSS responsive utilities
- CSS Grid & Flexbox
- Media queries

---

### 10. **PWA (Progressive Web App)**

#### Features
- Installable on mobile/desktop
- Offline support (coming soon)
- App-like experience
- Custom icons & splash screen
- Service worker

**Teknologi:**
- Vite PWA Plugin
- Service Worker
- Web App Manifest

---

## 🔐 Keamanan

### Authentication & Authorization
- Firebase Authentication
- JWT tokens
- Role-based access control (RBAC)
- Email verification required

### API Security
- Rate limiting (Express Rate Limit)
- CORS configuration
- Input validation (Zod)
- SQL injection prevention (Firestore)
- XSS protection

### Data Security
- Firestore security rules
- Environment variables for secrets
- HTTPS only (production)
- Secure cookie handling

### Payment Security
- Stripe PCI compliance
- No credit card data stored
- Webhook signature verification
- Secure checkout session

---

## 🗄️ Database Schema

### Collections

#### **users**
```typescript
{
  id: string;                    // User ID (Firebase Auth UID)
  email: string;                 // Email address
  name: string;                  // Full name
  role: 'affiliate' | 'admin';   // User role
  referralCode: string;          // Unique referral code
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  commissionEarned: number;      // Total commission
  totalSales: number;            // Total sales count
  totalClicks: number;           // Total referral clicks
  wishlist: string[];            // Product IDs
  purchasedProducts: string[];   // Purchased product IDs
  emailVerified: boolean;        // Email verification status
  isIndonesian: boolean;         // For geo-pricing
  createdAt: Timestamp;
}
```

#### **products**
```typescript
{
  id: string;                    // Product ID
  name: string;                  // Product name
  description: string;           // Product description
  price: number;                 // Base price (IDR)
  category: string;              // Product category
  image: string;                 // Image URL
  averageRating: number;         // Average rating (0-5)
  reviewCount: number;           // Total reviews
  marketingKit: {
    banners: string[];           // Banner URLs
    swipeFiles: Array<{
      title: string;
      content: string;
    }>;
  };
  modules: Array<{               // LMS modules
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    duration: number;
    order: number;
  }>;
  createdAt: Timestamp;
}
```

#### **sales**
```typescript
{
  id: string;                    // Sale ID
  productId: string;             // Product ID
  productName: string;           // Product name
  buyerId: string;               // Buyer user ID
  buyerEmail: string;            // Buyer email
  affiliateId: string;           // Affiliate user ID (if any)
  amount: number;                // Sale amount
  commission: number;            // Affiliate commission
  couponId: string;              // Coupon ID (if used)
  status: 'pending' | 'completed' | 'refunded';
  stripeSessionId: string;       // Stripe session ID
  createdAt: Timestamp;
}
```

#### **coupons**
```typescript
{
  id: string;                    // Coupon ID
  code: string;                  // Coupon code (uppercase)
  discountType: 'percentage' | 'fixed';
  discountValue: number;         // Discount amount
  expiryDate: string;            // Expiry date (YYYY-MM-DD)
  usageLimitPerUser: number;     // Max uses per user
  isActive: boolean;             // Active status
  createdAt: Timestamp;
}
```

#### **reviews**
```typescript
{
  id: string;                    // Review ID
  productId: string;             // Product ID
  userId: string;                // User ID
  userName: string;              // User name
  rating: number;                // Rating (1-5)
  comment: string;               // Review text
  createdAt: Timestamp;
}
```

#### **withdrawals**
```typescript
{
  id: string;                    // Withdrawal ID
  userId: string;                // User ID
  amount: number;                // Withdrawal amount
  paymentMethod: string;         // Payment method
  paymentDetails: string;        // Payment details
  status: 'pending' | 'approved' | 'rejected';
  processedAt: Timestamp;
  createdAt: Timestamp;
}
```

#### **settings/global**
```typescript
{
  promoActive: boolean;          // Global promo active
  promoDiscount: number;         // Promo discount %
  promoStart: string;            // Start date
  promoEnd: string;              // End date
  geoPricingActive: boolean;     // Geo-pricing active
  idrMultiplier: number;         // Indonesia price multiplier
  foreignMultiplier: number;     // Foreign price multiplier
}
```

#### **activityLogs**
```typescript
{
  id: string;                    // Log ID
  userId: string;                // User ID
  userName: string;              // User name
  action: string;                // Action description
  details: string;               // Action details
  timestamp: Timestamp;
}
```

---

## 🔄 API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user (handled by Firebase)

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### Sales
- `POST /api/create-checkout-session` - Create Stripe checkout
- `POST /api/webhook` - Stripe webhook handler
- `GET /api/sales` - Get user sales

### Reviews
- `GET /api/products/:id/reviews` - Get product reviews
- `POST /api/products/:id/reviews` - Create review

### User
- `POST /api/user/update-profile` - Update user profile
- `GET /api/user/stats` - Get user statistics

### Admin
- `GET /api/admin/users` - Get all users (admin only)
- `PUT /api/admin/users/:id` - Update user (admin only)
- `GET /api/admin/sales` - Get all sales (admin only)
- `POST /api/admin/coupons` - Create coupon (admin only)
- `GET /api/admin/withdrawals` - Get withdrawals (admin only)
- `PUT /api/admin/withdrawals/:id` - Process withdrawal (admin only)

### Tracking
- `POST /api/click` - Track referral click

---

## 🎨 Design System

### Color Palette

#### Primary Colors (Teal Green)
- **Dark Teal**: `#1F6F5F` - Primary buttons, headings
- **Medium Teal**: `#2FA084` - Hover states, accents
- **Light Green**: `#6FCF97` - Highlights, badges

#### Neutral Colors
- **Gray 50**: `#F9FAFB` - Light background
- **Gray 100**: `#F3F4F6` - Card background
- **Gray 500**: `#6B7280` - Secondary text
- **Gray 900**: `#111827` - Primary text

#### Dark Mode Colors
- **Gray 800**: `#1F2937` - Dark background
- **Gray 900**: `#111827` - Darker background
- **White**: `#FFFFFF` - Dark mode text

#### Semantic Colors
- **Success**: `#10B981` - Green
- **Warning**: `#F59E0B` - Amber
- **Error**: `#EF4444` - Red
- **Info**: `#3B82F6` - Blue

### Typography

#### Font Family
- **Primary**: System font stack (sans-serif)
- **Mono**: Monospace for code/IDs

#### Font Sizes
- **xs**: 0.75rem (12px)
- **sm**: 0.875rem (14px)
- **base**: 1rem (16px)
- **lg**: 1.125rem (18px)
- **xl**: 1.25rem (20px)
- **2xl**: 1.5rem (24px)
- **3xl**: 1.875rem (30px)
- **4xl**: 2.25rem (36px)
- **5xl**: 3rem (48px)

#### Font Weights
- **medium**: 500
- **semibold**: 600
- **bold**: 700
- **extrabold**: 800
- **black**: 900

### Spacing
- Tailwind default spacing scale (0.25rem increments)
- Custom spacing for specific components

### Border Radius
- **sm**: 0.125rem (2px)
- **DEFAULT**: 0.25rem (4px)
- **md**: 0.375rem (6px)
- **lg**: 0.5rem (8px)
- **xl**: 0.75rem (12px)
- **2xl**: 1rem (16px)
- **3xl**: 1.5rem (24px)
- **full**: 9999px (circle)

### Shadows
- **sm**: Small shadow for cards
- **DEFAULT**: Medium shadow
- **lg**: Large shadow for modals
- **xl**: Extra large shadow
- **2xl**: Maximum shadow

---

## 🚀 Performance Optimizations

### Code Splitting
- Route-based code splitting
- Lazy loading components
- Dynamic imports

### Bundle Optimization
- Vite build optimization
- Tree shaking
- Minification
- Compression

### Image Optimization
- Lazy loading images
- Responsive images
- WebP format (coming soon)
- CDN delivery (Firebase Storage)

### Caching
- Browser caching
- Service worker caching (PWA)
- API response caching

### Database Optimization
- Firestore indexes
- Query optimization
- Pagination (coming soon)
- Real-time listeners optimization

---

## 🧪 Testing

### Manual Testing Checklist

#### Authentication
- [ ] Register new user
- [ ] Login with email/password
- [ ] Email verification
- [ ] Logout
- [ ] Password reset (coming soon)

#### Product Management (Admin)
- [ ] Create product
- [ ] Edit product
- [ ] Delete product
- [ ] Upload image
- [ ] View product list

#### Purchase Flow
- [ ] View product catalog
- [ ] Add to wishlist
- [ ] View product detail
- [ ] Apply coupon
- [ ] Complete purchase
- [ ] Receive email confirmation

#### Affiliate System
- [ ] Generate referral link
- [ ] Track clicks
- [ ] Track sales
- [ ] Calculate commission
- [ ] Request withdrawal

#### Dark Mode
- [ ] Toggle dark mode
- [ ] Persist preference
- [ ] All components support dark mode

---

## 📦 Deployment

### Environment Variables

#### Required Variables
```env
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Firebase Admin (Server)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Email
EMAIL_USER=
EMAIL_PASS=

# App
APP_URL=http://localhost:3000
PORT=3000
```

### Build Commands

#### Development
```bash
npm run dev
```

#### Production Build
```bash
npm run build
```

#### Preview Production Build
```bash
npm run preview
```

### Deployment Platforms

#### Recommended
- **Vercel** - Best for Next.js/React apps
- **Netlify** - Easy deployment with CI/CD
- **Railway** - Full-stack deployment
- **Render** - Free tier available

#### Firebase Hosting
```bash
firebase deploy --only hosting
```

---

## 🔧 Configuration Files

### `vite.config.ts`
- React plugin
- Tailwind CSS plugin
- PWA plugin
- Build optimization
- Path aliases

### `tailwind.config.js`
- Dark mode: 'class'
- Custom colors
- Content paths
- Plugins

### `tsconfig.json`
- TypeScript compiler options
- Path mappings
- Strict mode enabled

### `firebase.json`
- Hosting configuration
- Firestore rules
- Emulator settings

### `firestore.rules`
- Security rules
- Access control
- Data validation

---

## 📚 Dependencies Explanation

### Production Dependencies

#### Core
- **react** & **react-dom**: UI library
- **typescript**: Type safety
- **vite**: Build tool

#### State & Routing
- **zustand**: Global state management
- **react-router-dom**: Client-side routing

#### UI & Styling
- **tailwindcss**: Utility-first CSS
- **motion**: Animations
- **lucide-react**: Icons
- **recharts**: Charts

#### Forms & Validation
- **react-hook-form**: Form management
- **zod**: Schema validation

#### Firebase
- **firebase**: Client SDK
- **firebase-admin**: Server SDK

#### Payment
- **stripe**: Payment processing

#### Utilities
- **jspdf**: PDF generation
- **papaparse**: CSV parsing
- **react-helmet-async**: SEO
- **react-joyride**: Onboarding tour

### Dev Dependencies
- **@types/**: TypeScript type definitions
- **autoprefixer**: CSS vendor prefixes

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. Dark mode toggle belum sempurna di semua browser
2. Pagination belum diimplementasi (akan lambat jika produk banyak)
3. Search & filter produk belum ada
4. Password reset belum diimplementasi
5. Social login belum ada
6. Real-time notifications belum ada
7. Chat support belum ada
8. Multi-language belum ada

### Planned Features
- [ ] Advanced search & filter
- [ ] Product categories
- [ ] Bulk operations (admin)
- [ ] Advanced analytics
- [ ] Email templates customization
- [ ] SMS notifications
- [ ] Social media integration
- [ ] Affiliate leaderboard prizes
- [ ] Referral contests
- [ ] Product bundles
- [ ] Subscription products
- [ ] Affiliate training materials

---

## 📞 Support & Maintenance

### Monitoring
- Firebase Console untuk database
- Stripe Dashboard untuk payments
- Browser DevTools untuk debugging
- Console logs untuk tracking

### Backup
- Firestore automatic backups
- Export data regularly
- Version control (Git)

### Updates
- Regular dependency updates
- Security patches
- Feature additions
- Bug fixes

---

## 📄 License

Apache-2.0 License

---

## 👥 Credits

### Technologies Used
- React Team
- Firebase Team
- Stripe Team
- Tailwind Labs
- Vercel (Vite)
- All open-source contributors

---

## 📝 Changelog

### Version 1.0.0 (Current)
- Initial release
- Complete marketplace functionality
- Affiliate system
- Admin dashboard
- Dark mode support
- PWA support
- Stripe integration
- Email notifications

---

**Dokumentasi ini akan terus diupdate seiring perkembangan aplikasi.**

*Last updated: April 2026*
