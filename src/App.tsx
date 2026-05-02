/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Users, 
  BarChart3, 
  LayoutDashboard, 
  LogOut, 
  ChevronRight, 
  Star, 
  TrendingUp,
  CreditCard,
  ShieldCheck,
  Zap,
  BookOpen,
  ArrowRight,
  Check,
  X,
  CreditCard as CreditIcon,
  Eye,
  Heart,
  Ticket,
  Wallet,
  AlertTriangle,
  MessageSquare,
  CheckCircle,
  Clock,
  Mail,
  Loader2,
  Download,
  Key,
  Shield,
  Tag
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Joyride, Step } from 'react-joyride';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';


import { supabase } from './lib/supabase';
import { Product, AffiliateStats, User, Sale, Coupon, Review } from './types';
import Navbar from './components/Navbar';
import { StaticPageViewer } from './components/StaticPageViewer';
import { LoginForm, RegisterForm } from './components/AuthForms';
import { ResetPassword } from './components/ResetPassword';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';
import AdminDashboard from './components/AdminDashboard';
import DashboardLayout from './components/DashboardLayout';
import PurchasesView from './components/PurchasesView';
import { PayoutHistory } from './components/PayoutHistory';
import { useStore } from './store/useStore';
import AuthCallback from './components/AuthCallback';

export default function App() {
  const {
    user, 
    setUser, 
    isAuthLoading, 
    products, 
    activeTab, 
    setActiveTab, 
    initAuth, 
    fetchProducts,
    resendVerificationEmail,
    globalConfig,
    fetchGlobalConfig,
    isDarkMode,
    tiers,
    fetchTiers,
    searchQuery
  } = useStore();

  const [runTour, setRunTour] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<{ isOpen: boolean, product: Product | null }>({ isOpen: false, product: null });
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean, product: Product | null }>({ isOpen: false, product: null });
  const [couponCode, setCouponCode] = useState('');
  const [isBuying, setIsBuying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const applyCoupon = async () => {
    if (!couponCode || !user) return;
    try {
      const q = query(collection(db, 'coupons'), where('code', '==', couponCode.toUpperCase()), where('isActive', '==', true));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert('Kupon tidak valid atau sudah tidak aktif.');
        return;
      }
      const couponData = { id: snap.docs[0].id, ...snap.docs[0].data() } as any as Coupon;
      
      // 1. Check Expiry
      if (couponData.expiryDate) {
         const now = new Date();
         // Parse YYYY-MM-DD secara eksplisit agar tidak terpengaruh timezone
         const [y, m, d] = couponData.expiryDate.split('-').map(Number);
         const expiry = new Date(y, m - 1, d, 23, 59, 59, 999);
         if (now > expiry) {
            alert('Kupon ini sudah kedaluwarsa.');
            return;
         }
      }

      // 2. Check Usage Limit per User
      const salesQuery = query(
         collection(db, 'sales'),
         where('buyerId', '==', user.id),
         where('couponId', '==', couponData.id)
      );
      const salesSnap = await getDocs(salesQuery);
      const limit = couponData.usageLimitPerUser || Infinity;
      
      if (salesSnap.size >= limit) {
         alert(`Gagal menerapkan kupon: Batas penggunaan untuk pelanggan Anda telah tercapai (${limit}x).`);
         return;
      }


      setAppliedCoupon(couponData);
      alert('Kupon berhasil diterapkan!');
    } catch (err) {
      alert('Gagal memverifikasi kupon');
    }
  };

  const getDiscountedPrice = (basePrice: number) => {
    let finalPrice = basePrice;
    
    // 1. Apply Geo-Pricing multiplier
    if (globalConfig?.geoPricingActive) {
      const multiplier = user?.isIndonesian !== false ? (globalConfig.idrMultiplier || 1) : (globalConfig.foreignMultiplier || 1.2);
      finalPrice = finalPrice * multiplier;
    }

    // 2. Apply Global Promo (Event)
    if (globalConfig?.promoActive) {
      const now = new Date();
      const start = new Date(globalConfig.promoStart);
      const end = new Date(globalConfig.promoEnd);
      if (now >= start && now <= end) {
        finalPrice = finalPrice - (finalPrice * (globalConfig.promoDiscount / 100));
      }
    }

    return Math.round(finalPrice);
  };

  const calculateTotal = (basePrice: number) => {
    const adjustedPrice = getDiscountedPrice(basePrice);
    if (!appliedCoupon) return adjustedPrice;
    if (appliedCoupon.discountType === 'percentage') {
      return adjustedPrice - (adjustedPrice * (appliedCoupon.discountValue / 100));
    }
    return Math.max(0, adjustedPrice - appliedCoupon.discountValue);
  };

  useEffect(() => {
    initAuth();
    fetchProducts();
    fetchGlobalConfig();
    fetchTiers();
  }, []);
  
  // Update dark mode when state changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Auto-redirect to dashboard when user logs in from any page
  useEffect(() => {
    if (user && (activeTab === 'login' || activeTab === 'register' || activeTab === 'home')) {
      setActiveTab(user.role === 'admin' ? 'admin' : 'affiliate');
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    
    if (ref) {
      localStorage.setItem('affiliate_ref', ref);
      
      // Track click only once per session/tab
      const trackClick = async () => {
        const SessionKey = `tracked_${ref}`;
        if (!sessionStorage.getItem(SessionKey)) {
          try {
            await fetch('/api/click', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ referralCode: ref })
            });
            sessionStorage.setItem(SessionKey, 'true');
          } catch (e) {
            console.error('Click tracking failed', e);
          }
        }
      };
      trackClick();
    }

    // Handle auth callback from OAuth (Google Sign-In)
    const tab = params.get('tab');
    if (tab === 'auth-callback') {
      setActiveTab('auth-callback');
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveTab('home');
  };

  const handlePurchase = async () => {
    
    if (!user || !purchaseModal.product) {
      return;
    }
    
    setIsBuying(true);
    const product = purchaseModal.product;
    const finalPrice = calculateTotal(product.price);
    const referralCode = localStorage.getItem('affiliate_ref');
    const { getAuthHeaders } = useStore.getState();

    console.log('[handlePurchase] Final price:', finalPrice);
    console.log('[handlePurchase] Referral code:', referralCode);
    console.log('[handlePurchase] Applied coupon:', appliedCoupon);

    try {
      const headers = await getAuthHeaders();
      console.log('[handlePurchase] Auth headers:', headers);
      
      const requestBody = {
        productId: product.id,
        referralCode: referralCode,
        couponId: appliedCoupon?.id || null,
        amount: finalPrice
      };
      console.log('[handlePurchase] Request body:', requestBody);
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      console.log('[handlePurchase] Response status:', response.status);
      const resData = await response.json();
      console.log('[handlePurchase] Response data:', resData);
      
      if (resData.url) {
        console.log('[handlePurchase] Redirecting to:', resData.url);
        window.location.href = resData.url;
      } else {
        console.error('[handlePurchase] No URL in response');
        alert('Gagal membuat sesi pembayaran: ' + (resData.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('[handlePurchase] Error:', err);
      alert('Error transaksi: ' + err.message);
    } finally {
      setIsBuying(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      alert('Pembayaran Berhasil! Produk akan segera muncul di dashboard Anda.');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('canceled')) {
      alert('Pembayaran dibatalkan.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('digisell_tour_seen');
    if (!hasSeenTour && !isAuthLoading && products.length > 0) {
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthLoading, products]);

  const tourSteps: Step[] = [
    {
      target: 'body',
      content: 'Selamat datang di DigiSell! Mari berkeliling sejenak untuk melihat fitur-fitur utama kami.',
      placement: 'center' as const,
    },
    {
      target: '#nav-products',
      content: 'Jelajahi katalog produk digital premium kami di sini.',
    },
    {
      target: '#nav-features',
      content: 'Pelajari berbagai kemudahan dan fitur unggulan yang kami sediakan.',
    },
    {
      target: '#nav-pricing',
      content: 'Cek daftar paket kemitraan kami, mulai dari gratis hingga profesional.',
    },
    {
      target: user ? '#nav-dashboard' : '#nav-register',
      content: user 
        ? 'Akses dashboard Anda untuk mengelola profil, melihat statistik, dan link referal.'
        : 'Daftar sekarang untuk bergabung dalam program afiliasi dengan komisi menggiurkan!',
    },
    {
      target: '#product-catalog',
      content: 'Lihat koleksi produk digital terbaru kami.',
      placement: 'top' as const,
    }
  ];

  if (activeTab === 'affiliate' && user) {
    tourSteps.push(
      {
        target: '#affiliate-stats',
        content: 'Pantau total komisi, jumlah penjualan, dan klik link Anda secara real-time.',
      },
      {
        target: '#commission-chart',
        content: 'Lihat visualisasi tren pendapatan Anda dalam 7 hari terakhir.',
      },
      {
        target: '#referral-link',
        content: 'Salin link unik ini dan sebarkan untuk mulai menghasilkan komisi!',
      }
    );
  }

  const handleTourCallback = (tourData: any) => {
    const { status } = tourData;
    if (status === 'finished' || status === 'skipped') {
      setRunTour(false);
      localStorage.setItem('digisell_tour_seen', 'true');
    }
  };

  const updateWishlist = async (productId: string) => {
    if (!user) return;
    const isWishlisted = user.wishlist?.includes(productId);
    const newWishlist = isWishlisted 
      ? user.wishlist?.filter(id => id !== productId) || []
      : [...(user.wishlist || []), productId];
    
    // Optimistic update
    const updatedUser = { ...user, wishlist: newWishlist };
    setUser(updatedUser);

    try {
      await setDoc(doc(db, 'users', user.id), { wishlist: newWishlist }, { merge: true });
    } catch (err) {
      console.error("Failed to update wishlist:", err);
      // Revert if failed
      setUser(user);
    }
  };

  const renderContent = () => {
    // FRONTEND STATIC PAGE VIEWER: if URL has ?page=<slug>, render static page front-end
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('page');
      if (slug) {
        return <StaticPageViewer slug={slug} />;
      }
    }
    if (user && !user.emailVerified && ['affiliate', 'admin'].includes(activeTab)) {
      return <VerificationRequired />;
    }

    switch (activeTab) {
      case 'home':
        return <LandingPage onStart={() => setActiveTab('products')} onViewPricing={() => setActiveTab('pricing')} />;
      case 'products':
        return <ProductCatalog products={products} onPurchase={(p) => setPurchaseModal({ isOpen: true, product: p })} setDetailModal={setDetailModal} user={user} onToggleWishlist={updateWishlist} getDiscountedPrice={getDiscountedPrice} searchQuery={searchQuery} />;
      case 'pricing':
        return <PricingView />;
      case 'login':
        return <AuthWrapper type="login" setTab={setActiveTab} />;
      case 'register':
        return <AuthWrapper type="register" setTab={setActiveTab} />;
      case 'reset-password':
        return <ResetPassword onBack={() => setActiveTab('login')} />;
      case 'auth-callback':
        return <AuthCallback />;
      case 'features':
        return <FeaturesView />;
      case 'about':
        return <AboutView />;
      case 'privacy':
        return <PrivacyPolicy onBack={() => setActiveTab('home')} />;
      case 'terms':
        return <TermsOfService onBack={() => setActiveTab('home')} />;
      default:
        return <LandingPage onStart={() => setActiveTab('products')} onViewPricing={() => setActiveTab('pricing')} />;
    }
  };

  // Dashboard tabs — rendered with sidebar layout
  const dashboardTabs = ['about', 'affiliate', 'affiliate-stats', 'affiliate-marketing', 'affiliate-leaderboard', 'purchases', 'wishlist', 'payout-history', 'profile', 'admin', 'admin-products', 'admin-users', 'admin-sales', 'admin-coupons', 'admin-withdrawals', 'admin-events', 'admin-logs'];
  const isDashboardTab = dashboardTabs.includes(activeTab);

  const renderDashboardContent = () => {
    if (user && !user.emailVerified && activeTab !== 'profile') {
      return <VerificationRequired />;
    }
    switch (activeTab) {
      case 'affiliate':
        return <AffiliateDashboard
          user={user!}
          setUser={setUser}
          data={{
            totalClicks: user?.totalClicks || 0,
            totalSales: user?.totalSales || 0,
            totalCommission: user?.commissionEarned || 0,
            referralLink: `https://${window.location.host}/?ref=${user?.referralCode}`
          }}
          onLogout={handleLogout}
          defaultTab="stats"
        />;
      case 'affiliate-stats':
        return <AffiliateDashboard
          user={user!}
          setUser={setUser}
          data={{
            totalClicks: user?.totalClicks || 0,
            totalSales: user?.totalSales || 0,
            totalCommission: user?.commissionEarned || 0,
            referralLink: `https://${window.location.host}/?ref=${user?.referralCode}`
          }}
          onLogout={handleLogout}
          defaultTab="stats"
        />;
      case 'affiliate-marketing':
        return <AffiliateDashboard
          user={user!}
          setUser={setUser}
          data={{
            totalClicks: user?.totalClicks || 0,
            totalSales: user?.totalSales || 0,
            totalCommission: user?.commissionEarned || 0,
            referralLink: `https://${window.location.host}/?ref=${user?.referralCode}`
          }}
          onLogout={handleLogout}
          defaultTab="marketing"
        />;
      case 'affiliate-leaderboard':
        return <AffiliateDashboard
          user={user!}
          setUser={setUser}
          data={{
            totalClicks: user?.totalClicks || 0,
            totalSales: user?.totalSales || 0,
            totalCommission: user?.commissionEarned || 0,
            referralLink: `https://${window.location.host}/?ref=${user?.referralCode}`
          }}
          onLogout={handleLogout}
          defaultTab="leaderboard"
        />;
      case 'purchases':
        return <PurchasesView />;
      case 'wishlist':
        return <WishlistView products={products} user={user!} onPurchase={(p) => setPurchaseModal({ isOpen: true, product: p })} setDetailModal={setDetailModal} onToggleWishlist={updateWishlist} onNavigate={setActiveTab} getDiscountedPrice={getDiscountedPrice} />;
      case 'payout-history':
        return <PayoutHistory />;
      case 'profile':
        return <UserProfile />;
      case 'about':
        return <AboutView />;
      case 'admin':
      case 'admin-products':
        return user?.role === 'admin' ? <AdminDashboard defaultTab="products" /> : <div className="text-center py-20 text-gray-500">Akses Ditolak</div>;
      case 'admin-users':
        return user?.role === 'admin' ? <AdminDashboard defaultTab="users" /> : <div className="text-center py-20 text-gray-500">Akses Ditolak</div>;
      case 'admin-sales':
        return user?.role === 'admin' ? <AdminDashboard defaultTab="sales" /> : <div className="text-center py-20 text-gray-500">Akses Ditolak</div>;
      case 'admin-coupons':
        return user?.role === 'admin' ? <AdminDashboard defaultTab="coupons" /> : <div className="text-center py-20 text-gray-500">Akses Ditolak</div>;
      case 'admin-withdrawals':
        return user?.role === 'admin' ? <AdminDashboard defaultTab="withdrawals" /> : <div className="text-center py-20 text-gray-500">Akses Ditolak</div>;
      case 'admin-events':
        return user?.role === 'admin' ? <AdminDashboard defaultTab="events" /> : <div className="text-center py-20 text-gray-500">Akses Ditolak</div>;
      case 'admin-logs':
        return user?.role === 'admin' ? <AdminDashboard defaultTab="logs" /> : <div className="text-center py-20 text-gray-500">Akses Ditolak</div>;
      default:
        return null;
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Zap className="animate-pulse text-[#2FA084]" size={48} />
      </div>
    );
  }

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <Helmet>
          <title>DigiSell | Marketplace Produk Digital & Program Afiliasi</title>
          <meta name="description" content="Platform modern untuk jual beli produk digital dan program afiliasi dengan komisi tinggi. Bergabung sekarang dan mulai hasilkan pendapatan." />
          <meta name="keywords" content="produk digital, afiliasi, marketplace, komisi, jual beli online, ebook, software" />
          <meta property="og:title" content="DigiSell - Marketplace Digital & Afiliasi" />
          <meta property="og:description" content="Akses produk premium dan hasilkan komisi afiliasi hingga 50%." />
          <meta property="og:type" content="website" />
          <meta property="og:locale" content="id_ID" />
          <meta name="robots" content="index, follow" />
          <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : 'https://digisell.id'} />
        </Helmet>
        
        {detailModal.isOpen && detailModal.product && (
          <Helmet>
            <title>{detailModal.product.name} | DigiSell</title>
            <meta name="description" content={detailModal.product.description.slice(0, 160)} />
            <meta property="og:image" content={detailModal.product.image} />
          </Helmet>
        )}

        <Joyride 
          {...({
            steps: tourSteps,
            run: runTour,
            continuous: true,
            showProgress: true,
            showSkipButton: true,
            styles: {
              options: {
                primaryColor: '#4f46e5',
                zIndex: 1000,
              }
            },
            locale: {
              back: 'Kembali',
              close: 'Tutup',
              last: 'Selesai',
              next: 'Lanjut',
              skip: 'Lewati'
            },
            callback: handleTourCallback
          } as any)}
        />

        {/* Modals */}
        <AnimatePresence>
          {purchaseModal.isOpen && purchaseModal.product && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
              <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.9 }}
                 className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[2.5rem] p-10 space-y-8 relative shadow-2xl"
              >
                 <button onClick={() => { setPurchaseModal({ isOpen: false, product: null }); setAppliedCoupon(null); setCouponCode(''); }} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                   <X size={24} />
                 </button>
                 
                 <div className="space-y-2">
                   <h3 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Checkout</h3>
                   <p className="text-gray-500 dark:text-gray-400 font-medium">Selesaikan transaksi untuk mengakses produk ini.</p>
                 </div>

                 <div className="flex gap-4 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-3xl border border-gray-100 dark:border-gray-600">
                    <img src={purchaseModal.product.image} className="w-20 h-20 rounded-2xl object-cover shadow-sm" referrerPolicy="no-referrer" />
                    <div className="flex-1 space-y-1">
                      <p className="font-black text-gray-900 dark:text-white line-clamp-1">{purchaseModal.product.name}</p>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{purchaseModal.product.category}</p>
                      <p className="text-lg font-black text-[#1F6F5F] dark:text-[#6FCF97]">Rp {purchaseModal.product.price.toLocaleString('id-ID')}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex gap-2">
                      <input 
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Punya Kode Kupon?"
                        className="flex-1 px-5 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-2xl outline-none focus:ring-2 focus:ring-[#2FA084] dark:focus:ring-[#6FCF97] font-bold text-sm text-gray-900 dark:text-white"
                      />
                      <button 
                        onClick={applyCoupon}
                        className="px-6 py-4 bg-gray-900 dark:bg-gray-700 text-white rounded-2xl font-bold text-sm hover:bg-gray-800 dark:hover:bg-gray-600 transition-all"
                      >Terapkan</button>
                    </div>
                    {appliedCoupon && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-xl text-green-700 dark:text-green-400 text-xs font-bold border border-green-200 dark:border-green-800">
                         <div className="flex items-center gap-2">
                           <Ticket size={14} />
                           Kupon "{appliedCoupon.code}" Berhasil!
                         </div>
                         <span>-{appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}%` : `Rp ${appliedCoupon.discountValue.toLocaleString('id-ID')}`}</span>
                      </motion.div>
                    )}
                 </div>

                 <div className="pt-6 border-t border-gray-100 dark:border-gray-700 space-y-4">
                    <div className="flex justify-between items-center text-sm font-bold text-gray-500 dark:text-gray-400">
                      <span>Subtotal</span>
                      <span>Rp {purchaseModal.product.price.toLocaleString('id-ID')}</span>
                    </div>
                    {appliedCoupon && (
                       <div className="flex justify-between items-center text-sm font-bold text-green-600 dark:text-green-400">
                          <span>Diskon Kupon</span>
                          <span>- Rp {(purchaseModal.product.price - calculateTotal(purchaseModal.product.price)).toLocaleString('id-ID')}</span>
                       </div>
                    )}
                    <div className="flex justify-between items-center text-xl font-black text-gray-900 dark:text-white">
                      <span>Total Bayar</span>
                      <span className="text-[#1F6F5F] dark:text-[#6FCF97]">Rp {calculateTotal(purchaseModal.product.price).toLocaleString('id-ID')}</span>
                    </div>
                 </div>

                 <button 
                   onClick={handlePurchase}
                   disabled={isBuying || !user?.emailVerified}
                   className="w-full py-5 bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-[#2FA084]/30 hover:from-[#2FA084] hover:to-[#6FCF97] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                   {isBuying ? <Zap className="animate-spin" size={24} /> : !user?.emailVerified ? (
                     <>
                       <AlertTriangle size={24} />
                       Verifikasi Email untuk Membeli
                     </>
                   ) : (
                     <>
                       <CreditIcon size={24} />
                       Bayar & Akses Sekarang
                     </>
                   )}
                 </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Dashboard Layout or Public Layout */}
        {isDashboardTab && user ? (
          <DashboardLayout
            activeTab={activeTab}
            onNavigate={setActiveTab}
            onLogout={handleLogout}
            onNavigatePublic={setActiveTab}
          >
            {renderDashboardContent()}
          </DashboardLayout>
        ) : (
          <>
            <Navbar user={user} onNavigate={setActiveTab} activeTab={activeTab} onLogout={handleLogout} />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              {user && !user.emailVerified && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm"
          >
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 flex-shrink-0 animate-pulse">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-lg font-black text-amber-900">Email Belum Terverifikasi</p>
                <p className="text-sm text-amber-700 font-medium">Buka inbox Anda dan klik tautan verifikasi untuk mengakses fitur Dashboard & Admin.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={async () => {
                   try {
                     await resendVerificationEmail();
                     alert('Email verifikasi telah dikirim ulang ke inbox Anda!');
                   } catch (e) {
                     alert('Gagal mengirim ulang email verifikasi. Coba lagi nanti.');
                   }
                }}
                className="flex-1 md:flex-none px-6 py-3 bg-amber-100 text-amber-700 text-sm font-black rounded-xl hover:bg-amber-200 transition-all border border-amber-200"
              >
                Kirim Ulang
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className="flex-1 md:flex-none px-6 py-3 bg-amber-600 text-white text-sm font-black rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-200 transition-all"
              >
                Cek Profil
              </button>
            </div>
          </motion.div>
        )}
        <AnimatePresence>
        {detailModal.isOpen && detailModal.product && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailModal({ isOpen: false, product: null })}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-2/5 relative">
             <img 
               src={detailModal.product.image} 
               className="w-full h-full object-cover min-h-[250px] md:min-h-[300px]" 
               referrerPolicy="no-referrer"
               alt={detailModal.product.name}
             />
             <div className="absolute top-4 left-4 md:top-6 md:left-6">
                <span className="bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase shadow-lg shadow-[#2FA084]/30">
                  {detailModal.product.category}
                </span>
             </div>
          </div>
          <div className="lg:w-3/5 p-6 md:p-10 space-y-8">
             <div className="flex justify-between items-start">
                <div className="space-y-1">
                   <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">{detailModal.product.name}</h2>
                   <div className="flex items-center gap-2">
                      <StarRating rating={detailModal.product.averageRating || 0} size={14} />
                      <span className="text-xs font-bold text-gray-400">({detailModal.product.reviewCount || 0} Ulasan)</span>
                   </div>
                </div>
                <button 
                  onClick={() => setDetailModal({ isOpen: false, product: null })}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={24} />
                </button>
             </div>

             <div className="space-y-4">
                <h4 className="font-bold text-gray-900 dark:text-white uppercase text-[10px] md:text-xs tracking-widest">Tentang Produk</h4>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">{detailModal.product.description}</p>
             </div>

             <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-4">
                <div className="space-y-1">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Investasi</p>
                   <p className="text-2xl md:text-3xl font-black text-[#1F6F5F] dark:text-[#6FCF97]">
                     <span className="text-sm font-medium mr-1">Rp</span>
                     {detailModal.product.price.toLocaleString('id-ID')}
                   </p>
                </div>
                <button 
                  onClick={() => {
                    setDetailModal({ isOpen: false, product: null });
                    setPurchaseModal({ isOpen: true, product: detailModal.product });
                  }}
                  className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white rounded-2xl font-black hover:from-[#2FA084] hover:to-[#6FCF97] hover:shadow-xl hover:shadow-[#2FA084]/30 transition-all"
                >
                  Beli Produk Ini
                </button>
             </div>
          </div>
       </div>
       
       {/* Review Section */}
       <div className="bg-gray-50/50 p-6 md:p-10 border-t border-gray-100">
          <ReviewSection 
            productId={detailModal.product.id} 
            hasPurchased={user?.purchasedProducts?.includes(detailModal.product.id) || false}
            fetchProducts={fetchProducts}
          />
       </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <WhatsAppSupport />
      
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
             <div className="w-8 h-8 bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">D</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">DigiSell</span>
          </div>
          <p className="text-gray-400 text-sm">© 2026 DigiAffiliate Store. Platform Modern Produk Digital.</p>
          <button 
            onClick={() => setRunTour(true)}
            className="mt-4 text-[#1F6F5F] dark:text-[#6FCF97] font-bold hover:underline flex items-center justify-center gap-2 mx-auto"
          >
            <BookOpen size={18} /> Panduan Platform
          </button>
        </div>
      </footer>
          </>
        )}
      </div>
    </HelmetProvider>
  );
}


function LandingPage({ onStart, onViewPricing }: { onStart: () => void, onViewPricing: () => void }) {
  return (
    <div className="space-y-20 md:space-y-32">
       {/* Hero Section - Enhanced */}
       <div className="relative overflow-hidden">
         {/* Background Decorations */}
         <div className="absolute inset-0 -z-10">
           <div className="absolute top-20 left-10 w-72 h-72 bg-[#6FCF97] opacity-10 dark:opacity-5 blur-3xl rounded-full"></div>
           <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#2FA084] opacity-10 dark:opacity-5 blur-3xl rounded-full"></div>
         </div>

         <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center py-8 md:py-16">
          <div className="flex-1 space-y-6 md:space-y-8 text-center md:text-left">
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6FCF97]/20 to-[#2FA084]/20 dark:from-[#1F6F5F]/20 dark:to-[#2FA084]/20 text-[#1F6F5F] dark:text-[#6FCF97] rounded-full text-xs md:text-sm font-bold uppercase tracking-wider border border-[#2FA084]/30 shadow-sm"
            >
              <Star size={16} className="animate-pulse" /> 
              Platform Afiliasi #1 di Indonesia
            </motion.div>

            {/* Main Heading */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[0.9] text-gray-900 dark:text-white"
            >
              Raih Passive <br className="hidden md:block" /> 
              Income dengan <br className="hidden md:block" /> 
              <span className="bg-gradient-to-r from-[#1F6F5F] via-[#2FA084] to-[#6FCF97] bg-clip-text text-transparent animate-gradient">
                Afiliasi Digital
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto md:mx-0 leading-relaxed"
            >
              Bergabung dengan <span className="font-bold text-[#1F6F5F] dark:text-[#6FCF97]">1000+ affiliate</span> yang sudah menghasilkan jutaan rupiah. 
              Komisi hingga <span className="font-bold text-[#1F6F5F] dark:text-[#6FCF97]">30%</span> untuk setiap penjualan!
            </motion.p>

            {/* Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-6 md:gap-8 justify-center md:justify-start"
            >
              <div className="text-center md:text-left">
                <div className="text-3xl md:text-4xl font-black text-[#1F6F5F] dark:text-[#6FCF97]">30%</div>
                <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">Komisi Maksimal</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-3xl md:text-4xl font-black text-[#1F6F5F] dark:text-[#6FCF97]">1000+</div>
                <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">Affiliate Aktif</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-3xl md:text-4xl font-black text-[#1F6F5F] dark:text-[#6FCF97]">24/7</div>
                <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">Support Ready</div>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4"
            >
              <button 
                onClick={onStart}
                className="group bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white px-8 py-5 rounded-2xl font-bold hover:from-[#2FA084] hover:to-[#6FCF97] hover:shadow-2xl hover:shadow-[#2FA084]/40 transition-all flex items-center justify-center gap-3 text-lg"
              >
                Mulai Sekarang 
                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={onViewPricing}
                className="border-2 border-gray-200 dark:border-gray-700 px-8 py-5 rounded-2xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-[#2FA084] dark:hover:border-[#6FCF97] transition-all flex items-center justify-center text-lg"
              >
                Lihat Paket Tier
              </button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center gap-4 justify-center md:justify-start pt-6 text-xs text-gray-500 dark:text-gray-400"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#2FA084]" />
                <span>Aman & Terpercaya</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-[#2FA084]" />
                <span>Instant Payout</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-[#2FA084]" />
                <span>Verified Platform</span>
              </div>
            </motion.div>
          </div>

          {/* Hero Image */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex-1 w-full max-w-2xl"
          >
             <div className="relative">
                {/* Glow Effect */}
                <div className="absolute -inset-8 bg-gradient-to-r from-[#1F6F5F] via-[#2FA084] to-[#6FCF97] opacity-20 dark:opacity-30 blur-3xl rounded-full animate-pulse"></div>
                
                {/* Main Image */}
                <div className="relative">
                  <img 
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop" 
                    className="relative rounded-[2rem] md:rounded-[3rem] shadow-2xl border-4 border-white/50 dark:border-gray-700/50 w-full" 
                    referrerPolicy="no-referrer"
                    alt="Dashboard Preview"
                  />
                  
                  {/* Floating Stats Card */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#1F6F5F] to-[#2FA084] rounded-xl flex items-center justify-center">
                        <TrendingUp size={24} className="text-white" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-[#1F6F5F] dark:text-[#6FCF97]">+245%</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Growth Rate</div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Floating Commission Card */}
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="absolute -top-6 -right-6 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#6FCF97] to-[#2FA084] rounded-xl flex items-center justify-center">
                        <Wallet size={24} className="text-white" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-[#1F6F5F] dark:text-[#6FCF97]">Rp 15M+</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Komisi</div>
                      </div>
                    </div>
                  </motion.div>
                </div>
             </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section - Enhanced */}
      <div className="space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block bg-gradient-to-r from-[#6FCF97]/20 to-[#2FA084]/20 dark:from-[#1F6F5F]/20 dark:to-[#2FA084]/20 text-[#1F6F5F] dark:text-[#6FCF97] px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-[#2FA084]/30"
          >
            Kenapa Memilih Kami?
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">
            Platform Terlengkap untuk <span className="text-[#1F6F5F] dark:text-[#6FCF97]">Affiliate Marketing</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Semua yang Anda butuhkan untuk sukses sebagai affiliate marketer dalam satu platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<ShieldCheck className="text-[#1F6F5F] dark:text-[#6FCF97]" />} 
            title="Anti-Fraud System" 
            desc="Sistem keamanan tingkat enterprise dengan deteksi fraud otomatis dan self-referral prevention untuk melindungi integritas program."
          />
          <FeatureCard 
            icon={<Zap className="text-[#1F6F5F] dark:text-[#6FCF97]" />} 
            title="Instant Payout" 
            desc="Diamond tier mendapat instant payout real-time. Gold tier priority 24 jam. Sistem holding period yang transparan dan fair."
          />
          <FeatureCard 
            icon={<TrendingUp className="text-[#1F6F5F] dark:text-[#6FCF97]" />} 
            title="Dynamic Cookie Life" 
            desc="Cookie tracking 30-120 hari berdasarkan tier. Semakin tinggi tier, semakin lama tracking untuk maximize conversion."
          />
          <FeatureCard 
            icon={<BarChart3 className="text-[#1F6F5F] dark:text-[#6FCF97]" />} 
            title="Advanced Analytics" 
            desc="Dashboard analytics lengkap dengan UTM tracking, conversion rate, dan fraud detection untuk optimize performance."
          />
          <FeatureCard 
            icon={<Users className="text-[#1F6F5F] dark:text-[#6FCF97]" />} 
            title="5-Tier System" 
            desc="Dari Starter (5%) hingga Diamond (30%). Auto-upgrade berdasarkan performa dengan benefit yang jelas di setiap level."
          />
          <FeatureCard 
            icon={<CreditIcon className="text-[#1F6F5F] dark:text-[#6FCF97]" />} 
            title="Multiple Payment" 
            desc="Support QRIS, Virtual Account, E-Wallet, dan Bank Transfer. Pembayaran aman dengan enkripsi tingkat bank."
          />
        </div>
      </div>

      {/* Pricing Section */}
      <div className="pt-20 border-t border-gray-100 dark:border-gray-800">
        <PricingView />
      </div>

      {/* CTA Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#1F6F5F] via-[#2FA084] to-[#6FCF97] opacity-5 dark:opacity-10"></div>
        <div className="relative bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] rounded-[3rem] p-12 md:p-20 text-center text-white">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-3xl md:text-5xl font-black">Siap Mulai Menghasilkan?</h2>
            <p className="text-lg md:text-xl text-white/90">
              Bergabung sekarang dan dapatkan akses ke platform afiliasi terbaik. 
              Gratis untuk memulai, tanpa biaya tersembunyi.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button 
                onClick={onStart}
                className="bg-white text-[#1F6F5F] px-10 py-5 rounded-2xl font-bold hover:bg-[#6FCF97] hover:text-white transition-all text-lg shadow-2xl"
              >
                Daftar Gratis Sekarang
              </button>
              <button 
                onClick={onViewPricing}
                className="border-2 border-white/30 backdrop-blur-sm px-10 py-5 rounded-2xl font-bold hover:bg-white/10 transition-all text-lg"
              >
                Pelajari Lebih Lanjut
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function ProductCard({ product, onPurchase, setDetailModal, user, onToggleWishlist, getDiscountedPrice }: { product: Product, onPurchase: (p: Product) => void, setDetailModal: (m: any) => void, user: User | null, onToggleWishlist: (id: string) => void, getDiscountedPrice: (p: number) => number }) {
  const isWishlisted = user?.wishlist?.includes(product.id) || false;
  const finalPrice = getDiscountedPrice(product.price);
  const isDiscounted = finalPrice < product.price;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white dark:bg-gray-800 rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:shadow-[#2FA084]/20 transition-all group relative h-full flex flex-col"
    >
      <div className="h-56 relative overflow-hidden">
          <img 
            src={product.image} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-pointer" 
            referrerPolicy="no-referrer"
            onClick={() => setDetailModal({ isOpen: true, product })}
          />
          
          {/* Discount Badge */}
          {isDiscounted && (
             <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black z-10 shadow-lg">
                OFF {Math.round((1 - finalPrice/product.price) * 100)}%
             </div>
          )}
          
          {/* Interactive Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-[#1F6F5F]/90 to-[#2FA084]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 transition-opacity duration-300 opacity-0 group-hover:opacity-100 p-6 z-20"
          >
             <motion.button 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => setDetailModal({ isOpen: true, product })}
               className="w-full max-w-[160px] bg-white text-[#1F6F5F] py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-2xl hover:bg-[#6FCF97] hover:text-white transition-colors"
             >
               <Eye size={18} />
               Lihat Detail
             </motion.button>
             <motion.button 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={(e) => {
                 e.stopPropagation();
                 onToggleWishlist(product.id);
               }}
               className={`w-full max-w-[160px] py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-2xl transition-all border ${
                 isWishlisted 
                 ? 'bg-red-500 border-red-500 text-white hover:bg-red-600' 
                 : 'bg-white/10 border-white/30 text-white backdrop-blur-md hover:bg-white hover:text-red-500 hover:border-white'
               }`}
             >
               <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
               {isWishlisted ? 'Tersimpan' : 'Wishlist'}
             </motion.button>
          </motion.div>

          {/* Persistent Wishlist Badge (Always visible if wishlisted) */}
          {isWishlisted && (
             <motion.div 
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               className="absolute top-4 left-4 bg-red-500 text-white p-2 rounded-full shadow-lg z-10"
             >
                <Heart size={12} fill="currentColor" />
             </motion.div>
          )}

          <div className="absolute top-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl px-4 py-1.5 rounded-full text-[10px] font-black text-[#1F6F5F] dark:text-[#6FCF97] z-10 shadow-sm uppercase tracking-wider border border-[#2FA084]/30">
            {product.category}
          </div>
      </div>
      
      <div className="p-8 flex flex-col flex-1 space-y-4">
         <div className="flex-1 space-y-3">
            <div className="flex items-center gap-1.5 mb-1 cursor-pointer" onClick={() => setDetailModal({ isOpen: true, product })}>
               <StarRating rating={product.averageRating || 0} size={12} />
               {product.reviewCount ? (
                 <span className="text-[10px] font-bold text-gray-400">({product.reviewCount})</span>
               ) : null}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-[#1F6F5F] dark:group-hover:text-[#6FCF97] transition-colors line-clamp-1 cursor-pointer" onClick={() => setDetailModal({ isOpen: true, product })}>{product.name}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-3 leading-relaxed">{product.description}</p>
         </div>
         
         <div className="pt-6 flex items-center justify-between border-t border-gray-100/50 dark:border-gray-700/50 mt-auto">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{isDiscounted ? 'Harga Promo' : 'Harga Dasar'}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-[#1F6F5F] dark:text-[#6FCF97]">
                  <span className="text-sm font-medium mr-1 tracking-tight">Rp</span>
                  {finalPrice.toLocaleString('id-ID')}
                </p>
                {isDiscounted && (
                  <p className="text-xs font-bold text-gray-400 line-through decoration-red-400/50">
                    {product.price.toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onPurchase(product)}
              className="bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white px-7 py-3.5 rounded-2xl font-bold hover:shadow-lg hover:shadow-[#2FA084]/30 hover:from-[#2FA084] hover:to-[#6FCF97] transition-all text-sm"
            >Beli Sekarang</motion.button>
         </div>
      </div>
    </motion.div>
  );
}

function ProductCatalog({ products, onPurchase, setDetailModal, user, onToggleWishlist, getDiscountedPrice, searchQuery }: { products: Product[], onPurchase: (p: Product) => void, setDetailModal: (m: any) => void, user: User | null, onToggleWishlist: (id: string) => void, getDiscountedPrice: (p: number) => number, searchQuery: string }) {
  const q = (searchQuery || '').toLowerCase();
  const filtered = q
    ? products.filter(p => (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))
    : products;
  // Removed verbose logging for production

  return (
    <div className="space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-6 px-4 md:px-0">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="inline-block bg-gradient-to-r from-[#6FCF97]/20 to-[#2FA084]/20 dark:from-[#1F6F5F]/20 dark:to-[#2FA084]/20 text-[#1F6F5F] dark:text-[#6FCF97] px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest mb-2 border border-[#2FA084]/30"
        >
          Katalog Produk
        </motion.div>
        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white leading-[1.1]">Pilihan Produk Digital Terbaik</h2>
        <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg leading-relaxed">Pilih dari berbagai pilihan produk digital untuk meningkatkan produktivitas dan finansial Anda melalui ekosistem kami.</p>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag size={40} className="text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Belum Ada Produk</h3>
          <p className="text-gray-500 dark:text-gray-400">Produk akan muncul di sini setelah admin menambahkannya.</p>
        </div>
      ) : (
        <div id="product-catalog" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filtered.map(product => (
            <ProductCard key={product.id} product={product} onPurchase={onPurchase} setDetailModal={setDetailModal} user={user} onToggleWishlist={onToggleWishlist} getDiscountedPrice={getDiscountedPrice} />
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistView({ products, user, onPurchase, setDetailModal, onToggleWishlist, onNavigate, getDiscountedPrice }: { products: Product[], user: User, onPurchase: (p: Product) => void, setDetailModal: (m: any) => void, onToggleWishlist: (id: string) => void, onNavigate: (tab: any) => void, getDiscountedPrice: (p: number) => number }) {
  const wishlistedProducts = products.filter(p => user.wishlist?.includes(p.id));

  return (
    <div className="space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-6 px-4 md:px-0">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="inline-block bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest mb-2 border border-red-200 dark:border-red-800"
        >
          Wishlist Anda
        </motion.div>
        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white leading-[1.1]">Produk Impian Anda</h2>
        <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg leading-relaxed">Simpan produk yang Anda minati dan akses kembali kapan saja untuk mulai menghasilkan cuan.</p>
      </div>

      {wishlistedProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {wishlistedProducts.map(product => (
            <ProductCard key={product.id} product={product} onPurchase={onPurchase} setDetailModal={setDetailModal} user={user} onToggleWishlist={onToggleWishlist} getDiscountedPrice={getDiscountedPrice} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-20 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700 text-center space-y-6">
           <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-8">
              <Heart size={48} />
           </div>
           <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Wah, Wishlist Masih Kosong</h3>
           <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">Jelajahi katalog kami dan klik ikon hati pada produk yang Anda sukai untuk menyimpannya di sini.</p>
           <button 
             onClick={() => onNavigate('products')}
             className="bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white px-8 py-4 rounded-2xl font-bold hover:shadow-xl hover:shadow-[#2FA084]/30 hover:from-[#2FA084] hover:to-[#6FCF97] transition-all"
           >Jelajahi Katalog</button>
        </div>
      )}
    </div>
  );
}

function AuthWrapper({ type, setTab }: { type: 'login' | 'register', setTab: (t: any) => void }) {
  const { user } = useStore();

  // Reactive redirect: when store updates with logged-in user, navigate to dashboard
  useEffect(() => {
    if (user) {
      setTab(user.role === 'admin' ? 'admin' : 'affiliate');
    }
  }, [user]);

  const handleLoginSuccess = () => {
    // Navigate immediately — useEffect above will also fire when store updates
    setTab('affiliate');
  };

  return (
    <div className="max-w-md mx-auto py-8 md:py-12 px-4">
      <div className="space-y-8 bg-white dark:bg-gray-800 p-6 md:p-10 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="text-center space-y-2">
         <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">{type === 'login' ? 'Selamat Datang' : 'Buat Akun'}</h2>
         <p className="text-gray-500 dark:text-gray-400 text-sm">
           {type === 'login' ? 'Masuk untuk mengelola afiliasi Anda' : 'Bergabung sebagai afiliasi dan mulai hasilkan cuan'}
         </p>
      </div>
      {type === 'login' 
        ? <LoginForm onSuccess={handleLoginSuccess} onForgotPassword={() => setTab('reset-password')} /> 
        : <RegisterForm onSuccess={() => setTab('home')} />}
      <div className="text-center">
         <button 
           onClick={() => setTab(type === 'login' ? 'register' : 'login')}
           className="text-sm font-medium text-gray-400 hover:text-[#2FA084] dark:hover:text-[#6FCF97]"
         >
           {type === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
         </button>
      </div>
    </div>
    </div>
  );
}

function VerificationRequired() {
  const { resendVerificationEmail, checkVerificationStatus } = useStore();
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 max-w-md w-full p-10 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 text-center space-y-6 shadow-sm"
      >
        <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-3xl flex items-center justify-center mx-auto text-amber-500 dark:text-amber-400">
          <AlertTriangle size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Verifikasi Email Anda</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
            Tautan verifikasi telah dikirim ke email Anda. Silakan verifikasi untuk membuka akses penuh ke Dashboard, Pembelian, dan Program Afiliasi.
          </p>
        </div>
        
        <div className="pt-4 space-y-3">
          <button 
            onClick={async () => {
              setChecking(true);
              try {
                await checkVerificationStatus();
              } finally {
                setChecking(false);
              }
            }}
            disabled={checking}
            className="w-full py-4 bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white rounded-2xl font-bold hover:from-[#2FA084] hover:to-[#6FCF97] hover:shadow-lg hover:shadow-[#2FA084]/30 transition-all flex items-center justify-center gap-2"
          >
            {checking ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
            {checking ? 'Mengecek...' : 'Saya Sudah Verifikasi'}
          </button>

          <button 
            onClick={async () => {
              try {
                await resendVerificationEmail();
                setSent(true);
                setTimeout(() => setSent(false), 5000);
              } catch (e) {
                alert('Gagal mengirim ulang. Silakan coba lagi nanti.');
              }
            }}
            disabled={sent}
            className={`w-full py-4 rounded-2xl font-bold transition-all border flex items-center justify-center gap-2 ${
              sent 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-600 dark:text-green-400' 
              : 'bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            {sent ? <Check size={20} /> : <Mail size={20} />}
            {sent ? 'Email Terkirim!' : 'Kirim Ulang Link Verifikasi'}
          </button>
        </div>

        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
          *Jika email tidak muncul, cek folder Spam atau Promosi.
        </p>
      </motion.div>
    </div>
  );
}

function UserProfile() {
  const { user, updateUserProfile, getAuthHeaders } = useStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isIndonesian, setIsIndonesian] = useState(user?.isIndonesian !== false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserProfile({ name, email, isIndonesian });
      setIsEditing(false);
      alert('Profil berhasil diperbaharui');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBootstrapAdmin = async () => {
    if (!confirm('Jadikan akun Anda sebagai Admin pertama? Tindakan ini tidak bisa dibatalkan.')) return;
    setIsBootstrapping(true);
    try {
      const resp = await fetch('/api/bootstrap-admin', {
        method: 'POST',
        headers: await getAuthHeaders()
      });
      const data = await resp.json();
      if (resp.ok) {
        alert(data.message || 'Berhasil! Silakan refresh halaman.');
        window.location.reload();
      } else {
        alert('Gagal: ' + (data.error || 'Server error'));
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsBootstrapping(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm"
      >
        <div className="bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] h-32 relative">
          <div className="absolute -bottom-10 left-10 w-20 h-20 bg-white dark:bg-gray-800 rounded-3xl p-1 shadow-lg">
            <div className="w-full h-full bg-gradient-to-br from-[#6FCF97]/30 to-[#2FA084]/30 rounded-2xl flex items-center justify-center text-[#1F6F5F] dark:text-[#6FCF97] text-3xl font-bold border border-[#2FA084]/30">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
        <div className="pt-16 pb-10 px-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{user.name}</h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest text-xs mt-1">{user.role}</p>
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white rounded-xl text-sm font-bold hover:from-[#2FA084] hover:to-[#6FCF97] hover:shadow-lg hover:shadow-[#2FA084]/30 transition-all"
              >
                Edit Profil
              </button>
            )}
          </div>

          {/* Bootstrap Admin Button (only show if user is not admin) */}
          {user.role !== 'admin' && (
            <div className="mb-8 p-5 bg-purple-50 border border-purple-100 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 flex-shrink-0">
                  <Shield size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-purple-900 text-sm mb-1">Belum Ada Admin?</h3>
                  <p className="text-xs text-purple-600 mb-3">
                    Jika Anda adalah pemilik platform dan belum ada admin, klik tombol di bawah untuk menjadikan akun Anda sebagai Admin pertama.
                  </p>
                  <button
                    onClick={handleBootstrapAdmin}
                    disabled={isBootstrapping}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isBootstrapping ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                    {isBootstrapping ? 'Memproses...' : 'Jadikan Admin Pertama'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase px-2">Nama Lengkap</label>
                <input 
                  disabled={!isEditing}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium disabled:opacity-75"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase px-2">Alamat Email</label>
                <input 
                  disabled={!isEditing}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium disabled:opacity-75"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase px-2">Domisili Pembeli (Simulasi Harga)</label>
                <select 
                  disabled={!isEditing}
                  value={isIndonesian ? 'true' : 'false'} 
                  onChange={e => setIsIndonesian(e.target.value === 'true')}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold disabled:opacity-75"
                >
                  <option value="true">🇮🇩 Indonesia (Harga Lokal)</option>
                  <option value="false">🌏 Luar Negeri (Harga Internasional)</option>
                </select>
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-4 bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white rounded-2xl font-bold hover:from-[#2FA084] hover:to-[#6FCF97] hover:shadow-lg hover:shadow-[#2FA084]/30 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setName(user.name);
                    setEmail(user.email);
                  }}
                  className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  Batal
                </button>
              </div>
            )}
          </form>

          {!isEditing && (
            <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ID Pengguna</p>
                <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{user.id}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Kode Referal</p>
                <p className="font-mono text-xs text-[#1F6F5F] dark:text-[#6FCF97] font-bold">{user.referralCode || '-'}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function AffiliateDashboard({ data, user, onLogout, setUser, defaultTab = 'stats' }: { data: AffiliateStats, user: User, onLogout: () => void, setUser: (u: User) => void, defaultTab?: 'stats' | 'marketing' | 'leaderboard' }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const { tiers } = useStore();

  
  // Withdrawal States
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Filter States
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | 'month' | 'custom'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [activeTab, setActiveTab] = useState<'stats' | 'marketing' | 'leaderboard'>(defaultTab);

  const ctr = data.totalClicks > 0 ? ((sales.length / data.totalClicks) * 100).toFixed(2) : '0';
  
  // Get user's current tier
  const userTierName = user.tier || 'starter';
  const currentTier = tiers.find(t => t.id === userTierName || t.name === userTierName);
  
  // Find next tier
  const sortedTiers = [...tiers].sort((a, b) => a.order - b.order);
  const currentTierIndex = sortedTiers.findIndex(t => t.id === userTierName || t.name === userTierName);
  const nextTier = currentTierIndex >= 0 && currentTierIndex < sortedTiers.length - 1 
    ? sortedTiers[currentTierIndex + 1] 
    : null;
  
  const tierColor = currentTier?.color || '#9CA3AF';


  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount <= 0) {
      alert('Error: Nominal pencairan harus berupa angka positif.');
      return;
    }
    if (withdrawAmount < 50000) {
      alert('Info: Minimal penarikan dana adalah Rp 50.000');
      return;
    }
    if (withdrawAmount > (user.commissionEarned || 0)) {
      alert('Error: Saldo tersedia tidak mencukupi untuk nominal pencairan tersebut.');
      return;
    }


    setIsWithdrawing(true);
    const { getAuthHeaders } = useStore.getState();
    try {
      const response = await fetch('/api/affiliate/withdrawals', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          amount: withdrawAmount,
          paymentMethod,
          paymentDetails
        })
      });

      if (response.ok) {
        alert('Permintaan pencairan berhasil dikirim. Mohon tunggu proses verifikasi admin.');
        setIsWithdrawModalOpen(false);
        setWithdrawAmount(0);
        setPaymentMethod('');
        setPaymentDetails('');
        // Refresh profile data
        const docSnap = await getDoc(doc(db, 'users', user.id));
        if (docSnap.exists()) setUser(docSnap.data() as User);
      } else {
        const errData = await response.json();
        alert('Gagal: ' + (errData.error || 'Server error'));
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const { getAuthHeaders } = useStore.getState();
        const response = await fetch('/api/affiliate/sales', {
          headers: await getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch sales');
        const salesData = await response.json();
        setSales(salesData);

        // Process Chart Data (Last 30 days stacked by product)
        const days = 30;
        const now = new Date();
        const dataMap: any = {};
        const productNames = new Set<string>();
        
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const key = d.toISOString().split('T')[0];
          dataMap[key] = { 
            date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            totalSales: 0
          };
        }

        salesData.forEach(sale => {
          if (sale.createdAt) {
            const saleDate = sale.createdAt.split('T')[0];
            const productName = sale.productName || 'Lainnya';
            if (dataMap[saleDate]) {
              dataMap[saleDate].totalSales += 1;
              dataMap[saleDate][productName] = (dataMap[saleDate][productName] || 0) + 1;
              productNames.add(productName);
            }
          }
        });

        setChartData(Object.values(dataMap));
        // We'll store top products separately for the legend/bars
        
        // Process Top Products
        const prodMap: any = {};
        salesData.forEach(sale => {
          const name = sale.productName || 'Produk Digital';
          if (!prodMap[name]) {
            prodMap[name] = { name, sales: 0, totalCommission: 0 };
          }
          prodMap[name].sales += 1;
          prodMap[name].totalCommission += (sale.commission || 0);
        });

        const sortedProds = Object.values(prodMap)
          .sort((a: any, b: any) => b.sales - a.sales)
          .slice(0, 5);
        setTopProducts(sortedProds);

        // Fetch Leaderboard
        const leaderboardRes = await fetch('/api/affiliate/leaderboard');
        if (leaderboardRes.ok) {
          setLeaderboard(await leaderboardRes.json());
        }

      } catch (err) {
        console.error("Error fetching sales:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchProducts = async () => {
      try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      } catch (err) { console.error(err); }
    };

    fetchSales();
    fetchProducts();
  }, [user.id]);


  const uniqueProducts = Array.from(new Set(sales.map(s => s.productName || 'Produk Digital')));

  const filteredSales = sales.filter(sale => {
    // Product Filter
    if (productFilter !== 'all' && sale.productName !== productFilter) return false;

    // Date Filter
    if (dateFilter === 'all') return true;

    const saleDate = new Date(sale.createdAt);
    const now = new Date();

    if (dateFilter === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return saleDate >= sevenDaysAgo;
    }

    if (dateFilter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return saleDate >= startOfMonth;
    }

    if (dateFilter === 'custom' && customRange.start && customRange.end) {
      const start = new Date(customRange.start);
      const end = new Date(customRange.end);
      end.setHours(23, 59, 59, 999);
      return saleDate >= start && saleDate <= end;
    }

    return true;
  });

  return (
    <div className="space-y-8 md:space-y-12">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] bg-clip-text text-transparent">Dashboard Afiliasi</h2>
            <p className="text-gray-500 text-sm mt-2 font-medium">Pantau performa dan kelola komisi Anda</p>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-6 py-3 text-red-500 font-bold text-sm border-2 border-red-100 rounded-2xl hover:bg-red-50 transition-all">
            <LogOut size={18}/> Keluar
          </button>
       </div>

        <div id="affiliate-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="relative group">
               {(() => {
                 const commissionTrend = user.commissionEarned && user.commissionEarned > 0 ? `${((user.totalSales || 0) > 0 ? (user.commissionEarned / (user.totalSales || 1)).toFixed(0) : 0)}% ROI` : 'Belum ada';
                 return <StatsCard title="Total Komisi" value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(user.commissionEarned || 0)} icon={<Wallet />} trend={commissionTrend} />;
               })()}
               <button 
                 onClick={() => setIsWithdrawModalOpen(true)}
                 className="absolute right-4 bottom-4 bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:from-[#2FA084] hover:to-[#6FCF97] transition-all shadow-lg shadow-[#2FA084]/30 group-hover:scale-105"
               >
                 Cairkan
               </button>
            </div>
            <StatsCard title="Total Penjualan" value={(user.totalSales || 0).toString() + " Sales"} icon={<ShoppingBag />} trend={data.totalClicks > 0 ? `${(((user.totalSales || 0) / data.totalClicks) * 100).toFixed(1)}% conv` : '0% conv'} />
            <StatsCard title="Link Clicks" value={data.totalClicks.toString()} icon={<Users />} trend={data.totalClicks > 0 ? `${(data.totalClicks / Math.max((user.totalSales || 1), 1)).toFixed(0)} CPC` : '0 CPC'} />
           <div className="bg-gradient-to-br from-[#1F6F5F] to-[#2FA084] p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-[#1F6F5F] shadow-xl shadow-[#2FA084]/30 flex flex-col justify-center text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-3">
                   <p className="text-xs font-black text-white/70 uppercase tracking-widest">Conversion Rate</p>
                   <TrendingUp size={16} className="text-[#6FCF97]" />
                </div>
                <h3 className="text-4xl md:text-5xl font-black">{ctr}%</h3>
                <p className="text-xs text-white/60 mt-2 font-bold">Klik → Penjualan</p>
              </div>
           </div>
        </div>

        

        {/* Withdrawal Modal */}
        <AnimatePresence>
          {isWithdrawModalOpen && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white v-full max-w-lg rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden"
              >
                  <button onClick={() => setIsWithdrawModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 transition-colors">
                    <X size={24} />
                  </button>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-bold tracking-tight">Cairkan Komisi</h3>
                    <p className="text-gray-500 font-medium">Lengkapi detail untuk memproses pencairan dana Anda.</p>
                  </div>

                  <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100/50 flex justify-between items-center">
                    <div>
                       <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Saldo Tersedia</p>
                       <p className="text-2xl font-black text-indigo-600">Rp {(user.commissionEarned || 0).toLocaleString('id-ID')}</p>
                    </div>
                    <Wallet className="text-indigo-200" size={40} />
                  </div>

                  <form onSubmit={handleWithdrawRequest} className="space-y-6">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase px-2">Nominal Pencairan</label>
                      <input 
                        required
                        type="number"
                        min="50000"
                        max={user.commissionEarned}
                        value={withdrawAmount}
                        onChange={e => setWithdrawAmount(parseInt(e.target.value))}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-bold"
                        placeholder="Min. 50,000"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase px-2">Metode Pembayaran</label>
                        <select 
                          required
                          value={paymentMethod}
                          onChange={e => setPaymentMethod(e.target.value)}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        >
                          <option value="">Pilih Metode</option>
                          <option value="Bank Transfer">Transfer Bank</option>
                          <option value="DANA">DANA</option>
                          <option value="OVO">OVO</option>
                          <option value="GoPay">GoPay</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase px-2">Detail Rekening/E-Wallet</label>
                        <textarea 
                          required
                          value={paymentDetails}
                          onChange={e => setPaymentDetails(e.target.value)}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 h-24 text-sm font-medium"
                          placeholder="Contoh: BCA 1234567890 a/n Nama Lengkap"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isWithdrawing}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isWithdrawing ? <Zap className="animate-spin" size={20} /> : 'Kirim Permintaan'}
                    </button>
                  </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Affiliate Tabs */}
        <div className="flex gap-2 p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl w-fit border border-gray-200 shadow-sm">
           <button onClick={() => setActiveTab('stats')} className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'stats' ? 'bg-white text-[#1F6F5F] shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
             📊 Statistik
           </button>
           <button onClick={() => setActiveTab('marketing')} className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'marketing' ? 'bg-white text-[#1F6F5F] shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
             🎯 Marketing Kit
           </button>
           <button onClick={() => setActiveTab('leaderboard')} className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'leaderboard' ? 'bg-white text-[#1F6F5F] shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
             🏆 Leaderboard
           </button>
        </div>

        {activeTab === 'stats' && (
          <>
            <div 
              className="p-8 md:p-10 rounded-[2.5rem] border shadow-xl transition-all text-white"
              style={{
                background: `linear-gradient(135deg, ${tierColor} 0%, ${tierColor}dd 100%)`,
                borderColor: tierColor
              }}
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                   <div 
                     className="w-16 h-16 md:w-20 md:h-20 rounded-[2rem] flex items-center justify-center font-black text-3xl md:text-4xl shadow-lg bg-white/20 text-white"
                   >
                      {currentTier?.icon || userTierName.charAt(0).toUpperCase()}
                   </div>
                   <div>
                      <h4 className="text-xl md:text-2xl font-black">
                        Level Akun: <span className="uppercase">{currentTier?.displayName || userTierName}</span>
                      </h4>
                      <p className="text-sm md:text-base font-bold mt-1 text-white/80">
                        Komisi Aktif: <span className="font-black text-white">
                          {currentTier ? `${(currentTier.commissionRate * 100).toFixed(0)}%` : '5%'}
                        </span> per penjualan
                      </p>
                   </div>
                </div>
                <div className="text-center md:text-right">
                   <p className="text-xs font-black uppercase tracking-widest mb-1 text-white/60">
                     {nextTier ? 'Target Berikutnya' : 'Tier Tertinggi'}
                   </p>
                   <p className="text-base md:text-lg font-black text-white">
                     {nextTier ? `${nextTier.minSales} Penjualan` : '∞'}
                   </p>
                   {nextTier && (
                     <p className="text-xs text-white/60 mt-1">
                       untuk {nextTier.displayName} ({(nextTier.commissionRate * 100).toFixed(0)}%)
                     </p>
                   )}
                </div>
              </div>
            </div>
            {/* Charts... */}
            <div id="commission-chart" className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                 <div>
                   <h3 className="text-lg md:text-xl font-bold">Analitik Penjualan (30 Hari)</h3>
                   <p className="text-gray-500 text-xs md:text-sm">Visualisasi performa penjualan per produk.</p>
                 </div>
                 <div className="flex items-center gap-1 md:gap-2 p-1 bg-gray-50 rounded-xl w-fit">
                   <button onClick={() => setDateFilter('7days')} className={`px-3 md:px-4 py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all ${dateFilter === '7days' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>7H</button>
                   <button onClick={() => setDateFilter('month')} className={`px-3 md:px-4 py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all ${dateFilter === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>30H</button>
                   <button onClick={() => setDateFilter('all')} className={`px-3 md:px-4 py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all ${dateFilter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Semua</button>
                 </div>
               </div>
               <div className="h-[300px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis 
                       dataKey="date" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fill: '#9ca3af', fontSize: 10}} 
                       dy={10}
                     />
                     <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fill: '#9ca3af', fontSize: 10}} 
                     />
                     <Tooltip 
                       contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                       cursor={{fill: '#f8fafc'}}
                     />
                     <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px'}} />
                     {Array.from(new Set(sales.map(s => s.productName || 'Lainnya'))).slice(0, 5).map((prodName, idx) => (
                       <Bar 
                         key={prodName} 
                         dataKey={prodName} 
                         stackId="a" 
                         fill={['#4f46e5', '#818cf8', '#c7d2fe', '#6366f1', '#a5b4fc'][idx % 5]} 
                         radius={idx === 0 ? [0, 0, 4, 4] : [0, 0, 0, 0]}
                       />
                     ))}
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </>
        )}


        {activeTab === 'marketing' && (
          <div className="space-y-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                   <div className="flex items-center gap-3">
                      <Tag className="text-indigo-600" />
                      <h4 className="text-xl font-bold">Marketing Kit Produk</h4>
                   </div>
                   <div className="space-y-8">
                      {products.filter(p => p.marketingKit && (p.marketingKit.banners.length > 0 || p.marketingKit.swipeFiles.length > 0)).length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Belum ada bahan promosi yang tersedia.</p>
                      ) : (
                        products.filter(p => p.marketingKit && (p.marketingKit.banners.length > 0 || p.marketingKit.swipeFiles.length > 0)).map(p => (
                          <div key={p.id} className="space-y-6 pt-6 border-t first:border-t-0 border-gray-100">
                             <div className="flex items-center justify-between">
                                <p className="font-black text-indigo-600 uppercase tracking-tighter text-sm">{p.name}</p>
                                <span className="text-[10px] bg-indigo-50 text-indigo-400 px-2 py-0.5 rounded-full font-bold">Ready</span>
                             </div>
                             
                             {p.marketingKit?.swipeFiles && p.marketingKit.swipeFiles.length > 0 && (
                               <div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Copywriting (Swipe Files)</p>
                                  <div className="space-y-3">
                                     {p.marketingKit.swipeFiles.map((sf, idx) => (
                                       <div key={idx} className="p-4 bg-gray-50 rounded-2xl space-y-2 border border-gray-100">
                                          <p className="font-bold text-sm">{sf.title}</p>
                                          <p className="text-xs text-gray-500 leading-relaxed italic line-clamp-3">"{sf.content}"</p>
                                          <button 
                                            onClick={() => {
                                              navigator.clipboard.writeText(sf.content);
                                              alert('Copywriting disalin ke clipboard!');
                                            }} 
                                            className="text-[10px] font-black text-indigo-600 uppercase hover:underline"
                                          >
                                            Salin Teks
                                          </button>
                                       </div>
                                     ))}
                                  </div>
                               </div>
                             )}

                             {p.marketingKit?.banners && p.marketingKit.banners.length > 0 && (
                               <div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Banner Ads</p>
                                  <div className="grid grid-cols-2 gap-4">
                                     {p.marketingKit.banners.map((url, idx) => (
                                       <div key={idx} className="aspect-square bg-gray-100 rounded-2xl overflow-hidden relative group border border-gray-100">
                                          <img src={url} className="w-full h-full object-cover" />
                                          <a 
                                            href={url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="absolute inset-0 bg-indigo-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-bold text-xs"
                                          >
                                            Lihat Banner
                                          </a>
                                       </div>
                                     ))}
                                  </div>
                               </div>
                             )}
                          </div>
                        ))
                      )}
                   </div>
                </div>
                <div className="bg-indigo-600 p-10 rounded-[2.5rem] text-white flex flex-col justify-center space-y-6 shadow-xl shadow-indigo-100">
                   <h4 className="text-3xl font-black italic">"Senjata Perang" Anda Siap!</h4>
                   <p className="text-indigo-100 opacity-80 leading-relaxed text-lg">Gunakan bahan promosi yang sudah kami sediakan untuk meningkatkan konversi hingga 3x lipat. Fokuslah pada copywriting yang menggugah rasa penasaran.</p>
                   <div className="pt-4 flex gap-3">
                      <div className="px-6 py-2 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest">Affiliate Secret Tip</div>
                   </div>
                </div>
             </div>
          </div>
        )}


        {activeTab === 'leaderboard' && (
          /* Affiliate Leaderboard */
          <div id="affiliate-leaderboard" className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">

           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-amber-50 rounded-2xl text-amber-500">
                    <Star size={24} className="fill-amber-500" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black tracking-tight">Leaderboard Afiliasi</h3>
                    <p className="text-sm text-gray-500 font-medium">Top 10 Pejuang Cuan di DigiSell.</p>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leaderboard.map((aff, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={aff.id} 
                  className={`p-6 rounded-3xl border transition-all flex items-center gap-4 ${
                    idx === 0 ? 'bg-indigo-600 text-white border-indigo-700 shadow-xl shadow-indigo-100 scale-105' : 
                    idx === 1 ? 'bg-gray-900 text-white border-gray-800' : 
                    idx === 2 ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-50'
                  }`}
                >
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                     idx === 0 ? 'bg-white/20 text-white' : 
                     idx === 1 ? 'bg-white/10 text-white' :
                     idx === 2 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                   }`}>
                      {idx + 1}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className={`font-bold truncate ${idx < 2 ? 'text-white' : 'text-gray-900'}`}>{aff.name} {aff.id === user.id && <span className="ml-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-full">(Anda)</span>}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${idx < 2 ? 'text-indigo-200' : 'text-indigo-400'}`}>
                        {aff.totalSales} Penjualan
                      </p>
                   </div>
                   <div className="text-right">
                      <p className={`font-black ${idx < 2 ? 'text-white' : 'text-indigo-600'}`}>Rp {(aff.commission / 1000).toFixed(0)}rb</p>
                      <p className={`text-[8px] font-bold uppercase tracking-widest ${idx < 2 ? 'text-white/40' : 'text-gray-400'}`}>Komisi</p>
                   </div>
                </motion.div>
              ))}
              {leaderboard.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-3xl font-medium">
                  Belum ada data kompetisi.
                </div>
              )}
           </div>
        </div>
        )}

       <div id="referral-link" className="relative bg-gradient-to-br from-[#1F6F5F] via-[#2FA084] to-[#6FCF97] p-8 md:p-12 rounded-[2.5rem] text-white space-y-6 shadow-2xl shadow-[#2FA084]/30 overflow-hidden">
           {/* Background Decorations */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
           <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
           
           <div className="relative z-10 space-y-6">
             <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <Zap size={24} className="text-white" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black">Link Referal Aktif</h3>
                </div>
                <p className="text-white/80 text-base md:text-lg font-medium">Gunakan link ini untuk promosi. Cookies ditanam selama 30 hari untuk tracking komisi Anda.</p>
             </div>
             <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl flex flex-col sm:flex-row gap-3 border border-white/20">
                <input 
                  readOnly 
                  value={data.referralLink} 
                  className="flex-1 bg-transparent px-4 py-3 font-mono text-sm md:text-base border-none focus:ring-0 text-white placeholder-white/50" 
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(data.referralLink);
                    alert('Link disalin!');
                  }} 
                  className="bg-white text-[#1F6F5F] px-6 md:px-8 py-3 rounded-xl font-black hover:bg-[#6FCF97] transition-all shadow-lg flex items-center justify-center gap-2 group"
                >
                  <span>Salin Link</span>
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
             </div>
             <div className="flex flex-wrap gap-3">
               <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-sm font-bold border border-white/20">
                 ✨ Auto-tracking
               </div>
               <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-sm font-bold border border-white/20">
                 🍪 30 Hari Cookie
               </div>
               <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-sm font-bold border border-white/20">
                 💰 Komisi Otomatis
               </div>
             </div>
           </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Selling Products */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
             <div className="flex items-center gap-3">
                <TrendingUp className="text-indigo-600" size={24} />
                <h3 className="text-xl font-bold">Produk Terlaris Anda</h3>
             </div>
             <div className="space-y-4">
                {topProducts.map((prod, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 transition-colors">
                     <div className="space-y-1">
                        <p className="font-bold text-gray-900">{prod.name}</p>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">{prod.sales} Penjualan Berhasil</p>
                     </div>
                     <div className="text-right">
                        <p className="text-indigo-600 font-extrabold">Rp {prod.totalCommission.toLocaleString('id-ID')}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-right">Total Komisi</p>
                     </div>
                  </div>
                ))}
                {topProducts.length === 0 && (
                  <div className="py-12 text-center text-gray-400">Belum ada data produk terlaris.</div>
                 )}
              </div>
           </div>

           {/* Sales Distribution Summary */}
           <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-10 rounded-[2.5rem] text-white space-y-8 flex flex-col justify-center shadow-xl shadow-indigo-100">
              <div className="space-y-2">
                 <h3 className="text-3xl font-bold">Ringkasan Performa</h3>
                 <p className="text-indigo-100 opacity-80 text-lg">Statistik performa Anda dalam seminggu terakhir.</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">Avg. Comm per Sale</p>
                    <p className="text-2xl font-bold">
                      Rp {sales.length > 0 ? (sales.reduce((acc, s) => acc + (s.commission || 0), 0) / sales.length).toLocaleString('id-ID') : '0'}
                    </p>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">Konversi Klik</p>
                    <p className="text-2xl font-bold">
                      {data.totalClicks > 0 ? ((sales.length / data.totalClicks) * 100).toFixed(1) : '0'}%
                    </p>
                 </div>
              </div>
           </div>
        </div>

       {/* Sales History Section */}
       <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-6 md:p-8 border-b border-gray-100 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-lg md:text-xl font-bold">Riwayat Penjualan Referal</h3>
              <span className="text-xs font-medium text-gray-400">{filteredSales.length} Transaksi Sesuai Filter</span>
            </div>

            <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100">
               <div className="space-y-1.5 flex-1 min-w-[140px]">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Periode Waktu</p>
                  <select 
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="w-full bg-white border-gray-200 rounded-xl text-xs md:text-sm font-medium focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">Semua Waktu</option>
                    <option value="7days">7 Hari Terakhir</option>
                    <option value="month">Bulan Ini</option>
                    <option value="custom">Rentang Custom</option>
                  </select>
               </div>

               {dateFilter === 'custom' && (
                 <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto animate-in fade-in slide-in-from-left-2 duration-300">
                   <div className="space-y-1.5 w-full sm:w-auto">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Mulai</p>
                     <input 
                       type="date" 
                       value={customRange.start}
                       onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                       className="w-full sm:w-auto bg-white border-gray-200 rounded-xl text-xs md:text-sm font-medium"
                     />
                   </div>
                   <div className="space-y-1.5 w-full sm:w-auto">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Sampai</p>
                     <input 
                       type="date" 
                       value={customRange.end}
                       onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                       className="w-full sm:w-auto bg-white border-gray-200 rounded-xl text-xs md:text-sm font-medium"
                     />
                   </div>
                 </div>
               )}

               <div className="space-y-1.5 flex-1 min-w-[180px]">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Filter Produk</p>
                  <select 
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="w-full bg-white border-gray-200 rounded-xl text-xs md:text-sm font-medium focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">Semua Produk</option>
                    {uniqueProducts.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
               </div>

               <div className="hidden lg:block lg:flex-1" />
               
               {(dateFilter !== 'all' || productFilter !== 'all') && (
                 <button 
                   onClick={() => {
                     setDateFilter('all');
                     setProductFilter('all');
                     setCustomRange({ start: '', end: '' });
                   }}
                   className="text-indigo-600 text-xs md:text-sm font-bold hover:underline w-full sm:w-auto text-center md:text-left"
                 >
                   Reset Filter
                 </button>
               )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-8 py-4">Tanggal</th>
                  <th className="px-8 py-4">Produk</th>
                  <th className="px-8 py-4">Buyer</th>
                  <th className="px-8 py-4">Komisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-8 py-4 text-sm text-gray-500">
                      {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-8 py-4 font-bold text-gray-900">{sale.productName || 'Produk Digital'}</td>
                    <td className="px-8 py-4 text-sm text-gray-500 lowercase">{sale.buyerEmail?.split('@')[0]}***</td>
                    <td className="px-8 py-4 text-indigo-600 font-bold">
                      Rp {(sale.commission || 0).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
                {filteredSales.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-gray-400">
                      Tidak ada data penjualan yang sesuai dengan filter Anda.
                    </td>
                  </tr>
                )}
                {loading && (
                   <tr>
                    <td colSpan={4} className="px-8 py-12 text-center">
                      <Zap className="animate-spin inline-block text-indigo-600" size={24} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
       </div>
    </div>
  );
}

function PricingView() {
  const plans = [
    {
      name: "Starter (Gratis)",
      price: "Rp 0",
      desc: "Cocok untuk pemula yang ingin mencoba sistem afiliasi.",
      features: ["Komisi 5%", "Dashboard Dasar", "1 Link Referal", "Materi Dasar LMS"],
      btn: "Mulai Gratis",
      popular: false
    },
    {
      name: "Business (Gold)",
      price: "Rp 249rb",
      desc: "Paket paling populer untuk afiliasi serius.",
      features: ["Komisi 15%", "Dashboard Pro", "Unlimited Link", "Akses Full LMS", "Marketing Kit", "Email Support"],
      btn: "Pilih Business",
      popular: true
    },
    {
      name: "Enterprise (Diamond)",
      price: "Rp 999rb",
      desc: "Untuk agensi dan marketer profesional.",
      features: ["Komisi 30%", "Custom Branding", "Multi-user Admin", "API Access", "Prioritas Support", "Webinar Eksklusif"],
      btn: "Hubungi Sales",
      popular: false
    }
  ];

  const comparison = [
    { feature: "Persentase Komisi", starter: "5%", business: "15%", enterprise: "30%" },
    { feature: "Manajemen Produk", starter: "Tersedia", business: "Tersedia", enterprise: "Tersedia" },
    { feature: "Marketing Kit", starter: false, business: "Tersedia", enterprise: "Tersedia" },
    { feature: "Custom Domain", starter: false, business: false, enterprise: "Tersedia" },
    { feature: "Materi LMS", starter: "Dasar", business: "Lengkap", enterprise: "Lengkap" },
    { feature: "Support", starter: "Community", business: "Email", enterprise: "Prioritas 24/7" },
  ];

  return (
    <div className="py-12 md:py-20 space-y-16 md:space-y-24 px-4 md:px-0">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">Pilih Paket yang Sesuai</h2>
        <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg">Investasikan masa depan digital Anda dengan paket yang tepat.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, i) => (
          <div key={i} className={`relative p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border ${plan.popular ? 'border-[#2FA084] dark:border-[#6FCF97] border-2 shadow-2xl shadow-[#2FA084]/30 md:scale-105 z-10 bg-white dark:bg-gray-800' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm'} space-y-8 flex flex-col`}>
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Paling Populer</div>
            )}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">{plan.price}</span>
                <span className="text-gray-400 dark:text-gray-500 text-xs md:text-sm font-medium">/bln</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">{plan.desc}</p>
            </div>
            <div className="space-y-4 flex-1">
              {plan.features.map((f, j) => (
                <div key={j} className="flex gap-3 items-center text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                  <div className="w-5 h-5 bg-gradient-to-br from-[#6FCF97]/30 to-[#2FA084]/30 rounded-full flex items-center justify-center text-[#1F6F5F] dark:text-[#6FCF97] flex-shrink-0 border border-[#2FA084]/30">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  {f}
                </div>
              ))}
            </div>
            <button className={`w-full py-4 rounded-xl md:rounded-2xl font-bold transition-all ${plan.popular ? 'bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white hover:from-[#2FA084] hover:to-[#6FCF97] hover:shadow-lg hover:shadow-[#2FA084]/30' : 'bg-gray-900 dark:bg-gray-700 text-white hover:bg-gray-800 dark:hover:bg-gray-600'}`}>
              {plan.btn}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm max-w-4xl mx-auto">
        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <h3 className="text-xl md:text-2xl font-bold text-center text-gray-900 dark:text-white">Perbandingan Detail</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gradient-to-r from-[#6FCF97]/10 to-[#2FA084]/10 dark:from-[#1F6F5F]/20 dark:to-[#2FA084]/20 text-[#1F6F5F] dark:text-[#6FCF97] text-[10px] md:text-xs font-bold uppercase tracking-widest">
                <th className="px-6 md:px-8 py-5 md:py-6">Fitur Utama</th>
                <th className="px-6 md:px-8 py-5 md:py-6 text-center">Starter</th>
                <th className="px-6 md:px-8 py-5 md:py-6 text-center">Business</th>
                <th className="px-6 md:px-8 py-5 md:py-6 text-center">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {comparison.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 md:px-8 py-4 md:py-5 font-bold text-gray-900 dark:text-white text-xs md:text-sm">{row.feature}</td>
                  <td className="px-6 md:px-8 py-4 md:py-5 text-center text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                    {typeof row.starter === 'string' ? row.starter : (row.starter ? <Check className="mx-auto text-green-500" size={16} /> : <X className="mx-auto text-red-300" size={16} />)}
                  </td>
                  <td className="px-6 md:px-8 py-4 md:py-5 text-center text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                    {typeof row.business === 'string' ? row.business : (row.business ? <Check className="mx-auto text-green-500" size={16} /> : <X className="mx-auto text-red-300" size={16} />)}
                  </td>
                  <td className="px-6 md:px-8 py-4 md:py-5 text-center text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                    {typeof row.enterprise === 'string' ? row.enterprise : (row.enterprise ? <Check className="mx-auto text-green-500" size={16} /> : <X className="mx-auto text-red-300" size={16} />)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FeaturesView() {
  return (
     <div className="py-12 md:py-20 space-y-16 md:space-y-32">
        <div className="text-center max-w-3xl mx-auto space-y-4 md:space-y-6 px-4">
           <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">Semua yang Anda Butuhkan <br className="hidden md:block" /> dalam Satu Platform</h2>
           <p className="text-base md:text-xl text-gray-500 dark:text-gray-400">Mulai dari manajemen produk hingga sistem pembelajaran mandiri (LMS) yang terintegrasi.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center px-4 md:px-0">
           <div className="space-y-8 md:space-y-12">
              <FeatureItem 
                icon={<BookOpen size={28} className="md:w-8 md:h-8" />} 
                title="Sistem LMS Terpadu" 
                desc="Akses materi pembelajaran dengan tampilan yang rapi dan terorganisir per modul." 
              />
              <FeatureItem 
                icon={<BarChart3 size={28} className="md:w-8 md:h-8" />} 
                title="Laporan Real-time" 
                desc="Pantau statistik penjualan dan klik afiliasi Anda secara instan di dashboard." 
              />
              <FeatureItem 
                icon={<Users size={28} className="md:w-8 md:h-8" />} 
                title="Manajemen Afiliasi" 
                desc="Program referal yang transparan dengan perhitungan komisi otomatis." 
              />
           </div>
           <div className="bg-gray-100 dark:bg-gray-800 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 border border-gray-200 dark:border-gray-700">
              <img src="https://picsum.photos/seed/features/800/600" className="rounded-xl md:rounded-2xl shadow-lg w-full" referrerPolicy="no-referrer" />
           </div>
        </div>
     </div>
  );
}

function FeatureItem({ icon, title, desc }: any) {
  return (
    <div className="flex gap-4 md:gap-6 items-start group">
       <div className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl md:rounded-2xl flex items-center justify-center text-[#1F6F5F] dark:text-[#6FCF97] shadow-sm group-hover:scale-110 transition-transform">
          {icon}
       </div>
       <div className="space-y-1">
          <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{title}</h4>
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base leading-relaxed">{desc}</p>
       </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="p-8 md:p-10 bg-white dark:bg-gray-800 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 dark:border-gray-700 space-y-4 md:space-y-6 hover:shadow-xl transition-all h-full group">
      <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-[#6FCF97]/20 to-[#2FA084]/20 dark:from-[#1F6F5F]/20 dark:to-[#2FA084]/20 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-[#2FA084]/30">
        {React.cloneElement(icon as any, { size: 24, className: 'md:w-8 md:h-8' })}
      </div>
      <h4 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{title}</h4>
      <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base leading-relaxed">{desc}</p>
    </div>
  );
}

function StatsCard({ title, value, icon, trend }: any) {
  return (
    <div className="relative bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-lg hover:shadow-xl transition-all group overflow-hidden">
      {/* Background Gradient Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#6FCF97]/30 to-[#2FA084]/30 rounded-full -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="relative z-10 space-y-4">
        <div className="flex justify-between items-start">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#1F6F5F] to-[#2FA084] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#2FA084]/30 group-hover:scale-110 transition-transform">
            {React.cloneElement(icon as any, { size: 24, className: 'md:w-[28px] md:h-[28px]' })}
          </div>
          <div className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-600 rounded-xl text-xs font-black border border-green-100">
            {trend}
          </div>
        </div>
        <div>
          <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2">{title}</p>
          <h3 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">{value}</h3>
        </div>
      </div>
    </div>
  );
}

function StarRating({ rating, size = 16, interactive = false, onSelect }: { rating: number, size?: number, interactive?: boolean, onSelect?: (r: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type="button"
          key={star}
          disabled={!interactive}
          onClick={() => onSelect?.(star)}
          className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
        >
          <Star 
            size={size} 
            className={(star <= rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} 
          />
        </button>
      ))}
    </div>
  );
}

function ReviewSection({ productId, hasPurchased, fetchProducts }: { productId: string, hasPurchased: boolean, fetchProducts: () => void }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadReviews = async () => {
    try {
      const resp = await fetch(`/api/products/${productId}/reviews`);
      if (resp.ok) {
        setReviews(await resp.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [productId]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">Ulasan Pembeli</h3>
          <p className="text-sm text-gray-500 font-medium">Apa kata mereka tentang produk ini?</p>
        </div>
        {hasPurchased && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-all shadow-sm"
          >
            <MessageSquare size={18} className="text-[#1F6F5F] dark:text-[#6FCF97]" /> Tulis Ulasan
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Zap className="animate-spin text-[#2FA084]" size={32} />
        </div>
      ) : reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map(review => (
            <div key={review.id} className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#6FCF97]/30 to-[#2FA084]/30 rounded-full flex items-center justify-center text-[#1F6F5F] dark:text-[#6FCF97] font-bold uppercase border border-[#2FA084]/30">
                    {review.userName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{review.userName}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{new Date(review.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
                <StarRating rating={review.rating} size={14} />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed italic">"{review.comment}"</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white/50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-gray-400 font-medium">Belum ada ulasan untuk produk ini.</p>
        </div>
      )}

      {/* Write Review Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsModalOpen(false)}
               className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
             />
             <motion.div
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-[2.5rem] p-10 shadow-2xl space-y-8"
             >
                <div className="text-center space-y-2">
                   <h3 className="text-2xl font-black text-gray-900 dark:text-white">Berikan Rating</h3>
                   <p className="text-sm text-gray-500 dark:text-gray-400">Bantu pembeli lain dengan ulasan jujur Anda.</p>
                </div>
                
                <ReviewForm 
                  productId={productId} 
                  onSuccess={() => {
                    setIsModalOpen(false);
                    loadReviews();
                    fetchProducts();
                  }}
                />
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReviewForm({ productId, onSuccess }: { productId: string, onSuccess: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.length < 3) {
      alert('Komentar terlalu pendek (min 3 karakter)');
      return;
    }

    setLoading(true);
    try {
      const { getAuthHeaders } = useStore.getState();
      const resp = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ rating, comment })
      });

      if (resp.ok) {
        onSuccess();
      } else {
        const err = await resp.json();
        alert(err.error || 'Gagal mengirim ulasan');
      }
    } catch (err) {
      alert('Gagal menghubungi server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
       <div className="flex flex-col items-center gap-4">
          <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Rating Anda</label>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl">
             <StarRating rating={rating} size={32} interactive onSelect={setRating} />
          </div>
          <span className="text-lg font-black text-[#1F6F5F] dark:text-[#6FCF97]">{rating === 5 ? 'Luar Biasa!' : rating === 4 ? 'Bagus Sekali' : rating === 3 ? 'Cukup Baik' : rating === 2 ? 'Kurang Memuaskan' : 'Sangat Buruk'}</span>
       </div>

       <div className="space-y-1">
          <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Ulasan</label>
          <textarea 
            required
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-2xl outline-none focus:ring-2 focus:ring-[#2FA084] dark:focus:ring-[#6FCF97] min-h-[120px] text-sm text-gray-900 dark:text-white"
            placeholder="Tuliskan pengalaman Anda menggunakan produk ini..."
          />
       </div>

       <button 
         type="submit"
         disabled={loading}
         className="w-full py-4 bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white rounded-2xl font-black hover:from-[#2FA084] hover:to-[#6FCF97] hover:shadow-xl hover:shadow-[#2FA084]/30 transition-all flex items-center justify-center gap-2"
       >
         {loading ? <Zap className="animate-spin" size={20} /> : 'Kirim Ulasan Sekarang'}
       </button>
    </form>
  );
}

function WhatsAppSupport() {
  return (
    <div className="fixed bottom-8 right-8 z-[50]">
      <motion.a 
        href="https://wa.me/6281234567890?text=Halo%20Admin%20DigiSell,%20saya%20butuh%20bantuan%20terkait%20pesanan%20saya"
        target="_blank"
        rel="noreferrer"
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        className="w-16 h-16 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-200 border-4 border-white"
      >
        <MessageSquare size={32} />
      </motion.a>
    </div>
  );
}

function AboutView() {
  return (
    <div className="py-12 md:py-20 space-y-16 md:space-y-24 px-4 md:px-0">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto space-y-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="inline-block bg-gradient-to-r from-[#6FCF97]/20 to-[#2FA084]/20 text-[#1F6F5F] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-2 border border-[#2FA084]/30"
        >
          Tentang Kami
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] bg-clip-text text-transparent leading-[1.1]">
          Platform Digital Terpercaya untuk Masa Depan Anda
        </h1>
        <p className="text-gray-600 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
          DigiSell adalah marketplace produk digital dan sistem afiliasi yang membantu ribuan orang menghasilkan pendapatan pasif melalui ekosistem digital yang terintegrasi.
        </p>
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-[#1F6F5F] to-[#2FA084] p-10 md:p-12 rounded-[2.5rem] text-white space-y-6 shadow-2xl shadow-[#2FA084]/30"
        >
          <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center">
            <Zap size={32} className="text-white" />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl md:text-3xl font-black">Misi Kami</h3>
            <p className="text-white/90 leading-relaxed">
              Memberdayakan setiap individu untuk mencapai kebebasan finansial melalui produk digital berkualitas dan sistem afiliasi yang transparan dan menguntungkan.
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="bg-white border-2 border-[#2FA084]/30 p-10 md:p-12 rounded-[2.5rem] space-y-6 shadow-lg hover:shadow-2xl transition-all"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-[#6FCF97]/30 to-[#2FA084]/30 rounded-2xl flex items-center justify-center border border-[#2FA084]/50">
            <TrendingUp size={32} className="text-[#1F6F5F]" />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] bg-clip-text text-transparent">Visi Kami</h3>
            <p className="text-gray-600 leading-relaxed">
              Menjadi platform digital nomor satu di Indonesia yang menghubungkan kreator, afiliator, dan konsumen dalam ekosistem yang saling menguntungkan.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-br from-[#1F6F5F] via-[#2FA084] to-[#6FCF97] rounded-[3rem] p-12 md:p-16 text-white shadow-2xl shadow-[#2FA084]/30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          <div className="text-center space-y-2">
            <h4 className="text-4xl md:text-5xl font-black">5K+</h4>
            <p className="text-white/80 text-sm font-medium">Pengguna Aktif</p>
          </div>
          <div className="text-center space-y-2">
            <h4 className="text-4xl md:text-5xl font-black">200+</h4>
            <p className="text-white/80 text-sm font-medium">Produk Digital</p>
          </div>
          <div className="text-center space-y-2">
            <h4 className="text-4xl md:text-5xl font-black">15M+</h4>
            <p className="text-white/80 text-sm font-medium">Total Transaksi</p>
          </div>
          <div className="text-center space-y-2">
            <h4 className="text-4xl md:text-5xl font-black">98%</h4>
            <p className="text-white/80 text-sm font-medium">Kepuasan Pelanggan</p>
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] bg-clip-text text-transparent">
            Mengapa Memilih DigiSell?
          </h2>
          <p className="text-gray-500 text-lg">Platform terlengkap dengan fitur-fitur unggulan untuk kesuksesan Anda</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white p-8 rounded-[2rem] border border-[#2FA084]/20 shadow-sm hover:shadow-xl transition-all space-y-4 group"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-[#6FCF97]/30 to-[#2FA084]/30 rounded-2xl flex items-center justify-center border border-[#2FA084]/50 group-hover:scale-110 transition-transform">
              <ShieldCheck size={28} className="text-[#1F6F5F]" />
            </div>
            <h4 className="text-xl font-black text-gray-900">Keamanan Terjamin</h4>
            <p className="text-gray-600 text-sm leading-relaxed">
              Sistem enkripsi tingkat tinggi dan payment gateway terpercaya untuk melindungi setiap transaksi Anda.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-[2rem] border border-[#2FA084]/20 shadow-sm hover:shadow-xl transition-all space-y-4 group"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-[#6FCF97]/30 to-[#2FA084]/30 rounded-2xl flex items-center justify-center border border-[#2FA084]/50 group-hover:scale-110 transition-transform">
              <BarChart3 size={28} className="text-[#1F6F5F]" />
            </div>
            <h4 className="text-xl font-black text-gray-900">Dashboard Lengkap</h4>
            <p className="text-gray-600 text-sm leading-relaxed">
              Pantau performa afiliasi Anda dengan dashboard analytics yang real-time dan mudah dipahami.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-[2rem] border border-[#2FA084]/20 shadow-sm hover:shadow-xl transition-all space-y-4 group"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-[#6FCF97]/30 to-[#2FA084]/30 rounded-2xl flex items-center justify-center border border-[#2FA084]/50 group-hover:scale-110 transition-transform">
              <Users size={28} className="text-[#1F6F5F]" />
            </div>
            <h4 className="text-xl font-black text-gray-900">Komunitas Solid</h4>
            <p className="text-gray-600 text-sm leading-relaxed">
              Bergabung dengan ribuan afiliator sukses dan dapatkan tips serta strategi marketing terbaik.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Team Section */}
      <div className="space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] bg-clip-text text-transparent">
            Tim Kami
          </h2>
          <p className="text-gray-500 text-lg">Didukung oleh profesional berpengalaman di bidang digital marketing dan teknologi</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { name: 'Budi Santoso', role: 'CEO & Founder', image: 'https://picsum.photos/seed/ceo/400/400' },
            { name: 'Siti Nurhaliza', role: 'Head of Marketing', image: 'https://picsum.photos/seed/cmo/400/400' },
            { name: 'Ahmad Rizki', role: 'CTO', image: 'https://picsum.photos/seed/cto/400/400' }
          ].map((member, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-[2rem] overflow-hidden border border-[#2FA084]/20 shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={member.image} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  referrerPolicy="no-referrer"
                  alt={member.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F6F5F]/80 to-transparent"></div>
              </div>
              <div className="p-6 text-center space-y-1">
                <h4 className="text-xl font-black text-gray-900">{member.name}</h4>
                <p className="text-sm font-bold text-[#2FA084]">{member.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-gradient-to-br from-[#1F6F5F] via-[#2FA084] to-[#6FCF97] rounded-[3rem] p-12 md:p-16 text-center text-white space-y-8 shadow-2xl shadow-[#2FA084]/30"
      >
        <h2 className="text-3xl md:text-5xl font-black tracking-tight">Siap Memulai Perjalanan Anda?</h2>
        <p className="text-white/90 text-lg max-w-2xl mx-auto">
          Bergabunglah dengan ribuan afiliator sukses dan mulai hasilkan komisi dari produk digital berkualitas tinggi.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={() => window.location.href = '/#register'}
            className="px-10 py-5 bg-white text-[#1F6F5F] rounded-2xl font-black text-lg hover:bg-gray-50 transition-all shadow-xl"
          >
            Daftar Sekarang
          </button>
          <button 
            onClick={() => window.location.href = '/#products'}
            className="px-10 py-5 bg-white/10 backdrop-blur-xl border-2 border-white/30 text-white rounded-2xl font-black text-lg hover:bg-white/20 transition-all"
          >
            Lihat Produk
          </button>
        </div>
      </motion.div>
    </div>
  );
}

