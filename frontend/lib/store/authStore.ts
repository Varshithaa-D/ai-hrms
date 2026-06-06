import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'management_admin' | 'senior_manager' | 'hr_recruiter' | 'employee';
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('hrms_user') || 'null') : null,
  token: typeof window !== 'undefined' ? localStorage.getItem('hrms_token') : null,

  setAuth: (user, token) => {
    localStorage.setItem('hrms_user', JSON.stringify(user));
    localStorage.setItem('hrms_token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('hrms_user');
    localStorage.removeItem('hrms_token');
    set({ user: null, token: null });
  },

  isAuthenticated: () => !!get().token,
}));