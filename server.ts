import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import admin from 'firebase-admin';
import firebaseConfig from './firebase-applet-config.json';
import { z } from 'zod';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { rateLimit } from 'express-rate-limit';


// --- Utilities ---
const generateLicenseKey = (prefix: string = 'DS') => {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    parts.push(crypto.randomBytes(2).toString('hex').toUpperCase());
  }
  return `${prefix}-${parts.join('-')}`;
};

const generateSecureToken = () => crypto.randomBytes(32).toString('hex');

// Activity Logging Helper
const logActivity = async (action: string, details: string, req: AuthenticatedRequest) => {
  try {
    await db.collection('activityLogs').add({
      adminId: req.user?.uid || 'system',
      adminName: req.userProfile?.name || 'Admin',
      action,
      details,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Logging Error:', err);
  }
};



// Initialize Firebase Admin
// Credentials must be provided via the SERVICE_ACCOUNT_KEY environment variable (JSON string).
// In Railway: set SERVICE_ACCOUNT_KEY to the contents of your Firebase service account JSON file.
if (!admin.apps.length) {
  const serviceAccountJson = process.env.SERVICE_ACCOUNT_KEY;

  if (!serviceAccountJson) {
    throw new Error(
      'Missing SERVICE_ACCOUNT_KEY environment variable. ' +
      'Please set it in your Railway project variables with the contents of your Firebase service account JSON file.'
    );
  }

  const serviceAccountCredential = JSON.parse(serviceAccountJson) as admin.ServiceAccount;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountCredential),
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
  const PORT = parseInt(process.env.PORT || '3000');

  // Validate required environment variables in production
  if (process.env.NODE_ENV === 'production') {
    const required = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length > 0) {
      console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
      process.exit(1);
    }
  }

  // Global Rate Limiting
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.' }
  });

  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 login/register attempts per hour
    message: { error: 'Batas percobaan login tercapai. Silakan coba lagi dalam 1 jam.' }
  });

  app.use('/api/', globalLimiter);
  app.use('/api/webhook', express.raw({ type: 'application/json' })); // Webhook needs raw body

  // Health check endpoint — digunakan Railway untuk monitoring
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  app.post('/api/webhook', async (req, res) => {
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
            const affSnap = await affiliateRef.get();
            const affData = affSnap.data();
            const newTotalSales = (affData?.totalSales || 0) + 1;
            
            // Dynamic Tier Auto-Upgrade Logic
            let newTier = affData?.tier || 'starter';
            let payoutHoldingDays = 14; // Default
            
            // Fetch all active tiers sorted by order
            const tiersSnap = await fs.collection('tiers')
              .where('isActive', '==', true)
              .orderBy('order', 'desc')
              .get();
            
            // Find the highest tier the user qualifies for
            for (const tierDoc of tiersSnap.docs) {
              const tierData = tierDoc.data();
              if (newTotalSales >= tierData.minSales) {
                if (tierData.maxSales === null || newTotalSales <= tierData.maxSales) {
                  newTier = tierDoc.id;
                  payoutHoldingDays = tierData.payoutHoldingDays || 14;
                  break;
                }
              }
            }
            
            // Calculate when commission becomes available
            const commissionAvailableAt = new Date();
            commissionAvailableAt.setDate(commissionAvailableAt.getDate() + payoutHoldingDays);

            // Update sale with commission status
            await saleRef.update({
              commissionStatus: 'held',
              commissionAvailableAt: commissionAvailableAt.toISOString()
            });

            batch.update(affiliateRef, {
              commissionEarned: admin.firestore.FieldValue.increment(parseInt(commission)),
              totalSales: admin.firestore.FieldValue.increment(1),
              tier: newTier
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

      // Redirect ke downloadUrl — di production sebaiknya gunakan signed URL (S3/GCS)
      // Pastikan URL valid sebelum redirect
      try {
        new URL(product.downloadUrl); // validasi URL
      } catch {
        return res.status(500).send('URL unduhan tidak valid.');
      }
      res.redirect(product.downloadUrl);
    } catch (err: any) {
      res.status(500).send('Terjadi kesalahan internal.');
    }
  });

  // API Route: Affiliate Stats (aggregated, efficient)
  app.get('/api/affiliate/stats', authenticate, requireAffiliate, async (req: AuthenticatedRequest, res) => {
    try {
      const fs = admin.firestore();
      const affiliateId = req.user!.uid;

      // Ambil data user langsung dari Firestore (sudah teragregasi)
      const userSnap = await fs.collection('users').doc(affiliateId).get();
      if (!userSnap.exists) return res.status(404).json({ error: 'User not found' });
      const userData = userSnap.data()!;

      // Hitung pending withdrawals untuk saldo tersedia
      const pendingWithdrawals = await fs.collection('withdrawals')
        .where('userId', '==', affiliateId)
        .where('status', '==', 'pending')
        .get();
      const pendingTotal = pendingWithdrawals.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);

      res.json({
        totalClicks: userData.totalClicks || 0,
        totalSales: userData.totalSales || 0,
        commissionEarned: userData.commissionEarned || 0,
        availableBalance: (userData.commissionEarned || 0) - pendingTotal,
        pendingWithdrawals: pendingTotal,
        tier: userData.tier || 'bronze',
        referralCode: userData.referralCode || null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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
          // Parse expiry date robustly: expiryDate is stored as YYYY-MM-DD
          const isExpired = coupon?.expiryDate
            ? (() => {
                const [y, m, d] = coupon.expiryDate.split('-').map(Number);
                const expiry = new Date(y, m - 1, d, 23, 59, 59, 999);
                return expiry < now;
              })()
            : false;

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
      let isSelfReferral = false;
      
      if (referralCode) {
        const affQuery = await fs.collection('users').where('referralCode', '==', referralCode).limit(1).get();
        if (!affQuery.empty) {
          const affDoc = affQuery.docs[0];
          const affData = affDoc.data();
          affiliateId = affDoc.id;
          
          // Get affiliate config for self-referral check
          const affiliateConfigSnap = await fs.collection('settings').doc('affiliate_config').get();
          const affiliateConfig = affiliateConfigSnap.exists ? affiliateConfigSnap.data() : null;
          
          // Self-Referral Prevention
          if (affiliateConfig?.selfReferralBlocked && affiliateId === buyerId) {
            console.warn(`[FRAUD] Self-referral detected: User ${buyerId} trying to use own referral code`);
            isSelfReferral = true;
            
            // Log fraud alert
            await fs.collection('fraud_alerts').add({
              type: 'self_referral',
              severity: 'high',
              userId: buyerId,
              affiliateId: affiliateId,
              description: `User ${buyerEmail} attempted to purchase using their own referral code`,
              status: 'pending',
              createdAt: new Date().toISOString()
            });
            
            // Block commission but allow purchase
            affiliateId = null;
            commission = 0;
          } else {
            // Dynamic Tiered Commission Logic
            const userTierName = affData.tier || 'starter';
            
            // Check for product-specific commission override
            let rate = 0.05; // Default starter rate
            
            if (product?.commissionOverride?.enabled) {
              // Product has commission override
              if (product.commissionOverride.tierSpecific && product.commissionOverride.tierSpecific[userTierName]) {
                rate = product.commissionOverride.tierSpecific[userTierName];
              } else if (product.commissionOverride.rate) {
                rate = product.commissionOverride.rate;
              }
            } else {
              // Fetch tier from Firestore
              const tierSnap = await fs.collection('tiers').doc(userTierName).get();
              if (tierSnap.exists) {
                const tierData = tierSnap.data();
                rate = tierData?.commissionRate || 0.05;
              }
            }
            
            commission = Math.floor(finalPrice * rate);
            
            // Check for promotion bonus
            if (product?.promotionBonus?.enabled) {
              const now = new Date();
              const start = new Date(product.promotionBonus.startDate);
              const end = new Date(product.promotionBonus.endDate);
              if (now >= start && now <= end) {
                const bonusAmount = Math.floor(finalPrice * product.promotionBonus.bonusRate);
                commission += bonusAmount;
              }
            }
          }
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
      
      // Get IP address
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                       req.socket.remoteAddress || 
                       'unknown';
      
      // Get affiliate config for fraud detection
      const configSnap = await fs.collection('settings').doc('affiliate_config').get();
      const config = configSnap.exists ? configSnap.data() : null;
      
      // Check rate limiting (clicks per IP per hour)
      if (config?.fraudDetectionEnabled && config?.maxClicksPerIpPerHour) {
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        
        const recentClicksSnap = await fs.collection('clicks')
          .where('ipAddress', '==', ipAddress)
          .where('timestamp', '>=', oneHourAgo.toISOString())
          .get();
        
        if (recentClicksSnap.size >= config.maxClicksPerIpPerHour) {
          console.warn(`[FRAUD] IP ${ipAddress} exceeded click limit: ${recentClicksSnap.size} clicks in 1 hour`);
          
          // Log fraud alert
          await fs.collection('fraud_alerts').add({
            type: 'click_spam',
            severity: 'medium',
            description: `IP ${ipAddress} exceeded ${config.maxClicksPerIpPerHour} clicks per hour`,
            ipAddress,
            referralCode,
            status: 'pending',
            createdAt: new Date().toISOString()
          });
          
          return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }
      }
      
      const userQuery = await fs.collection('users').where('referralCode', '==', referralCode).limit(1).get();
      
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        const affiliateData = userDoc.data();
        
        // Get tier for cookie expiration
        const tierSnap = await fs.collection('tiers').doc(affiliateData.tier || 'starter').get();
        const tierData = tierSnap.exists ? tierSnap.data() : null;
        const cookieLifeDays = tierData?.cookieLifeDays || config?.defaultCookieLifeDays || 30;
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + cookieLifeDays);
        
        // Store click with enhanced tracking
        await fs.collection('clicks').add({
          affiliateId: userDoc.id,
          referralCode,
          ipAddress,
          userAgent: req.get('User-Agent') || 'unknown',
          timestamp: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
          converted: false,
          landingPage: req.body.landingPage || '/',
          source: req.body.source || 'direct',
          medium: req.body.medium || 'referral',
          campaign: req.body.campaign || 'default'
        });
        
        await fs.collection('users').doc(userDoc.id).update({
          totalClicks: admin.firestore.FieldValue.increment(1)
        });
        
        return res.json({ 
          success: true,
          cookieLifeDays,
          expiresAt: expiresAt.toISOString()
        });
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
  app.post('/api/admin/products', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const fs = admin.firestore();
      const docRef = await fs.collection('products').add({
        ...req.body,
        createdAt: new Date().toISOString()
      });
      await logActivity('ADD_PRODUCT', `Added product: ${req.body.name}`, req);
      res.json({ id: docRef.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Bulk Add Products
  app.post('/api/admin/bulk-products', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const products = z.array(z.object({
        name: z.string(),
        price: z.number(),
        category: z.string(),
        description: z.string().optional(),
        image: z.string().optional()
      })).parse(req.body);

      const batch = db.batch();
      products.forEach(p => {
        const ref = db.collection('products').doc();
        batch.set(ref, {
          ...p,
          createdAt: new Date().toISOString(),
          modules: [],
          variants: []
        });
      });

      await batch.commit();
      await logActivity('BULK_ADD_PRODUCTS', `Added ${products.length} products via bulk upload`, req);
      res.json({ success: true, count: products.length });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin: Delete Product
  app.delete('/api/admin/products/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const fs = admin.firestore();
      await fs.collection('products').doc(req.params.id).delete();
      await logActivity('DELETE_PRODUCT', `Deleted product ID: ${req.params.id}`, req);
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

  // Admin: Process Withdrawal — dengan refund otomatis jika ditolak
  app.post('/api/admin/withdrawals/:id/process', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.body;
      if (!['approved', 'rejected', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Status tidak valid' });
      }

      const fs = admin.firestore();
      const withdrawalRef = fs.collection('withdrawals').doc(req.params.id);
      const withdrawalSnap = await withdrawalRef.get();

      if (!withdrawalSnap.exists) {
        return res.status(404).json({ error: 'Permintaan pencairan tidak ditemukan' });
      }

      const withdrawal = withdrawalSnap.data()!;

      // Jika ditolak, kembalikan komisi ke affiliate (tidak ada yang dipotong karena komisi tidak dipotong saat request)
      if (status === 'rejected' && withdrawal.status === 'pending') {
        await withdrawalRef.update({
          status,
          processedAt: new Date().toISOString()
        });
        await logActivity('REJECT_WITHDRAWAL', `Rejected withdrawal Rp ${withdrawal.amount} for ${withdrawal.userEmail}`, req);
      } else if (status === 'completed' && withdrawal.status !== 'completed') {
        // Potong komisi hanya saat benar-benar selesai dibayar
        const batch = fs.batch();
        batch.update(withdrawalRef, {
          status,
          processedAt: new Date().toISOString()
        });
        batch.update(fs.collection('users').doc(withdrawal.userId), {
          commissionEarned: admin.firestore.FieldValue.increment(-withdrawal.amount)
        });
        await batch.commit();
        await logActivity('COMPLETE_WITHDRAWAL', `Completed withdrawal Rp ${withdrawal.amount} for ${withdrawal.userEmail} — commission deducted`, req);
      } else {
        await withdrawalRef.update({
          status,
          processedAt: new Date().toISOString()
        });
        await logActivity('PROCESS_WITHDRAWAL', `Set withdrawal status to ${status} for ${withdrawal.userEmail}`, req);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Affiliate: Create Withdrawal
  // Komisi dikunci (locked) saat request dibuat, baru benar-benar dipotong saat admin approve/complete
  app.post('/api/affiliate/withdrawals', authenticate, requireAffiliate, async (req: AuthenticatedRequest, res) => {
    try {
      const fs = admin.firestore();
      const { amount, paymentMethod, paymentDetails } = req.body;
      const user = req.userProfile;

      // Validasi input
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Nominal pencairan tidak valid' });
      }
      if (amount < 50000) {
        return res.status(400).json({ error: 'Minimal pencairan adalah Rp 50.000' });
      }
      if (!paymentMethod || !paymentDetails) {
        return res.status(400).json({ error: 'Metode dan detail pembayaran wajib diisi' });
      }

      // Cek saldo tersedia (commissionEarned dikurangi yang masih pending)
      const pendingWithdrawals = await fs.collection('withdrawals')
        .where('userId', '==', req.user!.uid)
        .where('status', '==', 'pending')
        .get();
      const pendingTotal = pendingWithdrawals.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
      const availableBalance = (user.commissionEarned || 0) - pendingTotal;

      if (availableBalance < amount) {
        return res.status(400).json({ 
          error: `Saldo tersedia tidak mencukupi. Tersedia: Rp ${availableBalance.toLocaleString('id-ID')} (termasuk ${pendingWithdrawals.size} permintaan pending)` 
        });
      }

      const withdrawalRef = fs.collection('withdrawals').doc();
      await withdrawalRef.set({
        userId: req.user!.uid,
        userName: user.name,
        userEmail: user.email,
        amount,
        status: 'pending',
        paymentMethod,
        paymentDetails,
        createdAt: new Date().toISOString()
      });

      // Komisi TIDAK dipotong di sini — dipotong saat admin set status ke 'completed'
      // Ini mencegah kehilangan komisi jika request ditolak

      res.json({ id: withdrawalRef.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Update Global Settings
  app.post('/api/admin/settings', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const fs = admin.firestore();
      await fs.collection('settings').doc('global').set({
        ...req.body,
        id: 'global'
      });
      await logActivity('UPDATE_SETTINGS', 'Updated global settings/promo', req);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Fetch Activity Logs
  app.get('/api/admin/activity-logs', authenticate, requireAdmin, async (req, res) => {
    try {
      const logsSnap = await db.collection('activityLogs').orderBy('createdAt', 'desc').limit(100).get();
      const logs = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- TIER MANAGEMENT ENDPOINTS ---

  // Public: Get all active tiers
  app.get('/api/tiers', async (req, res) => {
    try {
      const fs = admin.firestore();
      const tiersSnap = await fs.collection('tiers')
        .where('isActive', '==', true)
        .orderBy('order', 'asc')
        .get();
      const tiers = tiersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(tiers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Get all tiers (including inactive)
  app.get('/api/admin/tiers', authenticate, requireAdmin, async (req, res) => {
    try {
      const fs = admin.firestore();
      const tiersSnap = await fs.collection('tiers').orderBy('order', 'asc').get();
      const tiers = tiersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(tiers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Create or Update Tier
  app.post('/api/admin/tiers/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const fs = admin.firestore();
      const tierId = req.params.id;
      const tierData = req.body;
      
      await fs.collection('tiers').doc(tierId).set({
        ...tierData,
        id: tierId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      await logActivity('UPDATE_TIER', `Updated tier: ${tierData.displayName}`, req);
      res.json({ success: true, id: tierId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Delete Tier
  app.delete('/api/admin/tiers/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const fs = admin.firestore();
      await fs.collection('tiers').doc(req.params.id).delete();
      await logActivity('DELETE_TIER', `Deleted tier ID: ${req.params.id}`, req);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Fetch All Withdrawals
  app.get('/api/admin/withdrawals', authenticate, requireAdmin, async (req, res) => {
    try {
      const fs = admin.firestore();
      const snap = await fs.collection('withdrawals').orderBy('createdAt', 'desc').get();
      const withdrawals = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(withdrawals);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public: Get product marketing kit (untuk affiliates)
  app.get('/api/products/:id/marketing-kit', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const fs = admin.firestore();
      const productSnap = await fs.collection('products').doc(req.params.id).get();
      if (!productSnap.exists) return res.status(404).json({ error: 'Produk tidak ditemukan' });
      const product = productSnap.data();
      res.json({
        productId: req.params.id,
        productName: product?.name,
        marketingKit: product?.marketingKit || { banners: [], swipeFiles: [] }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Customer: Get product modules (hanya untuk pembeli)
  app.get('/api/products/:id/modules', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const fs = admin.firestore();
      // Verifikasi pembelian
      const userDoc = await fs.collection('users').doc(req.user!.uid).get();
      const purchasedProducts = userDoc.data()?.purchasedProducts || [];
      if (!purchasedProducts.includes(req.params.id) && req.userProfile?.role !== 'admin') {
        return res.status(403).json({ error: 'Anda harus membeli produk ini untuk mengakses modulnya.' });
      }
      const productSnap = await fs.collection('products').doc(req.params.id).get();
      if (!productSnap.exists) return res.status(404).json({ error: 'Produk tidak ditemukan' });
      const product = productSnap.data();
      res.json({
        productId: req.params.id,
        productName: product?.name,
        modules: product?.modules || []
      });
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

  // API Route: Bootstrap first admin (only works if NO admin exists yet)
  // This is a one-time setup endpoint — once an admin exists, it's permanently disabled
  app.post('/api/bootstrap-admin', authLimiter, authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const fs = admin.firestore();
      // Check if any admin already exists
      const adminQuery = await fs.collection('users').where('role', '==', 'admin').limit(1).get();
      if (!adminQuery.empty) {
        return res.status(403).json({ error: 'Admin sudah ada. Endpoint ini hanya bisa digunakan sekali.' });
      }
      // Promote the requesting user to admin
      await fs.collection('users').doc(req.user!.uid).update({
        role: 'admin',
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true, message: 'Akun Anda berhasil dijadikan Admin pertama.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Update User Role (Admin only) — rate limited to prevent abuse
  app.post('/api/admin/update-role', authLimiter, authenticate, requireAdmin, async (req, res) => {
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

  // --- ADVANCED FEATURES ---

  // Abandoned Cart Recovery Trigger
  app.post('/api/admin/recover-carts', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const fs = admin.firestore();
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      const pendingSales = await fs.collection('sales')
        .where('paymentStatus', '==', 'pending')
        .where('createdAt', '<', oneHourAgo.toISOString())
        .limit(20)
        .get();
      
      let count = 0;
      for (const doc of pendingSales.docs) {
        const sale = doc.data();
        if (!sale.recoveryEmailSent) {
          await sendConfirmationEmail(
            sale.buyerEmail,
            sale.productName,
            sale.amount,
            undefined
          );
          // Kirim email recovery dengan subject berbeda
          if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            const transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST || 'smtp.gmail.com',
              port: parseInt(process.env.SMTP_PORT || '465'),
              secure: true,
              auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });
            await transporter.sendMail({
              from: `"DigiSell" <${process.env.SMTP_USER}>`,
              to: sale.buyerEmail,
              subject: `Pesanan Anda belum selesai — ${sale.productName}`,
              html: `<p>Halo, Anda meninggalkan produk <strong>${sale.productName}</strong> di keranjang. Selesaikan pembayaran sekarang!</p>
                     <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="background:#4f46e5;color:white;padding:12px 24px;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block;">Selesaikan Pembayaran</a>`
            }).catch(e => console.error('Recovery email error:', e));
          } else {
            console.log(`[EMAIL MOCK] Recovery email → ${sale.buyerEmail} for ${sale.productName}`);
          }
          await doc.ref.update({ recoveryEmailSent: true });
          count++;
        }
      }

      await logActivity('RECOVER_CARTS', `Triggered manual recovery for ${count} abandoned carts`, req);
      res.json({ success: true, recovered: count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Invoice Generation (PDF Mock - returns text or trigger for client-side download)
  app.get('/api/customer/invoice/:saleId', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const fs = admin.firestore();
      const saleSnap = await fs.collection('sales').doc(req.params.saleId).get();
      
      if (!saleSnap.exists) return res.status(404).send('Invoice not found');
      const sale = saleSnap.data();
      
      if (sale?.buyerId !== req.user!.uid && req.userProfile?.role !== 'admin') {
        return res.status(403).send('Forbidden');
      }

      // In a real app, we might use jspdf-node or similar. 
      // For this implementation, we send the data for the client to generate the PDF.
      res.json({
        invoiceNo: `INV-${sale?.id.slice(-8).toUpperCase()}`,
        date: sale?.createdAt,
        customer: sale?.buyerEmail,
        product: sale?.productName,
        amount: sale?.amount,
        status: sale?.paymentStatus
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown — penting untuk Railway agar request tidak terputus saat redeploy
  const shutdown = (signal: string) => {
    console.log(`[${signal}] Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    // Force exit jika tidak selesai dalam 10 detik
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
