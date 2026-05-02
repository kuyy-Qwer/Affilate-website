import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Shield, UserCog, Search, X, Check, AlertTriangle,
  ChevronDown, Mail, BarChart3, ShoppingBag, Crown, Star,
  UserCheck, UserX, Edit3, Save, RefreshCw
} from 'lucide-react';
import { User } from '../types';

type Role = 'admin' | 'affiliate' | 'customer';

const ROLE_CONFIG: Record<Role, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  desc: string;
  permissions: string[];
}> = {
  admin: {
    label: 'Admin',
    color: 'text-purple-700',
    bg: 'bg-purple-100',
    border: 'border-purple-200',
    icon: <Crown size={14} />,
    desc: 'Akses penuh ke semua fitur platform',
    permissions: [
      'Kelola produk (tambah, edit, hapus)',
      'Kelola semua pengguna & role',
      'Lihat semua transaksi penjualan',
      'Buat & hapus kupon diskon',
      'Proses permintaan pencairan',
      'Atur promo & geo-pricing',
      'Lihat audit log aktivitas',
    ],
  },
  affiliate: {
    label: 'Affiliate',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    border: 'border-blue-200',
    icon: <Star size={14} />,
    desc: 'Akses dashboard afiliasi & komisi',
    permissions: [
      'Lihat statistik & komisi pribadi',
      'Akses marketing kit produk',
      'Lihat leaderboard afiliasi',
      'Ajukan pencairan komisi',
      'Beli & akses produk digital',
      'Kelola wishlist produk',
    ],
  },
  customer: {
    label: 'Customer',
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    icon: <UserCheck size={14} />,
    desc: 'Akses dasar untuk membeli produk',
    permissions: [
      'Beli produk digital',
      'Akses produk yang dibeli',
      'Kelola wishlist produk',
      'Lihat riwayat pembelian',
    ],
  },
};

interface ConfirmModal {
  isOpen: boolean;
  user: User | null;
  newRole: Role | null;
}

interface EditModal {
  isOpen: boolean;
  user: User | null;
  name: string;
  email: string;
}

interface UserAccessManagerProps {
  users: User[];
  onRoleChange: (userId: string, newRole: string) => Promise<void>;
  onUpdateDetails: (e: React.FormEvent) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  userEditingId: string | null;
  setUserEditingId: (id: string | null) => void;
  editUserName: string;
  setEditUserName: (v: string) => void;
  editUserEmail: string;
  setEditUserEmail: (v: string) => void;
}

export default function UserAccessManager({
  users,
  onRoleChange,
  onUpdateDetails,
  onDeleteUser,
  userEditingId,
  setUserEditingId,
  editUserName,
  setEditUserName,
  editUserEmail,
  setEditUserEmail,
}: UserAccessManagerProps) {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all');
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>({ isOpen: false, user: null, newRole: null });
  const [editModal, setEditModal] = useState<EditModal>({ isOpen: false, user: null, name: '', email: '' });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; user: User | null }>({ isOpen: false, user: null });
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.referralCode || '').toLowerCase().includes(search.toLowerCase());
      const matchRole = filterRole === 'all' || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, search, filterRole]);

  const stats = useMemo(() => ({
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    affiliate: users.filter(u => u.role === 'affiliate').length,
    customer: users.filter(u => u.role === 'customer').length,
  }), [users]);

  const handleRoleClick = (user: User, newRole: Role) => {
    if (user.role === newRole) return;
    setConfirmModal({ isOpen: true, user, newRole });
  };

  const handleConfirmRole = async () => {
    if (!confirmModal.user || !confirmModal.newRole) return;
    setIsChangingRole(true);
    try {
      await onRoleChange(confirmModal.user.id, confirmModal.newRole);
      setConfirmModal({ isOpen: false, user: null, newRole: null });
    } finally {
      setIsChangingRole(false);
    }
  };

  const openEditModal = (user: User) => {
    setUserEditingId(user.id);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditModal({ isOpen: true, user, name: user.name, email: user.email });
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Pengguna', value: stats.total, icon: <Users size={18} />, color: 'text-gray-600', bg: 'bg-gray-100' },
          { label: 'Admin', value: stats.admin, icon: <Crown size={18} />, color: 'text-purple-600', bg: 'bg-purple-100' },
          { label: 'Affiliate', value: stats.affiliate, icon: <Star size={18} />, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Customer', value: stats.customer, icon: <UserCheck size={18} />, color: 'text-green-600', bg: 'bg-green-100' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg} ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Role Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([role, cfg]) => (
          <div key={role} className={`bg-white rounded-2xl border ${cfg.border} p-5 space-y-3`}>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${cfg.bg} ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">{cfg.desc}</p>
            <ul className="space-y-1.5">
              {cfg.permissions.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <Check size={12} className={`mt-0.5 flex-shrink-0 ${cfg.color}`} />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, email, atau kode referal..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'admin', 'affiliate', 'customer'] as const).map(r => (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  filterRole === r
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {r === 'all' ? 'Semua' : ROLE_CONFIG[r].label}
              </button>
            ))}
          </div>
        </div>

        {/* User List */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-sm">Tidak ada pengguna ditemukan</p>
            </div>
          )}
          {filtered.map(u => {
            const cfg = ROLE_CONFIG[u.role as Role] || ROLE_CONFIG.customer;
            const isSelected = selectedUser?.id === u.id;
            return (
              <motion.div
                key={u.id}
                layout
                className={`border rounded-2xl overflow-hidden transition-all ${
                  isSelected ? 'border-indigo-200 shadow-md' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {/* User Row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                  onClick={() => setSelectedUser(isSelected ? null : u)}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 text-sm truncate">{u.name}</p>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${cfg.bg} ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 text-xs text-gray-500">
                    <div className="text-center">
                      <p className="font-black text-gray-900">{u.totalSales || 0}</p>
                      <p>Penjualan</p>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-indigo-600">Rp {((u.commissionEarned || 0) / 1000).toFixed(0)}K</p>
                      <p>Komisi</p>
                    </div>
                  </div>

                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform flex-shrink-0 ${isSelected ? 'rotate-180' : ''}`}
                  />
                </div>

                {/* Expanded Panel */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-5">
                        {/* Detail Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <p className="text-gray-400 font-bold uppercase tracking-wider mb-1">User ID</p>
                            <p className="font-mono text-gray-600 truncate">{u.id.slice(0, 12)}...</p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-bold uppercase tracking-wider mb-1">Kode Referal</p>
                            <p className="font-mono font-bold text-indigo-600">{u.referralCode || '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-bold uppercase tracking-wider mb-1">Total Klik</p>
                            <p className="font-bold text-gray-900">{u.totalClicks || 0}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-bold uppercase tracking-wider mb-1">Bergabung</p>
                            <p className="font-bold text-gray-900">
                              {(u as any).createdAt
                                ? new Date((u as any).createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '-'}
                            </p>
                          </div>
                        </div>

                        {/* Role Changer */}
                        <div className="space-y-2">
                          <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Ubah Hak Akses</p>
                          <div className="flex flex-wrap gap-2">
                            {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([role, rcfg]) => (
                              <button
                                key={role}
                                onClick={() => handleRoleClick(u, role)}
                                disabled={u.role === role}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                                  u.role === role
                                    ? `${rcfg.bg} ${rcfg.color} ${rcfg.border} cursor-default ring-2 ring-offset-1 ${
                                        role === 'admin' ? 'ring-purple-300' :
                                        role === 'affiliate' ? 'ring-blue-300' : 'ring-gray-300'
                                      }`
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50'
                                }`}
                              >
                                {rcfg.icon}
                                {rcfg.label}
                                {u.role === role && <Check size={12} />}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-400">
                            Role saat ini: <span className={`font-black ${cfg.color}`}>{cfg.label}</span> — {cfg.desc}
                          </p>
                        </div>

                        {/* Edit Details */}
                        <div className="flex gap-2 pt-2 border-t border-gray-200">
                          <button
                            onClick={() => openEditModal(u)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all"
                          >
                            <Edit3 size={14} /> Edit Nama & Email
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, user: u })}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 hover:border-red-300 transition-all"
                          >
                            <UserX size={14} /> Hapus Pengguna
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Confirm Role Change Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && confirmModal.user && confirmModal.newRole && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <AlertTriangle size={24} />
                </div>
                <button
                  onClick={() => setConfirmModal({ isOpen: false, user: null, newRole: null })}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-gray-900">Konfirmasi Ubah Role</h3>
                <p className="text-sm text-gray-500">Tindakan ini akan mengubah hak akses pengguna secara langsung.</p>
              </div>

              {/* User Info */}
              <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-black">
                  {confirmModal.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{confirmModal.user.name}</p>
                  <p className="text-xs text-gray-500">{confirmModal.user.email}</p>
                </div>
              </div>

              {/* Role Change Arrow */}
              <div className="flex items-center gap-3 justify-center">
                <span className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black ${ROLE_CONFIG[confirmModal.user.role as Role]?.bg} ${ROLE_CONFIG[confirmModal.user.role as Role]?.color}`}>
                  {ROLE_CONFIG[confirmModal.user.role as Role]?.icon}
                  {ROLE_CONFIG[confirmModal.user.role as Role]?.label}
                </span>
                <div className="flex-1 h-px bg-gray-200 relative">
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <div className="w-2 h-2 border-t-2 border-r-2 border-gray-300 rotate-45 -mr-1" />
                  </div>
                </div>
                <span className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black ${ROLE_CONFIG[confirmModal.newRole].bg} ${ROLE_CONFIG[confirmModal.newRole].color}`}>
                  {ROLE_CONFIG[confirmModal.newRole].icon}
                  {ROLE_CONFIG[confirmModal.newRole].label}
                </span>
              </div>

              {/* Permissions Preview */}
              <div className={`rounded-2xl p-4 border ${ROLE_CONFIG[confirmModal.newRole].border} space-y-2`}>
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Hak akses baru:</p>
                <ul className="space-y-1.5">
                  {ROLE_CONFIG[confirmModal.newRole].permissions.map((p, i) => (
                    <li key={i} className={`flex items-start gap-2 text-xs ${ROLE_CONFIG[confirmModal.newRole].color}`}>
                      <Check size={12} className="mt-0.5 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Warning for admin */}
              {confirmModal.newRole === 'admin' && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3">
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 font-medium">
                    <strong>Perhatian:</strong> Role Admin memberikan akses penuh ke seluruh sistem termasuk data pengguna, transaksi, dan pengaturan platform. Pastikan Anda mempercayai pengguna ini.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal({ isOpen: false, user: null, newRole: null })}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmRole}
                  disabled={isChangingRole}
                  className={`flex-1 py-3 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
                    confirmModal.newRole === 'admin'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isChangingRole ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {isChangingRole ? 'Menyimpan...' : 'Ya, Ubah Role'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Details Modal */}
      <AnimatePresence>
        {editModal.isOpen && editModal.user && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Edit Data Pengguna</h3>
                  <p className="text-sm text-gray-500 mt-1">Ubah nama dan email pengguna ini.</p>
                </div>
                <button
                  onClick={() => { setEditModal({ isOpen: false, user: null, name: '', email: '' }); setUserEditingId(null); }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  await onUpdateDetails(e);
                  setEditModal({ isOpen: false, user: null, name: '', email: '' });
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Nama Lengkap</label>
                  <input
                    required
                    value={editUserName}
                    onChange={e => setEditUserName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Alamat Email</label>
                  <input
                    required
                    type="email"
                    value={editUserEmail}
                    onChange={e => setEditUserEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setEditModal({ isOpen: false, user: null, name: '', email: '' }); setUserEditingId(null); }}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> Simpan
                  </button>
                </div>
               </form>
             </motion.div>
           </div>
         )}
       </AnimatePresence>

       {/* Delete User Confirmation Modal */}
       <AnimatePresence>
         {deleteModal.isOpen && deleteModal.user && (
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
             <motion.div
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6"
             >
               <div className="flex items-start justify-between">
                 <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
                   <UserX size={24} />
                 </div>
                 <button
                   onClick={() => setDeleteModal({ isOpen: false, user: null })}
                   className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
                 >
                   <X size={20} />
                 </button>
               </div>

               <div className="space-y-1">
                 <h3 className="text-xl font-black text-gray-900">Hapus Pengguna</h3>
                 <p className="text-sm text-gray-500">Tindakan ini akan menghapus pengguna secara permanen dari sistem. Tidak dapat dibatalkan.</p>
               </div>

               {/* User Info */}
               <div className="bg-red-50 rounded-2xl p-4 flex items-center gap-3 border border-red-100">
                 <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 font-black">
                   {deleteModal.user.name.charAt(0).toUpperCase()}
                 </div>
                 <div>
                   <p className="font-bold text-gray-900 text-sm">{deleteModal.user.name}</p>
                   <p className="text-xs text-gray-500">{deleteModal.user.email}</p>
                 </div>
               </div>

               {/* Warning */}
               <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                 <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                 <p className="text-xs text-amber-700 font-medium">
                   <strong>Perhatian:</strong> Data pengguna, termasuk riwayat transaksi dan komisi, akan dihapus. Pastikan Anda yakin sebelum melanjutkan.
                 </p>
               </div>

               {/* Actions */}
               <div className="flex gap-3">
                 <button
                   onClick={() => setDeleteModal({ isOpen: false, user: null })}
                   className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
                 >
                   Batal
                 </button>
                 <button
                   onClick={async () => {
                     if (!deleteModal.user) return;
                     setIsDeleting(true);
                     try {
                       await onDeleteUser(deleteModal.user.id);
                       setDeleteModal({ isOpen: false, user: null });
                     } finally {
                       setIsDeleting(false);
                     }
                   }}
                   disabled={isDeleting}
                   className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold text-sm hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                 >
                   {isDeleting ? (
                     <RefreshCw size={16} className="animate-spin" />
                   ) : (
                     <UserX size={16} />
                   )}
                   {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                 </button>
               </div>
             </motion.div>
           </div>
         )}
       </AnimatePresence>
     </div>
   );
}
