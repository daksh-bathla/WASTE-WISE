import { create } from 'zustand';

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

export const useAuthStore = create((set) => ({
  user: readStoredUser(),
  token: localStorage.getItem('token') || null,
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },
}));

export const useProfileStore = create((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
