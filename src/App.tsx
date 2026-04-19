/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Joyride, Step } from 'react-joyride';
import { auth, db } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, orderBy, getDocs, where, addDoc, updateDoc } from 'firebase/firestore';
import { Product, AffiliateStats, User, Sale, Coupon } from './types';
import Navbar from './components/Navbar';
import { LoginForm, RegisterForm } from './components/AuthForms';
import AdminDashboard from './components/AdminDashboard';
import { useStore } from './store/useStore';

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
    fetchGlobalConfig
  } = useStore();

  const [runTour, setRunTour] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<{ isOpen: boolean, product: Product | null }>({ isOpen: false, product: null });
  const [couponCode, setCouponCode] = useState('');
  const [isBuying, setIsBuying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const applyCoupon = async () => {
    if (!couponCode) return;
    try {
      const q = query(collection(db, 'coupons'), where('code', '==', couponCode.toUpperCase()), where('isActive', '==', true));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert('Kupon tidak valid atau sudah tidak aktif.');
        return;
      }
      const couponData = { id: snap.docs[0].id, ...snap.docs[0].data() } as any as Coupon;
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
  }, []);

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
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setActiveTab('home');
  };

  const handlePurchase = async () => {
    if (!user || !purchaseModal.product) return;
    
    setIsBuying(true);
    const product = purchaseModal.product;
    const finalPrice = calculateTotal(product.price);
    const referralCode = localStorage.getItem('affiliate_ref');
    const { getAuthHeaders } = useStore.getState();

    try {
      const response = await fetch('/api/purchase', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          productId: product.id,
          buyerId: user.id,
          buyerEmail: user.email,
          referralCode: referralCode,
          couponId: appliedCoupon?.id || null,
          amount: finalPrice
        })
      });

      const resData = await response.json();
      if (resData.success) {
        // Increment coupon usage if used
        if (appliedCoupon) {
          await updateDoc(doc(db, 'coupons', appliedCoupon.id), {
            usageCount: (appliedCoupon.usageCount || 0) + 1
          });
        }
        alert('Pembelian berhasil! Akses produk telah dibuka di dashboard Anda.');
        setPurchaseModal({ isOpen: false, product: null });
        setAppliedCoupon(null);
        setCouponCode('');
        // Refresh products and user data to reflect new purchase
        const docSnap = await getDoc(doc(db, 'users', user.id));
        if (docSnap.exists()) setUser(docSnap.data() as User);
        if (activeTab === 'affiliate') window.location.reload();
      } else {
        alert('Gagal membeli: ' + resData.error);
      }
    } catch (err: any) {
      alert('Error transaksi: ' + err.message);
    } finally {
      setIsBuying(false);
    }
  };

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
    if (user && !user.emailVerified && ['affiliate', 'admin'].includes(activeTab)) {
      return <VerificationRequired />;
    }

    switch (activeTab) {
      case 'home':
        return <LandingPage onStart={() => setActiveTab('products')} onViewPricing={() => setActiveTab('pricing')} />;
      case 'products':
        return <ProductCatalog products={products} onPurchase={(p) => setPurchaseModal({ isOpen: true, product: p })} user={user} onToggleWishlist={updateWishlist} getDiscountedPrice={getDiscountedPrice} />;
      case 'wishlist':
        return user ? <WishlistView products={products} user={user} onPurchase={(p) => setPurchaseModal({ isOpen: true, product: p })} onToggleWishlist={updateWishlist} onNavigate={setActiveTab} getDiscountedPrice={getDiscountedPrice} /> : <AuthWrapper type="login" setTab={setActiveTab} />;
      case 'pricing':
        return <PricingView />;
      case 'affiliate':
        return user ? <AffiliateDashboard 
          user={user}
          data={{
            totalClicks: user.totalClicks || 0,
            totalSales: user.totalSales || 0,
            totalCommission: user.commissionEarned || 0,
            referralLink: `https://${window.location.host}/?ref=${user.referralCode}`
          }} 
          onLogout={handleLogout} 
        /> : <AuthWrapper type="login" setTab={setActiveTab} />;
      case 'admin':
        return user?.role === 'admin' ? <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-semibold text-red-500"><LogOut size={18}/> Keluar</button>
          </div>
          <AdminDashboard />
        </div> : <div className="text-center py-20">Akses Ditolak</div>;
      case 'profile':
        return user ? <UserProfile /> : <AuthWrapper type="login" setTab={setActiveTab} />;
      case 'login':
        return <AuthWrapper type="login" setTab={setActiveTab} />;
      case 'register':
        return <AuthWrapper type="register" setTab={setActiveTab} />;
      case 'features':
        return <FeaturesView />;
      default:
        return <LandingPage onStart={() => setActiveTab('products')} onViewPricing={() => setActiveTab('pricing')} />;
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Zap className="animate-pulse text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans text-gray-900">
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
      <Navbar user={user} onNavigate={setActiveTab} activeTab={activeTab} />

      <AnimatePresence>
        {purchaseModal.isOpen && purchaseModal.product && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 space-y-8 relative shadow-2xl"
            >
               <button onClick={() => { setPurchaseModal({ isOpen: false, product: null }); setAppliedCoupon(null); setCouponCode(''); }} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 transition-colors">
                 <X size={24} />
               </button>
               
               <div className="space-y-2">
                 <h3 className="text-3xl font-black tracking-tight">Checkout</h3>
                 <p className="text-gray-500 font-medium">Selesaikan transaksi untuk mengakses produk ini.</p>
               </div>

               <div className="flex gap-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <img src={purchaseModal.product.image} className="w-20 h-20 rounded-2xl object-cover shadow-sm" referrerPolicy="no-referrer" />
                  <div className="flex-1 space-y-1">
                    <p className="font-black text-gray-900 line-clamp-1">{purchaseModal.product.name}</p>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{purchaseModal.product.category}</p>
                    <p className="text-lg font-black text-indigo-600">Rp {purchaseModal.product.price.toLocaleString('id-ID')}</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex gap-2">
                    <input 
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Punya Kode Kupon?"
                      className="flex-1 px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                    />
                    <button 
                      onClick={applyCoupon}
                      className="px-6 py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all"
                    >Terapkan</button>
                  </div>
                  {appliedCoupon && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center bg-green-50 px-4 py-2 rounded-xl text-green-700 text-xs font-bold">
                       <div className="flex items-center gap-2">
                         <Ticket size={14} />
                         Kupon "{appliedCoupon.code}" Berhasil!
                       </div>
                       <span>-{appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}%` : `Rp ${appliedCoupon.discountValue.toLocaleString('id-ID')}`}</span>
                    </motion.div>
                  )}
               </div>

               <div className="pt-6 border-t border-gray-100 space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                    <span>Subtotal</span>
                    <span>Rp {purchaseModal.product.price.toLocaleString('id-ID')}</span>
                  </div>
                  {appliedCoupon && (
                     <div className="flex justify-between items-center text-sm font-bold text-green-600">
                        <span>Diskon Kupon</span>
                        <span>- Rp {(purchaseModal.product.price - calculateTotal(purchaseModal.product.price)).toLocaleString('id-ID')}</span>
                     </div>
                  )}
                  <div className="flex justify-between items-center text-xl font-black text-gray-900">
                    <span>Total Bayar</span>
                    <span className="text-indigo-600">Rp {calculateTotal(purchaseModal.product.price).toLocaleString('id-ID')}</span>
                  </div>
               </div>

               <button 
                 onClick={handlePurchase}
                 disabled={isBuying || !user?.emailVerified}
                 className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {user && !user.emailVerified && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-3xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">Email Belum Terverifikasi</p>
                <p className="text-xs text-amber-700">Silakan cek inbox Anda untuk mengaktifkan fitur penuh.</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('profile')}
              className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-colors"
            >
              Verifikasi Sekarang
            </button>
          </motion.div>
        )}
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
      
      <footer className="bg-white border-t border-gray-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">D</span>
              </div>
              <span className="font-bold text-xl tracking-tight">DigiSell</span>
          </div>
          <p className="text-gray-400 text-sm">© 2026 DigiAffiliate Store. Platform Modern Produk Digital.</p>
          <button 
            onClick={() => setRunTour(true)}
            className="mt-4 text-indigo-600 font-bold hover:underline flex items-center justify-center gap-2 mx-auto"
          >
            <BookOpen size={18} /> Panduan Platform
          </button>
        </div>
      </footer>
    </div>
  );
}

function LandingPage({ onStart, onViewPricing }: { onStart: () => void, onViewPricing: () => void }) {
  return (
    <div className="space-y-32">
       <div className="flex flex-col md:flex-row gap-12 items-center">
        <div className="flex-1 space-y-8 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
            <Star size={14} /> Solusi Digital Terbaik
          </div>
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tighter leading-[0.85] text-gray-900">
            Kembangkan <br/> Aset Digital <br/> <span className="text-indigo-600">Anda Sekarang.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-lg mx-auto md:mx-0">
            Akses ribuan produk digital berkualitas tinggi dan sistem afiliasi yang memberikan komisi hingga 50%.
          </p>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <button 
              onClick={onStart}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:shadow-xl hover:shadow-indigo-100 transition-all flex items-center gap-2"
            >
              Mulai Belanja <ArrowRight size={20} />
            </button>
            <button 
              onClick={onViewPricing}
              className="border-2 border-gray-200 px-8 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all"
            >
              Lihat Paket
            </button>
          </div>
        </div>
        <div className="flex-1 w-full max-w-xl">
           <div className="relative">
              <div className="absolute -inset-4 bg-indigo-500 opacity-10 blur-3xl rounded-full"></div>
              <img 
                src="https://picsum.photos/seed/dashboard/1200/800" 
                className="relative rounded-[2.5rem] shadow-2xl border border-white/50" 
                referrerPolicy="no-referrer"
              />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard 
          icon={<ShieldCheck className="text-indigo-600" />} 
          title="Keamanan Terjamin" 
          desc="Setiap transaksi diproses dengan enkripsi tingkat tinggi demi keamanan data Anda."
        />
        <FeatureCard 
          icon={<Zap className="text-indigo-600" />} 
          title="Instan Akses" 
          desc="Produk langsung tersedia di dashboard Anda segera setelah pembayaran dikonfirmasi."
        />
        <FeatureCard 
          icon={<CreditIcon className="text-indigo-600" />} 
          title="Pembayaran Mudah" 
          desc="Mendukung QRIS, Virtual Account, hingga E-Wallet untuk kemudahan transaksi."
        />
      </div>

      <div className="pt-20 border-t border-gray-100">
        <PricingView />
      </div>
    </div>
  );
}

function ProductCard({ product, onPurchase, user, onToggleWishlist, getDiscountedPrice }: { product: Product, onPurchase: (p: Product) => void, user: User | null, onToggleWishlist: (id: string) => void, getDiscountedPrice: (p: number) => number }) {
  const isWishlisted = user?.wishlist?.includes(product.id) || false;
  const finalPrice = getDiscountedPrice(product.price);
  const isDiscounted = finalPrice < product.price;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative h-full flex flex-col"
    >
      <div className="h-56 relative overflow-hidden">
          <img 
            src={product.image} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
            referrerPolicy="no-referrer" 
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
            className="absolute inset-0 bg-indigo-900/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 transition-opacity duration-300 opacity-0 group-hover:opacity-100 p-6 z-20"
          >
             <motion.button 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               className="w-full max-w-[160px] bg-white text-indigo-600 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-2xl hover:bg-indigo-50 transition-colors"
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

          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-xl px-4 py-1.5 rounded-full text-[10px] font-black text-indigo-600 z-10 shadow-sm uppercase tracking-wider">
            {product.category}
          </div>
      </div>
      
      <div className="p-8 flex flex-col flex-1 space-y-4">
         <div className="flex-1 space-y-3">
           <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{product.name}</h3>
           <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed">{product.description}</p>
         </div>
         
         <div className="pt-6 flex items-center justify-between border-t border-gray-100/50 mt-auto">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Harga Dasar</p>
              <p className="text-2xl font-black text-gray-900">
                <span className="text-xs font-medium mr-1 tracking-tight">Rp</span>
                {product.price.toLocaleString('id-ID')}
              </p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onPurchase(product)}
              className="bg-indigo-600 text-white px-7 py-3.5 rounded-2xl font-bold hover:shadow-lg hover:bg-indigo-700 transition-all text-sm shadow-indigo-100 border-b-4 border-indigo-800"
            >Beli Sekarang</motion.button>
         </div>
      </div>
    </motion.div>
  );
}

function ProductCatalog({ products, onPurchase, user, onToggleWishlist, getDiscountedPrice }: { products: Product[], onPurchase: (p: Product) => void, user: User | null, onToggleWishlist: (id: string) => void, getDiscountedPrice: (p: number) => number }) {
  return (
    <div className="space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="inline-block bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-2"
        >
          Katalog Produk
        </motion.div>
        <h2 className="text-5xl font-black tracking-tight text-gray-900 leading-[1.1]">Pilihan Produk Digital Terbaik</h2>
        <p className="text-gray-500 text-lg leading-relaxed">Pilih dari berbagai pilihan produk digital untuk meningkatkan produktivitas dan finansial Anda melalui ekosistem kami.</p>
      </div>

      <div id="product-catalog" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {products.map(product => (
          <ProductCard key={product.id} product={product} onPurchase={onPurchase} user={user} onToggleWishlist={onToggleWishlist} getDiscountedPrice={getDiscountedPrice} />
        ))}
      </div>
    </div>
  );
}

function WishlistView({ products, user, onPurchase, onToggleWishlist, onNavigate, getDiscountedPrice }: { products: Product[], user: User, onPurchase: (p: Product) => void, onToggleWishlist: (id: string) => void, onNavigate: (tab: any) => void, getDiscountedPrice: (p: number) => number }) {
  const wishlistedProducts = products.filter(p => user.wishlist?.includes(p.id));

  return (
    <div className="space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="inline-block bg-red-50 text-red-500 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-2"
        >
          Wishlist Anda
        </motion.div>
        <h2 className="text-5xl font-black tracking-tight text-gray-900 leading-[1.1]">Produk Impian Anda</h2>
        <p className="text-gray-500 text-lg leading-relaxed">Simpan produk yang Anda minati dan akses kembali kapan saja untuk mulai menghasilkan cuan.</p>
      </div>

      {wishlistedProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {wishlistedProducts.map(product => (
            <ProductCard key={product.id} product={product} onPurchase={onPurchase} user={user} onToggleWishlist={onToggleWishlist} getDiscountedPrice={getDiscountedPrice} />
          ))}
        </div>
      ) : (
        <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-gray-100 text-center space-y-6">
           <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <Heart size={48} />
           </div>
           <h3 className="text-2xl font-bold text-gray-900">Wah, Wishlist Masih Kosong</h3>
           <p className="text-gray-500 max-w-md mx-auto">Jelajahi katalog kami dan klik ikon hati pada produk yang Anda sukai untuk menyimpannya di sini.</p>
           <button 
             onClick={() => onNavigate('products')}
             className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:shadow-xl transition-all"
           >Jelajahi Katalog</button>
        </div>
      )}
    </div>
  );
}

function AuthWrapper({ type, setTab }: { type: 'login' | 'register', setTab: (t: any) => void }) {
  return (
    <div className="max-w-md mx-auto py-12 space-y-8 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
      <div className="text-center space-y-2">
         <h2 className="text-3xl font-extrabold">{type === 'login' ? 'Selamat Datang' : 'Buat Akun'}</h2>
         <p className="text-gray-500 text-sm">
           {type === 'login' ? 'Masuk untuk mengelola afiliasi Anda' : 'Bergabung sebagai afiliasi dan mulai hasilkan cuan'}
         </p>
      </div>
      {type === 'login' ? <LoginForm onSuccess={() => setTab('home')} /> : <RegisterForm onSuccess={() => setTab('home')} />}
      <div className="text-center">
         <button 
           onClick={() => setTab(type === 'login' ? 'register' : 'login')}
           className="text-sm font-medium text-gray-400 hover:text-indigo-600"
         >
           {type === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
         </button>
      </div>
    </div>
  );
}

function VerificationRequired() {
  const { resendVerificationEmail } = useStore();
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white max-w-md w-full p-10 rounded-[2.5rem] border border-gray-100 text-center space-y-6 shadow-sm"
      >
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto text-amber-500">
          <AlertTriangle size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Verifikasi Email Anda</h2>
          <p className="text-gray-500 font-medium">Anda perlu memverifikasi email untuk mengakses fitur dashboard ini.</p>
        </div>
        <div className="pt-4 space-y-3">
          <button 
            onClick={async () => {
              await resendVerificationEmail();
              setSent(true);
            }}
            disabled={sent}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {sent ? 'Email Terkirim!' : 'Kirim Ulang Verifikasi'}
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all underline decoration-gray-200"
          >
            Sudah Verifikasi? Muat Ulang
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function UserProfile() {
  const { user, updateUserProfile } = useStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isIndonesian, setIsIndonesian] = useState(user?.isIndonesian !== false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm"
      >
        <div className="bg-indigo-600 h-32 relative">
          <div className="absolute -bottom-10 left-10 w-20 h-20 bg-white rounded-3xl p-1 shadow-lg">
            <div className="w-full h-full bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 text-3xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
        <div className="pt-16 pb-10 px-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
              <p className="text-gray-500 font-medium uppercase tracking-widest text-xs mt-1">{user.role}</p>
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-all"
              >
                Edit Profil
              </button>
            )}
          </div>

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
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
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
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  Batal
                </button>
              </div>
            )}
          </form>

          {!isEditing && (
            <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ID Pengguna</p>
                <p className="font-mono text-xs text-gray-500">{user.id}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Kode Referal</p>
                <p className="font-mono text-xs text-indigo-600 font-bold">{user.referralCode || '-'}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function AffiliateDashboard({ data, user, onLogout }: { data: AffiliateStats, user: User, onLogout: () => void }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount < 50000) {
      alert('Minimal penarikan adalah Rp 50.000');
      return;
    }
    if (withdrawAmount > (user.commissionEarned || 0)) {
      alert('Saldo komisi tidak mencukupi');
      return;
    }

    setIsWithdrawing(true);
    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        amount: withdrawAmount,
        status: 'pending',
        paymentMethod,
        paymentDetails,
        createdAt: new Date().toISOString()
      });
      alert('Permintaan pencairan berhasil dikirim. Mohon tunggu proses verifikasi admin.');
      setIsWithdrawModalOpen(false);
      setWithdrawAmount(0);
      setPaymentMethod('');
      setPaymentDetails('');
    } catch (err) {
      alert('Gagal mengirim permintaan');
    } finally {
      setIsWithdrawing(false);
    }
  };

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const q = query(
          collection(db, 'sales'),
          where('affiliateId', '==', user.id),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const salesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
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

      } catch (err) {
        console.error("Error fetching sales:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
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
    <div className="space-y-12">
       <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold tracking-tight">Afiliasi Dashboard</h2>
          <button onClick={onLogout} className="text-red-500 font-bold text-sm flex items-center gap-2"><LogOut size={18}/> Keluar</button>
       </div>

       <div id="affiliate-stats" className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="relative group">
              <StatsCard title="Total Komisi" value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(user.commissionEarned || 0)} icon={<BarChart3 />} trend="+15%" />
              <button 
                onClick={() => setIsWithdrawModalOpen(true)}
                className="absolute right-4 bottom-4 bg-indigo-600 text-white p-2 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
              >
                Cairkan Dana
              </button>
           </div>
           <StatsCard title="Total Penjualan" value={(user.totalSales || 0).toString()} icon={<ShoppingBag />} trend="+5" />
           <StatsCard title="Link Clicks" value={data.totalClicks.toString()} icon={<Users />} trend="+124" />
        </div>

        {/* Withdrawal Modal */}
        <AnimatePresence>
          {isWithdrawModalOpen && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden"
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

        <div id="commission-chart" className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
            <div>
              <h3 className="text-xl font-bold">Analitik Penjualan (30 Hari)</h3>
              <p className="text-gray-500 text-sm">Visualisasi performa penjualan per produk.</p>
            </div>
            <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-xl">
              <button onClick={() => setDateFilter('7days')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${dateFilter === '7days' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>7H</button>
              <button onClick={() => setDateFilter('month')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${dateFilter === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>30H</button>
              <button onClick={() => setDateFilter('all')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${dateFilter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Semua</button>
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

       <div id="referral-link" className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-10 rounded-[2.5rem] text-white space-y-6 shadow-2xl shadow-indigo-100">
           <div className="space-y-2">
              <h3 className="text-2xl font-bold">Link Referal Aktif</h3>
              <p className="text-indigo-100 opacity-80">Gunakan link ini untuk promosi. Cookies ditanam selama 30 hari.</p>
           </div>
           <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl flex gap-4">
              <input readOnly value={data.referralLink} className="flex-1 bg-transparent px-4 font-mono text-sm border-none focus:ring-0" />
              <button onClick={() => {
                navigator.clipboard.writeText(data.referralLink);
                alert('Link disalin!');
              }} className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all">Salin</button>
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
       <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-8 border-b border-gray-100 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Riwayat Penjualan Referal</h3>
              <span className="text-sm font-medium text-gray-400">{filteredSales.length} Transaksi Sesuai Filter</span>
            </div>

            <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-6 rounded-3xl border border-gray-100">
               <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Periode Waktu</p>
                  <select 
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="bg-white border-gray-200 rounded-xl text-sm font-medium focus:ring-indigo-500 focus:border-indigo-500 min-w-[150px]"
                  >
                    <option value="all">Semua Waktu</option>
                    <option value="7days">7 Hari Terakhir</option>
                    <option value="month">Bulan Ini</option>
                    <option value="custom">Rentang Custom</option>
                  </select>
               </div>

               {dateFilter === 'custom' && (
                 <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                   <div className="space-y-1.5">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Mulai</p>
                     <input 
                       type="date" 
                       value={customRange.start}
                       onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                       className="bg-white border-gray-200 rounded-xl text-sm font-medium"
                     />
                   </div>
                   <div className="space-y-1.5">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Sampai</p>
                     <input 
                       type="date" 
                       value={customRange.end}
                       onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                       className="bg-white border-gray-200 rounded-xl text-sm font-medium"
                     />
                   </div>
                 </div>
               )}

               <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Filter Produk</p>
                  <select 
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="bg-white border-gray-200 rounded-xl text-sm font-medium focus:ring-indigo-500 focus:border-indigo-500 min-w-[200px]"
                  >
                    <option value="all">Semua Produk</option>
                    {uniqueProducts.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
               </div>

               <div className="flex-1" />
               
               {(dateFilter !== 'all' || productFilter !== 'all') && (
                 <button 
                   onClick={() => {
                     setDateFilter('all');
                     setProductFilter('all');
                     setCustomRange({ start: '', end: '' });
                   }}
                   className="text-indigo-600 text-sm font-bold hover:underline"
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
    <div className="py-20 space-y-24">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h2 className="text-5xl font-extrabold tracking-tight">Pilih Paket yang Sesuai</h2>
        <p className="text-gray-500 text-lg">Investasikan masa depan digital Anda dengan paket yang tepat.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, i) => (
          <div key={i} className={`relative p-10 rounded-[2.5rem] border ${plan.popular ? 'border-indigo-600 border-2 shadow-2xl shadow-indigo-100 scale-105 z-10' : 'border-gray-100 bg-white shadow-sm'} space-y-8 flex flex-col`}>
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Paling Populer</div>
            )}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span className="text-gray-400 text-sm font-medium">/bln</span>
              </div>
              <p className="text-gray-500 text-sm">{plan.desc}</p>
            </div>
            <div className="space-y-4 flex-1">
              {plan.features.map((f, j) => (
                <div key={j} className="flex gap-3 items-center text-sm font-medium text-gray-700">
                  <div className="w-5 h-5 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  {f}
                </div>
              ))}
            </div>
            <button className={`w-full py-4 rounded-2xl font-bold transition-all ${plan.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-900 text-white hover:bg-black'}`}>
              {plan.btn}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm max-w-4xl mx-auto">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-2xl font-bold text-center">Perbandingan Detail</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-indigo-50/30 text-indigo-600 text-xs font-bold uppercase tracking-widest">
                <th className="px-8 py-6">Fitur Utama</th>
                <th className="px-8 py-6 text-center">Starter</th>
                <th className="px-8 py-6 text-center">Business</th>
                <th className="px-8 py-6 text-center">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {comparison.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5 font-bold text-gray-900">{row.feature}</td>
                  <td className="px-8 py-5 text-center text-sm font-medium">
                    {typeof row.starter === 'string' ? row.starter : (row.starter ? <Check className="mx-auto text-green-500" /> : <X className="mx-auto text-red-300" />)}
                  </td>
                  <td className="px-8 py-5 text-center text-sm font-medium">
                    {typeof row.business === 'string' ? row.business : (row.business ? <Check className="mx-auto text-green-500" /> : <X className="mx-auto text-red-300" />)}
                  </td>
                  <td className="px-8 py-5 text-center text-sm font-medium">
                    {typeof row.enterprise === 'string' ? row.enterprise : (row.enterprise ? <Check className="mx-auto text-green-500" /> : <X className="mx-auto text-red-300" />)}
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
     <div className="py-20 space-y-32">
        <div className="text-center max-w-3xl mx-auto space-y-6">
           <h2 className="text-5xl font-extrabold tracking-tight">Semua yang Anda Butuhkan <br/> dalam Satu Platform</h2>
           <p className="text-xl text-gray-500">Mulai dari manajemen produk hingga sistem pembelajaran mandiri (LMS) yang terintegrasi.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
           <div className="space-y-12">
              <FeatureItem 
                icon={<BookOpen size={32} />} 
                title="Sistem LMS Terpadu" 
                desc="Akses materi pembelajaran dengan tampilan yang rapi dan terorganisir per modul." 
              />
              <FeatureItem 
                icon={<BarChart3 size={32} />} 
                title="Laporan Real-time" 
                desc="Pantau statistik penjualan dan klik afiliasi Anda secara instan di dashboard." 
              />
              <FeatureItem 
                icon={<Users size={32} />} 
                title="Manajemen Afiliasi" 
                desc="Program referal yang transparan dengan perhitungan komisi otomatis." 
              />
           </div>
           <div className="bg-gray-100 rounded-[3rem] p-12">
              <img src="https://picsum.photos/seed/features/800/600" className="rounded-2xl shadow-lg" referrerPolicy="no-referrer" />
           </div>
        </div>
     </div>
  );
}

function FeatureItem({ icon, title, desc }: any) {
  return (
    <div className="flex gap-6 items-start group">
       <div className="w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
          {icon}
       </div>
       <div className="space-y-1">
          <h4 className="text-xl font-bold">{title}</h4>
          <p className="text-gray-500 leading-relaxed">{desc}</p>
       </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="p-10 bg-white rounded-[2.5rem] border border-gray-100 space-y-6 hover:shadow-xl transition-all h-full">
      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
        {icon}
      </div>
      <h4 className="text-2xl font-bold">{title}</h4>
      <p className="text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function StatsCard({ title, value, icon, trend }: any) {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
      <div className="flex justify-between items-start">
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
          {icon}
        </div>
        <div className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-bold">
          {trend}
        </div>
      </div>
      <div>
        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-extrabold">{value}</h3>
      </div>
    </div>
  );
}
