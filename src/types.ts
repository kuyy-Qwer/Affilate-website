/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SwipeFile {
  title: string;
  content: string;
}

export interface ProductModule {
  id: string;
  title: string;
  content: string;
}

export interface GlobalConfig {
  id: 'global';
  promoActive: boolean;
  promoDiscount: number;
  promoStart: string;
  promoEnd: string;
  geoPricingActive: boolean;
  idrMultiplier: number;
  foreignMultiplier: number;
  // Anti-Fraud Settings
  selfReferralBlocked?: boolean;
  maxClicksPerIpPerHour?: number;
  fraudDetectionEnabled?: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  price?: number;
  sku?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  modules?: ProductModule[];
  variants?: ProductVariant[];
  averageRating?: number;
  reviewCount?: number;
  // Digital Delivery
  downloadUrl?: string;
  isSoftware?: boolean;
  licensePrefix?: string;
  marketingKit?: {
    banners: string[];
    swipeFiles: SwipeFile[];
  };
  // Commission Override
  commissionOverride?: {
    enabled: boolean;
    rate?: number;
    tierSpecific?: Record<string, number>;
  };
  // Promotion Bonus
  promotionBonus?: {
    enabled: boolean;
    bonusRate: number;
    startDate: string;
    endDate: string;
    description: string;
  };
  // Advanced Attribution
  cookieLifeDays?: number; // Override default cookie life for this product
  createdAt: string;
}

export interface AffiliateStats {
  totalClicks: number;
  totalSales: number;
  totalCommission: number;
  referralLink: string;
  availableBalance?: number; // Commission available for withdrawal
  pendingBalance?: number; // Commission in holding period
  paidBalance?: number; // Commission already paid out
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'affiliate' | 'customer';
  referralCode?: string;
  referredBy?: string;
  wishlist?: string[];
  purchasedProducts?: string[];
  commissionEarned?: number;
  totalSales?: number;
  totalClicks?: number;
  emailVerified?: boolean;
  country?: string;
  isIndonesian?: boolean;
  tier?: string; // Changed to string for dynamic tiers
  // Security & Verification
  kycVerified?: boolean; // Know Your Customer verification
  payoutMethodVerified?: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  // Performance Metrics
  conversionRate?: number; // Calculated: totalSales / totalClicks
  averageOrderValue?: number;
  lifetimeEarnings?: number;
}

export interface Tier {
  id: string;
  name: string;
  displayName: string;
  commissionRate: number;
  minSales: number;
  maxSales: number | null; // null = unlimited
  color: string;
  icon: string;
  benefits: string[];
  isActive: boolean;
  order: number;
  createdAt: string;
  // Advanced Features
  cookieLifeDays?: number; // Dynamic cookie duration per tier
  payoutPriority?: 'standard' | 'priority' | 'instant'; // Payout speed
  payoutHoldingDays?: number; // Holding period before withdrawal
}

export interface Click {
  id: string;
  affiliateId: string;
  referralCode: string;
  visitorId: string;
  source: string;
  medium: string;
  campaign: string;
  landingPage: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  converted: boolean;
  saleId?: string;
  // Anti-Fraud
  fingerprint?: string; // Browser fingerprint
  isBot?: boolean; // Bot detection flag
  isSuspicious?: boolean; // Fraud detection flag
  expiresAt?: string; // Cookie expiration based on tier
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
  usageCount: number;
  usageLimitPerUser?: number;
  expiryDate?: string;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  paymentMethod: string;
  paymentDetails: string;
  createdAt: string;
  processedAt?: string;
  // Priority & Security
  priority?: 'standard' | 'priority' | 'instant'; // Based on tier
  estimatedProcessingTime?: string; // e.g., "24 hours", "7 days"
  fraudCheckStatus?: 'pending' | 'passed' | 'failed';
  adminNotes?: string;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  buyerId: string;
  buyerEmail: string;
  affiliateId: string | null;
  commission: number;
  amount: number;
  couponId?: string | null;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  stripeSessionId?: string;
  // Digital Delivery
  licenseKey?: string;
  downloadToken?: string;
  downloadExpiresAt?: string;
  createdAt: string;
  // Anti-Fraud & Security
  buyerIpAddress?: string;
  isSelfReferral?: boolean; // Detected self-referral
  fraudScore?: number; // 0-100, higher = more suspicious
  idempotencyKey?: string; // Prevent duplicate transactions
  // Commission Management
  commissionStatus?: 'pending' | 'held' | 'available' | 'paid';
  commissionAvailableAt?: string; // When commission becomes available for withdrawal
  commissionPaidAt?: string; // When commission was paid out
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

// New Professional Types

export interface AffiliateConfig {
  id: 'affiliate_config';
  defaultCookieLifeDays: number;
  defaultPayoutHoldingDays: number;
  selfReferralBlocked: boolean;
  fraudDetectionEnabled: boolean;
  maxClicksPerIpPerHour: number;
  minPayoutAmount: number;
  multiTouchAttributionEnabled: boolean;
  attributionModel: 'first-click' | 'last-click' | 'linear' | 'time-decay';
  multiTierEnabled: boolean;
  tier2Rate: number;
  tier3Rate: number;
}

export interface PayoutMethod {
  id: string;
  userId: string;
  type: 'bank_transfer' | 'dana' | 'ovo' | 'gopay' | 'paypal';
  accountName: string;
  accountNumber: string;
  bankName?: string;
  isVerified: boolean;
  isPrimary: boolean;
  createdAt: string;
}

export interface FraudAlert {
  id: string;
  type: 'self_referral' | 'click_spam' | 'suspicious_pattern' | 'duplicate_transaction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  affiliateId?: string;
  saleId?: string;
  clickId?: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'false_positive';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  resolution?: string;
}

export interface DeepLink {
  id: string;
  affiliateId: string;
  productId?: string;
  moduleId?: string;
  couponCode?: string;
  customParams?: Record<string, string>;
  shortCode: string;
  fullUrl: string;
  clicks: number;
  conversions: number;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage: string;
  authorId: string;
  authorName: string;
  status: 'draft' | 'published';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
}

export interface MediaFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  folder?: string;
  thumbnailUrl?: string;
}

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  key: string;
  subject: string;
  htmlBody: string;
  variables: string[];
  isActive: boolean;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'promo';
  isActive: boolean;
  startDate: string;
  endDate?: string;
  targetAudience: 'all' | 'affiliates' | 'customers' | 'admins';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'commission_earned' | 'payout_processed' | 'tier_upgraded' | 'new_sale' | 'affiliate_approved';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Resource {
  id: string;
  title: string;
  type: 'faq' | 'tip' | 'video' | 'guide';
  content: string;
  videoUrl?: string;
  order: number;
  isPublished: boolean;
}

export interface Refund {
  id: string;
  saleId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  processedAt?: string;
  commissionReversed: number;
}

export interface UserSession {
  id: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  lastActive: string;
  isActive: boolean;
  createdAt: string;
}
