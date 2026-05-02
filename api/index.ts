// Vercel Serverless Function Entry Point - Complete API
import express from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import Stripe from 'stripe';
import crypto from 'crypto';
import { rateLimit } from 'express-rate-limit';

// --- Supabase Setup ---
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
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

interface AuthenticatedRequest extends express.Request {
  user?: { uid: string; email: string };
  userProfile?: UserProfile;
}

// --- Middleware ---
const authenticate = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      uid: user.id,
      email: user.email || ''
    };

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

const requireAdmin = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
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
  windowMs: 15 * 60 * 1000,
  max: 100,
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'supabase' });
});

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, name, referralCode } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name }
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || 'Failed to create user' });
    }

    const userReferralCode = `REF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

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
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    res.status(201).json({ user: userProfile, message: 'Registration successful' });
  } catch (err: any) {
    console.error('Register Error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.post('/api/auth/login', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.session) {
      return res.status(401).json({ error: error?.message || 'Invalid credentials' });
    }

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

app.post('/api/auth/logout', authenticate, async (req: AuthenticatedRequest, res: express.Response) => {
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

// ==================== PRODUCTS API ====================

app.get('/api/admin/products', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
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

app.post('/api/admin/products', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
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

app.put('/api/admin/products/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
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

app.delete('/api/admin/products/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
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

// ==================== USERS API ====================

app.get('/api/admin/users', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch users' });
  }
});

app.put('/api/admin/users/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const userSchema = z.object({
      name: z.string().optional(),
      role: z.enum(['user', 'admin']).optional(),
      status: z.enum(['active', 'suspended', 'banned']).optional()
    });

    const validated = userSchema.parse(req.body);

    const { data, error } = await supabase
      .from('users')
      .update({
        ...validated,
        updated_at: new Date().toISOString()
      })
      .eq('uid', id)
      .select()
      .single();

    if (error) throw error;

    await logActivity('User Updated', `Updated user ID: ${id}`, req);
    res.json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error updating user:', err);
    res.status(500).json({ error: err.message || 'Failed to update user' });
  }
});

app.delete('/api/admin/users/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    // Delete from database
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('uid', id);

    if (error) throw error;

    // Delete from auth
    await supabase.auth.admin.deleteUser(id);

    await logActivity('User Deleted', `Deleted user ID: ${id}`, req);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: err.message || 'Failed to delete user' });
  }
});

// ==================== ORDERS API ====================

app.get('/api/admin/orders', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch orders' });
  }
});

app.post('/api/admin/orders', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const orderSchema = z.object({
      user_id: z.string(),
      product_id: z.string(),
      amount: z.number().positive(),
      status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('pending')
    });

    const validated = orderSchema.parse(req.body);

    const orderId = `ORD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const licenseKey = generateLicenseKey();

    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_id: orderId,
        user_id: validated.user_id,
        product_id: validated.product_id,
        amount: validated.amount,
        status: validated.status,
        license_key: licenseKey,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity('Order Created', `Created order: ${orderId}`, req);
    res.status(201).json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error creating order:', err);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

// ==================== EMAIL TEMPLATES API ====================

app.get('/api/admin/email-templates', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching email templates:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch email templates' });
  }
});

app.post('/api/admin/email-templates', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const templateSchema = z.object({
      name: z.string().min(1),
      subject: z.string().min(1),
      body: z.string().min(1),
      variables: z.array(z.string()).optional()
    });

    const validated = templateSchema.parse(req.body);

    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        name: validated.name,
        subject: validated.subject,
        body: validated.body,
        variables: validated.variables,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity('Email Template Created', `Created template: ${validated.name}`, req);
    res.status(201).json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error creating email template:', err);
    res.status(500).json({ error: err.message || 'Failed to create email template' });
  }
});

app.put('/api/admin/email-templates/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const templateSchema = z.object({
      name: z.string().min(1).optional(),
      subject: z.string().min(1).optional(),
      body: z.string().min(1).optional(),
      variables: z.array(z.string()).optional()
    });

    const validated = templateSchema.parse(req.body);

    const { data, error } = await supabase
      .from('email_templates')
      .update({
        ...validated,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logActivity('Email Template Updated', `Updated template ID: ${id}`, req);
    res.json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error updating email template:', err);
    res.status(500).json({ error: err.message || 'Failed to update email template' });
  }
});

app.delete('/api/admin/email-templates/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logActivity('Email Template Deleted', `Deleted template ID: ${id}`, req);
    res.json({ success: true, message: 'Email template deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting email template:', err);
    res.status(500).json({ error: err.message || 'Failed to delete email template' });
  }
});

// ==================== BLOG POSTS API ====================

app.get('/api/admin/blog', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching blog posts:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch blog posts' });
  }
});

app.post('/api/admin/blog', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const blogSchema = z.object({
      title: z.string().min(1),
      content: z.string().optional(),
      slug: z.string().min(1),
      author_id: z.string(),
      status: z.enum(['draft', 'published']).default('draft')
    });

    const validated = blogSchema.parse(req.body);

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title: validated.title,
        content: validated.content,
        slug: validated.slug,
        author_id: validated.author_id,
        status: validated.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity('Blog Post Created', `Created post: ${validated.title}`, req);
    res.status(201).json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error creating blog post:', err);
    res.status(500).json({ error: err.message || 'Failed to create blog post' });
  }
});

app.put('/api/admin/blog/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const blogSchema = z.object({
      title: z.string().min(1).optional(),
      content: z.string().optional(),
      slug: z.string().min(1).optional(),
      status: z.enum(['draft', 'published']).optional()
    });

    const validated = blogSchema.parse(req.body);

    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        ...validated,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logActivity('Blog Post Updated', `Updated post ID: ${id}`, req);
    res.json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error updating blog post:', err);
    res.status(500).json({ error: err.message || 'Failed to update blog post' });
  }
});

app.delete('/api/admin/blog/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logActivity('Blog Post Deleted', `Deleted post ID: ${id}`, req);
    res.json({ success: true, message: 'Blog post deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting blog post:', err);
    res.status(500).json({ error: err.message || 'Failed to delete blog post' });
  }
});

// ==================== STATIC PAGES API ====================

app.get('/api/admin/static-pages', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('static_pages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching static pages:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch static pages' });
  }
});

app.post('/api/admin/static-pages', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const pageSchema = z.object({
      title: z.string().min(1),
      slug: z.string().min(1),
      content: z.string().optional(),
      status: z.string().default('draft')
    });

    const validated = pageSchema.parse(req.body);

    const { data, error } = await supabase
      .from('static_pages')
      .insert({
        title: validated.title,
        slug: validated.slug,
        content: validated.content,
        status: validated.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity('Static Page Created', `Created page: ${validated.title}`, req);
    res.status(201).json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error creating static page:', err);
    res.status(500).json({ error: err.message || 'Failed to create static page' });
  }
});

app.put('/api/admin/static-pages/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const pageSchema = z.object({
      title: z.string().min(1).optional(),
      slug: z.string().min(1).optional(),
      content: z.string().optional(),
      status: z.string().optional()
    });

    const validated = pageSchema.parse(req.body);

    const { data, error } = await supabase
      .from('static_pages')
      .update({
        ...validated,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logActivity('Static Page Updated', `Updated page ID: ${id}`, req);
    res.json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error updating static page:', err);
    res.status(500).json({ error: err.message || 'Failed to update static page' });
  }
});

app.delete('/api/admin/static-pages/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('static_pages')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logActivity('Static Page Deleted', `Deleted page ID: ${id}`, req);
    res.json({ success: true, message: 'Static page deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting static page:', err);
    res.status(500).json({ error: err.message || 'Failed to delete static page' });
  }
});

// ==================== MEDIA FILES API ====================

app.get('/api/admin/media', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('media_files')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching media files:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch media files' });
  }
});

app.post('/api/admin/media', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const mediaSchema = z.object({
      filename: z.string().min(1),
      url: z.string().url(),
      mime_type: z.string().optional(),
      size: z.number().positive().optional(),
      uploaded_by: z.string()
    });

    const validated = mediaSchema.parse(req.body);

    const { data, error } = await supabase
      .from('media_files')
      .insert({
        filename: validated.filename,
        url: validated.url,
        mime_type: validated.mime_type,
        size: validated.size,
        uploaded_by: validated.uploaded_by,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity('Media File Uploaded', `Uploaded file: ${validated.filename}`, req);
    res.status(201).json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error uploading media:', err);
    res.status(500).json({ error: err.message || 'Failed to upload media' });
  }
});

app.delete('/api/admin/media/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('media_files')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logActivity('Media File Deleted', `Deleted file ID: ${id}`, req);
    res.json({ success: true, message: 'Media file deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting media:', err);
    res.status(500).json({ error: err.message || 'Failed to delete media' });
  }
});

// ==================== BANNERS API ====================

app.get('/api/admin/banners', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching banners:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch banners' });
  }
});

app.post('/api/admin/banners', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const bannerSchema = z.object({
      title: z.string().min(1),
      image_url: z.string().url(),
      link_url: z.string().url().optional(),
      position: z.string().optional(),
      status: z.string().default('active')
    });

    const validated = bannerSchema.parse(req.body);

    const { data, error } = await supabase
      .from('banners')
      .insert({
        title: validated.title,
        image_url: validated.image_url,
        link_url: validated.link_url,
        position: validated.position,
        status: validated.status,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity('Banner Created', `Created banner: ${validated.title}`, req);
    res.status(201).json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error creating banner:', err);
    res.status(500).json({ error: err.message || 'Failed to create banner' });
  }
});

app.put('/api/admin/banners/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const bannerSchema = z.object({
      title: z.string().min(1).optional(),
      image_url: z.string().url().optional(),
      link_url: z.string().url().optional(),
      position: z.string().optional(),
      status: z.string().optional()
    });

    const validated = bannerSchema.parse(req.body);

    const { data, error } = await supabase
      .from('banners')
      .update(validated)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logActivity('Banner Updated', `Updated banner ID: ${id}`, req);
    res.json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error updating banner:', err);
    res.status(500).json({ error: err.message || 'Failed to update banner' });
  }
});

app.delete('/api/admin/banners/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logActivity('Banner Deleted', `Deleted banner ID: ${id}`, req);
    res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting banner:', err);
    res.status(500).json({ error: err.message || 'Failed to delete banner' });
  }
});

// ==================== COUPONS API ====================

app.get('/api/admin/coupons', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching coupons:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch coupons' });
  }
});

app.post('/api/admin/coupons', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const couponSchema = z.object({
      code: z.string().min(3),
      discount_type: z.enum(['percentage', 'fixed']),
      discount_value: z.number().positive()
    });

    const validated = couponSchema.parse(req.body);

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code: validated.code,
        discount_type: validated.discount_type,
        discount_value: validated.discount_value,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity('Coupon Created', `Created coupon: ${validated.code}`, req);
    res.status(201).json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error creating coupon:', err);
    res.status(500).json({ error: err.message || 'Failed to create coupon' });
  }
});

app.delete('/api/admin/coupons/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logActivity('Coupon Deleted', `Deleted coupon ID: ${id}`, req);
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting coupon:', err);
    res.status(500).json({ error: err.message || 'Failed to delete coupon' });
  }
});

// ==================== TIER SETTINGS API ====================

app.get('/api/admin/tiers', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('tier_settings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching tiers:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch tiers' });
  }
});

app.post('/api/admin/tiers', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const tierSchema = z.object({
      name: z.string().min(1),
      commission_rate: z.number().min(0).max(100),
      required_referrals: z.number().positive()
    });

    const validated = tierSchema.parse(req.body);

    const { data, error } = await supabase
      .from('tier_settings')
      .insert({
        name: validated.name,
        commission_rate: validated.commission_rate,
        required_referrals: validated.required_referrals,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity('Tier Created', `Created tier: ${validated.name}`, req);
    res.status(201).json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error creating tier:', err);
    res.status(500).json({ error: err.message || 'Failed to create tier' });
  }
});

// ==================== AFFILIATE APPROVALS API ====================

app.get('/api/admin/affiliate-approvals', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'affiliate')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching affiliate approvals:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch affiliate approvals' });
  }
});

app.post('/api/admin/affiliate-approvals/:userId/approve', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('users')
      .update({ status: 'active' })
      .eq('uid', userId)
      .select()
      .single();

    if (error) throw error;

    await logActivity('Affiliate Approved', `Approved user ID: ${userId}`, req);
    res.json(data);
  } catch (err: any) {
    console.error('Error approving affiliate:', err);
    res.status(500).json({ error: err.message || 'Failed to approve affiliate' });
  }
});

// ==================== REFUNDS API ====================

app.get('/api/admin/refunds', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'refunded')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching refunds:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch refunds' });
  }
});

// ==================== NOTIFICATIONS API ====================

app.get('/api/admin/notifications', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
  }
});

app.post('/api/admin/notifications', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const notifSchema = z.object({
      user_id: z.string(),
      title: z.string().min(1),
      message: z.string().min(1)
    });

    const validated = notifSchema.parse(req.body);

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: validated.user_id,
        title: validated.title,
        message: validated.message,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity('Notification Sent', `Sent notification: ${validated.title}`, req);
    res.status(201).json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error creating notification:', err);
    res.status(500).json({ error: err.message || 'Failed to create notification' });
  }
});

// ==================== CLICKS & ANALYTICS API ====================

app.get('/api/admin/clicks', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('clicks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching clicks:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch clicks' });
  }
});

app.get('/api/admin/clicks/analytics', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .rpc('get_click_analytics');

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching click analytics:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch click analytics' });
  }
});

// ==================== FRAUD ALERTS API ====================

app.get('/api/admin/fraud-alerts', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('fraud_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching fraud alerts:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch fraud alerts' });
  }
});

app.put('/api/admin/fraud-alerts/:id/resolve', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('fraud_alerts')
      .update({ status: 'resolved' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logActivity('Fraud Alert Resolved', `Resolved alert ID: ${id}`, req);
    res.json(data);
  } catch (err: any) {
    console.error('Error resolving fraud alert:', err);
    res.status(500).json({ error: err.message || 'Failed to resolve fraud alert' });
  }
});

// ==================== REVENUE & ANALYTICS API ====================

app.get('/api/admin/revenue', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('amount, created_at')
      .eq('status', 'completed');

    if (error) throw error;

    const total = data?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0;
    res.json({ total_revenue: total, orders: data || [] });
  } catch (err: any) {
    console.error('Error fetching revenue:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch revenue' });
  }
});

app.get('/api/admin/conversion-funnel', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    // Get clicks, signups, and orders for funnel analysis
    const { data: clicks } = await supabase.from('clicks').select('id');
    const { data: signups } = await supabase.from('users').select('id');
    const { data: orders } = await supabase.from('orders').select('id').eq('status', 'completed');

    res.json({
      clicks: clicks?.length || 0,
      signups: signups?.length || 0,
      orders: orders?.length || 0
    });
  } catch (err: any) {
    console.error('Error fetching conversion funnel:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch conversion funnel' });
  }
});

app.get('/api/admin/product-performance', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data: products } = await supabase.from('products').select('id, name');
    const { data: orders } = await supabase.from('orders').select('product_id, amount').eq('status', 'completed');

    // Calculate performance per product
    const performance = products?.map(product => {
      const productOrders = orders?.filter(o => o.product_id === product.id) || [];
      const revenue = productOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
      return {
        product_id: product.id,
        product_name: product.name,
        total_orders: productOrders.length,
        total_revenue: revenue
      };
    });

    res.json(performance || []);
  } catch (err: any) {
    console.error('Error fetching product performance:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch product performance' });
  }
});

// ==================== ACTIVITY LOGS API ====================

app.get('/api/admin/activity-logs', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch activity logs' });
  }
});

// ==================== STRIPE WEBHOOK ====================

app.post('/api/webhooks/stripe', async (req: express.Request, res: express.Response) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret || '');

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Payment successful:', session.id);
        // TODO: Update order status in Supabase
        break;
      
      case 'invoice.payment_failed':
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment failed:', invoice.id);
        break;
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('Webhook Error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// ==================== STRIPE CHECKOUT ====================

app.post('/api/create-checkout-session', async (req: express.Request, res: express.Response) => {
  try {
    const { productId, userId } = req.body;
    const stripe = getStripe();

    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.description,
              images: product.cover_image_url ? [product.cover_image_url] : undefined
            },
            unit_amount: Math.round((product.sale_price || product.price) * 100)
          },
          quantity: 1
        }
      ],
      success_url: `${req.headers.origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/products`,
      metadata: {
        productId,
        userId
      }
    });

    res.json({ sessionId: session.id });
  } catch (err: any) {
    console.error('Checkout Error:', err);
    res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
});

// ==================== USER PROFILE API ====================

app.get('/api/user/profile', authenticate, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', req.user.uid)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch profile' });
  }
});

app.post('/api/user/update-profile', authenticate, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        ...req.body,
        updated_at: new Date().toISOString()
      })
      .eq('uid', req.user.uid)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
});

// ==================== EXPORT FOR VERCEL ====================

export default app;
