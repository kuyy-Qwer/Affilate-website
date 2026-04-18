import { useState } from 'react';
import { ShoppingBag, Users, LayoutDashboard, LogIn, UserPlus, Menu, X, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  onNavigate: (tab: any) => void;
  activeTab: string;
}

export default function Navbar({ user, onNavigate, activeTab }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (tab: any) => {
    onNavigate(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => handleNavigate('home')}
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">D</span>
              </div>
              <span className="font-bold text-xl tracking-tight">DigiSell</span>
            </div>
            
              <div className="hidden md:flex items-center gap-6">
                <NavItem id="nav-products" active={activeTab === 'products'} onClick={() => handleNavigate('products')} label="Produk" />
                <NavItem id="nav-features" active={activeTab === 'features'} onClick={() => handleNavigate('features')} label="Fitur" />
                <NavItem id="nav-pricing" active={activeTab === 'pricing'} onClick={() => handleNavigate('pricing')} label="Paket" />
                <NavItem active={activeTab === 'about'} onClick={() => handleNavigate('about')} label="Tentang" />
              </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
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
                  id="nav-dashboard"
                  onClick={() => handleNavigate(user.role === 'admin' ? 'admin' : 'affiliate')}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  <LayoutDashboard size={18} />
                  Dashboard
                </button>
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleNavigate('login')}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  <LogIn size={18} /> Masuk
                </button>
                <button 
                  id="nav-register"
                  onClick={() => handleNavigate('register')}
                  className="flex items-center gap-2 text-sm font-semibold bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
                >
                  <UserPlus size={18} /> Daftar
                </button>
              </div>
            )}
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
              className="fixed right-0 top-0 bottom-0 w-[80%] max-w-sm bg-white z-50 shadow-2xl md:hidden p-6"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">D</div>
                  <span className="font-bold text-lg">DigiSell</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400"><X size={24} /></button>
              </div>

              <div className="space-y-2">
                <MobileNavItem active={activeTab === 'home'} onClick={() => handleNavigate('home')} label="Beranda" />
                <MobileNavItem active={activeTab === 'products'} onClick={() => handleNavigate('products')} label="Produk" />
                {user && <MobileNavItem active={activeTab === 'wishlist'} onClick={() => handleNavigate('wishlist')} label="Wishlist" />}
                <MobileNavItem active={activeTab === 'features'} onClick={() => handleNavigate('features')} label="Fitur" />
                <MobileNavItem active={activeTab === 'pricing'} onClick={() => handleNavigate('pricing')} label="Paket" />
                <MobileNavItem active={activeTab === 'about'} onClick={() => handleNavigate('about')} label="Tentang" />
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col gap-4">
                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleNavigate(user.role === 'admin' ? 'admin' : 'affiliate')}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-bold"
                    >
                      <LayoutDashboard size={20} />
                      Ke Dashboard
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => handleNavigate('login')}
                      className="w-full py-4 text-gray-600 font-bold border border-gray-100 rounded-2xl"
                    >
                      Masuk
                    </button>
                    <button 
                      onClick={() => handleNavigate('register')}
                      className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100"
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

function NavItem({ active, onClick, label, id }: any) {
  return (
    <button 
      id={id}
      onClick={onClick}
      className={`text-sm font-medium transition-colors relative ${
        active ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'
      }`}
    >
      {label}
      {active && (
        <motion.div 
          layoutId="navbar-underline"
          className="absolute -bottom-[22px] left-0 right-0 h-0.5 bg-indigo-600"
        />
      )}
    </button>
  );
}

function MobileNavItem({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${
        active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}
