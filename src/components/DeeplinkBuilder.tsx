import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { v4 as uuidv4 } from 'uuid';

export function DeeplinkBuilder() {
  const { getAuthHeaders } = useStore();
  const [destination, setDestination] = useState('https://example.com/product');
  const [productId, setProductId] = useState('');
  const [utm, setUtm] = useState({ source: '', medium: '', campaign: '', term: '', content: '' });
  const [shortCode, setShortCode] = useState('');
  const [generated, setGenerated] = useState('');
  const [saving, setSaving] = useState(false);

  const buildUrl = () => {
    const url = new URL(destination);
    const map = { utm_source: utm.source, utm_medium: utm.medium, utm_campaign: utm.campaign, utm_term: utm.term, utm_content: utm.content };
    Object.entries(map).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
    if (shortCode) url.searchParams.set('code', shortCode);
    setGenerated(url.toString());
    return url.toString();
  };

  const saveDeeplink = async () => {
    try {
      setSaving(true);
      const url = buildUrl();
      const payload = {
        id: uuidv4(),
        productId,
        destination: url,
        ...utm,
        shortCode
      };
      const resp = await fetch('/api/admin/deeplinks', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('Failed to create deeplink');
      // reset fields after success
      setProductId('');
      setDestination('https://example.com/product');
      setUtm({ source: '', medium: '', campaign: '', term: '', content: '' });
      setShortCode('');
      setGenerated('');
    } catch (e) {
      alert('Gagal menyimpan deeplink');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Deeplink Builder + UTM</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label>Destination URL</label>
          <input className="w-full px-3 py-2 border rounded" value={destination} onChange={e => setDestination(e.target.value)} />
        </div>
        <div>
          <label>Product ID</label>
          <input className="w-full px-3 py-2 border rounded" value={productId} onChange={e => setProductId(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>UTM Source</label>
          <input className="w-full px-3 py-2 border rounded" value={utm.source} onChange={e => setUtm({ ...utm, source: e.target.value })} />
        </div>
        <div>
          <label>UTM Medium</label>
          <input className="w-full px-3 py-2 border rounded" value={utm.medium} onChange={e => setUtm({ ...utm, medium: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>UTM Campaign</label>
          <input className="w-full px-3 py-2 border rounded" value={utm.campaign} onChange={e => setUtm({ ...utm, campaign: e.target.value })} />
        </div>
        <div>
          <label>UTM Term</label>
          <input className="w-full px-3 py-2 border rounded" value={utm.term} onChange={e => setUtm({ ...utm, term: e.target.value })} />
        </div>
      </div>
      <div>
        <label>UTM Content</label>
        <input className="w-full px-3 py-2 border rounded" value={utm.content} onChange={e => setUtm({ ...utm, content: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Short Code</label>
          <input className="w-full px-3 py-2 border rounded" value={shortCode} onChange={e => setShortCode(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button onClick={saveDeeplink} className="w-full py-2 bg-sky-600 text-white rounded">Simpan Deeplink</button>
        </div>
      </div>
      {generated && (
        <div className="p-3 bg-gray-100 rounded-lg text-sm break-words">Generated: {generated}</div>
      )}
      {saving && <div className="flex items-center gap-2"><span className="loader"/> Menyimpan…</div>}
    </div>
  );
}
