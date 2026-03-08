import { apiClient } from "./client";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  ApiResponse,
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseDetailsResponse,
} from "@/types/api.types";

export const expensesApi = {
  addExpense: (data: CreateExpenseDto) =>
    apiClient.post(ENDPOINTS.ADD_EXPENSE, data),

  updateExpense: (data: UpdateExpenseDto) =>
    apiClient.put(ENDPOINTS.UPDATE_EXPENSE, data),

  deleteExpense: (expenseId: number) =>
    apiClient.delete(`${ENDPOINTS.DELETE_EXPENSE}/${expenseId}`),

  getExpenseDetails: (expenseId: number) =>
    apiClient.get<ApiResponse<ExpenseDetailsResponse>>(
      `${ENDPOINTS.GET_EXPENSE}/${expenseId}`
    ),
};
