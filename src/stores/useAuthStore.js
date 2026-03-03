import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
    user: null,
    session: null,
    loading: true,
    error: null,

    setUser: (user) => set({ user, loading: false }),
    setSession: (session) => set({ session }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    logout: () => set({
        user: null,
        session: null,
        loading: false,
        error: null,
    }),

    // Computed: check if current user is admin
    get isAdmin() {
        const state = get();
        return state.user?.profile?.role === 'admin';
    },
}));

export default useAuthStore;
