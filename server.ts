import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { rateLimit } from 'express-rate-limit';
import fs from 'fs';

// --- Supabase Setup ---
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
  process.exit(1);
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

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
    await supabase
      .from('activity_logs')
      .insert({
        admin_id: req.user?.uid || 'system',
        admin_name: req.userProfile?.name || 'Admin',
        action,
        details,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        created_at: new Date().toISOString()
      });
  } catch (err) {
    console.error('Logging Error:', err);
  }
};

// --- Types ---
interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  referralCode?: string;
  referredBy?: string;
  twoFA?: any;
  status: 'active' | 'suspended' | 'banned';
}

interface AuthenticatedRequest extends Request {
  user?: { uid: string; email: string };
  userProfile?: UserProfile;
}

// --- Middleware ---
const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify Supabase JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      uid: user.id,
      email: user.email || ''
    };

    // Get user profile from database
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('uid', user.id)
      .single();

    if (profile) {
      req.userProfile = profile;
    }

    next();
  } catch (err: any) {
    console.error('Auth Error:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.userProfile || req.userProfile.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// --- App Setup ---
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// --- Stripe Setup ---
let stripeClient: Stripe | null = null;
const getStripe = () => {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is required');
    stripeClient = new Stripe(key, { apiVersion: '2025-02-24' as any });
  }
  return stripeClient;
};

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'supabase' });
});

// --- Auth Routes ---
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, referralCode } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name }
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || 'Failed to create user' });
    }

    // Generate referral code
    const userReferralCode = `REF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Create user profile in database
    const { data: userProfile, error: dbError } = await supabase
      .from('users')
      .insert({
        uid: authData.user.id,
        email,
        name,
        role: 'user',
        referral_code: userReferralCode,
        referred_by: referralCode || null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB Error:', dbError);
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    res.status(201).json({ user: userProfile, message: 'Registration successful' });
  } catch (err: any) {
    console.error('Register Error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.session) {
      return res.status(401).json({ error: error?.message || 'Invalid credentials' });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('uid', data.user.id)
      .single();

    res.json({
      session: data.session,
      user: profile || { uid: data.user.id, email: data.user.email }
    });
  } catch (err: any) {
    console.error('Login Error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.post('/api/auth/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (token) {
      await supabase.auth.admin.signOut(token);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err: any) {
    console.error('Logout Error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// --- Admin Routes (Products Example) ---
app.get('/api/admin/products', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch products' });
  }
});

app.post('/api/admin/products', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productSchema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.number().positive(),
      salePrice: z.number().positive().optional(),
      licenseTier: z.string().optional(),
      category: z.string().optional(),
      downloadUrl: z.string().url().optional(),
      demoUrl: z.string().url().optional(),
      coverImageUrl: z.string().url().optional(),
      galleryImages: z.array(z.string().url()).optional(),
      status: z.enum(['active', 'inactive', 'draft']).default('active')
    });

    const validated = productSchema.parse(req.body);

    const { data, error } = await supabase
      .from('products')
      .insert({
        name: validated.name,
        description: validated.description,
        price: validated.price,
        sale_price: validated.salePrice,
        license_tier: validated.licenseTier,
        category: validated.category,
        download_url: validated.downloadUrl,
        demo_url: validated.demoUrl,
        cover_image_url: validated.coverImageUrl,
        gallery_images: validated.galleryImages,
        status: validated.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity('Product Created', `Created product: ${validated.name}`, req);

    res.status(201).json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error creating product:', err);
    res.status(500).json({ error: err.message || 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const productSchema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      price: z.number().positive().optional(),
      salePrice: z.number().positive().optional(),
      licenseTier: z.string().optional(),
      category: z.string().optional(),
      downloadUrl: z.string().url().optional(),
      demoUrl: z.string().url().optional(),
      coverImageUrl: z.string().url().optional(),
      galleryImages: z.array(z.string().url()).optional(),
      status: z.enum(['active', 'inactive', 'draft']).optional()
    });

    const validated = productSchema.parse(req.body);

    const { data, error } = await supabase
      .from('products')
      .update({
        ...validated,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logActivity('Product Updated', `Updated product ID: ${id}`, req);

    res.json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error updating product:', err);
    res.status(500).json({ error: err.message || 'Failed to update product' });
  }
});

app.delete('/api/admin/products/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logActivity('Product Deleted', `Deleted product ID: ${id}`, req);

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: err.message || 'Failed to delete product' });
  }
});

// --- Vite Dev Server (Development Only) ---
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  // Serve static files in production
  app.use(express.static(path.join(process.cwd(), 'dist')));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    }
  });
}

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📦 Database: Supabase`);
});
