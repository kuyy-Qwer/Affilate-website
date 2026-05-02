import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { StaticPage } from '../types';

export function StaticPageManager() {
  const { getAuthHeaders } = useStore();
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', slug: '', content: '', isPublished: true });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPages = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/admin/static-pages', { headers });
      if (resp.ok) {
        const data = await resp.json();
        setPages(data);
      } else {
        console.error('Failed to fetch static pages');
      }
    } catch (err) {
      console.error('StaticPage fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const resetForm = () => setForm({ title: '', slug: '', content: '', isPublished: true });

  const onSubmit = async () => {
    if (!form.title || !form.content) return;
    setSaving(true);
    try {
      const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const now = new Date().toISOString();
      const pageData = {
        title: form.title,
        slug,
        content: form.content,
        isPublished: form.isPublished,
        updatedAt: now
      };

      if (editing) {
        const resp = await fetch(`/api/admin/static-pages/${editing}`, {
          method: 'PUT',
          headers: { ...await getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(pageData)
        });
        if (!resp.ok) throw new Error('Failed to update');
      } else {
        const resp = await fetch('/api/admin/static-pages', {
          method: 'POST',
          headers: { ...await getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...pageData, createdAt: now })
        });
        if (!resp.ok) throw new Error('Failed to create');
      }

      await fetchPages();
      resetForm();
      setEditing(null);
    } catch (err: any) {
      alert('Failed to save page: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const editPage = (id: string) => {
    const p = pages.find(p => p.id === id);
    if (p) {
      setForm({ title: p.title, slug: p.slug, content: p.content, isPublished: p.isPublished ?? true });
      setEditing(id);
    }
  };

  const removePage = async (id: string) => {
    if (!confirm('Hapus halaman ini?')) return;
    try {
      const resp = await fetch(`/api/admin/static-pages/${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders()
      });
      if (resp.ok) {
        await fetchPages();
      } else {
        alert('Failed to delete page');
      }
    } catch (err: any) {
      alert('Failed to delete page: ' + err.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Static Page Builder</h2>
          <p className="text-sm text-gray-600">Buat halaman statis seperti About, Privacy, Terms, dsb.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Judul</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl" placeholder="Judul halaman" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Slug (opsional)</label>
            <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl" placeholder="slug-halaman" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Konten</label>
          <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={6} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl" placeholder="Isi halaman..." />
        </div>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center text-sm">
            <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} className="mr-2" /> Publish
          </label>
          <button onClick={onSubmit} className="ml-auto px-6 py-2 bg-[#2FA084] text-white rounded-xl font-bold">{editing ? 'Update Halaman' : 'Simpan Halaman'}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pages.map(p => (
          <div key={p.id} className="p-4 border rounded-xl border-gray-100 bg-white dark:bg-gray-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{p.title}</span>
              <div className="flex gap-2">
                <button onClick={() => editPage(p.id)} className="text-sm text-blue-600">Edit</button>
                <button onClick={() => removePage(p.id)} className="text-sm text-red-600">Delete</button>
              </div>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">{p.slug} • {p.isPublished ? 'Published' : 'Draft'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
