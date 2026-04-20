import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Mail, Lock, User, Loader2 } from 'lucide-react';

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
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    
    // Check if user exists
    const userRef = doc(db, 'users', res.user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      const incomingRef = localStorage.getItem('affiliate_ref');
      const namePart = (res.user.displayName || 'USER').split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
      const randomPart = Math.random().toString(36).substring(7).toUpperCase();
      const newReferralCode = `${namePart}-${randomPart}`;

      await setDoc(userRef, {
        id: res.user.uid,
        name: res.user.displayName || 'Tanpa Nama',
        email: res.user.email || '',
        role: 'affiliate',
        referralCode: newReferralCode,
        referredBy: incomingRef || null,
        wishlist: [],
        commissionEarned: 0,
        totalSales: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
      });
    }
    
    onSuccess();
  } catch (err: any) {
    if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
      setError(err.message || 'Gagal login dengan Google');
    }
  } finally {
    setLoading(false);
  }
};

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      onSuccess();
    } catch (err: any) {
      setError('Email atau password salah');
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
          <input {...register('email')} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none" placeholder="anda@email.com" />
        </div>
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold text-gray-700">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
          <input {...register('password')} type="password" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none" placeholder="••••••••" />
        </div>
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>
      {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}
      <button disabled={loading} type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Masuk'}
      </button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Atau</span>
        </div>
      </div>
      <button type="button" onClick={() => handleGoogleSignIn(onSuccess, setError, setLoading)} disabled={loading} className="w-full py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
        <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
        Lanjutkan dengan Google
      </button>

      <div className="pt-6 border-t border-gray-100 space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Akses Demo (Satu Klik)</p>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                await signInWithEmailAndPassword(auth, 'admin@aisell.id', 'password123');
                onSuccess();
              } catch {
                try {
                  const res = await createUserWithEmailAndPassword(auth, 'admin@aisell.id', 'password123');
                  await setDoc(doc(db, 'users', res.user.uid), {
                    id: res.user.uid, name: 'Admin Demo', email: 'admin@aisell.id', role: 'admin', 
                    totalClicks: 0, totalSales: 0, commissionEarned: 0, wishlist: [], createdAt: new Date().toISOString()
                  });
                  onSuccess();
                } catch (e: any) { setError('Gagal akses demo admin: ' + e.message); }
              } finally { setLoading(false); }
            }}
            className="flex-1 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-indigo-600 transition-all"
          >
            Demo Admin
          </button>
          <button 
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                await signInWithEmailAndPassword(auth, 'affiliate@aisell.id', 'password123');
                onSuccess();
              } catch {
                try {
                  const res = await createUserWithEmailAndPassword(auth, 'affiliate@aisell.id', 'password123');
                  await setDoc(doc(db, 'users', res.user.uid), {
                    id: res.user.uid, name: 'Affiliate Demo', email: 'affiliate@aisell.id', role: 'affiliate', 
                    referralCode: 'DEMO123', commissionEarned: 1500000, totalSales: 12, totalClicks: 145, wishlist: [], createdAt: new Date().toISOString()
                  });
                  onSuccess();
                } catch (e: any) { setError('Gagal akses demo afiliasi: ' + e.message); }
              } finally { setLoading(false); }
            }}
            className="flex-1 py-2 text-xs font-bold border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all"
          >
            Demo Afiliasi
          </button>
        </div>
      </div>
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
    if (!data.name) return;
    setLoading(true);
    setError('');
    try {
      const incomingRef = localStorage.getItem('affiliate_ref');
      const res = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await sendEmailVerification(res.user);
      
      const namePart = data.name.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
      const randomPart = Math.random().toString(36).substring(7).toUpperCase();
      const newReferralCode = `${namePart}-${randomPart}`;

      await setDoc(doc(db, 'users', res.user.uid), {
        id: res.user.uid,
        name: data.name,
        email: data.email,
        role: 'affiliate',
        referralCode: newReferralCode,
        referredBy: incomingRef || null,
        wishlist: [],
        commissionEarned: 0,
        totalSales: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
      });
      setRegistered(true);
    } catch (err: any) {
      setError(err.message || 'Gagal mendaftar');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="text-center space-y-6 py-4">
        <div className="p-4 bg-green-50 rounded-2xl text-green-600 flex justify-center mx-auto w-16 h-16 items-center">
          <Mail size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold">Cek Email Anda</h3>
          <p className="text-sm text-gray-500">
            Link verifikasi telah dikirim ke email Anda. Silakan verifikasi sebelum masuk ke dashboard.
          </p>
        </div>
        <button 
          onClick={onSuccess}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
        >
          Lanjut ke Beranda
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
          <input {...register('name')} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none" placeholder="Nama Anda" />
        </div>
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold text-gray-700">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
          <input {...register('email')} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none" placeholder="anda@email.com" />
        </div>
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold text-gray-700">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
          <input {...register('password')} type="password" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none" placeholder="Min 6 karakter" />
        </div>
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>
      {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg text-center break-words">{error}</p>}
      <button disabled={loading} type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Daftar Sekarang'}
      </button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Atau</span>
        </div>
      </div>
      <button type="button" onClick={() => handleGoogleSignIn(onSuccess, setError, setLoading)} disabled={loading} className="w-full py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
        <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
        Daftar dengan Google
      </button>
    </form>
  );
}
