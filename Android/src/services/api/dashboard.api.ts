import { apiClient } from "./client";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  ApiResponse,
  UserDTO,
  RecentActivityDTO,
  ReminderRequest,
} from "@/types/api.types";

export const dashboardApi = {
  getDashboard: () =>
    apiClient.get<ApiResponse<UserDTO>>(ENDPOINTS.DASHBOARD),

  getRecentActivity: () =>
    apiClient.get<ApiResponse<RecentActivityDTO[]>>(ENDPOINTS.RECENT_ACTIVITY),

  sendReminder: (data: ReminderRequest) =>
    apiClient.post(ENDPOINTS.SEND_REMINDER, data),
};
