import { create } from "zustand";
import { dashboardApi } from "@/services/api/dashboard.api";
import type { UserDTO, RecentActivityDTO } from "@/types/api.types";

interface DashboardState {
  dashboard: UserDTO | null;
  recentActivity: RecentActivityDTO[];
  isLoading: boolean;
  error: string | null;

  fetchDashboard: () => Promise<void>;
  fetchRecentActivity: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  dashboard: null,
  recentActivity: [],
  isLoading: false,
  error: null,

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await dashboardApi.getDashboard();
      set({ dashboard: response.data.data ?? null, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Failed to load dashboard",
        isLoading: false,
      });
    }
  },

  fetchRecentActivity: async () => {
    try {
      const response = await dashboardApi.getRecentActivity();
      set({ recentActivity: response.data.data ?? [] });
    } catch {
      // Silent fail for activity
    }
  },
}));
