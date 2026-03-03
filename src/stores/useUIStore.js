import { create } from 'zustand';

const useUIStore = create((set) => ({
    // Theme
    theme: 'light',
    toggleTheme: () => set((state) => ({
        theme: state.theme === 'dark' ? 'light' : 'dark',
    })),

    // Sidebar
    sidebarOpen: true,
    toggleSidebar: () => set((state) => ({
        sidebarOpen: !state.sidebarOpen,
    })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    // Mobile menu
    mobileMenuOpen: false,
    setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

    // Toast notifications
    toasts: [],
    addToast: (toast) => set((state) => ({
        toasts: [...state.toasts, { id: Date.now(), ...toast }],
    })),
    removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
    })),

    // Loading states
    globalLoading: false,
    setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));

export default useUIStore;
