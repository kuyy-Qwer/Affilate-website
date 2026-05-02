import React, { useEffect, useState } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Announcement } from '../types';
import { Loader2 } from 'lucide-react';

export function BannerManager() {
  const { getAuthHeaders } = useStore();
  const [banners, setBanners] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState<Announcement['type']>('info');

  const fetchBanners = async () => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/admin/banners', { headers });
      if (resp.ok) {
        const data = await resp.json();
        setBanners(data);
      } else {
        console.error('Failed to fetch banners');
      }
    } catch (err) {
      console.error('Banner fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBanners(); }, []);

  const addBanner = async () => {
    if (!title || !message) return;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          type,
          isActive: true,
          startDate: startDate || new Date().toISOString(),
          endDate: endDate || null,
          createdAt: new Date().toISOString()
        })
      });
      if (resp.ok) {
        setTitle(''); setMessage(''); setStartDate(''); setEndDate('');
        await fetchBanners();
      } else {
        alert('Gagal menambah banner');
      }
    } catch (err: any) {
      alert('Gagal menambah banner: ' + err.message);
    }
  };

  const removeBanner = async (id: string) => {
    if (!confirm('Hapus banner ini?')) return;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers
      });
      if (resp.ok) {
        await fetchBanners();
      } else {
        alert('Gagal menghapus banner');
      }
    } catch (err: any) {
      alert('Gagal menghapus banner: ' + err.message);
    }
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="animate-spin" size={20} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Announcement/Banner</h3>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 overflow-auto">
        <div className="font-bold mb-2">Daftar Banner</div>
        {banners.map(b => (
          <div key={b.id} className="flex justify-between items-center p-2 border-b border-gray-100 dark:border-gray-700">
            <div>
              <div className="font-semibold">{b.title} <span className="text-xs text-gray-500">({b.type})</span></div>
              <div className="text-xs text-gray-500">{b.message}</div>
            </div>
            <button onClick={() => removeBanner(b.id!)} className="text-red-500">Hapus</button>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2"><Calendar /><span>New Banner</span></div>
        <input placeholder="Judul banner" value={title} onChange={e => setTitle(e.target.value)} className="w-full mb-2 p-2 border rounded" />
        <input placeholder="Pesan" value={message} onChange={e => setMessage(e.target.value)} className="w-full mb-2 p-2 border rounded" />
        <select value={type} onChange={e => setType(e.target.value as any)} className="w-full mb-2 p-2 border rounded">
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="success">Success</option>
          <option value="promo">Promo</option>
        </select>
        <div className="flex gap-2">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 p-2 border rounded" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 p-2 border rounded" />
        </div>
        <button onClick={addBanner} className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">Tambah Banner</button>
      </div>
    </div>
  );
}
