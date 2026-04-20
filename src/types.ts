/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  createdAt: any;
}

export interface AffiliateStats {
  totalClicks: number;
  totalSales: number;
  totalCommission: number;
  referralLink: string;
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
  paymentStatus: 'pending' | 'completed' | 'failed';
  stripeSessionId?: string;
  // Digital Delivery
  licenseKey?: string;
  downloadToken?: string;
  downloadExpiresAt?: string;
  createdAt: string;
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
