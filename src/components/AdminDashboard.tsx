import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, setDoc } from 'firebase/firestore';
import { Product, User, Coupon, WithdrawalRequest, ProductVariant, GlobalConfig } from '../types';
import { Plus, Trash2, Edit3, Package, Users, Shield, UserCog, Ticket, Wallet, CheckCircle2, XCircle, Tag, Globe, Calendar, Zap, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';

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

export default function AdminDashboard() {
  const { getAuthHeaders, globalConfig, fetchGlobalConfig } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'users' | 'coupons' | 'withdrawals' | 'events'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userEditingId, setUserEditingId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    image: 'https://picsum.photos/seed/tool/800/600'
  });

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
    discountValue: 0
  });

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
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...newPromo,
        id: 'global'
      });
      alert('Konfigurasi Global Diperbarui!');
      fetchGlobalConfig();
    } catch (err) {
      alert('Gagal memperbarui konfigurasi');
    }
  };
  
  const fetchProducts = async () => {
    try {
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(docs);
    } catch (err) {
      console.error(err);
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
      alert('Error fetching users: ' + err.message);
    }
  };

  const fetchCoupons = async () => {
    try {
      const q = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon)));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const q = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawalRequest)));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchUsers(), fetchCoupons(), fetchWithdrawals(), fetchGlobalConfig()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || newCoupon.discountValue <= 0) return;
    try {
      await addDoc(collection(db, 'coupons'), {
        ...newCoupon,
        code: newCoupon.code.toUpperCase(),
        isActive: true,
        usageCount: 0,
        createdAt: new Date().toISOString()
      });
      setNewCoupon({ code: '', discountType: 'percentage', discountValue: 0 });
      fetchCoupons();
    } catch (err) {
      alert('Gagal menambah kupon');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Hapus kupon ini?')) return;
    try {
      await deleteDoc(doc(db, 'coupons', id));
      fetchCoupons();
    } catch (err) {
      alert('Gagal menghapus');
    }
  };

  const handleProcessWithdrawal = async (withdrawal: WithdrawalRequest, status: 'approved' | 'rejected' | 'completed') => {
    if (!confirm(`Ubah status permintaan ini menjadi ${status}?`)) return;
    try {
      await updateDoc(doc(db, 'withdrawals', withdrawal.id), {
        status,
        processedAt: new Date().toISOString()
      });
      fetchWithdrawals();
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

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'products'), {
        ...newProduct,
        modules: [],
        createdAt: new Date().toISOString()
      });
      setNewProduct({ name: '', description: '', price: 0, category: '', image: 'https://picsum.photos/seed/tool/800/600' });
      fetchProducts();
    } catch (err) {
      alert('Gagal menambah produk: ' + (err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus produk ini?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      fetchProducts();
    } catch (err) {
      alert('Gagal menghapus');
    }
  };

  return (
    <div className="space-y-12">
      {/* Tab Switcher */}
      <div className="flex gap-4 p-1 bg-gray-100 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveSubTab('products')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeSubTab === 'products' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package size={18} /> Produk
        </button>
        <button 
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeSubTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={18} /> Pengguna
        </button>
        <button 
          onClick={() => setActiveSubTab('coupons')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeSubTab === 'coupons' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Ticket size={18} /> Kupon
        </button>
        <button 
          onClick={() => setActiveSubTab('withdrawals')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeSubTab === 'withdrawals' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Wallet size={18} /> Pencairan
        </button>
        <button 
          onClick={() => setActiveSubTab('events')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeSubTab === 'events' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Zap size={18} /> Event & Geo
        </button>
      </div>

      {activeSubTab === 'products' ? (
        <>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Plus size={24} />
              </div>
              <h2 className="text-2xl font-bold">Tambah Produk Baru</h2>
            </div>
            
            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <button type="submit" className="md:col-span-2 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-indigo-600 transition-all">
                Simpan Produk
              </button>
            </form>
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
                                            await updateDoc(doc(db, 'products', p.id), { modules: newModules });
                                            fetchProducts();
                                          }} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                      </div>
                                    ))}
                                    <AddModuleForm onAdd={async (title, content) => {
                                        const newModules = [...(p.modules || []), { id: Date.now().toString(), title, content }];
                                        await updateDoc(doc(db, 'products', p.id), { modules: newModules });
                                        fetchProducts();
                                    }} />
                                  </div>
                              </div>

                              <div className="space-y-6 border-t lg:border-t-0 lg:border-l lg:pl-12 border-gray-200">
                                  <div className="flex items-center gap-2">
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
                                            await updateDoc(doc(db, 'products', p.id), { variants: newVariants });
                                            fetchProducts();
                                          }} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                      </div>
                                    ))}
                                    <AddVariantForm onAdd={async (name, price, sku) => {
                                        const newVariants = [...(p.variants || []), { id: Date.now().toString(), name, price, sku }];
                                        await updateDoc(doc(db, 'products', p.id), { variants: newVariants });
                                        fetchProducts();
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
        <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <Users className="text-gray-400" />
               <h3 className="text-xl font-bold">Manajemen Pengguna</h3>
            </div>
            <span className="text-sm font-medium text-gray-400">{users.length} Terdaftar</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-widest text-left">
                <tr>
                  <th className="px-8 py-4">User</th>
                  <th className="px-8 py-4 text-center">Stats (Sales/Comm)</th>
                  <th className="px-8 py-4">Status/Role</th>
                  <th className="px-8 py-4">Referal</th>
                  <th className="px-8 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <React.Fragment key={u.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-gray-900">{u.totalSales || 0} Penjualan</p>
                          <p className="text-[10px] text-indigo-600 font-bold">Rp {(u.commissionEarned || 0).toLocaleString('id-ID')}</p>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-8 py-4 font-mono text-xs text-gray-400">{u.referralCode || '-'}</td>
                      <td className="px-8 py-4">
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => {
                              setUserEditingId(userEditingId === u.id ? null : u.id);
                              setEditUserName(u.name);
                              setEditUserEmail(u.email);
                            }}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <UserCog size={18} />
                          </button>
                          {u.role === 'admin' ? (
                            <button 
                              onClick={() => handleUpdateRole(u.id, 'affiliate')}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg flex items-center gap-2 text-xs font-bold"
                            >
                              <Users size={16} /> Demote
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleUpdateRole(u.id, 'admin')}
                              className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg flex items-center gap-2 text-xs font-bold"
                            >
                              <Shield size={16} /> Promote
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {userEditingId === u.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={5} className="px-8 py-6">
                           <form onSubmit={handleUpdateUserDetails} className="flex flex-wrap gap-4 items-end bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                              <div className="space-y-1 flex-1 min-w-[200px]">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Nama Lengkap</label>
                                <input 
                                  value={editUserName}
                                  onChange={e => setEditUserName(e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div className="space-y-1 flex-1 min-w-[200px]">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Email Address</label>
                                <input 
                                  value={editUserEmail}
                                  onChange={e => setEditUserEmail(e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                                Simpan Perubahan
                              </button>
                           </form>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubTab === 'coupons' ? (
        <div className="space-y-12">
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100">
             <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                 <Plus size={24} />
               </div>
               <h2 className="text-2xl font-bold">Buat Kupon Baru</h2>
             </div>
             <form onSubmit={handleAddCoupon} className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <button type="submit" className="md:col-span-3 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-indigo-600 transition-all">
                  Simpan Kupon
                </button>
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
                      <th className="px-8 py-4">Digunakan</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {coupons.map(c => (
                      <tr key={c.id}>
                        <td className="px-8 py-4 font-bold text-gray-900">{c.code}</td>
                        <td className="px-8 py-4 text-sm text-gray-500 uppercase">{c.discountType === 'fixed' ? 'Nominal' : 'Persen'}</td>
                        <td className="px-8 py-4 font-bold text-indigo-600">{c.discountType === 'percentage' ? `${c.discountValue}%` : `Rp ${c.discountValue.toLocaleString('id-ID')}`}</td>
                        <td className="px-8 py-4 text-sm text-gray-500">{c.usageCount} kali</td>
                        <td className="px-8 py-4">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                             c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                           }`}>{c.isActive ? 'Aktif' : 'Nonaktif'}</span>
                        </td>
                        <td className="px-8 py-4">
                           <button onClick={() => handleDeleteCoupon(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                              <Trash2 size={18} />
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
           </div>
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

                 <button type="submit" className="md:col-span-2 py-5 bg-gray-900 text-white rounded-[1.5rem] font-bold text-lg shadow-xl shadow-gray-200 hover:bg-indigo-600 transition-all flex items-center justify-center gap-3">
                    <CheckCircle2 size={24} />
                    Simpan Perubahan Global
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
    </div>
  );
}
