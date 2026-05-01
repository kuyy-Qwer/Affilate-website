import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

type Log = {
  id: string; type: string; message: string; createdAt?: string; isRead?: boolean;
};

export function AuditLogsEnhanced() {
  const { getAuthHeaders } = useStore();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const resp = await fetch('/api/admin/audit-logs', { headers: await getAuthHeaders() });
      if (!resp.ok) throw new Error('Failed to fetch logs');
      const data = await resp.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? 'Error fetching logs');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchLogs(); }, []);

  if (loading) return <div>Loading logs…</div>;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 p-4">
      <h4 className="font-bold mb-2">Audit Logs</h4>
      {logs.length === 0 ? (
        <div className="text-sm text-gray-500">Tidak ada log audit untuk ditampilkan.</div>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-[10px] uppercase tracking-widest text-gray-400">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{l.createdAt ? new Date(l.createdAt).toLocaleString() : ''}</td>
                <td className="px-4 py-2 text-xs">{l.type}</td>
                <td className="px-4 py-2">{l.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
