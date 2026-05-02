import React, { useEffect, useState } from 'react';
import { EmailTemplate } from '../types';
import { Loader2, Edit3, Trash2 } from 'lucide-react';

export function EmailTemplateManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTpl, setNewTpl] = useState({ key: '', subject: '', htmlBody: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ key: '', subject: '', htmlBody: '' });

  const fetchTemplates = async () => {
    try {
      const q = query(collection(db, 'emailTemplates'), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as EmailTemplate));
      setTemplates(data);
    } catch (e) {
      console.error('Failed to fetch email templates', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    return { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
  };

  const addTemplate = async () => {
    if (!newTpl.subject || !newTpl.htmlBody) return;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: newTpl.key || newTpl.subject.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          subject: newTpl.subject,
          htmlBody: newTpl.htmlBody,
          variables: [],
          isActive: true,
        })
      });
      if (resp.ok) {
        setNewTpl({ key: '', subject: '', htmlBody: '' });
        fetchTemplates();
      } else {
        const err = await resp.json();
        alert('Gagal: ' + (err.error || 'Server error'));
      }
    } catch (e: any) {
      alert('Gagal menambah template: ' + e.message);
    }
  };

  const updateTemplate = async () => {
    if (!editingId) return;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/email-templates/${editingId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editData)
      });
      if (resp.ok) {
        setEditingId(null);
        setEditData({ key: '', subject: '', htmlBody: '' });
        fetchTemplates();
      } else {
        const err = await resp.json();
        alert('Gagal: ' + (err.error || 'Server error'));
      }
    } catch (e: any) {
      alert('Gagal mengupdate template: ' + e.message);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Hapus template ini?')) return;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/email-templates/${id}`, {
        method: 'DELETE',
        headers
      });
      if (resp.ok) {
        fetchTemplates();
      } else {
        const err = await resp.json();
        alert('Gagal: ' + (err.error || 'Server error'));
      }
    } catch (e: any) {
      alert('Gagal menghapus template: ' + e.message);
    }
  };

  const startEdit = (t: EmailTemplate) => {
    setEditingId(t.id);
    setEditData({
      key: t.key || '',
      subject: t.subject || '',
      htmlBody: t.htmlBody || ''
    });
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={20} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Email Template Manager</h2>
      </div>

      {/* Add New Template */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input className="p-2 border rounded" placeholder="Template Key" value={newTpl.key} onChange={e => setNewTpl({...newTpl, key: e.target.value})} />
          <input className="p-2 border rounded" placeholder="Subject" value={newTpl.subject} onChange={e => setNewTpl({...newTpl, subject: e.target.value})} />
          <textarea className="p-2 border rounded" placeholder="HTML Body" value={newTpl.htmlBody} onChange={e => setNewTpl({...newTpl, htmlBody: e.target.value})} rows={3} />
        </div>
        <button onClick={addTemplate} className="px-4 py-2 bg-[#2FA084] text-white rounded-lg font-bold">Simpan Template</button>
      </div>

      {/* Edit Template Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold">Edit Template</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-semibold mb-1 block">Key</label>
                <input
                  value={editData.key}
                  onChange={e => setEditData(prev => ({ ...prev, key: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold mb-1 block">Subject</label>
                <input
                  value={editData.subject}
                  onChange={e => setEditData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold mb-1 block">HTML Body</label>
                <textarea
                  value={editData.htmlBody}
                  onChange={e => setEditData(prev => ({ ...prev, htmlBody: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm min-h-[120px]"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setEditingId(null); setEditData({ key: '', subject: '', htmlBody: '' }); }} className="flex-1 py-2.5 border rounded-lg font-bold hover:bg-gray-50 transition-all">Batal</button>
              <button onClick={updateTemplate} className="flex-1 py-2.5 bg-[#2FA084] text-white rounded-lg font-bold hover:bg-[#6FCF97] transition-all">Simpan</button>
            </div>
          </div>
        </div>
      )}

      <div className="border-t pt-4" />

      {/* Template List */}
      <div className="space-y-4">
        {templates.map(t => (
          <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 flex items-start justify-between">
            <div className="flex-1">
              <div className="font-bold">{t.subject}</div>
              <div className="text-xs text-gray-500">{t.key}</div>
              <div className="text-xs text-gray-400 mt-1 line-clamp-2">{t.htmlBody}</div>
            </div>
            <div className="flex gap-2 ml-4">
              <button onClick={() => startEdit(t)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg">
                <Edit3 size={18} />
              </button>
              <button onClick={() => deleteTemplate(t.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="text-center py-8 text-gray-400 italic">Belum ada template email.</div>
        )}
      </div>
    </div>
  );
}
