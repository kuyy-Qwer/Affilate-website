import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';

export function ResetPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      const errorMessages: Record<string, string> = {
        'User not found': 'Email tidak terdaftar.',
        'Invalid email': 'Format email tidak valid.',
        'Too many requests': 'Terlalu banyak percobaan. Coba lagi nanti.'
      };
      setError(errorMessages[err.message] || 'Gagal mengirim link reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900">Email Terkirim</h2>
            <p className="text-gray-500 text-sm">
              Link reset password telah dikirim ke <strong>{email}</strong>. Cek inbox dan folder spam Anda.
            </p>
          </div>
          <button
            onClick={onBack}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
            <Mail className="text-indigo-600" size={28} />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Lupa Password?</h2>
          <p className="text-gray-500 text-sm">Masukkan email Anda dan kami akan mengirimkan link reset password.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              placeholder="anda@email.com"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}
          <button
            disabled={loading}
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Kirim Link Reset'}
          </button>
        </form>

        <button
          onClick={onBack}
          className="w-full py-3 text-gray-500 font-semibold text-sm hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} /> Kembali ke Login
        </button>
      </div>
    </div>
  );
}
