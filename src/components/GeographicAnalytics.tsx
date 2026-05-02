import React, { useState, useEffect, useCallback } from 'react';
import { Globe, MapPin, Users, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabase';

const COLORS = ['#2FA084', '#6FCF97', '#4f46e5', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#06b6d4', '#84cc16'];

interface GeoData {
  country: string;
  users: number;
  sales: number;
  revenue: number;
  clicks: number;
}

export function GeographicAnalytics() {
  const [geoData, setGeoData] = useState<GeoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<'revenue' | 'sales' | 'users' | 'clicks'>('revenue');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersSnap, salesSnap, clicksSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'sales')),
        getDocs(collection(db, 'clicks')),
      ]);

      const countryMap = new Map<string, GeoData>();

      usersSnap.docs.forEach(doc => {
        const data = doc.data();
        const country = data.country || 'Unknown';
        if (!countryMap.has(country)) {
          countryMap.set(country, { country, users: 0, sales: 0, revenue: 0, clicks: 0 });
        }
        countryMap.get(country)!.users += 1;
      });

      salesSnap.docs.forEach(doc => {
        const data = doc.data();
        const buyerCountry = data.buyerCountry || 'Unknown';
        if (!countryMap.has(buyerCountry)) {
          countryMap.set(buyerCountry, { country: buyerCountry, users: 0, sales: 0, revenue: 0, clicks: 0 });
        }
        const entry = countryMap.get(buyerCountry)!;
        entry.sales += 1;
        entry.revenue += data.amount || 0;
      });

      clicksSnap.docs.forEach(doc => {
        const data = doc.data();
        const clickCountry = data.country || 'Unknown';
        if (!countryMap.has(clickCountry)) {
          countryMap.set(clickCountry, { country: clickCountry, users: 0, sales: 0, revenue: 0, clicks: 0 });
        }
        countryMap.get(clickCountry)!.clicks += 1;
      });

      const sorted = Array.from(countryMap.values())
        .sort((a, b) => {
          switch (metric) {
            case 'revenue': return b.revenue - a.revenue;
            case 'sales': return b.sales - a.sales;
            case 'users': return b.users - a.users;
            case 'clicks': return b.clicks - a.clicks;
            default: return 0;
          }
        })
        .slice(0, 15);

      setGeoData(sorted);
    } catch (err) {
      console.error('Failed to load geographic data:', err);
    } finally {
      setLoading(false);
    }
  }, [metric]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="animate-pulse h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>;

  const totalRevenue = geoData.reduce((sum, g) => sum + g.revenue, 0);
  const totalUsers = geoData.reduce((sum, g) => sum + g.users, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black flex items-center gap-2"><Globe size={20} />Geographic Analytics</h2>
        <div className="flex gap-2">
          {(['revenue', 'sales', 'users', 'clicks'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${
                metric === m ? 'bg-[#2FA084] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <h3 className="font-bold mb-4">Top Countries by {metric.charAt(0).toUpperCase() + metric.slice(1)}</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={geoData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="country" tick={{ fontSize: 11 }} width={100} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'revenue') return [`Rp ${value.toLocaleString('id-ID')}`, 'Revenue'];
                  return [value.toLocaleString(), name.charAt(0).toUpperCase() + name.slice(1)];
                }}
              />
              <Bar dataKey={metric} fill="#2FA084" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <h3 className="font-bold mb-4">Distribution</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={geoData.slice(0, 10)}
                dataKey={metric}
                nameKey="country"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ country, percent }) => `${country} (${(percent * 100).toFixed(0)}%)`}
              >
                {geoData.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: number) => metric === 'revenue' ? `Rp ${value.toLocaleString('id-ID')}` : value.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-bold">Country Breakdown</h3>
          <p className="text-xs text-gray-500">{geoData.length} countries | Total Revenue: Rp {totalRevenue.toLocaleString('id-ID')} | Total Users: {totalUsers}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs font-bold uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Country</th>
                <th className="px-4 py-3 text-right">Users</th>
                <th className="px-4 py-3 text-right">Sales</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {geoData.map((g, idx) => (
                <tr key={g.country} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="font-semibold text-sm">{g.country}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{g.users}</td>
                  <td className="px-4 py-3 text-right">{g.sales}</td>
                  <td className="px-4 py-3 text-right font-bold">Rp {g.revenue.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right">{g.clicks}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      g.clicks > 0 && (g.sales / g.clicks) * 100 >= 5 ? 'bg-green-100 text-green-700' :
                      g.clicks > 0 && (g.sales / g.clicks) * 100 >= 2 ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {g.clicks > 0 ? ((g.sales / g.clicks) * 100).toFixed(1) : 0}%
                    </span>
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
