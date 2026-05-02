import React, { useState, useEffect, useCallback } from 'react';
import { Share2, TrendingUp, BarChart3, MousePointer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { supabase } from '../lib/supabase';

const COLORS = ['#2FA084', '#6FCF97', '#4f46e5', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#06b6d4', '#84cc16'];

interface SourceData {
  name: string;
  clicks: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

export function TrafficSourcesReport() {
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [mediumData, setMediumData] = useState<SourceData[]>([]);
  const [campaignData, setCampaignData] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'source' | 'medium' | 'campaign'>('source');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clicksSnap, salesSnap] = await Promise.all([
        getDocs(collection(db, 'clicks')),
        getDocs(collection(db, 'sales')),
      ]);

      const clicks = clicksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const saleByClickId = new Map<string, any>();
      sales.forEach(s => {
        if (s.clickId) saleByClickId.set(s.clickId, s);
      });

      const sourceMap = new Map<string, { clicks: number; conversions: number; revenue: number }>();
      const mediumMap = new Map<string, { clicks: number; conversions: number; revenue: number }>();
      const campaignMap = new Map<string, { clicks: number; conversions: number; revenue: number }>();

      clicks.forEach(click => {
        const source = click.source || 'direct';
        const medium = click.medium || 'referral';
        const campaign = click.campaign || 'default';

        const converted = click.converted;
        const sale = saleByClickId.get(click.saleId);
        const revenue = sale?.amount || 0;

        if (!sourceMap.has(source)) sourceMap.set(source, { clicks: 0, conversions: 0, revenue: 0 });
        sourceMap.get(source)!.clicks += 1;
        if (converted) sourceMap.get(source)!.conversions += 1;
        sourceMap.get(source)!.revenue += revenue;

        if (!mediumMap.has(medium)) mediumMap.set(medium, { clicks: 0, conversions: 0, revenue: 0 });
        mediumMap.get(medium)!.clicks += 1;
        if (converted) mediumMap.get(medium)!.conversions += 1;
        mediumMap.get(medium)!.revenue += revenue;

        if (!campaignMap.has(campaign)) campaignMap.set(campaign, { clicks: 0, conversions: 0, revenue: 0 });
        campaignMap.get(campaign)!.clicks += 1;
        if (converted) campaignMap.get(campaign)!.conversions += 1;
        campaignMap.get(campaign)!.revenue += revenue;
      });

      const formatData = (map: Map<string, any>): SourceData[] =>
        Array.from(map.entries())
          .map(([name, data]) => ({
            name,
            ...data,
            conversionRate: data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0,
          }))
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 15);

      setSourceData(formatData(sourceMap));
      setMediumData(formatData(mediumMap));
      setCampaignData(formatData(campaignMap));
    } catch (err) {
      console.error('Failed to load traffic sources:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="animate-pulse h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>;

  const currentData = activeView === 'source' ? sourceData : activeView === 'medium' ? mediumData : campaignData;
  const totalClicks = currentData.reduce((sum, d) => sum + d.clicks, 0);
  const totalRevenue = currentData.reduce((sum, d) => sum + d.revenue, 0);
  const totalConversions = currentData.reduce((sum, d) => sum + d.conversions, 0);

  const radarData = currentData.slice(0, 6).map(d => ({
    name: d.name.substring(0, 15),
    Clicks: d.clicks,
    Conversions: d.conversions,
    Revenue: Math.round(d.revenue / 1000),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black flex items-center gap-2"><Share2 size={20} />Traffic Sources Report</h2>
        <div className="flex gap-2">
          {([
            { key: 'source', label: 'Source', icon: Share2 },
            { key: 'medium', label: 'Medium', icon: BarChart3 },
            { key: 'campaign', label: 'Campaign', icon: MousePointer },
          ] as const).map(view => (
            <button
              key={view.key}
              onClick={() => setActiveView(view.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-all ${
                activeView === view.key ? 'bg-[#2FA084] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <view.icon size={14} />
              {view.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs text-gray-500 font-medium">Total Clicks</p>
          <p className="text-2xl font-black mt-1">{totalClicks.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs text-gray-500 font-medium">Total Conversions</p>
          <p className="text-2xl font-black mt-1">{totalConversions.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs text-gray-500 font-medium">Total Revenue</p>
          <p className="text-2xl font-black mt-1">Rp {totalRevenue.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <h3 className="font-bold mb-4">Clicks by {activeView}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={currentData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="clicks" fill="#2FA084" radius={[4, 4, 0, 0]} name="Clicks" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <h3 className="font-bold mb-4">Share Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={currentData.slice(0, 8)}
                dataKey="clicks"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name?.substring(0, 12)} (${(percent * 100).toFixed(0)}%)`}
              >
                {currentData.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {radarData.length >= 3 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <h3 className="font-bold mb-4">Performance Comparison (Top 6)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData}>
              <PolarGrid className="stroke-gray-200 dark:stroke-gray-700" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              <Radar name="Clicks" dataKey="Clicks" stroke="#2FA084" fill="#2FA084" fillOpacity={0.3} />
              <Radar name="Revenue (K)" dataKey="Revenue" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-bold">All {activeView.charAt(0).toUpperCase() + activeView.slice(1)}</h3>
          <p className="text-xs text-gray-500">{currentData.length} {activeView}s</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs font-bold uppercase">
              <tr>
                <th className="px-4 py-3 text-left">{activeView.charAt(0).toUpperCase() + activeView.slice(1)}</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">Conversions</th>
                <th className="px-4 py-3 text-right">Conversion Rate</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Rev/Click</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {currentData.map((d, idx) => (
                <tr key={d.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="font-semibold text-sm">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{d.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{d.conversions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      d.conversionRate >= 5 ? 'bg-green-100 text-green-700' :
                      d.conversionRate >= 2 ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {d.conversionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">Rp {d.revenue.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right text-sm">Rp {d.clicks > 0 ? Math.round(d.revenue / d.clicks).toLocaleString('id-ID') : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
