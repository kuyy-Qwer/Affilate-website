import { create } from 'zustand';
import { User, Product } from '../types';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';

interface AppState {
  user: User | null;
  isAuthLoading: boolean;
  products: Product[];
  activeTab: string;
  
  setUser: (user: User | null) => void;
  setIsAuthLoading: (loading: boolean) => void;
  setProducts: (products: Product[]) => void;
  setActiveTab: (tab: string) => void;
  
  initAuth: () => void;
  fetchProducts: () => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  isAuthLoading: true,
  products: [],
  activeTab: 'home',

  setUser: (user) => set({ user }),
  setIsAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
  setProducts: (products) => set({ products }),
  setActiveTab: (activeTab) => set({ activeTab }),

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
        try {
          const docRef = doc(db, 'users', fbUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            set({ user: docSnap.data() as User, isAuthLoading: false });
          } else {
            set({ user: null, isAuthLoading: false });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          set({ user: null, isAuthLoading: false });
        }
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
  }
}));
