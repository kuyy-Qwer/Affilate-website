import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';
type ApprovalRecord = {
  id: string;
  userId: string;
  userName: string;
  referralCode?: string;
  status: ApprovalStatus;
  requestedAt?: string;
  notes?: string;
};

export function AffiliateApproval() {
  const { getAuthHeaders } = useStore();
  const [records, setRecords] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      const resp = await fetch('/api/admin/affiliate-approvals', { headers: await getAuthHeaders() });
      if (!resp.ok) throw new Error('Failed to fetch affiliations');
      const data = await resp.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? 'Error fetching approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const updateStatus = async (id: string, status: ApprovalRecord['status']) => {
    try {
      const resp = await fetch(`/api/admin/affiliate-approvals/${id}`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      if (resp.ok) {
        setRecords(rs => rs.map(r => r.id === id ? { ...r, status } : r));
      } else {
        const err = await resp.json();
        alert('Gagal: ' + (err.error || 'Server error'));
      }
    } catch (e) {
      alert('Gagal memperbarui status');
    }
  };

  if (loading) return <div className="flex justify-center py-8"><span>Memuat...</span></div>;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
      <h3 className="text-xl font-bold mb-4">Persetujuan Affiliate</h3>
      {records.length === 0 ? (
        <div className="text-center text-sm text-gray-500">Tidak ada permintaan persetujuan saat ini.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-[10px] uppercase tracking-widest text-gray-400">
              <tr>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Referral</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tgl Request</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-3">{r.userName}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.referralCode ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    {r.status !== 'approved' && (
                      <button onClick={() => updateStatus(r.id, 'approved')} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Approve</button>
                    )}
                    {r.status !== 'rejected' && (
                      <button onClick={() => updateStatus(r.id, 'rejected')} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Reject</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
