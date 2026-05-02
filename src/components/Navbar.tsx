import { useState } from 'react';
import { ShoppingBag, Users, LayoutDashboard, LogIn, UserPlus, Menu, X, Heart, LogOut, Package, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { useStore } from '../store/useStore';

interface NavbarProps {
  user: User | null;
  onNavigate: (tab: string) => void;
  activeTab: string;
  onLogout: () => void;
}

export default function Navbar({ user, onNavigate, activeTab, onLogout }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDarkMode, toggleDarkMode, searchQuery, setSearchQuery } = useStore();

  const handleNavigate = (tab: string) => {
    onNavigate(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => handleNavigate('home')}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#1F6F5F] to-[#2FA084] rounded-lg flex items-center justify-center shadow-lg shadow-[#2FA084]/30">
                <span className="text-white font-bold">D</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">DigiSell</span>
            </div>
            
              <div className="hidden md:flex items-center gap-6">
                <NavItem id="nav-products" active={activeTab === 'products'} onClick={() => handleNavigate('products')} label="Produk" />
                <NavItem id="nav-features" active={activeTab === 'features'} onClick={() => handleNavigate('features')} label="Fitur" />
                <NavItem id="nav-pricing" active={activeTab === 'pricing'} onClick={() => handleNavigate('pricing')} label="Paket" />
                <NavItem id="nav-privacy" active={activeTab === 'privacy'} onClick={() => handleNavigate('privacy')} label="Kebijakan Privasi" />
                <NavItem id="nav-terms" active={activeTab === 'terms'} onClick={() => handleNavigate('terms')} label="Syarat & Ketentuan" />
                <NavItem active={activeTab === 'about'} onClick={() => handleNavigate('about')} label="Tentang" />
              </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-[#1F6F5F] dark:hover:text-[#6FCF97] hover:bg-[#6FCF97]/20 dark:hover:bg-[#1F6F5F]/20 rounded-xl transition-all border border-gray-200 dark:border-gray-700"
              title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              {isDarkMode ? (
                <Sun size={18} className="text-amber-500" />
              ) : (
                <Moon size={18} className="text-[#1F6F5F]" />
              )}
            </button>
            
            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleNavigate('wishlist')}
                  className={`p-2 rounded-xl transition-all ${activeTab === 'wishlist' ? 'bg-red-50 text-red-500' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                  title="Wishlist"
                >
                  <Heart size={20} fill={activeTab === 'wishlist' ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={() => handleNavigate('purchases')}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'purchases' ? 'text-[#1F6F5F] dark:text-[#6FCF97]' : 'text-gray-600 dark:text-gray-300 hover:text-[#1F6F5F] dark:hover:text-[#6FCF97]'}`}
                  title="Produk Saya"
                >
                  <Package size={18} />
                  Produk Saya
                </button>
                <button 
                  id="nav-dashboard"
                  onClick={() => handleNavigate(user.role === 'admin' ? 'admin' : 'affiliate')}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-[#1F6F5F] dark:hover:text-[#6FCF97] transition-colors"
                >
                  <LayoutDashboard size={18} />
                  Dashboard
                </button>
                <button 
                  onClick={() => handleNavigate('profile')}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-[#1F6F5F] dark:text-[#6FCF97]' : 'text-gray-600 dark:text-gray-300 hover:text-[#1F6F5F] dark:hover:text-[#6FCF97]'}`}
                >
                  <Users size={18} />
                  Profil
                </button>
                <div className="w-8 h-8 bg-gradient-to-br from-[#6FCF97]/30 to-[#2FA084]/30 rounded-full flex items-center justify-center text-[#1F6F5F] font-bold text-xs border border-[#2FA084]/50">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <button 
                  onClick={onLogout}
                  className="flex items-center gap-1.5 text-sm font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-all"
                >
                  <LogOut size={18} />
                  Keluar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleNavigate('login')}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-[#1F6F5F] dark:hover:text-[#6FCF97] transition-colors"
                >
                  <LogIn size={18} /> Masuk
                </button>
                <button 
                  id="nav-register"
                  onClick={() => handleNavigate('register')}
                  className="flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white px-5 py-2.5 rounded-xl hover:from-[#2FA084] hover:to-[#6FCF97] transition-all shadow-lg shadow-[#2FA084]/30"
                >
                  <UserPlus size={18} /> Daftar
                </button>
              </div>
            )}
          </div>

          {/* Search (Phase 1.1) */}
          <div className="hidden md:flex items-center justify-center mx-4" aria-label="Cari produk">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk..."
              className="w-64 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[80%] max-w-sm bg-white dark:bg-gray-800 z-50 shadow-2xl md:hidden p-6 transition-colors duration-200"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#1F6F5F] to-[#2FA084] rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-[#2FA084]/30">D</div>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">DigiSell</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 dark:text-gray-500"><X size={24} /></button>
              </div>

              <div className="space-y-2">
                <MobileNavItem active={activeTab === 'home'} onClick={() => handleNavigate('home')} label="Beranda" />
                <MobileNavItem active={activeTab === 'products'} onClick={() => handleNavigate('products')} label="Produk" />
                {user && <MobileNavItem active={activeTab === 'wishlist'} onClick={() => handleNavigate('wishlist')} label="Wishlist" />}
                {user && <MobileNavItem active={activeTab === 'purchases'} onClick={() => handleNavigate('purchases')} label="Produk Saya" />}
                {user && <MobileNavItem active={activeTab === 'profile'} onClick={() => handleNavigate('profile')} label="Profil Saya" />}
                <MobileNavItem active={activeTab === 'features'} onClick={() => handleNavigate('features')} label="Fitur" />
                <MobileNavItem active={activeTab === 'pricing'} onClick={() => handleNavigate('pricing')} label="Paket" />
                <MobileNavItem active={activeTab === 'about'} onClick={() => handleNavigate('about')} label="Tentang" />
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-4">
                {/* Dark Mode Toggle Mobile */}
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
                        <Moon size={18} className="text-[#1F6F5F]" />
                        <span>Mode Gelap</span>
                      </>
                    )}
                  </div>
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${isDarkMode ? 'bg-[#2FA084]' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isDarkMode ? 'right-1' : 'left-1'}`} />
                  </div>
                </button>
                
                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#6FCF97]/20 to-[#2FA084]/20 dark:from-[#1F6F5F]/20 dark:to-[#2FA084]/20 rounded-2xl border border-[#2FA084]/30 dark:border-[#2FA084]/20">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#1F6F5F] to-[#2FA084] rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-[#2FA084]/30">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleNavigate(user.role === 'admin' ? 'admin' : 'affiliate')}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white rounded-2xl font-bold shadow-lg shadow-[#2FA084]/30"
                    >
                      <LayoutDashboard size={20} />
                      Ke Dashboard
                    </button>
                    <button 
                      onClick={onLogout}
                      className="w-full flex items-center justify-center gap-2 py-4 text-red-500 font-bold border border-red-50 rounded-2xl hover:bg-red-50 transition-all"
                    >
                      <LogOut size={20} />
                      Keluar
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => handleNavigate('login')}
                      className="w-full py-4 text-gray-600 dark:text-gray-300 font-bold border border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                      Masuk
                    </button>
                    <button 
                      onClick={() => handleNavigate('register')}
                      className="w-full py-4 bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white font-bold rounded-2xl shadow-lg shadow-[#2FA084]/30 hover:from-[#2FA084] hover:to-[#6FCF97] transition-all"
                    >
                      Daftar Sekarang
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

function NavItem({ active, onClick, label, id }: { active: boolean; onClick: () => void; label: string; id?: string }) {
  return (
    <button 
      id={id}
      onClick={onClick}
      className={`text-sm font-medium transition-colors relative ${
        active ? 'text-[#1F6F5F] dark:text-[#6FCF97]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      {label}
      {active && (
        <motion.div 
          layoutId="navbar-underline"
          className="absolute -bottom-[22px] left-0 right-0 h-0.5 bg-[#2FA084]"
        />
      )}
    </button>
  );
}

function MobileNavItem({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${
        active ? 'bg-gradient-to-r from-[#6FCF97]/30 to-[#2FA084]/30 dark:from-[#1F6F5F]/30 dark:to-[#2FA084]/30 text-[#1F6F5F] dark:text-[#6FCF97] border border-[#2FA084]/50 dark:border-[#2FA084]/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}
