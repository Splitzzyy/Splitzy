import { apiClient } from "./client";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  LoginUserDTO,
  UserGroupExpenseDTO,
} from "@/types/api.types";

export const usersApi = {
  getAllUsers: () =>
    apiClient.get<LoginUserDTO[]>(ENDPOINTS.ALL_USERS),

  getUserSummary: () =>
    apiClient.get<UserGroupExpenseDTO>(ENDPOINTS.USER_SUMMARY),
};
