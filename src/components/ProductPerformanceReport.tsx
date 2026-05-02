import React, { useState, useEffect, useCallback } from 'react';
import { Package, TrendingUp, ShoppingCart, Star, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabase';
import { Product, Sale } from '../types';

const COLORS = ['#2FA084', '#6FCF97', '#4f46e5', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

interface ProductPerformance {
  product: Product;
  totalSales: number;
  totalRevenue: number;
  totalCommission: number;
  conversionRate: number;
  clicks: number;
  averageRating: number;
  reviewCount: number;
}

export function ProductPerformanceReport() {
  const [products, setProducts] = useState<ProductPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'revenue' | 'sales' | 'conversion' | 'rating'>('revenue');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsSnap, salesSnap, clicksSnap] = await Promise.all([
        getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'sales'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'clicks')),
      ]);

      const productList = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      const salesList = salesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sale));

      const productMap = new Map<string, ProductPerformance>();
      productList.forEach(p => {
        productMap.set(p.id, {
          product: p,
          totalSales: 0,
          totalRevenue: 0,
          totalCommission: 0,
          conversionRate: 0,
          clicks: 0,
          averageRating: p.averageRating || 0,
          reviewCount: p.reviewCount || 0,
        });
      });

      salesList.forEach(sale => {
        const entry = productMap.get(sale.productId);
        if (entry) {
          entry.totalSales += 1;
          entry.totalRevenue += sale.amount || 0;
          entry.totalCommission += sale.commission || 0;
        }
      });

      clicksSnap.docs.forEach(clickDoc => {
        const data = clickDoc.data();
        if (data.productId && productMap.has(data.productId)) {
          productMap.get(data.productId)!.clicks += 1;
        }
      });

      productMap.forEach(entry => {
        entry.conversionRate = entry.clicks > 0 ? (entry.totalSales / entry.clicks) * 100 : 0;
      });

      const sorted = Array.from(productMap.values()).sort((a, b) => {
        switch (sortBy) {
          case 'revenue': return b.totalRevenue - a.totalRevenue;
          case 'sales': return b.totalSales - a.totalSales;
          case 'conversion': return b.conversionRate - a.conversionRate;
          case 'rating': return b.averageRating - a.averageRating;
          default: return 0;
        }
      });

      setProducts(sorted);
    } catch (err) {
      console.error('Failed to load product performance:', err);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="animate-pulse h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>;

  const totalRevenue = products.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalSales = products.reduce((sum, p) => sum + p.totalSales, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Product Performance Report</h2>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="px-3 py-2 border rounded-lg text-sm font-bold"
        >
          <option value="revenue">Sort by Revenue</option>
          <option value="sales">Sort by Sales</option>
          <option value="conversion">Sort by Conversion</option>
          <option value="rating">Sort by Rating</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <h3 className="font-bold mb-4">Revenue by Product</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={products.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `Rp ${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
              <Bar dataKey="totalRevenue" fill="#2FA084" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <h3 className="font-bold mb-4">Revenue Share</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={products.slice(0, 8)}
                dataKey="totalRevenue"
                nameKey="product.name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name?.substring(0, 12)}... (${(percent * 100).toFixed(0)}%)`}
              >
                {products.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-bold">All Products</h3>
          <p className="text-xs text-gray-500">{products.length} products | Total Revenue: Rp {totalRevenue.toLocaleString('id-ID')} | Total Sales: {totalSales}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs font-bold uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Sales</th>
                <th className="px-4 py-3 text-right">Commission</th>
                <th className="px-4 py-3 text-right">Conversion</th>
                <th className="px-4 py-3 text-center">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {products.map((p, idx) => (
                <tr key={p.product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.product.image} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      <div>
                        <p className="font-semibold text-sm">{p.product.name}</p>
                        <p className="text-xs text-gray-500">{p.product.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">Rp {p.totalRevenue.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right">{p.totalSales}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-semibold">Rp {p.totalCommission.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      p.conversionRate >= 5 ? 'bg-green-100 text-green-700' :
                      p.conversionRate >= 2 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {p.conversionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                      <span className="text-sm font-semibold">{p.averageRating.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({p.reviewCount})</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
