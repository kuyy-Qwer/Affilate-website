import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import admin from 'firebase-admin';
import firebaseConfig from './firebase-applet-config.json';
import { z } from 'zod';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import serviceAccount from './serviceAccountKey.json';

// --- Utilities ---
const generateLicenseKey = (prefix: string = 'DS') => {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    parts.push(crypto.randomBytes(2).toString('hex').toUpperCase());
  }
  return `${prefix}-${parts.join('-')}`;
};

const generateSecureToken = () => crypto.randomBytes(32).toString('hex');


// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount), 
    projectId: firebaseConfig.projectId
  });
}

const db = admin.firestore();

// Late initialize Stripe
let stripeClient: Stripe | null = null;
const getStripe = () => {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is required');
    stripeClient = new Stripe(key, { apiVersion: '2025-02-24' as any });
  }
  return stripeClient;
};

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

const requireAffiliate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const role = req.userProfile?.role;
  if (role !== 'affiliate' && role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Affiliate access required' });
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

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(3).max(1000)
});

const sendConfirmationEmail = async (to: string, productName: string, amount: number, deliveryInfo?: { licenseKey?: string, downloadLink?: string }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[EMAIL MOCK] To: ${to}, Product: ${productName}, Amount: Rp ${amount.toLocaleString('id-ID')}`);
    if (deliveryInfo) {
      console.log(`[EMAIL MOCK] Delivery:`, deliveryInfo);
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"DigiAffiliate Store" <${process.env.SMTP_USER}>`,
      to,
      subject: `Konfirmasi Pembelian: ${productName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
          <h2 style="color: #4f46e5; text-align: center;">Terima Kasih Atas Pembelian Anda!</h2>
          <p>Halo,</p>
          <p>Terima kasih telah berbelanja di DigiAffiliate Store. Pesanan Anda untuk produk <strong>${productName}</strong> telah berhasil dikonfirmasi.</p>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 14px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em;">Total Transaksi</p>
            <p style="margin: 0; font-size: 32px; font-weight: 800; color: #4f46e5;">Rp ${amount.toLocaleString('id-ID')}</p>
          </div>

          ${deliveryInfo?.licenseKey ? `
          <div style="background: #eef2ff; border: 2px dashed #4f46e5; padding: 15px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #4f46e5; font-size: 12px; font-weight: bold; text-transform: uppercase;">License Key / Serial Number</p>
            <code style="font-size: 18px; font-weight: bold; color: #1e1b4b; background: white; padding: 5px 10px; border-radius: 4px;">${deliveryInfo.licenseKey}</code>
          </div>
          ` : ''}

          ${deliveryInfo?.downloadLink ? `
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">Klik tombol di bawah untuk mengunduh produk Anda (link aktif 24 jam):</p>
            <a href="${deliveryInfo.downloadLink}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Unduh Produk</a>
          </div>
          ` : `
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://${process.env.APP_DOMAIN || 'digiaffiliate.com'}/dashboard" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Pergi ke My Products</a>
          </div>
          `}

          <p style="margin-top: 40px; font-size: 12px; color: #9ca3af; text-align: center;">Jika Anda memiliki pertanyaan, silakan hubungi tim support kami.</p>
        </div>
      `,
    });
    console.log(`Confirmation email sent to ${to}`);
  } catch (err) {
    console.error('Email Error:', err);
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe Webhook MUST be before express.json() to get raw body
  app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (!sig || !endpointSecret) throw new Error('Missing stripe signature or secret');
      event = getStripe().webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error('Webhook Error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      if (metadata) {
        const { productId, buyerId, buyerEmail, referralCode, couponId, finalPrice, commission } = metadata;

        const fs = admin.firestore();
        const batch = fs.batch();
        const saleRef = fs.collection('sales').doc(session.id); // Use session ID as sale ID to prevent duplicates

        // Check if sale already exists
        const existingSale = await saleRef.get();
        if (!existingSale.exists) {
          // Fetch product info for digital delivery
          const productSnap = await fs.collection('products').doc(productId).get();
          const product = productSnap.data();
          
          let licenseKey = null;
          let downloadToken = null;
          let downloadExpiresAt = null;

          if (product?.isSoftware) {
            licenseKey = generateLicenseKey(product.licensePrefix || 'DS');
          }

          if (product?.downloadUrl) {
            downloadToken = generateSecureToken();
            const expires = new Date();
            expires.setHours(expires.getHours() + 24); // 24 hours expiry
            downloadExpiresAt = expires.toISOString();
          }

          batch.set(saleRef, {
            productId,
            productName: metadata.productName,
            buyerId,
            buyerEmail,
            affiliateId: metadata.affiliateId || null,
            amount: parseInt(finalPrice),
            commission: parseInt(commission),
            couponId: couponId || null,
            paymentStatus: 'completed',
            stripeSessionId: session.id,
            licenseKey,
            downloadToken,
            downloadExpiresAt,
            createdAt: new Date().toISOString()
          });

          if (metadata.affiliateId) {
            const affiliateRef = fs.collection('users').doc(metadata.affiliateId);
            batch.update(affiliateRef, {
              commissionEarned: admin.firestore.FieldValue.increment(parseInt(commission)),
              totalSales: admin.firestore.FieldValue.increment(1)
            });
          }

          // Also add to user's purchasedProducts array
          const buyerRef = fs.collection('users').doc(buyerId);
          batch.update(buyerRef, {
            purchasedProducts: admin.firestore.FieldValue.arrayUnion(productId)
          });

          await batch.commit();
          console.log(`Sale ${saleRef.id} completed for ${buyerEmail}`);

          // Send confirmation email with digital delivery info
          const downloadLink = downloadToken ? `${process.env.APP_URL || 'http://localhost:3000'}/api/download/${downloadToken}` : undefined;
          await sendConfirmationEmail(buyerEmail, metadata.productName, parseInt(finalPrice), {
            licenseKey: licenseKey || undefined,
            downloadLink
          });
        }
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // API Route: Secure Download
  app.get('/api/download/:token', async (req, res) => {
    try {
      const fs = admin.firestore();
      const salesQuery = await fs.collection('sales')
        .where('downloadToken', '==', req.params.token)
        .limit(1)
        .get();
      
      if (salesQuery.empty) {
        return res.status(404).send('Link unduhan tidak valid.');
      }

      const sale = salesQuery.docs[0].data();
      const now = new Date();
      const expires = new Date(sale.downloadExpiresAt);

      if (now > expires) {
        return res.status(410).send('Link unduhan sudah kedaluwarsa.');
      }

      const productSnap = await fs.collection('products').doc(sale.productId).get();
      const product = productSnap.data();

      if (!product?.downloadUrl) {
        return res.status(404).send('File tidak ditemukan.');
      }

      // In a real app, you might use a redirect to a signed S3 URL
      // For now, we redirect to the downloadUrl
      res.redirect(product.downloadUrl);
    } catch (err: any) {
      res.status(500).send('Terjadi kesalahan internal.');
    }
  });

  // API Route: Affiliate Leaderboard
  app.get('/api/affiliate/leaderboard', async (req, res) => {
    try {
      const fs = admin.firestore();
      const topAffiliates = await fs.collection('users')
        .where('role', '==', 'affiliate')
        .orderBy('commissionEarned', 'desc')
        .limit(10)
        .get();
      
      const leaderboard = topAffiliates.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        commission: doc.data().commissionEarned || 0,
        totalSales: doc.data().totalSales || 0
      }));

      res.json(leaderboard);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Create Stripe Checkout Session
  app.post('/api/create-checkout-session', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { productId, referralCode, couponId, amount: clientAmount } = purchaseSchema.parse({
        ...req.body,
        buyerId: req.user!.uid,
        buyerEmail: req.user!.email || ''
      });
      
      const buyerId = req.user!.uid;
      const buyerEmail = req.user!.email || '';
      const fs = admin.firestore();
      
      // 1. Get Product, Config, Buyer
      const [productSnap, configSnap, buyerSnap] = await Promise.all([
        fs.collection('products').doc(productId).get(),
        fs.collection('settings').doc('global').get(),
        fs.collection('users').doc(buyerId).get()
      ]);

      if (!productSnap.exists) return res.status(404).json({ error: 'Product not found' });
      const product = productSnap.data();
      const config = configSnap.exists ? configSnap.data() : null;
      const buyerProfile = buyerSnap.exists ? buyerSnap.data() : null;

      // 2. Calculate Final Price (Server-side)
      let finalPrice = product?.price || 0;

      if (config?.geoPricingActive) {
        const multiplier = buyerProfile?.isIndonesian !== false ? (config.idrMultiplier || 1) : (config.foreignMultiplier || 1.2);
        finalPrice = finalPrice * multiplier;
      }

      if (config?.promoActive) {
        const now = new Date();
        const start = new Date(config.promoStart);
        const end = new Date(config.promoEnd);
        if (now >= start && now <= end) {
          finalPrice = finalPrice - (finalPrice * (config.promoDiscount / 100));
        }
      }

      finalPrice = Math.round(finalPrice);

      let appliedCouponId = null;
      if (couponId) {
        const couponSnap = await fs.collection('coupons').doc(couponId).get();
        if (couponSnap.exists) {
          const coupon = couponSnap.data();
          const now = new Date();
          const isExpired = coupon?.expiryDate ? new Date(coupon.expiryDate + 'T23:59:59') < now : false;

          if (coupon?.isActive && !isExpired) {
            const userUsageSnap = await fs.collection('sales')
              .where('buyerId', '==', buyerId)
              .where('couponId', '==', couponId)
              .get();
            
            if (userUsageSnap.size < (coupon.usageLimitPerUser || Infinity)) {
              appliedCouponId = couponId;
              if (coupon.discountType === 'percentage') {
                finalPrice = finalPrice - (finalPrice * (coupon.discountValue / 100));
              } else {
                finalPrice = Math.max(0, finalPrice - coupon.discountValue);
              }
            }
          }
        }
      }

      finalPrice = Math.round(finalPrice);

      let affiliateId = null;
      let commission = 0;
      if (referralCode) {
        const affQuery = await fs.collection('users').where('referralCode', '==', referralCode).limit(1).get();
        if (!affQuery.empty) {
          affiliateId = affQuery.docs[0].id;
          commission = Math.floor(finalPrice * 0.1);
        }
      }

      // 3. Create Stripe Session
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'idr',
            product_data: {
              name: product?.name,
              images: [product?.image],
            },
            unit_amount: finalPrice * 100, // Stripe uses cents (or smallest units)
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.APP_URL || 'http://localhost:3000'}?success=true`,
        cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}?canceled=true`,
        metadata: {
          productId,
          productName: product?.name || '',
          buyerId,
          buyerEmail,
          referralCode: referralCode || '',
          affiliateId: affiliateId || '',
          couponId: appliedCouponId || '',
          finalPrice: finalPrice.toString(),
          commission: commission.toString()
        },
      });

      res.json({ id: session.id, url: session.url });

    } catch (err: any) {
      console.error('Session Error:', err);
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

  // --- Granular Role-Based Routes ---

  // Customer: Get own purchases
  app.get('/api/customer/purchases', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const fs = admin.firestore();
      const buyerId = req.user!.uid;
      const salesQuery = await fs.collection('sales')
        .where('buyerId', '==', buyerId)
        .where('paymentStatus', '==', 'completed')
        .orderBy('createdAt', 'desc')
        .get();
      
      const purchases = salesQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(purchases);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Affiliate: Get own refered sales
  app.get('/api/affiliate/sales', authenticate, requireAffiliate, async (req: AuthenticatedRequest, res) => {
    try {
      const fs = admin.firestore();
      const affiliateId = req.user!.uid;
      const salesQuery = await fs.collection('sales')
        .where('affiliateId', '==', affiliateId)
        .where('paymentStatus', '==', 'completed')
        .orderBy('createdAt', 'desc')
        .get();
      
      const sales = salesQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(sales);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Get ALL sales
  app.get('/api/admin/sales', authenticate, requireAdmin, async (req, res) => {
    try {
      const fs = admin.firestore();
      const salesQuery = await fs.collection('sales')
        .orderBy('createdAt', 'desc')
        .get();
      
      const sales = salesQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(sales);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Add Product
  app.post('/api/admin/products', authenticate, requireAdmin, async (req, res) => {
    try {
      const fs = admin.firestore();
      const docRef = await fs.collection('products').add({
        ...req.body,
        createdAt: new Date().toISOString()
      });
      res.json({ id: docRef.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Delete Product
  app.delete('/api/admin/products/:id', authenticate, requireAdmin, async (req, res) => {
    try {
      const fs = admin.firestore();
      await fs.collection('products').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Add Coupon
  app.post('/api/admin/coupons', authenticate, requireAdmin, async (req, res) => {
    try {
      const fs = admin.firestore();
      const docRef = await fs.collection('coupons').add({
        ...req.body,
        createdAt: new Date().toISOString()
      });
      res.json({ id: docRef.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Process Withdrawal
  app.post('/api/admin/withdrawals/:id/process', authenticate, requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const fs = admin.firestore();
      await fs.collection('withdrawals').doc(req.params.id).update({
        status,
        processedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Affiliate: Create Withdrawal
  app.post('/api/affiliate/withdrawals', authenticate, requireAffiliate, async (req: AuthenticatedRequest, res) => {
    try {
      const fs = admin.firestore();
      const { amount, paymentMethod, paymentDetails } = req.body;
      const user = req.userProfile;

      if (user.commissionEarned < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      const withdrawalRef = fs.collection('withdrawals').doc();
      const batch = fs.batch();

      batch.set(withdrawalRef, {
        userId: req.user!.uid,
        userName: user.name,
        userEmail: user.email,
        amount,
        status: 'pending',
        paymentMethod,
        paymentDetails,
        createdAt: new Date().toISOString()
      });

      batch.update(fs.collection('users').doc(req.user!.uid), {
        commissionEarned: admin.firestore.FieldValue.increment(-amount)
      });

      await batch.commit();
      res.json({ id: withdrawalRef.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Update Global Settings
  app.post('/api/admin/settings', authenticate, requireAdmin, async (req, res) => {
    try {
      const fs = admin.firestore();
      await fs.collection('settings').doc('global').set({
        ...req.body,
        id: 'global'
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Delete Coupon
  app.delete('/api/admin/coupons/:id', authenticate, requireAdmin, async (req, res) => {
    try {
      const fs = admin.firestore();
      await fs.collection('coupons').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (err: any) {
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

  // --- REVIEW ROUTES ---

  app.get('/api/products/:id/reviews', async (req, res) => {
    try {
      const fs = admin.firestore();
      const reviewsSnap = await fs.collection('reviews')
        .where('productId', '==', req.params.id)
        .orderBy('createdAt', 'desc')
        .get();
      
      const reviews = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(reviews);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/products/:id/reviews', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { rating, comment } = reviewSchema.parse(req.body);
      const fs = admin.firestore();
      
      // 1. Check if user purchased the product
      const userDoc = await fs.collection('users').doc(req.user!.uid).get();
      const userData = userDoc.data();
      const purchasedProducts = userData?.purchasedProducts || [];
      
      if (!purchasedProducts.includes(req.params.id)) {
        return res.status(403).json({ error: 'Anda harus membeli produk ini sebelum memberikan ulasan.' });
      }

      // 2. Check if already reviewed
      const existingReview = await fs.collection('reviews')
        .where('productId', '==', req.params.id)
        .where('userId', '==', req.user!.uid)
        .limit(1)
        .get();

      if (!existingReview.empty) {
        return res.status(400).json({ error: 'Anda sudah memberikan ulasan untuk produk ini.' });
      }

      // 3. Add review
      const reviewData = {
        productId: req.params.id,
        userId: req.user!.uid,
        userName: userData?.name || 'User',
        rating,
        comment,
        createdAt: new Date().toISOString()
      };

      await fs.collection('reviews').add(reviewData);

      // 4. Update Product aggregation
      const productRef = fs.collection('products').doc(req.params.id);
      await fs.runTransaction(async (transaction) => {
        const prod = await transaction.get(productRef);
        if (!prod.exists) return;
        
        const data = prod.data()!;
        const oldCount = data.reviewCount || 0;
        const oldAvg = data.averageRating || 0;
        
        const newCount = oldCount + 1;
        const newAvg = ((oldAvg * oldCount) + rating) / newCount;
        
        transaction.update(productRef, {
          reviewCount: newCount,
          averageRating: newAvg
        });
      });

      res.json({ success: true, review: reviewData });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues });
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
