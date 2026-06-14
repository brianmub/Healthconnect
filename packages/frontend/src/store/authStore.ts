import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      login: (accessToken, refreshToken, user) => set({ accessToken, refreshToken, user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
      setAccessToken: (token) => set({ accessToken: token }),
    }),
    {
      name: 'healthconnect-auth-storage',
    }
  )
);
