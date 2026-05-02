-- Supabase Schema for DigiSell Affiliate Platform

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Users table (replaces Firebase Auth + Firestore users collection)
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  uid text unique not null,
  email text unique not null,
  name text not null,
  role text default 'user' check (role in ('user', 'admin')),
  referral_code text unique,
  referred_by text references public.users(uid),
  two_fa jsonb default '{}'::jsonb,
  status text default 'active' check (status in ('active', 'suspended', 'banned')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Products table
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price numeric(10,2) not null,
  sale_price numeric(10,2),
  license_tier text,
  category text,
  download_url text,
  demo_url text,
  cover_image_url text,
  gallery_images text[],
  status text default 'active' check (status in ('active', 'inactive', 'draft')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Orders table
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_id text unique not null,
  user_id text references public.users(uid),
  product_id text,
  amount numeric(10,2) not null,
  status text default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  stripe_session_id text,
  license_key text,
  created_at timestamptz default now()
);

-- License Keys table
create table if not exists public.license_keys (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  product_id text,
  order_id text,
  user_id text references public.users(uid),
  status text default 'active' check (status in ('active', 'revoked', 'expired')),
  created_at timestamptz default now()
);

-- Affiliate Links table
create table if not exists public.affiliate_links (
  id uuid primary key default uuid_generate_v4(),
  user_id text references public.users(uid),
  product_id text,
  referral_code text,
  deeplink_url text,
  created_at timestamptz default now()
);

-- Clicks table (for analytics)
create table if not exists public.clicks (
  id uuid primary key default uuid_generate_v4(),
  user_id text references public.users(uid),
  product_id text,
  ip_address text,
  user_agent text,
  referrer text,
  created_at timestamptz default now()
);

-- Referrals table
create table if not exists public.referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_id text references public.users(uid),
  referred_user_id text references public.users(uid),
  order_id text,
  commission numeric(10,2),
  status text default 'pending' check (status in ('pending', 'approved', 'paid')),
  created_at timestamptz default now()
);

-- Payouts table
create table if not exists public.payouts (
  id uuid primary key default uuid_generate_v4(),
  user_id text references public.users(uid),
  amount numeric(10,2) not null,
  method text,
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz default now()
);

-- Email Templates table
create table if not exists public.email_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subject text not null,
  body text not null,
  variables text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Blog Posts table
create table if not exists public.blog_posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text,
  slug text unique,
  author_id text references public.users(uid),
  status text default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Static Pages table
create table if not exists public.static_pages (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text unique not null,
  content text,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Media Files table
create table if not exists public.media_files (
  id uuid primary key default uuid_generate_v4(),
  filename text not null,
  url text not null,
  mime_type text,
  size integer,
  uploaded_by text references public.users(uid),
  created_at timestamptz default now()
);

-- Banners table
create table if not exists public.banners (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  image_url text not null,
  link_url text,
  position text,
  status text default 'active',
  created_at timestamptz default now()
);

-- Coupons table
create table if not exists public.coupons (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  discount_type text check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10,2),
  expires_at timestamptz,
  usage_limit integer,
  status text default 'active',
  created_at timestamptz default now()
);

-- Tier Settings table
create table if not exists public.tier_settings (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  commission_rate numeric(5,2),
  required_referrals integer,
  created_at timestamptz default now()
);

-- Activity Logs table
create table if not exists public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id text,
  admin_name text,
  action text not null,
  details text,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

-- Notifications table
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id text references public.users(uid),
  title text not null,
  message text,
  read boolean default false,
  created_at timestamptz default now()
);

-- Fraud Alerts table
create table if not exists public.fraud_alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id text references public.users(uid),
  type text,
  severity text check (severity in ('low', 'medium', 'high')),
  status text default 'open' check (status in ('open', 'investigating', 'resolved')),
  description text,
  created_at timestamptz default now()
);

-- RLS (Row Level Security) Policies
alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.license_keys enable row level security;

-- Public can read active products
create policy "Public can view active products" on public.products
  for select using (status = 'active');

-- Users can read their own data
create policy "Users can view own profile" on public.users
  for select using (auth.uid()::text = uid);

-- Users can update their own data
create policy "Users can update own profile" on public.users
  for update using (auth.uid()::text = uid);

-- Create indexes for performance
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_uid on public.users(uid);
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_clicks_created_at on public.clicks(created_at);
create index if not exists idx_referrals_referrer on public.referrals(referrer_id);
