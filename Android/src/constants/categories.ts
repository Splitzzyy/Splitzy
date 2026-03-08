export enum ExpenseCategory {
  Uncategorized = 0,
  Food = 1,
  Travel = 2,
  Utilities = 3,
  Entertainment = 4,
  Housing = 5,
  Healthcare = 6,
  Shopping = 7,
  Transportation = 8,
  Education = 9,
  Personal = 10,
  Other = 11,
}

export const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; icon: string; color: string }
> = {
  [ExpenseCategory.Uncategorized]: {
    label: "Uncategorized",
    icon: "help-circle-outline",
    color: "#64748b",
  },
  [ExpenseCategory.Food]: {
    label: "Food",
    icon: "food",
    color: "#f97316",
  },
  [ExpenseCategory.Travel]: {
    label: "Travel",
    icon: "airplane",
    color: "#3b82f6",
  },
  [ExpenseCategory.Utilities]: {
    label: "Utilities",
    icon: "lightning-bolt",
    color: "#eab308",
  },
  [ExpenseCategory.Entertainment]: {
    label: "Entertainment",
    icon: "movie-open",
    color: "#a855f7",
  },
  [ExpenseCategory.Housing]: {
    label: "Housing",
    icon: "home",
    color: "#06b6d4",
  },
  [ExpenseCategory.Healthcare]: {
    label: "Healthcare",
    icon: "hospital-box",
    color: "#ef4444",
  },
  [ExpenseCategory.Shopping]: {
    label: "Shopping",
    icon: "shopping",
    color: "#ec4899",
  },
  [ExpenseCategory.Transportation]: {
    label: "Transport",
    icon: "car",
    color: "#14b8a6",
  },
  [ExpenseCategory.Education]: {
    label: "Education",
    icon: "school",
    color: "#8b5cf6",
  },
  [ExpenseCategory.Personal]: {
    label: "Personal",
    icon: "account",
    color: "#f43f5e",
  },
  [ExpenseCategory.Other]: {
    label: "Other",
    icon: "dots-horizontal-circle",
    color: "#6b7280",
  },
};
