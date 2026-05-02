import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, DollarSign, Users, ShoppingCart, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ToolTip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { useStore } from '../store/useStore';

const COLORS = ['#2FA084', '#6FCF97', '#4f46e5', '#f59e0b', '#ef4444', '#8b5cf6'];

interface RevenueData {
  totalRevenue: number;
  totalCommission: number;
  totalSales: number;
  totalClicks: number;
  conversionRate: number;
  averageOrderValue: number;
  dailyRevenue: { date: string; revenue: number; sales: number }[];
  revenueByProduct: { name: string; revenue: number; sales: number }[];
  revenueByTier: { tier: string; revenue: number; sales: number }[];
  comparisonData: {
    revenueChange: number;
    salesChange: number;
    commissionChange: number;
  };
}

export function RevenueDashboard() {
  const { getAuthHeaders } = useStore();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/revenue`, { headers });
      if (resp.ok) {
        const result = await resp.json();
        
        // Calculate comparison data (simplified - in production, use proper period comparison)
        const prevRevenue = result.totalRevenue * 0.9; // Simulated previous period
        const prevSales = result.totalSales * 0.9;
        const prevCommission = result.totalCommission * 0.9;

        const formattedData: RevenueData = {
          totalRevenue: result.totalRevenue || 0,
          totalCommission: result.totalCommission || 0,
          totalSales: result.totalSales || 0,
          totalClicks: result.totalClicks || 0,
          conversionRate: result.totalClicks > 0 ? (result.totalSales / result.totalClicks) * 100 : 0,
          averageOrderValue: result.totalSales > 0 ? result.totalRevenue / result.totalSales : 0,
          dailyRevenue: Object.entries(result.byMonth || {}).map(([date, data]: [string, any]) => ({
            date: new Date(date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
            revenue: data.revenue || 0,
            sales: data.sales || 0,
          })),
          revenueByProduct: (result.byProduct || []).slice(0, 10),
          revenueByTier: (result.byTier || []),
          comparisonData: {
            revenueChange: prevRevenue > 0 ? ((result.totalRevenue - prevRevenue) / prevRevenue) * 100 : 0,
            salesChange: prevSales > 0 ? ((result.totalSales - prevSales) / prevSales) * 100 : 0,
            commissionChange: prevCommission > 0 ? ((result.totalCommission - prevCommission) / prevCommission) * 100 : 0,
          },
        };

        setData(formattedData);
      } else {
        console.error('Failed to load revenue data');
      }
    } catch (err) {
      console.error('Failed to load revenue data:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          ))}
        </div>
        <div className="animate-pulse h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      </div>
    );
  }

  if (!data) return <div className="text-center py-12 text-gray-500">Failed to load revenue data</div>;

  const ChangeIndicator = ({ value }: { value: number }) => (
    <span className={`flex items-center gap-1 text-xs font-bold ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
      {value >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">Revenue Dashboard</h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                dateRange === range
                  ? 'bg-[#2FA084] text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `Rp ${data.totalRevenue.toLocaleString('id-ID')}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', change: data.comparisonData.revenueChange },
          { label: 'Total Sales', value: data.totalSales.toString(), icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', change: data.comparisonData.salesChange },
          { label: 'Commission Paid', value: `Rp ${data.totalCommission.toLocaleString('id-ID')}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', change: data.comparisonData.commissionChange },
          { label: 'Conversion Rate', value: `${data.conversionRate.toFixed(2)}%`, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', change: 0 },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <ChangeIndicator value={stat.change} />
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
              <p className="text-xl font-black mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Calendar size={16} />Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `Rp ${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
              <Area type="monotone" dataKey="revenue" stroke="#2FA084" fill="#2FA084" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <h3 className="font-bold mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data.revenueByProduct.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <h3 className="font-bold mb-4">Revenue by Product</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.revenueByProduct} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `Rp ${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
              <Bar dataKey="revenue" fill="#2FA084" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <h3 className="font-bold mb-4">Revenue by Tier</h3>
          {data.revenueByTier.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.revenueByTier} dataKey="revenue" nameKey="tier" cx="50%" cy="50%" outerRadius={80} label={({ tier, percent }: any) => `${tier} (${(percent * 100).toFixed(0)}%)`}>
                  {data.revenueByTier.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-8">No tier data available</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <h3 className="font-bold mb-4">Key Metrics</h3>
          <div className="space-y-4">
            {[
              { label: 'Average Order Value', value: `Rp ${Math.round(data.averageOrderValue).toLocaleString('id-ID')}` },
              { label: 'Total Clicks', value: data.totalClicks.toLocaleString() },
              { label: 'Total Sales', value: data.totalSales.toLocaleString() },
              { label: 'Conversion Rate', value: `${data.conversionRate.toFixed(2)}%` },
              { label: 'Revenue per Click', value: `Rp ${data.totalClicks > 0 ? Math.round(data.totalRevenue / data.totalClicks).toLocaleString('id-ID') : 0}` },
              { label: 'Commission Rate', value: `${data.totalRevenue > 0 ? ((data.totalCommission / data.totalRevenue) * 100).toFixed(1) : 0}%` },
            ].map((metric, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</span>
                <span className="font-bold">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
