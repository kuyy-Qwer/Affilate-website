import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const { setUser, setActiveTab, initAuth } = useStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Memproses autentikasi...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          console.error('Auth callback error:', error);
          setStatus('error');
          setMessage('Gagal memproses autentikasi. Silakan coba lagi.');
          setTimeout(() => {
            window.location.href = '/?tab=login&error=auth_failed';
          }, 2000);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setStatus('error');
          setMessage('User tidak ditemukan.');
          return;
        }

        // Check if user profile exists in database
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('uid', user.id)
          .single();

        if (profileError || !profile) {
          // Create user profile for OAuth sign-in (Google)
          const referralCode = localStorage.getItem('affiliate_ref');
          const userReferralCode = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              uid: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || 'Pengguna',
              role: 'affiliate',
              referral_code: userReferralCode,
              referred_by: referralCode || null,
              wishlist: [],
              commission_earned: 0,
              total_sales: 0,
              total_clicks: 0,
              email_verified: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('Error creating user profile:', insertError);
          }
        }

        // Re-initialize auth to get fresh user data
        await initAuth();
        
        // Get updated user from store
        const currentUser = useStore.getState().user;
        
        setStatus('success');
        setMessage('Autentikasi berhasil! Mengalihkan...');
        
        // Redirect based on role
        setTimeout(() => {
          if (currentUser?.role === 'admin') {
            window.location.href = '/?tab=admin';
          } else {
            window.location.href = '/?tab=affiliate';
          }
        }, 1000);
        
      } catch (err: any) {
        console.error('Callback handling error:', err);
        setStatus('error');
        setMessage('Terjadi kesalahan: ' + (err.message || 'Unknown error'));
        setTimeout(() => {
          window.location.href = '/?tab=login&error=auth_failed';
        }, 2000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-6 max-w-md mx-auto p-6">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-[#2FA084] animate-spin mx-auto" />
            <p className="text-gray-600 dark:text-gray-400">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-900 dark:text-white font-semibold">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-600 dark:text-red-400">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
