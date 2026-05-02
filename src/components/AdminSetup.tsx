import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Shield, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AdminSetup() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { user } = useStore();

  const handleMakeAdmin = async () => {
    if (!email) return;
    
    setLoading(true);
    setMessage(null);

    try {
      const { data: userProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (fetchError || !userProfile) {
        setMessage({ type: 'error', text: 'User tidak ditemukan dengan email tersebut' });
        return;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('uid', userProfile.uid);

      if (updateError) {
        setMessage({ type: 'error', text: 'Gagal mengupdate role user: ' + updateError.message });
        return;
      }

      setMessage({ type: 'success', text: `User ${email} berhasil dijadikan admin!` });
      setEmail('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Terjadi kesalahan' });
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Shield className="text-[#2FA084]" size={24} />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Admin Setup</h3>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Masukkan email user yang ingin dijadikan admin:
      </p>

      <div className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@email.com"
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#2FA084] outline-none text-gray-900 dark:text-white"
        />

        <button
          onClick={handleMakeAdmin}
          disabled={loading || !email}
          className="w-full py-3 bg-[#1F6F5F] text-white rounded-xl font-bold hover:bg-[#2FA084] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Jadikan Admin'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
        <p className="text-xs text-amber-700 dark:text-amber-400">
          <strong>Catatan:</strong> Pastikan user sudah terdaftar dan login minimal sekali sebelum dijadikan admin.
        </p>
      </div>
    </div>
  );
}
