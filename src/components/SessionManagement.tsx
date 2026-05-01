import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

type SessionInfo = {
  id: string;
  device: string;
  ip: string;
  lastActive: string;
  isActive: boolean;
};

export function SessionManagement() {
  const { getAuthHeaders } = useStore();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const resp = await fetch('/api/admin/sessions', { headers: await getAuthHeaders() });
      if (!resp.ok) throw new Error('Failed to fetch sessions');
      const data = await resp.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? 'Error fetching sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  if (loading) return <div>Loading sessions…</div>;
  if (error) return <div className="text-red-600 p-4">{error}</div>;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 p-4">
      <h4 className="font-bold mb-3">Session Management</h4>
      {sessions.length === 0 ? (
        <div className="text-sm text-gray-500">Tidak ada sesi aktif.</div>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-[10px] uppercase tracking-widest text-gray-400">
            <tr><th className="px-4 py-2">Device</th><th className="px-4 py-2">IP</th><th className="px-4 py-2">Last Active</th><th className="px-4 py-2">Active</th></tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{s.device}</td>
                <td className="px-4 py-2 text-xs">{s.ip}</td>
                <td className="px-4 py-2">{new Date(s.lastActive).toLocaleString()}</td>
                <td className="px-4 py-2">{s.isActive ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
