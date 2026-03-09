import { apiClient } from "./client";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  ApiResponse,
  LoginUserDTO,
  UserGroupExpenseDTO,
} from "@/types/api.types";

export const usersApi = {
  getAllUsers: () =>
    apiClient.get<ApiResponse<LoginUserDTO[]>>(ENDPOINTS.ALL_USERS),

  getUserSummary: () =>
    apiClient.get<ApiResponse<UserGroupExpenseDTO>>(ENDPOINTS.USER_SUMMARY),
};
