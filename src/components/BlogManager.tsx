import { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Eye, Save, X, Loader2 } from 'lucide-react';
import { BlogPost } from '../types';
import { useStore } from '../store/useStore';

export function BlogManager() {
  const { getAuthHeaders } = useStore();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', slug: '', content: '', excerpt: '', coverImage: '', tags: '', seoTitle: '', seoDescription: '' });

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/admin/blog', { headers });
      if (resp.ok) {
        const data = await resp.json();
        setPosts(data);
      } else {
        console.error('Failed to fetch posts');
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.content) return;
    setSaving(true);
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const now = new Date().toISOString();
    const postData = {
      ...form,
      slug,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      updatedAt: now
    };

    try {
      const headers = await getAuthHeaders();
      if (editing) {
        const resp = await fetch(`/api/admin/blog/${editing.id}`, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        });
        if (!resp.ok) throw new Error('Failed to update');
      } else {
        const resp = await fetch('/api/admin/blog', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...postData,
            status: 'draft',
            authorId: 'admin',
            authorName: 'Admin',
            createdAt: now
          })
        });
        if (!resp.ok) throw new Error('Failed to create');
      }
      setForm({ title: '', slug: '', content: '', excerpt: '', coverImage: '', tags: '', seoTitle: '', seoDescription: '' });
      setEditing(null);
      setShowForm(false);
      await fetchPosts();
    } catch (err) {
      console.error('Error saving post:', err);
      alert('Gagal menyimpan artikel');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus postingan ini?')) return;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/blog/${id}`, {
        method: 'DELETE',
        headers
      });
      if (resp.ok) {
        await fetchPosts();
      } else {
        alert('Gagal menghapus artikel');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Gagal menghapus artikel');
    }
  };

  const toggleStatus = async (post: BlogPost) => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/blog/${post.id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: post.status === 'draft' ? 'published' : 'draft',
          publishedAt: post.status === 'draft' ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString()
        })
      });
      if (resp.ok) {
        await fetchPosts();
      } else {
        alert('Gagal mengubah status');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      alert('Gagal mengubah status');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Blog Management</h2>
          <p className="text-gray-500 text-sm mt-1">Kelola konten blog dan artikel</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ title: '', slug: '', content: '', excerpt: '', coverImage: '', tags: '', seoTitle: '', seoDescription: '' }); }} className="flex items-center gap-2 px-4 py-2 bg-[#2FA084] text-white rounded-xl font-bold text-sm hover:bg-[#1F6F5F] transition-all">
          <Plus size={16} /> Tulis Artikel
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">Judul</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-[#2FA084]" placeholder="Judul artikel" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">Slug (opsional)</label>
              <input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-[#2FA084]" placeholder="url-slug" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">Excerpt</label>
            <input value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-[#2FA084]" placeholder="Ringkasan singkat" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">Cover Image URL</label>
            <input value={form.coverImage} onChange={e => setForm({...form, coverImage: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-[#2FA084]" placeholder="https://..." />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">Konten</label>
            <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={8} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-[#2FA084] font-mono text-sm" placeholder="Tulis konten artikel..." />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">Tags (pisah koma)</label>
            <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-[#2FA084]" placeholder="affiliate, marketing, tips" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-[#2FA084] text-white rounded-xl font-bold text-sm hover:bg-[#1F6F5F] transition-all disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} {editing ? 'Update' : 'Simpan'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all">
              <X size={16} /> Batal
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {posts.map(post => (
          <div key={post.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-start">
            {post.coverImage && <img src={post.coverImage} alt={post.title} className="w-full md:w-32 h-20 object-cover rounded-xl" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900 dark:text-white truncate">{post.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {post.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">{post.excerpt || post.content.slice(0, 100)}...</p>
              <p className="text-xs text-gray-400 mt-1">{post.tags?.join(', ')} • {new Date(post.createdAt).toLocaleDateString('id-ID')}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleStatus(post)} className="p-2 text-gray-400 hover:text-[#2FA084] transition-colors" title={post.status === 'draft' ? 'Publish' : 'Unpublish'}>
                <Eye size={16} />
              </button>
              <button onClick={() => { setEditing(post); setForm({ title: post.title, slug: post.slug, content: post.content, excerpt: post.excerpt, coverImage: post.coverImage, tags: post.tags?.join(', ') || '', seoTitle: post.seoTitle || '', seoDescription: post.seoDescription || '' }); setShowForm(true); }} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                <Edit3 size={16} />
              </button>
              <button onClick={() => handleDelete(post.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {posts.length === 0 && <p className="text-center text-gray-400 py-12">Belum ada artikel. Mulai tulis sekarang!</p>}
      </div>
    </div>
  );
}
