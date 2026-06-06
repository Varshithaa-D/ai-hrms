import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  notifications: { id: string; message: string; type: 'info'|'success'|'error' }[];
  toggleSidebar: () => void;
  addNotification: (msg: string, type?: 'info'|'success'|'error') => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  notifications: [],
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  addNotification: (message, type = 'info') => {
    const id = Date.now().toString();
    set(s => ({ notifications: [...s.notifications, { id, message, type }] }));
    setTimeout(() => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })), 4000);
  },
  removeNotification: (id) => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),
}));