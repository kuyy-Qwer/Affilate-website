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
  affiliateId: string;
  commission: number;
  amount: number;
  createdAt: string;
}
