import React, { useState, useEffect, useMemo } from 'react';
import { Product, User, Coupon, WithdrawalRequest, ProductVariant, GlobalConfig, Sale, SwipeFile } from '../types';
import { Plus, Trash2, Edit3, Package, Users, Shield, UserCog, Ticket, Wallet, CheckCircle2, XCircle, Tag, Globe, Calendar, Zap, AlertCircle, ShoppingBag, Search, History, FileUp, BookOpen, Mail, BarChart3, Layers, AlertTriangle, TrendingUp, Share2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import Papa from 'papaparse';
import UserAccessManager from './UserAccessManager';
import { BlogManager } from './BlogManager';
import { MediaManager } from './MediaManager';
import { StaticPageManager } from './StaticPageManager';
import { EmailTemplateManager } from './EmailTemplateManager';
import { SiteSettingsDashboard } from './SiteSettingsDashboard';
import { BannerManager } from './BannerManager';
import { AffiliateApproval } from './AffiliateApproval';
import { DeeplinkBuilder } from './DeeplinkBuilder';
import { EpcMetrics } from './EpcMetrics';
import { DateRangePicker } from './DateRangePicker';
import { CommissionPdfReport } from './CommissionPdfReport';
import { NotificationCenter } from './NotificationCenter';
import { ResourceCenter } from './ResourceCenter';
import { GDPRCookieConsent } from './GDPRCookieConsent';
import { Admin2FA } from './Admin2FA';
import { SessionManagement } from './SessionManagement';
import { AuditLogsEnhanced } from './AuditLogsEnhanced';
import { RevenueDashboard } from './RevenueDashboard';
import { ConversionFunnel } from './ConversionFunnel';
import { ProductPerformanceReport } from './ProductPerformanceReport';
import { GeographicAnalytics } from './GeographicAnalytics';
import { TrafficSourcesReport } from './TrafficSourcesReport';
import { TierManagementUI } from './TierManagementUI';
import { FraudAlertDashboard } from './FraudAlertDashboard';
import { PayoutMethodManagementUI } from './PayoutMethodManagementUI';
import { MultiTierReferral } from './MultiTierReferral';
import { AffiliateTermsAgreement } from './AffiliateTermsAgreement';
import { RefundManagement } from './RefundManagement';
import AdminSetup from './AdminSetup';



function AddModuleForm({ onAdd }: { onAdd: (title: string, content: string) => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  return (
    <div className="flex flex-col md:flex-row gap-2 bg-white p-4 rounded-xl border border-dashed border-gray-300">
       <input 
         value={title} 
         onChange={e => setTitle(e.target.value)} 
         placeholder="Judul Modul" 
         className="flex-1 text-sm outline-none px-2 py-1 border-b md:border-b-0 md:border-r border-gray-100"
       />
       <input 
         value={content} 
         onChange={e => setContent(e.target.value)} 
         placeholder="Konten/Link Video" 
         className="flex-1 text-sm outline-none px-2 py-1"
       />
       <button 
         type="button"
         onClick={() => { if(title && content) { onAdd(title, content); setTitle(''); setContent(''); } }}
         className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold"
       >
         Tambah
       </button>
    </div>
  );
}

function AddVariantForm({ onAdd }: { onAdd: (name: string, price?: number, sku?: string) => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<string>('');
  const [sku, setSku] = useState('');

  return (
    <div className="flex flex-col md:flex-row gap-2 bg-white p-4 rounded-xl border border-dashed border-gray-300">
       <input 
         value={name} 
         onChange={e => setName(e.target.value)} 
         placeholder="Varian (ex: Size L)" 
         className="flex-1 text-sm outline-none px-2 py-1 border-b md:border-b-0 md:border-r border-gray-100"
       />
       <input 
         type="number"
         value={price} 
         onChange={e => setPrice(e.target.value)} 
         placeholder="Harga Spesifik" 
         className="w-32 text-sm outline-none px-2 py-1 border-b md:border-b-0 md:border-r border-gray-100"
       />
       <input 
         value={sku} 
         onChange={e => setSku(e.target.value)} 
         placeholder="SKU" 
         className="w-32 text-sm outline-none px-2 py-1"
       />
       <button 
         type="button"
         onClick={() => { if(name) { onAdd(name, price ? parseInt(price) : undefined, sku); setName(''); setPrice(''); setSku(''); } }}
         className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold"
       >
         Tambah
       </button>
    </div>
  );
}

export default function AdminDashboard({ defaultTab = 'products' }: { defaultTab?: 'products' | 'users' | 'coupons' | 'withdrawals' | 'events' | 'sales' | 'logs' | 'blog' | 'media' | 'static-pages' | 'affiliate-approvals' | 'deeplink-builder' | 'epc-metrics' | 'date-range-picker' | 'commission-pdf' | 'notifications' | 'resource-center' | 'revenue' | 'conversion-funnel' | 'product-performance' | 'geographic-analytics' | 'traffic-sources' | 'tier-management' | 'fraud-alerts' | 'payout-methods' | 'gdpr-consent' | '2fa-admin' | 'session-management' | 'audit-logs' }) {
  const { getAuthHeaders, globalConfig, fetchGlobalConfig } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<string>(defaultTab);

  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userEditingId, setUserEditingId] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    image: 'https://picsum.photos/seed/tool/800/600',
    downloadUrl: '',
    isSoftware: false,
    licensePrefix: '',
    marketingKit: {
      banners: [] as string[],
      swipeFiles: [] as SwipeFile[]
    }
  });

  const [bannerInput, setBannerInput] = useState('');
  const [newSwipe, setNewSwipe] = useState({ title: '', content: '' });


  const [newPromo, setNewPromo] = useState({
    promoActive: false,
    promoDiscount: 0,
    promoStart: '',
    promoEnd: '',
    geoPricingActive: false,
    idrMultiplier: 1,
    foreignMultiplier: 1.2
  });

  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    usageLimitPerUser: 1,
    expiryDate: ''
  });

  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponEditData, setCouponEditData] = useState<Partial<Coupon>>({});
  const [showCouponEdit, setShowCouponEdit] = useState(false);

  useEffect(() => {
    if (globalConfig) {
      setNewPromo({
        promoActive: globalConfig.promoActive,
        promoDiscount: globalConfig.promoDiscount,
        promoStart: globalConfig.promoStart,
        promoEnd: globalConfig.promoEnd,
        geoPricingActive: globalConfig.geoPricingActive,
        idrMultiplier: globalConfig.idrMultiplier,
        foreignMultiplier: globalConfig.foreignMultiplier
      });
    }
  }, [globalConfig]);

  const handleUpdateGlobalConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Start Date must not be later than End Date
    if (newPromo.promoActive && newPromo.promoStart && newPromo.promoEnd) {
      const start = new Date(newPromo.promoStart);
      const end = new Date(newPromo.promoEnd);
      if (start > end) {
        alert('Error: Tanggal mulai promo tidak boleh lebih lambat dari tanggal berakhir.');
        return;
      }
    }

    setSaveStatus('saving');
    try {
      const resp = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(newPromo)
      });

      if (resp.ok) {
        setSaveStatus('success');
        fetchGlobalConfig();
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        const err = await resp.json();
        setSaveStatus('error');
        alert('Gagal: ' + (err.error || 'Server error'));
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (err) {
      setSaveStatus('error');
      alert('Gagal memperbarui konfigurasi');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const hasGlobalChanges = useMemo(() => {
    if (!globalConfig) return false;
    return (
      newPromo.promoActive !== globalConfig.promoActive ||
      newPromo.promoDiscount !== globalConfig.promoDiscount ||
      newPromo.promoStart !== globalConfig.promoStart ||
      newPromo.promoEnd !== globalConfig.promoEnd ||
      newPromo.geoPricingActive !== globalConfig.geoPricingActive ||
      newPromo.idrMultiplier !== globalConfig.idrMultiplier ||
      newPromo.foreignMultiplier !== globalConfig.foreignMultiplier
    );
  }, [newPromo, globalConfig]);
  
  const fetchProducts = async () => {
    try {
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(docs);
    } catch (err: any) {
      console.error(err);
      setFetchError('Gagal memuat produk: ' + (err.message || 'Terjadi kesalahan'));
    }
  };

  const fetchUsers = async () => {
    try {
      const resp = await fetch('/api/admin/users', {
        headers: await getAuthHeaders()
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setUsers(data);
    } catch (err: any) {
      console.error('Fetch Users Error:', err);
      setFetchError('Gagal memuat pengguna: ' + err.message);
    }
  };

  const fetchCoupons = async () => {
    try {
      const q = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon)));
    } catch (err: any) {
      console.error(err);
      setFetchError('Gagal memuat kupon: ' + (err.message || 'Terjadi kesalahan'));
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const q = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawalRequest)));
    } catch (err: any) {
      console.error(err);
      setFetchError('Gagal memuat pencairan: ' + (err.message || 'Terjadi kesalahan'));
    }
  };

  const fetchAllSales = async () => {
    try {
      const resp = await fetch('/api/admin/sales', {
        headers: await getAuthHeaders()
      });
      if (!resp.ok) throw new Error('Server error: ' + resp.status);
      const data = await resp.json();
      setAllSales(data);
    } catch (err: any) {
      console.error(err);
      setFetchError('Gagal memuat penjualan: ' + (err.message || 'Terjadi kesalahan'));
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const resp = await fetch('/api/admin/activity-logs', { headers: await getAuthHeaders() });
      if (!resp.ok) throw new Error('Server error: ' + resp.status);
      const data = await resp.json();
      setActivityLogs(data);
    } catch (err: any) {
      console.error(err);
      setFetchError('Gagal memuat log aktivitas: ' + (err.message || 'Terjadi kesalahan'));
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setFetchError(null);
      await Promise.all([
        fetchProducts(), 
        fetchUsers(), 
        fetchCoupons(), 
        fetchWithdrawals(), 
        fetchGlobalConfig(), 
        fetchAllSales(),
        fetchActivityLogs()
      ]);
      setLoading(false);
    };
    init();
  }, []);


  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi Client-side
    if (!newCoupon.code) {
      alert('Kode kupon harus diisi');
      return;
    }
    if (newCoupon.discountValue <= 0) {
      alert('Nilai diskon harus lebih besar dari 0');
      return;
    }
    if (newCoupon.expiryDate) {
      const expiry = new Date(newCoupon.expiryDate);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (expiry < today) {
        alert('Tanggal kedaluwarsa tidak boleh di masa lalu');
        return;
      }
    }

    try {
      const resp = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          ...newCoupon,
          code: newCoupon.code.toUpperCase(),
          isActive: true,
          usageCount: 0
        })
      });
      if (resp.ok) {
        setNewCoupon({ code: '', discountType: 'percentage', discountValue: 0, usageLimitPerUser: 1, expiryDate: '' });
        fetchCoupons();
      } else {
        const err = await resp.json();
        alert('Gagal: ' + (err.error || 'Server error'));
      }
    } catch (err) {
      alert('Gagal menambah kupon');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Hapus kupon ini?')) return;
    try {
      const resp = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders()
      });
      if (resp.ok) {
        fetchCoupons();
      } else {
        const err = await resp.json();
        alert('Gagal: ' + (err.error || 'Server error'));
      }
    } catch (err) {
      alert('Gagal menghapus');
    }
  };

  const handleEditCoupon = async () => {
    if (!editingCoupon) return;
    try {
      await updateDoc(doc(db, 'coupons', editingCoupon.id), {
        code: couponEditData.code || editingCoupon.code,
        discountType: couponEditData.discountType || editingCoupon.discountType,
        discountValue: couponEditData.discountValue ?? editingCoupon.discountValue,
        usageLimitPerUser: couponEditData.usageLimitPerUser ?? editingCoupon.usageLimitPerUser,
        expiryDate: couponEditData.expiryDate ?? editingCoupon.expiryDate,
      });
      setShowCouponEdit(false);
      setEditingCoupon(null);
      fetchCoupons();
    } catch (err) {
      alert('Gagal mengedit kupon');
    }
  };

  const handleProcessWithdrawal = async (withdrawal: WithdrawalRequest, status: 'approved' | 'rejected' | 'completed') => {
    if (!confirm(`Ubah status permintaan ini menjadi ${status}?`)) return;
    try {
      const resp = await fetch(`/api/admin/withdrawals/${withdrawal.id}/process`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      if (resp.ok) {
        fetchWithdrawals();
      } else {
        const err = await resp.json();
        alert('Gagal: ' + (err.error || 'Server error'));
      }
    } catch (err) {
      alert('Gagal memproses permintaan');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if(!confirm(`Ubah role user ini menjadi ${newRole}?`)) return;
    try {
      const resp = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ userId, newRole })
      });
      if(resp.ok) {
        alert('Role berhasil diperbarui');
        fetchUsers();
      } else {
        const error = await resp.json();
        alert('Gagal: ' + (error.error || 'Server error'));
      }
    } catch (err) {
      alert('Gagal memperbarui role');
    }
  };

  const handleUpdateUserDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEditingId) return;
    try {
      const resp = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ 
          userId: userEditingId, 
          name: editUserName, 
          email: editUserEmail 
        })
      });
      if (resp.ok) {
        alert('Data user berhasil diperbarui');
        setUserEditingId(null);
        fetchUsers();
      } else {
        const error = await resp.json();
        alert('Gagal: ' + (error.error || 'Server error'));
      }
    } catch (err) {
      alert('Gagal memperbarui data user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Hapus pengguna ini secara permanen? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers
      });
      if (resp.ok) {
        alert('Pengguna berhasil dihapus');
        fetchUsers();
      } else {
        const error = await resp.json();
        alert('Gagal: ' + (error.error || 'Server error'));
      }
    } catch (err: any) {
      alert('Gagal menghapus pengguna: ' + err.message);
    }
  };

  const handleUpdateProduct = async (productId: string, updateData: any) => {
    try {
      const resp = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: await getAuthHeaders(),
        body: JSON.stringify(updateData)
      });
      if (!resp.ok) {
        const err = await resp.json();
        alert('Gagal update: ' + (err.error || 'Server error'));
      }
      fetchProducts();
    } catch (err) {
      alert('Gagal mengupdate produk');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch('/api/admin/products', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          ...newProduct,
          modules: [],
          marketingKit: {
            banners: bannerInput.split(',').map(s => s.trim()).filter(s => s),
            swipeFiles: newProduct.marketingKit?.swipeFiles || []
          }
        })

      });
      if (resp.ok) {
        setNewProduct({ 
          name: '', 
          description: '', 
          price: 0,
          category: '', 
          image: 'https://picsum.photos/seed/tool/800/600', 
          downloadUrl: '', 
          isSoftware: false,
          licensePrefix: '',
          marketingKit: {
            banners: [],
            swipeFiles: []
          }
        });
        fetchProducts();
      } else {
        const err = await resp.json();
        alert('Gagal: ' + (err.error || 'Server error'));
      }
    } catch (err) {
      alert('Gagal menambah produk: ' + (err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus produk ini?')) return;
    try {
      const resp = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders()
      });
      if (resp.ok) {
        fetchProducts();
      } else {
        const err = await resp.json();
        alert('Gagal: ' + (err.error || 'Server error'));
      }
    } catch (err) {
      alert('Gagal menghapus');
    }
  };

  return (
    <div className="space-y-12">
      {/* Error Banner */}
      {fetchError && (
        <div className="flex items-center justify-between gap-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-400 text-sm font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            {fetchError}
          </div>
          <button onClick={() => setFetchError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
            <XCircle size={16} />
          </button>
        </div>
      )}
      {/* Tab Switcher */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        <div className="flex gap-2 md:gap-3 p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl w-fit whitespace-nowrap border border-gray-200 shadow-sm">
          <button 
            onClick={() => setActiveSubTab('products')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'products' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Package size={16} className="md:w-[18px] md:h-[18px]" /> Produk
          </button>
          <button 
            onClick={() => setActiveSubTab('users')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'users' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Users size={16} className="md:w-[18px] md:h-[18px]" /> Pengguna
          </button>
          <button 
            onClick={() => setActiveSubTab('coupons')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'coupons' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Ticket size={16} className="md:w-[18px] md:h-[18px]" /> Kupon
          </button>
          <button 
            onClick={() => setActiveSubTab('withdrawals')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'withdrawals' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Wallet size={16} className="md:w-[18px] md:h-[18px]" /> Pencairan
          </button>
          <button 
            onClick={() => setActiveSubTab('events')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'events' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Zap size={16} className="md:w-[18px] md:h-[18px]" /> Event
          </button>
          <button 
            onClick={() => setActiveSubTab('sales')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'sales' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <ShoppingBag size={16} className="md:w-[18px] md:h-[18px]" /> Penjualan
          </button>
          <button 
            onClick={() => setActiveSubTab('logs')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'logs' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <History size={16} className="md:w-[18px] md:h-[18px]" /> Audit Log
          </button>
          <button 
            onClick={() => setActiveSubTab('blog')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'blog' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`} 
          >
            <Search size={16} className="md:w-[18px] md:h-[18px]" /> Blog
          </button>
          <button 
            onClick={() => setActiveSubTab('email-templates')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'email-templates' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Mail size={16} className="md:w-[18px] md:h-[18px]" /> Email Templates
          </button>
          <button 
            onClick={() => setActiveSubTab('site-settings')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'site-settings' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Tool size={16} className="md:w-[18px] md:h-[18px]" /> Site Settings
          </button>
          <button 
            onClick={() => setActiveSubTab('announcements')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'announcements' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Calendar size={16} className="md:w-[18px] md:h-[18px]" /> Announcements
          </button>
          <button 
            onClick={() => setActiveSubTab('static-pages')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'static-pages' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <BookOpen size={16} className="md:w-[18px] md:h-[18px]" /> Static Pages
          </button>
          <button 
            onClick={() => setActiveSubTab('gdpr-consent')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'gdpr-consent' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Shield size={16} className="md:w-[18px] md:h-[18px]" /> GDPR Consent
          </button>
          <button 
            onClick={() => setActiveSubTab('2fa-admin')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === '2fa-admin' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <UserCog size={16} className="md:w-[18px] md:h-[18px]" /> 2FA Admin
          </button>
          <button 
            onClick={() => setActiveSubTab('session-management')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'session-management' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Calendar size={16} className="md:w-[18px] md:h-[18px]" /> Session Mgmt
          </button>
          <button 
            onClick={() => setActiveSubTab('audit-logs')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'audit-logs' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <AlertCircle size={16} className="md:w-[18px] md:h-[18px]" /> Audit Logs
          </button>
          <button 
            onClick={() => setActiveSubTab('affiliate-approvals')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'affiliate-approvals' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Users size={16} className="md:w-[18px] md:h-[18px]" /> Affiliate Approvals
          </button>
          <button 
            onClick={() => setActiveSubTab('deeplink-builder')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'deeplink-builder' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Globe size={16} className="md:w-[18px] md:h-[18px]" /> Deeplink Builder
          </button>
          <button 
            onClick={() => setActiveSubTab('epc-metrics')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'epc-metrics' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Calendar size={16} className="md:w-[18px] md:h-[18px]" /> EPC Metric
          </button>
          <button 
            onClick={() => setActiveSubTab('date-range-picker')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'date-range-picker' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Calendar size={16} className="md:w-[18px] md:h-[18px]" /> Date Range
          </button>
          <button 
            onClick={() => setActiveSubTab('commission-pdf')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'commission-pdf' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <FileUp size={16} className="md:w-[18px] md:h-[18px]" /> Commission PDF
          </button>
          <button 
            onClick={() => setActiveSubTab('notifications')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'notifications' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Bell size={16} className="md:w-[18px] md:h-[18px]" /> Notifications
          </button>
          <button 
            onClick={() => setActiveSubTab('resource-center')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'resource-center' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <BookOpen size={16} className="md:w-[18px] md:h-[18px]" /> Resources
          </button>
          <button 
            onClick={() => setActiveSubTab('revenue')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'revenue' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <BarChart3 size={16} className="md:w-[18px] md:h-[18px]" /> Revenue
          </button>
          <button 
            onClick={() => setActiveSubTab('conversion-funnel')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'conversion-funnel' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <TrendingUp size={16} className="md:w-[18px] md:h-[18px]" /> Funnel
          </button>
          <button 
            onClick={() => setActiveSubTab('product-performance')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'product-performance' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Package size={16} className="md:w-[18px] md:h-[18px]" /> Products
          </button>
          <button 
            onClick={() => setActiveSubTab('geographic-analytics')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'geographic-analytics' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Globe size={16} className="md:w-[18px] md:h-[18px]" /> Geographic
          </button>
          <button 
            onClick={() => setActiveSubTab('traffic-sources')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'traffic-sources' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Share2 size={16} className="md:w-[18px] md:h-[18px]" /> Traffic
          </button>
          <button 
            onClick={() => setActiveSubTab('tier-management')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'tier-management' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Layers size={16} className="md:w-[18px] md:h-[18px]" /> Tiers
          </button>
          <button 
            onClick={() => setActiveSubTab('fraud-alerts')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'fraud-alerts' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <AlertTriangle size={16} className="md:w-[18px] md:h-[18px]" /> Fraud
          </button>
          <button 
            onClick={() => setActiveSubTab('admin-setup')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all ${
              activeSubTab === 'admin-setup' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Shield size={16} className="md:w-[18px] md:h-[18px]" /> Admin Setup
          </button>
        </div>
      </div>


      {activeSubTab === 'blog' && <BlogManager />}
      {activeSubTab === 'media' && <MediaManager />}
      {activeSubTab === 'static-pages' && <StaticPageManager />}
      {activeSubTab === 'email-templates' && <EmailTemplateManager />}
      {activeSubTab === 'site-settings' && <SiteSettingsDashboard />}
      {activeSubTab === 'announcements' && <BannerManager />}
      {activeSubTab === 'affiliate-approvals' && <AffiliateApproval />}
      {activeSubTab === 'deeplink-builder' && <DeeplinkBuilder />}
      {activeSubTab === 'epc-metrics' && <EpcMetrics value={12.34} />}
      {activeSubTab === 'date-range-picker' && <DateRangePicker />}
      {activeSubTab === 'commission-pdf' && <CommissionPdfReport />}
      {activeSubTab === 'notifications' && <NotificationCenter />}
      {activeSubTab === 'resource-center' && <ResourceCenter />}
      {activeSubTab === 'gdpr-consent' && <GDPRCookieConsent />}
      {activeSubTab === '2fa-admin' && <Admin2FA />}
      {activeSubTab === 'session-management' && <SessionManagement />}
      {activeSubTab === 'audit-logs' && <AuditLogsEnhanced />}
      {activeSubTab === 'revenue' && <RevenueDashboard />}
      {activeSubTab === 'conversion-funnel' && <ConversionFunnel />}
      {activeSubTab === 'product-performance' && <ProductPerformanceReport />}
      {activeSubTab === 'geographic-analytics' && <GeographicAnalytics />}
      {activeSubTab === 'traffic-sources' && <TrafficSourcesReport />}
      {activeSubTab === 'tier-management' && <TierManagementUI />}
      {activeSubTab === 'fraud-alerts' && <FraudAlertDashboard />}
      {activeSubTab === 'multi-tier-referral' && <MultiTierReferral />}
      {activeSubTab === 'affiliate-terms' && <AffiliateTermsAgreement />}
      {activeSubTab === 'refunds' && <RefundManagement />}
      {activeSubTab === 'affiliate-approvals' && <AffiliateApproval />}
      {activeSubTab === 'affiliate-approvals' && <AffiliateApprovalCmp />}
      {activeSubTab === 'deeplink-builder' && <DeeplinkBuilder />}
      {activeSubTab === 'epc-metrics' && <EpcMetrics value={12.34} />}
      {activeSubTab === 'date-range-picker' && <DateRangePicker />}
      {activeSubTab === 'commission-pdf' && <CommissionPdfReport />}
      {activeSubTab === 'notifications' && <NotificationCenter />}
      {activeSubTab === 'resource-center' && <ResourceCenter />}
      {activeSubTab === 'gdpr' && <GDPRCookieConsent />}
      {activeSubTab === 'admin-setup' && <AdminSetup />}
    </div>
  );
}
                          } catch (err) {
                            alert('Terjadi kesalahan saat upload');
                          } finally {
                            setIsBulkUploading(false);
                          }
                        }
                      });
                    }}
                  />
                </label>
              </div>
            </div>

            
            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Nama Produk</label>
                <input 
                  required
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="Contoh: Kursus Keuangan" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Kategori</label>
                <input 
                  required
                  value={newProduct.category}
                  onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="E-Book / Kursus / Template" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Harga (IDR)</label>
                <input 
                  required
                  type="number"
                  value={newProduct.price}
                  onChange={e => setNewProduct({...newProduct, price: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">URL Gambar</label>
                <input 
                  value={newProduct.image}
                  onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Download URL (PDF/ZIP)</label>
                <input 
                  value={newProduct.downloadUrl}
                  onChange={e => setNewProduct({...newProduct, downloadUrl: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="URL File Digital..." 
                />
              </div>
              <div className="space-y-4 md:col-span-2 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-indigo-900 text-sm">Software / License System</h4>
                    <p className="text-xs text-indigo-600">Aktifkan untuk menggenerate license key unik setiap penjualan.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setNewProduct({...newProduct, isSoftware: !newProduct.isSoftware})}
                    className={`w-12 h-6 rounded-full transition-all relative ${newProduct.isSoftware ? 'bg-indigo-600' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newProduct.isSoftware ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
                {newProduct.isSoftware && (
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-indigo-900">Prefix Lisensi (Opsional)</label>
                    <input 
                      value={newProduct.licensePrefix}
                      onChange={e => setNewProduct({...newProduct, licensePrefix: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                      placeholder="Contoh: WIN, SOFT, ACC..." 
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Deskripsi</label>
                <textarea 
                  required
                  value={newProduct.description}
                  onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 h-24" 
                  placeholder="Deskripsi singkat produk..." 
                />
              </div>
              <button type="submit" className="md:col-span-2 py-4 bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white rounded-2xl font-black hover:from-[#2FA084] hover:to-[#6FCF97] transition-all shadow-lg shadow-[#2FA084]/30">
                Simpan Produk Baru
              </button>
            </form>

            <div className="mt-12 space-y-8 border-t border-gray-100 pt-10">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <Tag size={24} />
                  </div>
                  <h3 className="text-xl font-bold">Marketing Kit (Bahan Jualan)</h3>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Banner URLs (Pisahkan dengan koma)</label>
                      <textarea 
                        value={bannerInput}
                        onChange={e => setBannerInput(e.target.value)}
                        placeholder="https://image1.jpg, https://image2.jpg"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-400 uppercase">Swipe Files (Copywriting Iklan)</p>
                    <div className="space-y-3">
                      {newProduct.marketingKit?.swipeFiles.map((sf, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-xl flex justify-between items-start gap-4">
                          <div>
                            <p className="font-bold text-sm">{sf.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-2">{sf.content}</p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => {
                              const updated = newProduct.marketingKit!.swipeFiles.filter((_, i) => i !== idx);
                              setNewProduct({...newProduct, marketingKit: {...newProduct.marketingKit!, swipeFiles: updated}});
                            }} 
                            className="text-red-400 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <div className="p-4 border-2 border-dashed border-gray-100 rounded-xl space-y-3">
                        <input 
                          placeholder="Judul Swipe (Contoh: Story WA)"
                          value={newSwipe.title}
                          onChange={e => setNewSwipe({...newSwipe, title: e.target.value})}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs"
                        />
                        <textarea 
                          placeholder="Konten Iklan..."
                          value={newSwipe.content}
                          onChange={e => setNewSwipe({...newSwipe, content: e.target.value})}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs min-h-[80px]"
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            if (newSwipe.title && newSwipe.content) {
                              const updated = [...(newProduct.marketingKit?.swipeFiles || []), newSwipe];
                              setNewProduct({...newProduct, marketingKit: {...newProduct.marketingKit!, swipeFiles: updated}});
                              setNewSwipe({title: '', content: ''});
                            }
                          }}
                          className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                        >Tambah Swipe File</button>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>


          <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <Package className="text-gray-400" />
                 <h3 className="text-xl font-bold">Daftar Produk</h3>
              </div>
              <span className="text-sm font-medium text-gray-400">{products.length} Produk</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-widest text-left">
                  <tr>
                    <th className="px-8 py-4">Produk</th>
                    <th className="px-8 py-4">Kategori</th>
                    <th className="px-8 py-4">Harga</th>
                    <th className="px-8 py-4">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(p => (
                    <React.Fragment key={p.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-4">
                            <img src={p.image} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                            <span className="font-bold text-gray-900">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-sm font-medium text-gray-500">{p.category}</td>
                        <td className="px-8 py-4 font-extrabold text-indigo-600">Rp {p.price.toLocaleString('id-ID')}</td>
                        <td className="px-8 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => setEditingId(editingId === p.id ? null : p.id)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                              <Edit3 size={18} />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingId === p.id && (
                        <tr>
                          <td colSpan={4} className="px-8 py-8 bg-gray-50">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                              <div className="space-y-6">
                                  <div className="flex items-center gap-2">
                                    <Shield size={18} className="text-gray-400" />
                                    <h4 className="font-bold text-gray-700">Manajemen Modul LMS</h4>
                                  </div>
                                  <div className="space-y-4">
                                     {(p.modules || []).map((m, idx) => (
                                       <div key={idx} className="flex gap-4 items-start bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                           <div className="flex-1">
                                             <p className="font-bold text-sm">{m.title}</p>
                                             <p className="text-xs text-gray-400 line-clamp-1">{m.content}</p>
                                           </div>
                                           <button onClick={async () => {
                                             const newModules = (p.modules || []).filter((_, i) => i !== idx);
                                             await handleUpdateProduct(p.id, { modules: newModules });
                                           }} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                       </div>
                                     ))}
                                     <AddModuleForm onAdd={async (title, content) => {
                                         const newModules = [...(p.modules || []), { id: Date.now().toString(), title, content }];
                                         await handleUpdateProduct(p.id, { modules: newModules });
                                     }} />
                                  </div>
                              </div>

                              <div className="space-y-6 border-t lg:border-t-0 lg:border-l lg:pl-12 border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Zap size={18} className="text-gray-400" />
                                      <h4 className="font-bold text-gray-700">Digital Delivery</h4>
                                    </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-500">Software?</span>
                                        <button 
                                          onClick={async () => {
                                            await handleUpdateProduct(p.id, { isSoftware: !p.isSoftware });
                                          }}
                                          className={`w-10 h-5 rounded-full transition-colors relative ${p.isSoftware ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                        >
                                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${p.isSoftware ? 'left-6' : 'left-1'}`} />
                                        </button>
                                      </div>
                                  </div>
                                  <div className="space-y-4">
                                        <div className="space-y-1">
                                         <label className="text-[10px] font-black uppercase text-gray-400">Download URL</label>
                                         <div className="flex gap-2">
                                           <input 
                                             defaultValue={p.downloadUrl || ''}
                                             onBlur={async (e) => {
                                               if (e.target.value !== (p.downloadUrl || '')) {
                                                 await handleUpdateProduct(p.id, { downloadUrl: e.target.value });
                                               }
                                             }}
                                             placeholder="https://example.com/file.zip"
                                             className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                                           />
                                         </div>
                                       </div>
                                        {p.isSoftware && (
                                         <div className="space-y-1">
                                           <label className="text-[10px] font-black uppercase text-gray-400">License Prefix</label>
                                           <input 
                                             defaultValue={p.licensePrefix || ''}
                                             onBlur={async (e) => {
                                               if (e.target.value !== (p.licensePrefix || '')) {
                                                 await handleUpdateProduct(p.id, { licensePrefix: e.target.value });
                                               }
                                             }}
                                             placeholder="E.g. DIGI-PRO-"
                                             className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                                           />
                                         </div>
                                       )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 pt-4">
                                    <Tag size={18} className="text-gray-400" />
                                    <h4 className="font-bold text-gray-700">Varian Produk</h4>
                                  </div>
                                  <div className="space-y-4">
                                     {(p.variants || []).map((v, idx) => (
                                       <div key={idx} className="flex gap-4 items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                           <div className="flex-1">
                                             <p className="font-bold text-sm">{v.name}</p>
                                             <div className="flex gap-3 mt-1">
                                               {v.sku && <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-mono">SKU: {v.sku}</span>}
                                               {v.price && <span className="text-[10px] bg-indigo-50 px-2 py-0.5 rounded text-indigo-600 font-bold">Rp {v.price.toLocaleString('id-ID')}</span>}
                                             </div>
                                           </div>
                                           <button onClick={async () => {
                                             const newVariants = (p.variants || []).filter((_, i) => i !== idx);
                                             await handleUpdateProduct(p.id, { variants: newVariants });
                                           }} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                       </div>
                                     ))}
                                     <AddVariantForm onAdd={async (name, price, sku) => {
                                         const newVariants = [...(p.variants || []), { id: Date.now().toString(), name, price, sku }];
                                         await handleUpdateProduct(p.id, { variants: newVariants });
                                     }} />
                                  </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeSubTab === 'users' ? (
        /* User Management View */
        <UserAccessManager
          users={users}
          onRoleChange={handleUpdateRole}
          onUpdateDetails={handleUpdateUserDetails}
          onDeleteUser={handleDeleteUser}
          userEditingId={userEditingId}
          setUserEditingId={setUserEditingId}
          editUserName={editUserName}
          setEditUserName={setEditUserName}
          editUserEmail={editUserEmail}
          setEditUserEmail={setEditUserEmail}
        />
      ) : activeSubTab === 'coupons' ? (
        <div className="space-y-12">
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100">
             <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                 <Plus size={24} />
               </div>
               <h2 className="text-2xl font-bold">Buat Kupon Baru</h2>
             </div>
             <form onSubmit={handleAddCoupon} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Kode Kupon</label>
                  <input 
                    required
                    value={newCoupon.code}
                    onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="CONTOH: PROMO2024"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Tipe Diskon</label>
                  <select 
                    value={newCoupon.discountType}
                    onChange={e => setNewCoupon({...newCoupon, discountType: e.target.value as 'percentage' | 'fixed'})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal Tetap (Rp)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Nilai Diskon</label>
                  <input 
                    required
                    type="number"
                    value={newCoupon.discountValue}
                    onChange={e => setNewCoupon({...newCoupon, discountValue: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Limit per Pengguna</label>
                  <input 
                    type="number"
                    min="1"
                    value={newCoupon.usageLimitPerUser}
                    onChange={e => setNewCoupon({...newCoupon, usageLimitPerUser: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Tanggal Kedaluwarsa</label>
                  <input 
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={newCoupon.expiryDate}
                    onChange={e => setNewCoupon({...newCoupon, expiryDate: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-1 flex items-end">
                  <button type="submit" className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all">
                    Simpan Kupon
                  </button>
                </div>
             </form>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden">
             <div className="p-8 border-b border-gray-100 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <Ticket className="text-gray-400" />
                  <h3 className="text-xl font-bold">Daftar Kupon</h3>
               </div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full border-collapse text-left">
                  <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-widest">
                    <tr>
                      <th className="px-8 py-4">Kode</th>
                      <th className="px-8 py-4">Tipe</th>
                      <th className="px-8 py-4">Nilai</th>
                      <th className="px-8 py-4">Limit (User)</th>
                      <th className="px-8 py-4">Kedaluwarsa</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4">Aksi</th>
                    </tr>
                  </thead>
                   <tbody className="divide-y divide-gray-100">
                     {coupons.map(c => (
                       <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                         <td className="px-8 py-4">
                            <span className="font-bold text-gray-900 block">{c.code}</span>
                            <span className="text-[10px] text-gray-400 tracking-tighter uppercase">{c.usageCount} digunakan secara total</span>
                         </td>
                         <td className="px-8 py-4 text-sm text-gray-500 uppercase">{c.discountType === 'fixed' ? 'Nominal' : 'Persen'}</td>
                         <td className="px-8 py-4 font-bold text-indigo-600">{c.discountType === 'percentage' ? `${c.discountValue}%` : `Rp ${c.discountValue.toLocaleString('id-ID')}`}</td>
                         <td className="px-8 py-4 text-sm text-gray-700">{c.usageLimitPerUser || '∞'} kali</td>
                         <td className="px-8 py-4 text-sm text-gray-700">{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tidak ada'}</td>
                         <td className="px-8 py-4 text-center">
                            <button
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, 'coupons', c.id), { isActive: !c.isActive });
                                  fetchCoupons();
                                } catch (err) {
                                  alert('Gagal mengubah status kupon');
                                }
                              }}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${c.isActive ? 'bg-green-600' : 'bg-gray-300'}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${c.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                         </td>
                         <td className="px-8 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => {
                                setEditingCoupon(c);
                                setCouponEditData({ ...c });
                                setShowCouponEdit(true);
                              }} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg">
                                <Edit3 size={18} />
                              </button>
                              <button onClick={() => handleDeleteCoupon(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                <Trash2 size={18} />
                              </button>
                            </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
               </table>
              </div>
            </div>

            {showCouponEdit && editingCoupon && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 space-y-4">
                  <h3 className="text-lg font-bold">Edit Kupon: {editingCoupon.code}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Kode</label>
                      <input
                        value={couponEditData.code || editingCoupon.code}
                        onChange={e => setCouponEditData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Tipe</label>
                      <select
                        value={couponEditData.discountType || editingCoupon.discountType}
                        onChange={e => setCouponEditData(prev => ({ ...prev, discountType: e.target.value as 'percentage' | 'fixed' }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="percentage">Persentase</option>
                        <option value="fixed">Nominal</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Nilai</label>
                      <input
                        type="number"
                        value={couponEditData.discountValue ?? editingCoupon.discountValue}
                        onChange={e => setCouponEditData(prev => ({ ...prev, discountValue: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Limit per User</label>
                      <input
                        type="number"
                        value={couponEditData.usageLimitPerUser ?? editingCoupon.usageLimitPerUser}
                        onChange={e => setCouponEditData(prev => ({ ...prev, usageLimitPerUser: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-semibold mb-1 block">Tanggal Kedaluwarsa</label>
                      <input
                        type="date"
                        value={couponEditData.expiryDate ? new Date(couponEditData.expiryDate).toISOString().split('T')[0] : ''}
                        onChange={e => setCouponEditData(prev => ({ ...prev, expiryDate: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { setShowCouponEdit(false); setEditingCoupon(null); }} className="flex-1 py-2.5 border rounded-lg font-bold hover:bg-gray-50 transition-all">Batal</button>
                    <button onClick={handleEditCoupon} className="flex-1 py-2.5 bg-[#2FA084] text-white rounded-lg font-bold hover:bg-[#6FCF97] transition-all">Simpan</button>
                  </div>
                </div>
              </div>
            )}
         </div>
       ) : activeSubTab === 'events' ? (
        <div className="space-y-8">
           <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Zap size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Event Promosi Global</h2>
                  <p className="text-sm text-gray-500">Atur diskon otomatis untuk semua produk sekaligus.</p>
                </div>
              </div>

              <form onSubmit={handleUpdateGlobalConfig} className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                 <div className="space-y-6 p-8 bg-gray-50 rounded-[2rem] border border-gray-100">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Calendar size={18} className="text-indigo-600" />
                          <h3 className="font-bold text-gray-900">Pengaturan Diskon</h3>
                       </div>
                       <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={newPromo.promoActive}
                            onChange={e => setNewPromo({...newPromo, promoActive: e.target.checked})}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                       </label>
                    </div>

                    <div className="space-y-4">
                       <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase">Besar Diskon (%)</label>
                          <input 
                            type="number"
                            value={newPromo.promoDiscount}
                            onChange={e => setNewPromo({...newPromo, promoDiscount: parseInt(e.target.value)})}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                          />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <label className="text-xs font-bold text-gray-400 uppercase">Mulai</label>
                             <input 
                               type="datetime-local"
                               value={newPromo.promoStart}
                               onChange={e => setNewPromo({...newPromo, promoStart: e.target.value})}
                               className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                             />
                          </div>
                          <div className="space-y-1">
                             <label className="text-xs font-bold text-gray-400 uppercase">Berakhir</label>
                             <input 
                               type="datetime-local"
                               value={newPromo.promoEnd}
                               onChange={e => setNewPromo({...newPromo, promoEnd: e.target.value})}
                               className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                             />
                          </div>
                       </div>
                       {newPromo.promoActive && (
                         <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl text-indigo-700 text-[10px] font-bold">
                            <AlertCircle size={14} />
                            Diskon ini akan otomatis memotong harga di seluruh katalog.
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="space-y-6 p-8 bg-gray-50 rounded-[2rem] border border-gray-100">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Globe size={18} className="text-indigo-600" />
                          <h3 className="font-bold text-gray-900">Geo-Pricing (Algoritma Harga)</h3>
                       </div>
                       <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={newPromo.geoPricingActive}
                            onChange={e => setNewPromo({...newPromo, geoPricingActive: e.target.checked})}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                       </label>
                    </div>

                    <div className="space-y-4">
                       <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase">Multiplier Indonesia (IDR)</label>
                          <input 
                            type="number"
                            step="0.1"
                            value={newPromo.idrMultiplier}
                            onChange={e => setNewPromo({...newPromo, idrMultiplier: parseFloat(e.target.value)})}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                          />
                       </div>
                       <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase">Multiplier Luar Negeri</label>
                          <input 
                            type="number"
                            step="0.1"
                            value={newPromo.foreignMultiplier}
                            onChange={e => setNewPromo({...newPromo, foreignMultiplier: parseFloat(e.target.value)})}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                          />
                       </div>
                       <div className="p-4 bg-white rounded-2xl border border-gray-100 space-y-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Simulasi Harga</p>
                          <div className="flex justify-between items-center text-xs">
                             <span className="text-gray-500">Base Price (100k)</span>
                             <span className="font-bold">Rp 100.000</span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-indigo-600 font-bold">
                             <span>Harga Lokal</span>
                             <span>Rp {(100000 * newPromo.idrMultiplier).toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-amber-600 font-bold">
                             <span>Harga Asing</span>
                             <span>Rp {(100000 * newPromo.foreignMultiplier).toLocaleString('id-ID')}</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <button 
                   type="submit" 
                   disabled={!hasGlobalChanges || saveStatus === 'saving'}
                   className={`md:col-span-2 py-5 rounded-[1.5rem] font-bold text-lg shadow-xl shadow-gray-200 transition-all flex items-center justify-center gap-3 ${
                     !hasGlobalChanges ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 
                     saveStatus === 'success' ? 'bg-green-500 text-white' :
                     saveStatus === 'error' ? 'bg-red-500 text-white' :
                     'bg-gray-900 text-white hover:bg-indigo-600'
                   }`}
                 >
                    {saveStatus === 'saving' ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : saveStatus === 'success' ? (
                      <CheckCircle2 size={24} />
                    ) : (
                      <Zap size={24} />
                    )}
                    {saveStatus === 'saving' ? 'Menyimpan...' : 
                     saveStatus === 'success' ? 'Perubahan Berhasil Disimpan!' : 
                     saveStatus === 'error' ? 'Gagal Menyimpan' :
                     !hasGlobalChanges ? 'Tidak Ada Perubahan' : 'Simpan Perubahan Global'}
                 </button>
              </form>
           </div>
        </div>
      ) : (
        /* Withdrawal Management View */
        <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <Wallet className="text-gray-400" />
               <h3 className="text-xl font-bold">Permintaan Pencairan Komisi</h3>
            </div>
            <span className="text-sm font-medium text-gray-400">{withdrawals.filter(w=>w.status==='pending').length} Menunggu</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-widest text-left">
                <tr>
                  <th className="px-8 py-4">Afiliasi</th>
                  <th className="px-8 py-4 text-right">Email</th>
                  <th className="px-8 py-4 text-center">Metode / Detail Pembayaran</th>
                  <th className="px-8 py-4">Nominal</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-gray-400 italic">Belum ada permintaan pencairan.</td>
                  </tr>
                ) : (
                  withdrawals.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-4">
                        <p className="font-bold text-gray-900">{w.userName}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-medium">{new Date(w.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
                      </td>
                      <td className="px-8 py-4 text-right text-sm text-gray-500">{w.userEmail}</td>
                      <td className="px-8 py-4 text-center">
                        <p className="text-sm font-bold text-gray-900">{w.paymentMethod}</p>
                        <p className="text-[10px] text-gray-400">{w.paymentDetails}</p>
                      </td>
                      <td className="px-8 py-4 font-black text-indigo-600">Rp {w.amount.toLocaleString('id-ID')}</td>
                      <td className="px-8 py-4">
                        <div className="space-y-1">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            w.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                            w.status === 'completed' ? 'bg-green-100 text-green-700' : 
                            w.status === 'approved' ? 'bg-blue-100 text-blue-700' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {w.status}
                          </span>
                          {w.processedAt && (
                            <p className="text-[10px] text-gray-400 font-medium">Proc: {new Date(w.processedAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex gap-2 justify-end">
                           {w.status === 'pending' && (
                             <>
                               <button 
                                 onClick={() => handleProcessWithdrawal(w, 'approved')}
                                 className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                                 title="Approve"
                               >
                                  <CheckCircle2 size={18} />
                               </button>
                               <button 
                                 onClick={() => handleProcessWithdrawal(w, 'rejected')}
                                 className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                 title="Reject"
                               >
                                  <XCircle size={18} />
                               </button>
                             </>
                           )}
                           {w.status === 'approved' && (
                             <button 
                               onClick={() => handleProcessWithdrawal(w, 'completed')}
                               className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold shadow-sm"
                             >
                                Tandai Selesai
                             </button>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'sales' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
             <div>
                <h3 className="text-xl font-bold">Semua Transaksi</h3>
                <p className="text-sm text-gray-500 font-medium">Total {allSales.length} transaksi berhasil.</p>
             </div>
             <div className="flex items-center gap-4">
                <button 
                  onClick={async () => {
                    if (confirm('Kirim email pengingat untuk semua checkout yang menggantung > 1 jam?')) {
                      const resp = await fetch('/api/admin/recover-carts', { method: 'POST', headers: await getAuthHeaders() });
                      const data = await resp.json();
                      alert(`Berhasil mengirim ${data.recovered} email recovery.`);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
                >
                  <AlertCircle size={14} /> Recover Abandoned Carts
                </button>
                 <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl flex items-center gap-2">
                    <Search size={16} className="text-gray-400" />
                    <input 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari Buyer..." 
                      className="bg-transparent outline-none text-sm font-medium w-40" 
                    />
                 </div>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <th className="px-8 py-4">ID / Tanggal</th>
                  <th className="px-8 py-4">Produk</th>
                  <th className="px-8 py-4">Pembeli</th>
                  <th className="px-8 py-4">Afiliasi / Komisi</th>
                  <th className="px-8 py-4">Total Bayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allSales
                  .filter(s => 
                    searchQuery === '' || 
                    s.buyerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.id.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((s) => (
                  <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-mono text-[10px] text-gray-400 mb-1">{s.id.slice(0, 12)}...</p>
                      <p className="text-xs font-bold text-gray-600">{new Date(s.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</p>
                    </td>
                    <td className="px-8 py-6">
                       <p className="font-black text-gray-900">{s.productName}</p>
                       <p className="text-[10px] uppercase font-bold text-gray-400 tracking-tighter">ID: {s.productId}</p>
                    </td>
                    <td className="px-8 py-6">
                       <p className="font-bold text-gray-800 text-sm">{s.buyerEmail}</p>
                       <p className="text-[10px] font-medium text-gray-400">UID: {s.buyerId.slice(0, 8)}</p>
                    </td>
                    <td className="px-8 py-6">
                       {s.affiliateId ? (
                         <div className="space-y-1">
                           <p className="text-xs font-bold text-indigo-600">Rp {s.commission.toLocaleString('id-ID')}</p>
                           <p className="text-[10px] text-gray-400 font-medium">Affiliate: {s.affiliateId.slice(0, 8)}</p>
                         </div>
                       ) : (
                         <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Langsung</span>
                       )}
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-lg font-black text-indigo-600">Rp {s.amount.toLocaleString('id-ID')}</p>
                       <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">Lunas</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
             <div>
                <h3 className="text-xl font-bold">Activity Logs (Audit Trail)</h3>
                <p className="text-sm text-gray-500 font-medium">Catatan aktivitas administratif untuk keamanan internal.</p>
             </div>
             <button onClick={fetchActivityLogs} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                <Zap size={18} /> Refresh
             </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <th className="px-8 py-4">Waktu</th>
                  <th className="px-8 py-4">Admin</th>
                  <th className="px-8 py-4">Aksi</th>
                  <th className="px-8 py-4">Detail</th>
                  <th className="px-8 py-4 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-8 py-5 text-xs text-gray-500 whitespace-nowrap">
                       {new Date(log.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td className="px-8 py-5">
                       <span className="font-bold text-gray-900">{log.adminName}</span>
                       <p className="text-[10px] text-gray-400">ID: {log.adminId.slice(0, 8)}</p>
                    </td>
                    <td className="px-8 py-5">
                       <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                         log.action.includes('DELETE') ? 'bg-red-100 text-red-600' :
                         log.action.includes('ADD') ? 'bg-green-100 text-green-600' :
                         'bg-blue-100 text-blue-600'
                       }`}>
                         {log.action}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-600">{log.details}</td>
                    <td className="px-8 py-5 text-xs text-gray-400 text-right font-mono">{log.ip || 'Unknown'}</td>
                  </tr>
                ))}
                {activityLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic">Belum ada catatan aktivitas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

  );
}
