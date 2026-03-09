import { create } from "zustand";
import { expensesApi } from "@/services/api/expenses.api";
import type {
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseDetailsResponse,
} from "@/types/api.types";

interface ExpensesState {
  currentExpense: ExpenseDetailsResponse | null;
  isLoading: boolean;
  error: string | null;

  fetchExpenseDetails: (expenseId: number) => Promise<void>;
  addExpense: (data: CreateExpenseDto) => Promise<void>;
  updateExpense: (data: UpdateExpenseDto) => Promise<void>;
  deleteExpense: (expenseId: number) => Promise<void>;
  clearCurrentExpense: () => void;
}

export const useExpensesStore = create<ExpensesState>((set) => ({
  currentExpense: null,
  isLoading: false,
  error: null,

  fetchExpenseDetails: async (expenseId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await expensesApi.getExpenseDetails(expenseId);
      set({ currentExpense: response.data.data ?? null, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Failed to load expense",
        isLoading: false,
      });
    }
  },

  addExpense: async (data) => {
    try {
      await expensesApi.addExpense(data);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to add expense"
      );
    }
  },

  updateExpense: async (data) => {
    try {
      await expensesApi.updateExpense(data);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to update expense"
      );
    }
  },

  deleteExpense: async (expenseId) => {
    try {
      await expensesApi.deleteExpense(expenseId);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to delete expense"
      );
    }
  },

  clearCurrentExpense: () => set({ currentExpense: null }),
}));
