import { create } from 'zustand';
import { User, Product, GlobalConfig, Tier } from '../types';
import { supabase } from '../lib/supabase';

interface AppState {
  user: User | null;
  isAuthLoading: boolean;
  products: Product[];
  activeTab: string;
  globalConfig: GlobalConfig | null;
  isDarkMode: boolean;
  tiers: Tier[];
  searchQuery: string;
  
  setUser: (user: User | null) => void;
  setIsAuthLoading: (loading: boolean) => void;
  setProducts: (products: Product[]) => void;
  setActiveTab: (tab: string) => void;
  setGlobalConfig: (config: GlobalConfig) => void;
  toggleDarkMode: () => void;
  setTiers: (tiers: Tier[]) => void;
  setSearchQuery: (q: string) => void;
  
  initAuth: () => void;
  fetchProducts: () => Promise<void>;
  fetchGlobalConfig: () => Promise<void>;
  fetchTiers: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  checkVerificationStatus: () => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string>>;
  subscribeToUserData: (userId: string) => (() => void) | null;
}

export const useStore = create<AppState>((set, get) => {
  const initialDarkMode = typeof window !== 'undefined' ? localStorage.getItem('darkMode') === 'true' : false;
  
  if (typeof window !== 'undefined') {
    if (initialDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  return {
    user: null,
    isAuthLoading: true,
    products: [],
    activeTab: 'home',
    globalConfig: null,
    isDarkMode: initialDarkMode,
    tiers: [],
    searchQuery: '',

    setUser: (user) => set({ user }),
    setIsAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
    setProducts: (products) => set({ products }),
    setActiveTab: (activeTab) => set({ activeTab }),
    setGlobalConfig: (globalConfig) => set({ globalConfig }),
    setTiers: (tiers) => set({ tiers }),
    setSearchQuery: (q: string) => set({ searchQuery: q }),
    
    toggleDarkMode: () => {
      const currentMode = get().isDarkMode;
      const newMode = !currentMode;
      
      set({ isDarkMode: newMode });
      localStorage.setItem('darkMode', String(newMode));
      
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },

    getAuthHeaders: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return {};
      return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };
    },

    initAuth: () => {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          set({ isAuthLoading: false });
        }
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            await fetchUserProfile(session.user.id);
          } else {
            set({ user: null, isAuthLoading: false });
          }
        }
      );

      // Return cleanup function
      return () => {
        subscription.unsubscribe();
      };
    },

    fetchProducts: async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const products = (data || []).map(d => ({ id: d.id, ...d } as Product));
        set({ products });
      } catch (error) {
        console.error('[fetchProducts] Error fetching products:', error);
      }
    },

    fetchGlobalConfig: async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('id', 'global')
          .single();

        if (error) throw error;

        if (data) {
          set({ globalConfig: data as GlobalConfig });
        }
      } catch (error) {
        console.error('Error fetching global config:', error);
      }
    },

    fetchTiers: async () => {
      try {
        const { data, error } = await supabase
          .from('tier_settings')
          .select('*')
          .eq('is_active', true)
          .order('order', { ascending: true });

        if (error) throw error;

        const tiers = (data || []).map(d => ({ id: d.id, ...d } as Tier));
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await supabase.auth.resend({
          type: 'signup',
          email: user.email
        });
      }
    },

    checkVerificationStatus: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.refreshSession();
        const { user: updatedUser } = await supabase.auth.getUser();
        const { user: currentUser } = get();
        if (currentUser && updatedUser) {
          set({ user: { ...currentUser, emailVerified: updatedUser.email_confirmed_at != null } as User });
        }
      }
    },

    subscribeToUserData: (userId: string) => {
      if (!userId) return null;
      
      const subscription = supabase
        .channel(`user-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'users',
            filter: `uid=eq.${userId}`
          },
          (payload) => {
            const currentUser = get().user;
            if (currentUser && payload.new) {
              set({ user: { ...payload.new, emailVerified: currentUser.emailVerified } as User });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    },
  };

  async function fetchUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', userId)
        .single();

      if (error) throw error;

      if (data) {
        const { data: { user } } = await supabase.auth.getUser();
        set({ 
          user: { ...data, emailVerified: user?.email_confirmed_at != null } as User, 
          isAuthLoading: false 
        });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          set({ 
            user: {
              id: user.id,
              name: user.user_metadata?.name || 'Pengguna',
              email: user.email || '',
              role: 'affiliate',
              emailVerified: user.email_confirmed_at != null,
              wishlist: [],
              commissionEarned: 0,
              totalSales: 0,
              totalClicks: 0,
            } as User, 
            isAuthLoading: false 
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      set({ isAuthLoading: false });
    }
  }
});
