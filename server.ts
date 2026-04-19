import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import admin from 'firebase-admin';
import firebaseConfig from './firebase-applet-config.json';
import { z } from 'zod';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), 
    projectId: firebaseConfig.projectId
  });
}

const db = admin.firestore();

// --- Security Middleware ---

// Extend Express Request to include user info
interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
  userProfile?: any;
}

const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    
    // Fetch user profile to check roles
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (userDoc.exists) {
      req.userProfile = userDoc.data();
    }
    
    next();
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.userProfile?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

// --- Input Validation Schemas ---

const purchaseSchema = z.object({
  productId: z.string().min(1),
  buyerId: z.string().min(1),
  buyerEmail: z.string().email(),
  referralCode: z.string().nullable().optional(),
  couponId: z.string().nullable().optional(),
  amount: z.number().positive()
});

const clickSchema = z.object({
  referralCode: z.string().min(1)
});

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  newRole: z.enum(['admin', 'affiliate', 'customer'])
});

const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  isIndonesian: z.boolean().optional()
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Handle Purchase & Commission Allocation
  app.post('/api/purchase', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = purchaseSchema.parse(req.body);
      const { productId, buyerId, buyerEmail, referralCode, couponId, amount: clientAmount } = validatedData;
      
      const fs = admin.firestore();
      
      // 1. Get Product Details, Global Config, and Buyer Profile
      const [productSnap, configSnap, buyerSnap] = await Promise.all([
        fs.collection('products').doc(productId).get(),
        fs.collection('settings').doc('global').get(),
        fs.collection('users').doc(req.user!.uid).get()
      ]);

      if (!productSnap.exists) return res.status(404).json({ error: 'Product not found' });
      const product = productSnap.data();
      const config = configSnap.exists ? configSnap.data() : null;
      const buyerProfile = buyerSnap.exists ? buyerSnap.data() : null;

      // 2. Pricing Algorithm
      let basePrice = product?.price || 0;
      let finalPrice = basePrice;

      // a. Geo-Pricing
      if (config?.geoPricingActive) {
        const multiplier = buyerProfile?.isIndonesian !== false ? (config.idrMultiplier || 1) : (config.foreignMultiplier || 1.2);
        finalPrice = finalPrice * multiplier;
      }

      // b. Global Promo (Event)
      if (config?.promoActive) {
        const now = new Date();
        const start = new Date(config.promoStart);
        const end = new Date(config.promoEnd);
        if (now >= start && now <= end) {
          finalPrice = finalPrice - (finalPrice * (config.promoDiscount / 100));
        }
      }

      finalPrice = Math.round(finalPrice);

      // c. Coupon Discount
      if (couponId) {
        const couponSnap = await fs.collection('coupons').doc(couponId).get();
        if (couponSnap.exists) {
          const coupon = couponSnap.data();
          if (coupon?.isActive) {
             if (coupon.discountType === 'percentage') {
               finalPrice = finalPrice - (finalPrice * (coupon.discountValue / 100));
             } else {
               finalPrice = Math.max(0, finalPrice - coupon.discountValue);
             }
          }
        }
      }

      finalPrice = Math.round(finalPrice);

      // Verification (Security Check: Client shouldn't spoof price)
      if (Math.abs(finalPrice - clientAmount) > 10) { // Allow minor rounding diff
         console.warn(`Price mismatch: Server ${finalPrice} vs Client ${clientAmount}`);
         // We'll trust server price for actual transaction logs
      }

      let affiliateId = null;
      let commission = 0;
      const commissionRate = 0.1; // 10% Commission

      // 3. Find Affiliate by Referral Code
      if (referralCode) {
        const affiliateQuery = await fs.collection('users')
          .where('referralCode', '==', referralCode)
          .limit(1)
          .get();
        
        if (!affiliateQuery.empty) {
          const affiliateDoc = affiliateQuery.docs[0];
          affiliateId = affiliateDoc.id;
          commission = Math.floor(finalPrice * commissionRate);
        }
      }

      // 4. Create Sale Document & Update Affiliate Stats atomically
      const batch = fs.batch();
      const saleRef = fs.collection('sales').doc();
      
      batch.set(saleRef, {
        productId,
        productName: product?.name,
        buyerId,
        buyerEmail,
        affiliateId,
        amount: finalPrice,
        commission,
        createdAt: new Date().toISOString()
      });

      if (affiliateId) {
        const affiliateRef = fs.collection('users').doc(affiliateId);
        batch.update(affiliateRef, {
          commissionEarned: admin.firestore.FieldValue.increment(commission),
          totalSales: admin.firestore.FieldValue.increment(1)
        });
      }

      await batch.commit();
      res.json({ success: true, saleId: saleRef.id, commissionAllocated: commission });

    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: err.issues });
      }
      console.error('Purchase Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Track Referral Click (Non-authenticated but validated)
  app.post('/api/click', async (req, res) => {
    try {
      const { referralCode } = clickSchema.parse(req.body);
      const fs = admin.firestore();
      const userQuery = await fs.collection('users').where('referralCode', '==', referralCode).limit(1).get();
      
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        await fs.collection('users').doc(userDoc.id).update({
          totalClicks: admin.firestore.FieldValue.increment(1)
        });
        return res.json({ success: true });
      }
      res.status(404).json({ error: 'Affiliate not found' });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: err.issues });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Fetch All Users (Admin only)
  app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
    try {
      const fs = admin.firestore();
      const usersSnap = await fs.collection('users').orderBy('createdAt', 'desc').get();
      const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Update User Role (Admin only)
  app.post('/api/admin/update-role', authenticate, requireAdmin, async (req, res) => {
    try {
      const { userId, newRole } = updateRoleSchema.parse(req.body);
      const fs = admin.firestore();
      await fs.collection('users').doc(userId).update({
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: err.issues });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Update User Details (Admin only)
  app.post('/api/admin/update-user', authenticate, requireAdmin, async (req, res) => {
    try {
      const { userId, name, email } = updateUserSchema.parse(req.body);
      const fs = admin.firestore();
      await fs.collection('users').doc(userId).update({
        name,
        email,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: err.issues });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Update Own Profile
  app.post('/api/user/update-profile', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, email, isIndonesian } = updateUserSchema.parse({ ...req.body, userId: req.user?.uid });
      const fs = admin.firestore();
      await fs.collection('users').doc(req.user!.uid).update({
        name,
        email,
        isIndonesian: isIndonesian ?? true,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: err.issues });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
