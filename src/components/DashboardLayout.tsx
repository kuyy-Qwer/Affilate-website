import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, ShoppingBag, Heart, User, LogOut, Menu, X,
  BarChart3, Tag, Trophy, Wallet, Package, Settings, Shield,
  Users, Ticket, History, Globe, ChevronRight, Bell, Search, Moon, Sun, Info
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
  { id: 'about', label: 'Tentang', icon: <Info size={18} /> },
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
  { id: 'about', label: 'Tentang', icon: <Info size={18} /> },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  onNavigatePublic: (tab: string) => void;
}

export default function DashboardLayout({ children, activeTab, onNavigate, onLogout, onNavigatePublic }: DashboardLayoutProps) {
  const { user, isDarkMode, toggleDarkMode, tiers } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminItems : affiliateItems;

  const userTierName = user?.tier || 'starter';
  const userTier = tiers.find(t => t.id === userTierName || t.name === userTierName);
  
  const tierConfig = userTier ? {
    color: userTier.color,
    text: userTier.displayName,
    textColor: `text-[${userTier.color}]`,
    commissionRate: `${(userTier.commissionRate * 100).toFixed(0)}%`
  } : {
    color: '#9CA3AF',
    text: 'Starter',
    textColor: 'text-gray-600',
    commissionRate: '5%'
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={() => { onNavigatePublic('home'); setSidebarOpen(false); }}
          className="flex items-center gap-3"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-[#1F6F5F] to-[#2FA084] rounded-xl flex items-center justify-center shadow-lg shadow-[#2FA084]/30">
            <span className="text-white font-black text-lg">D</span>
          </div>
          <div>
            <span className="font-black text-gray-900 dark:text-white text-lg tracking-tight">DigiSell</span>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium -mt-0.5">{isAdmin ? 'Admin Panel' : 'Affiliate Panel'}</p>
          </div>
        </button>
      </div>

      {/* User Card */}
      <div className="px-4 py-4">
        <div className="bg-gradient-to-br from-[#1F6F5F] via-[#2FA084] to-[#6FCF97] rounded-2xl p-[2px] shadow-lg shadow-[#2FA084]/30">
          <div className="bg-white rounded-[15px] p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-[#1F6F5F] to-[#2FA084] rounded-xl flex items-center justify-center text-white font-black text-base shadow-lg shadow-[#2FA084]/50 flex-shrink-0">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#6FCF97] rounded-full border-2 border-white"></div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-gray-900 text-sm truncate">{user?.name}</p>
                <p className="text-[10px] text-gray-500 truncate font-medium">{user?.email}</p>
              </div>
            </div>
            {!isAdmin && (
              <div className="mt-4 p-3 bg-gradient-to-r from-[#6FCF97]/20 to-[#2FA084]/20 rounded-xl border border-[#2FA084]/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: tierConfig.color }} />
                    <span className="text-xs font-black uppercase tracking-wider" style={{ color: tierConfig.color }}>
                      {userTier?.icon} {tierConfig.text} Tier
                    </span>
                  </div>
                  <span className="text-xs font-black text-[#1F6F5F] bg-white px-2 py-1 rounded-lg">
                    {tierConfig.commissionRate}
                  </span>
                </div>
              </div>
            )}
            {isAdmin && (
              <div className="mt-4 p-3 bg-gradient-to-r from-[#6FCF97]/20 to-[#2FA084]/20 rounded-xl border border-[#2FA084]/30">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-[#1F6F5F]" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#1F6F5F]">Administrator</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 py-2">
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
                  ? 'bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white shadow-lg shadow-[#2FA084]/30'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#6FCF97]/30 text-[#1F6F5F]'
                }`}>
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight size={14} className="text-white/70" />}
            </button>
          );
        })}

        <div className="pt-4">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 py-2">Navigasi</p>
          <button
            onClick={() => { onNavigatePublic('products'); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-all group"
          >
            <ShoppingBag size={18} className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
            Katalog Produk
          </button>
        </div>
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all border border-gray-200 dark:border-gray-600"
        >
          <div className="flex items-center gap-3">
            {isDarkMode ? (
              <>
                <Sun size={18} className="text-amber-500" />
                <span>Mode Terang</span>
              </>
            ) : (
              <>
                <Moon size={18} className="text-indigo-500" />
                <span>Mode Gelap</span>
              </>
            )}
          </div>
          {/* Toggle Switch Visual */}
          <div className={`relative w-11 h-6 rounded-full transition-colors ${isDarkMode ? 'bg-[#2FA084]' : 'bg-gray-300'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isDarkMode ? 'right-1' : 'left-1'}`} />
          </div>
        </button>
        
        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-red-100 dark:border-red-900/30"
        >
          <LogOut size={18} />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 fixed top-0 left-0 bottom-0 z-30 shadow-sm transition-colors duration-200">
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
              className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-gray-800 z-50 shadow-2xl lg:hidden transition-colors duration-200"
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
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-700 sticky top-0 z-20 px-4 sm:px-6 h-16 flex items-center justify-between shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-[#6FCF97]/20 hover:text-[#1F6F5F] rounded-xl transition-all"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-black text-gray-900 dark:text-white text-base leading-tight bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] bg-clip-text text-transparent">
                {navItems.find(i => i.id === activeTab)?.label || (isAdmin ? 'Admin Panel' : 'Dashboard')}
              </h1>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium hidden sm:block">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle Button */}
            <button 
              onClick={toggleDarkMode}
              className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-[#1F6F5F] dark:hover:text-[#6FCF97] hover:bg-[#6FCF97]/20 dark:hover:bg-[#1F6F5F]/20 rounded-xl transition-all border border-gray-200 dark:border-gray-700"
              title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              {isDarkMode ? (
                <Sun size={18} className="text-amber-500" />
              ) : (
                <Moon size={18} className="text-indigo-600" />
              )}
            </button>
            
            {/* Notification Button */}
            <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-[#1F6F5F] dark:hover:text-[#6FCF97] hover:bg-[#6FCF97]/20 dark:hover:bg-[#1F6F5F]/20 rounded-xl transition-all relative group">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            <button
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-2 pl-3 pr-4 py-2 bg-gradient-to-r from-[#6FCF97]/20 to-[#2FA084]/20 hover:from-[#6FCF97]/30 hover:to-[#2FA084]/30 dark:from-[#1F6F5F]/20 dark:to-[#2FA084]/20 dark:hover:from-[#1F6F5F]/30 dark:hover:to-[#2FA084]/30 rounded-xl transition-all border border-[#2FA084]/30 dark:border-[#2FA084]/20"
            >
              <div className="w-7 h-7 bg-gradient-to-br from-[#1F6F5F] to-[#2FA084] rounded-lg flex items-center justify-center text-white font-black text-xs shadow-md">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 hidden sm:block">{user?.name?.split(' ')[0]}</span>
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
