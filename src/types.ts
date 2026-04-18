/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProductModule {
  id: string;
  title: string;
  content: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  modules?: ProductModule[];
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
