import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import admin from 'firebase-admin';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), 
    projectId: firebaseConfig.projectId
  });
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Handle Purchase & Commission Allocation
  app.post('/api/purchase', async (req, res) => {
    const { productId, buyerId, buyerEmail, referralCode } = req.body;

    try {
      // Use standard firestore for simplicity unless specifically a named db is needed
      const fs = admin.firestore();
      
      // 1. Get Product Details
      const productSnap = await fs.collection('products').doc(productId).get();
      if (!productSnap.exists) return res.status(404).json({ error: 'Product not found' });
      const product = productSnap.data();

      let affiliateId = null;
      let commission = 0;
      const commissionRate = 0.1; // 10% Commission

      // 2. Find Affiliate by Referral Code
      if (referralCode) {
        const affiliateQuery = await fs.collection('users')
          .where('referralCode', '==', referralCode)
          .limit(1)
          .get();
        
        if (!affiliateQuery.empty) {
          const affiliateDoc = affiliateQuery.docs[0];
          affiliateId = affiliateDoc.id;
          commission = Math.floor(product?.price * commissionRate);
        }
      }

      // 3. Create Sale Document & Update Affiliate Stats atomically
      const batch = fs.batch();
      const saleRef = fs.collection('sales').doc();
      
      batch.set(saleRef, {
        productId,
        productName: product?.name,
        buyerId,
        buyerEmail,
        affiliateId,
        amount: product?.price,
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
      console.error('Purchase Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Track Referral Click
  app.post('/api/click', async (req, res) => {
    const { referralCode } = req.body;
    try {
      if (!referralCode) return res.status(400).json({ error: 'Referral code missing' });
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
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Fetch All Users (Admin only logic)
  app.get('/api/admin/users', async (req, res) => {
    try {
      const fs = admin.firestore();
      const usersSnap = await fs.collection('users').orderBy('createdAt', 'desc').get();
      const users = usersSnap.docs.map(doc => doc.data());
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Update User Role
  app.post('/api/admin/update-role', async (req, res) => {
    const { userId, newRole } = req.body;
    try {
      const fs = admin.firestore();
      await fs.collection('users').doc(userId).update({
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Update User Details
  app.post('/api/admin/update-user', async (req, res) => {
    const { userId, name, email } = req.body;
    try {
      const fs = admin.firestore();
      await fs.collection('users').doc(userId).update({
        name,
        email,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (err: any) {
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
