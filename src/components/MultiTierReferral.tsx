import React from 'react'
import { useStore } from '../store/useStore'

export function MultiTierReferral() {
  const { tiers } = useStore();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 p-4">
      <h3 className="text-xl font-bold mb-2">Multi-Tier Referral</h3>
      <p className="text-sm text-gray-600 mb-4">Daftar tier dan rate untuk referensi multi-tier.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map(t => (
          <div key={t.id} className="p-3 border rounded-lg">
            <div className="font-bold">{t.displayName}</div>
            <div className="text-sm text-gray-600">Rate: {((t.commissionRate || 0) * 100).toFixed(0)}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}
