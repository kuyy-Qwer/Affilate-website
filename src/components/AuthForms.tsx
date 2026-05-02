import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Loader2, Chrome } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  name: z.string().min(2, 'Nama minimal 2 karakter').optional(),
});

type FormData = z.infer<typeof schema>;

const handleGoogleSignIn = async (onSuccess: () => void, setError: (m: string) => void, setLoading: (b: boolean) => void) => {
  setLoading(true);
  setError('');
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/?tab=auth-callback`
      }
    });
    
    if (error) throw error;
    
    onSuccess();
  } catch (err: any) {
    setError(err.message || 'Gagal login dengan Google');
  } finally {
    setLoading(false);
  }
};

export function LoginForm({ onSuccess, onForgotPassword }: { onSuccess: () => void; onForgotPassword?: () => void }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });
      
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      const errorMessages: Record<string, string> = {
        'Invalid login credentials': 'Email atau password salah.',
        'Email not confirmed': 'Email belum diverifikasi. Cek inbox Anda.',
        'Too many requests': 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.',
        'Invalid email': 'Format email tidak valid.'
      };
      setError(errorMessages[err.message] || 'Gagal login: ' + (err.message || 'Terjadi kesalahan.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full max-w-sm">
      <div className="space-y-1">
        <label className="text-sm font-semibold text-gray-700">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
          <input {...register('email')} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2FA084] transition-all outline-none" placeholder="anda@email.com" />
        </div>
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold text-gray-700">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
          <input {...register('password')} type="password" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2FA084] transition-all outline-none" placeholder="••••••••" />
        </div>
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>
      {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}
      <button disabled={loading} type="submit" className="w-full py-3 bg-[#1F6F5F] text-white rounded-xl font-bold hover:bg-[#2FA084] transition-all flex items-center justify-center gap-2">
        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Masuk'}
      </button>
      {onForgotPassword && (
        <button type="button" onClick={onForgotPassword} className="w-full text-center text-sm text-[#1F6F5F] hover:text-[#2FA084] font-semibold transition-colors">
          Lupa Password?
        </button>
      )}

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Atau</span>
        </div>
      </div>
      <button type="button" onClick={() => handleGoogleSignIn(onSuccess, setError, setLoading)} disabled={loading} className="w-full py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
        <Chrome size={20} />
        Lanjutkan dengan Google
      </button>
    </form>
  );
}

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      const referralCode = localStorage.getItem('affiliate_ref');
      
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name
          }
        }
      });
      
      if (error) throw error;
      
      if (authData.user) {
        // Create user profile in database
        const userReferralCode = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        const { error: dbError } = await supabase
          .from('users')
          .insert({
            uid: authData.user.id,
            email: data.email,
            name: data.name || 'Tanpa Nama',
            role: 'affiliate',
            referral_code: userReferralCode,
            referred_by: referralCode || null,
            wishlist: [],
            commission_earned: 0,
            total_sales: 0,
            total_clicks: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (dbError) {
          console.error('DB Error:', dbError);
        }
        
        setRegistered(true);
      }
    } catch (err: any) {
      const errorMessages: Record<string, string> = {
        'User already registered': 'Email sudah terdaftar. Silakan masuk.',
        'Password should be at least 6 characters': 'Password minimal 6 karakter.',
        'Unable to validate email address: invalid format': 'Format email tidak valid.'
      };
      setError(errorMessages[err.message] || 'Gagal daftar: ' + (err.message || 'Terjadi kesalahan.'));
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="text-center space-y-4 w-full max-w-sm">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">Pendaftaran Berhasil!</h3>
        <p className="text-gray-600">Cek email Anda untuk verifikasi akun.</p>
        <button onClick={onSuccess} className="w-full py-3 bg-[#1F6F5F] text-white rounded-xl font-bold hover:bg-[#2FA084] transition-all">
          Lanjutkan ke Login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full max-w-sm">
      <div className="space-y-1">
        <label className="text-sm font-semibold text-gray-700">Nama Lengkap</label>
        <div className="relative">
          <User className="absolute left-3 top-3 text-gray-400" size={18} />
          <input {...register('name')} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2FA084] transition-all outline-none" placeholder="Nama Anda" />
        </div>
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold text-gray-700">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
          <input {...register('email')} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2FA084] transition-all outline-none" placeholder="anda@email.com" />
        </div>
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold text-gray-700">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
          <input {...register('password')} type="password" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2FA084] transition-all outline-none" placeholder="••••••••" />
        </div>
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>
      {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}
      <button disabled={loading} type="submit" className="w-full py-3 bg-[#1F6F5F] text-white rounded-xl font-bold hover:bg-[#2FA084] transition-all flex items-center justify-center gap-2">
        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Daftar'}
      </button>
    </form>
  );
}
