import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Product, User } from '../types';
import { Plus, Trash2, Edit3, Package, Users, Shield, UserCog } from 'lucide-react';

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

export default function AdminDashboard() {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'users'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
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
      const resp = await fetch('/api/admin/users');
      const data = await resp.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchUsers()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if(!confirm(`Ubah role user ini menjadi ${newRole}?`)) return;
    try {
      const resp = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole })
      });
      if(resp.ok) {
        alert('Role berhasil diperbarui');
        fetchUsers();
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
        headers: { 'Content-Type': 'application/json' },
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
                            <div className="space-y-6">
                                <h4 className="font-bold text-gray-700">Manajemen Modul LMS</h4>
                                <div className="space-y-4">
                                  {(p.modules || []).map((m, idx) => (
                                    <div key={idx} className="flex gap-4 items-start bg-white p-4 rounded-xl border border-gray-200">
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
      ) : (
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
      )}
    </div>
  );
}
