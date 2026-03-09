import { apiClient } from "./client";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  UserDTO,
  RecentActivityDTO,
  ReminderRequest,
} from "@/types/api.types";

export const dashboardApi = {
  getDashboard: () =>
    apiClient.get<UserDTO>(ENDPOINTS.DASHBOARD),

  getRecentActivity: () =>
    apiClient.get<RecentActivityDTO[]>(ENDPOINTS.RECENT_ACTIVITY),

  sendReminder: (data: ReminderRequest) =>
    apiClient.post(ENDPOINTS.SEND_REMINDER, data),
};
