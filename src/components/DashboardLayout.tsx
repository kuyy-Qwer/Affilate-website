import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, ShoppingBag, Heart, User, LogOut, Menu, X,
  BarChart3, Tag, Trophy, Wallet, Package, Settings, Shield,
  Users, Ticket, History, Globe, ChevronRight, Bell, Search
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  roles?: ('admin' | 'affiliate' | 'customer')[];
}

const affiliateItems: SidebarItem[] = [
  { id: 'affiliate', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'affiliate-stats', label: 'Statistik', icon: <BarChart3 size={18} /> },
  { id: 'affiliate-marketing', label: 'Marketing Kit', icon: <Tag size={18} /> },
  { id: 'affiliate-leaderboard', label: 'Leaderboard', icon: <Trophy size={18} /> },
  { id: 'purchases', label: 'Produk Saya', icon: <Package size={18} /> },
  { id: 'wishlist', label: 'Wishlist', icon: <Heart size={18} /> },
  { id: 'profile', label: 'Profil', icon: <User size={18} /> },
];

const adminItems: SidebarItem[] = [
  { id: 'admin-products', label: 'Produk', icon: <ShoppingBag size={18} /> },
  { id: 'admin-users', label: 'Pengguna', icon: <Users size={18} /> },
  { id: 'admin-sales', label: 'Penjualan', icon: <BarChart3 size={18} /> },
  { id: 'admin-coupons', label: 'Kupon', icon: <Ticket size={18} /> },
  { id: 'admin-withdrawals', label: 'Pencairan', icon: <Wallet size={18} /> },
  { id: 'admin-events', label: 'Promo & Event', icon: <Globe size={18} /> },
  { id: 'admin-logs', label: 'Log Aktivitas', icon: <History size={18} /> },
  { id: 'profile', label: 'Profil', icon: <User size={18} /> },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  onNavigatePublic: (tab: string) => void;
}

export default function DashboardLayout({ children, activeTab, onNavigate, onLogout, onNavigatePublic }: DashboardLayoutProps) {
  const { user } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminItems : affiliateItems;

  const tier = (user as any)?.tier || 'bronze';
  const tierConfig = {
    diamond: { color: 'bg-blue-500', text: 'Diamond', textColor: 'text-blue-600' },
    gold: { color: 'bg-amber-400', text: 'Gold', textColor: 'text-amber-600' },
    bronze: { color: 'bg-orange-400', text: 'Bronze', textColor: 'text-orange-600' },
  }[tier] || { color: 'bg-gray-400', text: 'Bronze', textColor: 'text-gray-600' };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <button
          onClick={() => { onNavigatePublic('home'); setSidebarOpen(false); }}
          className="flex items-center gap-3"
        >
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-white font-black text-lg">D</span>
          </div>
          <div>
            <span className="font-black text-gray-900 text-lg tracking-tight">DigiSell</span>
            <p className="text-[10px] text-gray-400 font-medium -mt-0.5">{isAdmin ? 'Admin Panel' : 'Affiliate Panel'}</p>
          </div>
        </button>
      </div>

      {/* User Card */}
      <div className="px-4 py-4">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-200 flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          {!isAdmin && (
            <div className="mt-3 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${tierConfig.color}`} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${tierConfig.textColor}`}>{tierConfig.text}</span>
              <span className="text-[10px] text-gray-400 ml-auto">
                {tier === 'bronze' ? '10%' : tier === 'gold' ? '15%' : '25%'} komisi
              </span>
            </div>
          )}
          {isAdmin && (
            <div className="mt-3 flex items-center gap-2">
              <Shield size={12} className="text-indigo-500" />
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Administrator</span>
            </div>
          )}
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2">
          {isAdmin ? 'Manajemen' : 'Menu Utama'}
        </p>
        {navItems.map((item) => {
          const isActive = activeTab === item.id ||
            (item.id === 'affiliate' && activeTab === 'affiliate') ||
            (item.id === 'admin-products' && activeTab === 'admin' && true);

          return (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight size={14} className="text-white/70" />}
            </button>
          );
        })}

        <div className="pt-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2">Navigasi</p>
          <button
            onClick={() => { onNavigatePublic('products'); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all group"
          >
            <ShoppingBag size={18} className="text-gray-400 group-hover:text-gray-600" />
            Katalog Produk
          </button>
        </div>
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut size={18} />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 fixed top-0 left-0 bottom-0 z-30 shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl lg:hidden"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X size={20} />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-20 px-4 sm:px-6 h-16 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-black text-gray-900 text-base leading-tight">
                {navItems.find(i => i.id === activeTab)?.label || (isAdmin ? 'Admin Panel' : 'Dashboard')}
              </h1>
              <p className="text-[10px] text-gray-400 font-medium hidden sm:block">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all relative">
              <Bell size={18} />
            </button>
            <button
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-2 pl-3 pr-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all border border-gray-100"
            >
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-gray-700 hidden sm:block">{user?.name?.split(' ')[0]}</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
