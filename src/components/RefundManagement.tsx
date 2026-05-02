import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

type Refund = { id: string; saleId: string; amount?: number; status: string; reason?: string; createdAt?: string; processedAt?: string };

export function RefundManagement() {
  const { getAuthHeaders } = useStore();
  const [refounds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRefunds = async () => {
    try {
      const resp = await fetch('/api/admin/refunds', { headers: await getAuthHeaders() });
      if (!resp.ok) throw new Error('Failed to fetch refunds');
      const data = await resp.json();
      setRefunds(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRefunds(); }, []);

  if (loading) return <div className="p-4">Loading refunds…</div>;
  return (
    <div className="p-4 border rounded-xl bg-white dark:bg-gray-800 border-gray-100">
      <h3 className="font-bold mb-2">Refund Management</h3>
      {refounds.length === 0 ? (
        <div className="text-sm text-gray-600">Tidak ada refund saat ini.</div>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-[10px] uppercase tracking-widest text-gray-400">
            <tr>
              <th className="px-4 py-2">Sale</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {refounds.map(r => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{r.saleId}</td>
                <td className="px-4 py-2">{r.amount ?? 0}</td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2">{r.createdAt ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
