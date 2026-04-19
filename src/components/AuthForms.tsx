import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Mail, Lock, User, Loader2 } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  name: z.string().min(2, 'Nama minimal 2 karakter').optional(),
});

type FormData = z.infer<typeof schema>;

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
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!data.name) return;
    setLoading(true);
    setError('');
    try {
      // Get referral code from URL if exists (stored in localStorage by App.tsx)
      const incomingRef = localStorage.getItem('affiliate_ref');
      
      const res = await createUserWithEmailAndPassword(auth, data.email, data.password);
      
      // Send verification email
      await sendEmailVerification(res.user);
      
      // Generate unique referral code for the new user
      // Pattern: NAME-RANDOM (e.g. BUDI-X9Z2)
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
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Gagal mendaftar');
    } finally {
      setLoading(false);
    }
  };

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
    </form>
  );
}
