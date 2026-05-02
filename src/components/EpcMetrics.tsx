import React from 'react'

export function EpcMetrics({ value }: { value?: number }) {
  const v = value ?? 0
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100">
      <div className="text-sm font-bold text-gray-500 uppercase">EPC</div>
      <div className="text-2xl font-black text-[#1F6F5F]">{v.toFixed(2)}</div>
    </div>
  )
}
