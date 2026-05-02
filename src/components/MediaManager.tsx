import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Image, FileText, Film, Grid, List } from 'lucide-react';
import { useStore } from '../store/useStore';
import { MediaFile } from '../types';

export function MediaManager() {
  const { getAuthHeaders, user } = useStore();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchFiles = async () => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/admin/media', { headers });
      if (resp.ok) {
        const data = await resp.json();
        setFiles(data);
      } else {
        console.error('Failed to fetch media files');
      }
    } catch (err) {
      console.error('Media fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const headers = await getAuthHeaders();
            const resp = await fetch('/api/admin/media', {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: file.name,
                url: reader.result,
                type: file.type,
                size: file.size,
                uploadedBy: user?.uid || 'unknown',
                uploadedAt: new Date().toISOString(),
                folder: 'general'
              })
            });
            if (resp.ok) await fetchFiles();
          } catch (err) {
            console.error('Upload error:', err);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus file ini?')) return;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/media/${id}`, {
        method: 'DELETE',
        headers
      });
      if (resp.ok) {
        await fetchFiles();
      } else {
        alert('Gagal menghapus file');
      }
    } catch (err: any) {
      alert('Gagal menghapus file: ' + err.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image size={20} />;
    if (type.startsWith('video/')) return <Film size={20} />;
    return <FileText size={20} />;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Media Manager</h2>
          <p className="text-gray-500 text-sm mt-1">{files.length} file terupload</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-[#2FA084] text-white rounded-xl font-bold text-sm hover:bg-[#1F6F5F] transition-all cursor-pointer">
            <Plus size={16} /> Upload {uploading && <Loader2 className="animate-spin" size={14} />}
            <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />
          </label>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}><Grid size={16} /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}><List size={16} /></button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {files.map(file => (
            <div key={file.id} className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all">
              {file.type.startsWith('image/') ? (
                <img src={file.url} alt={file.name} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 flex items-center justify-center bg-gray-50 dark:bg-gray-700 text-gray-400">
                  {getFileIcon(file.type)}
                </div>
              )}
              <div className="p-2">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{file.name}</p>
                <p className="text-[10px] text-gray-400">{formatSize(file.size)}</p>
              </div>
              <button onClick={() => handleDelete(file.id!)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-3">File</th>
                <th className="px-6 py-3">Tipe</th>
                <th className="px-6 py-3">Ukuran</th>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {files.map(file => (
                <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-3 flex items-center gap-3">
                    {file.type.startsWith('image/') ? <img src={file.url} alt={file.name} className="w-8 h-8 rounded object-cover" /> : getFileIcon(file.type)}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{file.name}</span>
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">{file.type}</td>
                  <td className="px-6 py-3 text-xs text-gray-500">{formatSize(file.size)}</td>
                  <td className="px-6 py-3 text-xs text-gray-500">{new Date(file.uploadedAt).toLocaleDateString('id-ID')}</td>
                  <td className="px-6 py-3">
                    <button onClick={() => handleDelete(file.id!)} className="p-1 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {files.length === 0 && <p className="text-center text-gray-400 py-12">Belum ada file. Upload gambar atau dokumen sekarang.</p>}
    </div>
  );
}
