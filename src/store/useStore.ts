import { create } from 'zustand';
import { User, Product, GlobalConfig, Tier } from '../types';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, getDocs, where } from 'firebase/firestore';

interface AppState {
  user: User | null;
  isAuthLoading: boolean;
  products: Product[];
  activeTab: string;
  globalConfig: GlobalConfig | null;
  isDarkMode: boolean;
  tiers: Tier[];
  
  setUser: (user: User | null) => void;
  setIsAuthLoading: (loading: boolean) => void;
  setProducts: (products: Product[]) => void;
  setActiveTab: (tab: string) => void;
  setGlobalConfig: (config: GlobalConfig) => void;
  toggleDarkMode: () => void;
  setTiers: (tiers: Tier[]) => void;
  
  initAuth: () => void;
  fetchProducts: () => Promise<void>;
  fetchGlobalConfig: () => Promise<void>;
  fetchTiers: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  checkVerificationStatus: () => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

export const useStore = create<AppState>((set, get) => {
  // Initialize dark mode on store creation
  const initialDarkMode = typeof window !== 'undefined' ? localStorage.getItem('darkMode') === 'true' : false;
  
  console.log('[Store Init] Starting initialization');
  console.log('[Store Init] localStorage darkMode:', typeof window !== 'undefined' ? localStorage.getItem('darkMode') : 'N/A');
  console.log('[Store Init] initialDarkMode:', initialDarkMode);
  
  // Apply dark mode class immediately on initialization
  if (typeof window !== 'undefined') {
    console.log('[Store Init] Window is defined, applying dark mode');
    console.log('[Store Init] HTML classes before:', document.documentElement.className);
    
    if (initialDarkMode) {
      document.documentElement.classList.add('dark');
      console.log('[Store Init] Added dark class');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('[Store Init] Removed dark class (ensuring light mode)');
    }
    
    console.log('[Store Init] HTML classes after:', document.documentElement.className);
  }

  return {
  user: null,
  isAuthLoading: true,
  products: [],
  activeTab: 'home',
  globalConfig: null,
  isDarkMode: initialDarkMode,
  tiers: [],

  setUser: (user) => set({ user }),
  setIsAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
  setProducts: (products) => set({ products }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setGlobalConfig: (globalConfig) => set({ globalConfig }),
  setTiers: (tiers) => set({ tiers }),
  
  toggleDarkMode: () => {
    const currentMode = get().isDarkMode;
    const newMode = !currentMode;
    
    console.log('[toggleDarkMode] Called');
    console.log('[toggleDarkMode] Current mode:', currentMode);
    console.log('[toggleDarkMode] New mode:', newMode);
    console.log('[toggleDarkMode] HTML element:', document.documentElement);
    console.log('[toggleDarkMode] Current HTML classes before:', document.documentElement.className);
    
    set({ isDarkMode: newMode });
    localStorage.setItem('darkMode', String(newMode));
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      console.log('[toggleDarkMode] Added dark class');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('[toggleDarkMode] Removed dark class');
    }
    
    console.log('[toggleDarkMode] Current HTML classes after:', document.documentElement.className);
    console.log('[toggleDarkMode] localStorage value:', localStorage.getItem('darkMode'));
  },

  getAuthHeaders: async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return {};
    const token = await currentUser.getIdToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  },

  initAuth: () => {
    onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Retry fetching Firestore doc a few times in case of transient offline errors
        const fetchUserDoc = async (retries = 3): Promise<void> => {
          try {
            const docRef = doc(db, 'users', fbUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              set({ 
                user: { ...docSnap.data(), emailVerified: fbUser.emailVerified } as User, 
                isAuthLoading: false 
              });
            } else {
              // Firebase Auth user exists but no Firestore doc yet (e.g. doc write failed)
              // Keep a minimal user object so the app doesn't treat them as logged out
              set({ 
                user: {
                  id: fbUser.uid,
                  name: fbUser.displayName || 'Pengguna',
                  email: fbUser.email || '',
                  role: 'affiliate',
                  emailVerified: fbUser.emailVerified,
                  wishlist: [],
                  commissionEarned: 0,
                  totalSales: 0,
                  totalClicks: 0,
                } as User, 
                isAuthLoading: false 
              });
            }
          } catch (error: any) {
            const isTransient = 
              error?.code === 'unavailable' ||
              error?.code === 'deadline-exceeded' ||
              error?.code === 'resource-exhausted' ||
              error?.message?.includes('offline') ||
              error?.message?.includes('network');
            if (retries > 0 && isTransient) {
              console.warn(`Firestore offline, retrying... (${retries} left)`);
              await new Promise(res => setTimeout(res, 1500));
              return fetchUserDoc(retries - 1);
            }
            console.error('Error fetching user profile:', error);
            // Don't set user to null on network error — keep them "logged in" with basic info
            set({ 
              user: {
                id: fbUser.uid,
                name: fbUser.displayName || 'Pengguna',
                email: fbUser.email || '',
                role: 'affiliate',
                emailVerified: fbUser.emailVerified,
                wishlist: [],
                commissionEarned: 0,
                totalSales: 0,
                totalClicks: 0,
              } as User, 
              isAuthLoading: false 
            });
          }
        };
        await fetchUserDoc();
      } else {
        set({ user: null, isAuthLoading: false });
      }
    });
  },

  fetchProducts: async () => {
    console.log('[fetchProducts] Starting to fetch products...');
    try {
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const products = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      console.log('[fetchProducts] Fetched products:', products.length, products);
      set({ products });
    } catch (error) {
      console.error('[fetchProducts] Error fetching products:', error);
    }
  },

  fetchGlobalConfig: async () => {
    try {
      const docRef = doc(db, 'settings', 'global');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        set({ globalConfig: docSnap.data() as GlobalConfig });
      }
    } catch (error) {
      console.error('Error fetching global config:', error);
    }
  },

  fetchTiers: async () => {
    console.log('[fetchTiers] Starting to fetch tiers...');
    try {
      const q = query(
        collection(db, 'tiers'), 
        where('isActive', '==', true),
        orderBy('order', 'asc')
      );
      const snap = await getDocs(q);
      const tiers = snap.docs.map(d => ({ id: d.id, ...d.data() } as Tier));
      console.log('[fetchTiers] Fetched tiers:', tiers.length, tiers);
      set({ tiers });
    } catch (error) {
      console.error('[fetchTiers] Error fetching tiers:', error);
    }
  },

  updateUserProfile: async (data) => {
    const { user, getAuthHeaders } = get();
    if (!user) return;
    try {
      const resp = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(data)
      });
      if (resp.ok) {
        set({ user: { ...user, ...data } });
      } else {
        const err = await resp.json();
        throw new Error(err.error || 'Gagal update profil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  resendVerificationEmail: async () => {
    const fbUser = auth.currentUser;
    if (fbUser) {
      await sendEmailVerification(fbUser);
    }
  },

  checkVerificationStatus: async () => {
    const fbUser = auth.currentUser;
    if (fbUser) {
      await fbUser.reload();
      const { user } = get();
      if (user) {
        set({ user: { ...user, emailVerified: auth.currentUser?.emailVerified || false } });
      }
    }
  }
};
});
