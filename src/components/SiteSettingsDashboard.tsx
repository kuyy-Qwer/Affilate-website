import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function SiteSettingsDashboard() {
  const [siteName, setSiteName] = useState('DigiSell');
  const [logoUrl, setLogoUrl] = useState('');
  const [metaTitle, setMetaTitle] = useState('DigiSell | Affiliate Marketplace');
  const [metaDesc, setMetaDesc] = useState('Platform afiliasi untuk produk digital dengan komisi menarik.');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'global'));
        if (snap.exists()) {
          const data = snap.data() as any;
          setSiteName(data.siteName || siteName);
          setLogoUrl(data.logoUrl || '');
          setMetaTitle(data.metaTitle || metaTitle);
          setMetaDesc(data.metaDesc || metaDesc);
        }
      } catch (e) {
        console.error('SiteSettings load error', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const save = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        siteName,
        logoUrl,
        metaTitle,
        metaDesc
      }, { merge: true });
      alert('Settings tersimpan');
    } catch (e) {
      console.error('SiteSettings save error', e);
      alert('Gagal menyimpan settings');
    }
  };

  if (loading) return <div>Loading...</div>;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 space-y-4">
      <h3 className="text-xl font-bold">Site Settings</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Site Name</label>
          <input className="w-full px-3 py-2 border rounded" value={siteName} onChange={e => setSiteName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Logo URL</label>
          <input className="w-full px-3 py-2 border rounded" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Meta Title</label>
          <input className="w-full px-3 py-2 border rounded" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Meta Description</label>
          <textarea className="w-full px-3 py-2 border rounded" rows={3} value={metaDesc} onChange={e => setMetaDesc(e.target.value)} />
        </div>
      </div>
      <button onClick={save} className="px-4 py-2 bg-indigo-600 text-white rounded">Simpan</button>
    </div>
  );
}
