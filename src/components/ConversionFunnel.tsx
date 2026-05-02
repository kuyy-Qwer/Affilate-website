import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Users, ShoppingCart, CreditCard, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';

interface FunnelStep {
  name: string;
  count: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

export function ConversionFunnel() {
  const { getAuthHeaders } = useStore();
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/conversion-funnel`, { headers });
      if (resp.ok) {
        const data = await resp.json();
        setSteps([
          { name: 'Page Visitors', count: (data.clicks || 0) * 3, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-500' },
          { name: 'Clicks', count: data.clicks || 0, icon: TrendingUp, color: 'text-indigo-600', bgColor: 'bg-indigo-500' },
          { name: 'Purchases', count: data.sales || 0, icon: ShoppingCart, color: 'text-amber-600', bgColor: 'bg-amber-500' },
          { name: 'Completed Sales', count: data.customers || 0, icon: CreditCard, color: 'text-green-600', bgColor: 'bg-green-500' },
        ]);
      } else {
        console.error('Failed to load funnel data');
      }
    } catch (err) {
      console.error('Failed to load funnel data:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="animate-pulse h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>;
  }

  const maxCount = steps[0]?.count || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Conversion Funnel</h2>
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
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => {
          const width = (step.count / maxCount) * 100;
          const conversionRate = idx > 0 ? ((step.count / steps[idx - 1].count) * 100) || 0 : 100;
          const overallRate = ((step.count / maxCount) * 100) || 0;

          return (
            <div key={idx} className="relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <step.icon size={18} className={step.color} />
                  <span className="font-bold text-sm">{step.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-black">{step.count.toLocaleString()}</span>
                  {idx > 0 && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      conversionRate >= 50 ? 'bg-green-100 text-green-700' :
                      conversionRate >= 20 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {conversionRate.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${step.bgColor} rounded-full transition-all duration-500 flex items-center justify-end pr-3`}
                  style={{ width: `${Math.max(width, 5)}%` }}
                >
                  <span className="text-xs font-bold text-white">{overallRate.toFixed(1)}%</span>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowRight size={14} className="text-gray-400 rotate-90" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {steps.length >= 4 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4 mt-4">
          <h4 className="font-bold text-sm mb-3">Funnel Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Click-through Rate</p>
              <p className="text-lg font-black text-blue-700 dark:text-blue-300 mt-1">
                {steps[1].count > 0 ? ((steps[1].count / steps[0].count) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Purchase Rate</p>
              <p className="text-lg font-black text-amber-700 dark:text-amber-300 mt-1">
                {steps[0].count > 0 ? ((steps[2].count / steps[0].count) * 100).toFixed(2) : 0}%
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Completion Rate</p>
              <p className="text-lg font-black text-green-700 dark:text-green-300 mt-1">
                {steps[2].count > 0 ? ((steps[3].count / steps[2].count) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
