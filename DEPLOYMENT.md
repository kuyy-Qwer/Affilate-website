# Deployment Guide: Firebase → Supabase + Vercel

## Completed Steps ✅

1. **Removed Firebase dependencies**
   - Deleted `firebase.ts` and `firebase-applet-config.json`
   - Uninstalled `firebase` and `firebase-admin` packages
   - Created `supabase.ts` client library

2. **Created Supabase schema**
   - `supabase-schema.sql` contains all tables (users, products, orders, etc.)
   - Row Level Security (RLS) policies included
   - Indexes for performance

3. **Updated backend (`server.ts`)**
   - Migrated from Firebase Admin to Supabase client
   - Authentication via Supabase JWT tokens
   - Products API (GET, POST, PUT, DELETE)

4. **Created Vercel entry point**
   - `api/index.ts` for serverless deployment
   - Includes auth routes (register, login, logout)
   - Stripe webhook endpoint
   - Stripe checkout session creation

5. **Updated frontend auth**
   - `useStore.ts` - Migrated from Firebase Auth to Supabase Auth
   - `App.tsx` - Uses Supabase for logout
   - `AuthForms.tsx` - Login/Register with Supabase
   - `ResetPassword.tsx` - Password reset with Supabase

6. **Created Vercel configuration**
   - `vercel.json` configured for API routes and static build

## Next Steps 🚀

### 1. **Set up Supabase Project**
```bash
# Go to https://app.supabase.com
# Create new project
# Run the SQL in supabase-schema.sql in the SQL Editor
# Get your project URL and keys from Project Settings > API
```

### 2. **Environment Variables**

Create `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. **Deploy to Vercel**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Or use CLI:
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add SUPABASE_ANON_KEY
vercel env add STRIPE_SECRET_KEY
```

### 4. **Still Need to Migrate (Frontend Components)**

Components that still need Firebase → Supabase migration:
- `AdminDashboard.tsx` - Already uses API ✅
- `EmailTemplateManager.tsx` - Already uses API ✅
- `UserAccessManager.tsx` - Already uses API ✅
- `BlogManager.tsx` - Already uses API ✅
- `TierManagementUI.tsx` - Already uses API ✅
- `StaticPageManager.tsx` - Already uses API ✅
- `MediaManager.tsx` - Already uses API ✅
- `BannerManager.tsx` - Already uses API ✅
- `FraudAlertDashboard.tsx` - Already uses API ✅
- `PayoutMethodManagementUI.tsx` - Already uses API ✅
- `SessionManagement.tsx` - Already uses API ✅
- `Admin2FA.tsx` - Already uses API ✅
- `RevenueDashboard.tsx` - Already uses API ✅
- `ConversionFunnel.tsx` - Already uses API ✅

### 5. **Remaining Tasks**

- [ ] Run Supabase schema SQL in your Supabase project
- [ ] Update all frontend components to use Supabase client instead of direct API calls
- [ ] Set up Stripe webhook endpoint in Stripe dashboard
- [ ] Configure OAuth providers in Supabase (Google, etc.)
- [ ] Test authentication flow
- [ ] Migrate existing Firebase data to Supabase (if needed)
- [ ] Remove old `server.ts` Firebase-based code (already done ✅)

## Quick Test

```bash
# Install dependencies
npm install

# Run development server (uses Supabase)
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

## Notes

- Frontend components should now use `supabase` client from `src/lib/supabase.ts`
- Backend APIs are in `api/index.ts` for Vercel serverless
- Authentication uses Supabase JWT tokens
- All data operations go through Supabase client in backend
