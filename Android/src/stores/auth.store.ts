import { create } from "zustand";
import { authApi } from "@/services/api/auth.api";
import { tokenStorage } from "@/services/api/client";
import type {
  LoginRequest,
  SignupRequest,
  GoogleLoginRequest,
} from "@/types/api.types";

interface AuthState {
  userId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (data: LoginRequest) => Promise<void>;
  register: (data: SignupRequest) => Promise<void>;
  googleLogin: (data: GoogleLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(data);
      const { id, token, refreshToken } = response.data.data!;

      await tokenStorage.setAccessToken(token);
      if (refreshToken) {
        await tokenStorage.setRefreshToken(refreshToken);
      }
      await tokenStorage.setUserId(id.toString());

      set({ userId: id, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Login failed. Please try again.";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.register(data);
      set({ isLoading: false });
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Registration failed. Please try again.";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  googleLogin: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.googleLogin(data);
      const { id, token, refreshToken } = response.data.data!;

      await tokenStorage.setAccessToken(token);
      if (refreshToken) {
        await tokenStorage.setRefreshToken(refreshToken);
      }
      await tokenStorage.setUserId(id.toString());

      set({ userId: id, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Google login failed.";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      await authApi.logout(refreshToken ?? undefined);
    } catch {
      // Ignore logout errors
    } finally {
      await tokenStorage.clearAll();
      set({
        userId: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  checkAuth: async () => {
    try {
      const token = await tokenStorage.getAccessToken();
      const userId = await tokenStorage.getUserId();
      if (token && userId) {
        set({
          userId: parseInt(userId, 10),
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
