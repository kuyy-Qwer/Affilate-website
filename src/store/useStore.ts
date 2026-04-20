import { create } from 'zustand';
import { User, Product, GlobalConfig } from '../types';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';

interface AppState {
  user: User | null;
  isAuthLoading: boolean;
  products: Product[];
  activeTab: string;
  globalConfig: GlobalConfig | null;
  
  setUser: (user: User | null) => void;
  setIsAuthLoading: (loading: boolean) => void;
  setProducts: (products: Product[]) => void;
  setActiveTab: (tab: string) => void;
  setGlobalConfig: (config: GlobalConfig) => void;
  
  initAuth: () => void;
  fetchProducts: () => Promise<void>;
  fetchGlobalConfig: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  checkVerificationStatus: () => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  isAuthLoading: true,
  products: [],
  activeTab: 'home',
  globalConfig: null,

  setUser: (user) => set({ user }),
  setIsAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
  setProducts: (products) => set({ products }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setGlobalConfig: (globalConfig) => set({ globalConfig }),

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
            if (retries > 0 && (error?.code === 'unavailable' || error?.message?.includes('offline'))) {
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
    try {
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const products = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      set({ products });
    } catch (error) {
      console.error('Error fetching products:', error);
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
}));
