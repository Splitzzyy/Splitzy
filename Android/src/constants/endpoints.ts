export const API_BASE_URL = "https://splitzy.aarshiv.xyz";

export const ENDPOINTS = {
  // Auth
  LOGIN: "/api/Auth/login",
  REGISTER: "/api/Auth/signup",
  GOOGLE_LOGIN: "/api/Auth/google-login",
  LOGOUT: "/api/Auth/logout",
  REFRESH: "/api/Auth/refresh",
  FORGOT_PASSWORD: "/api/Auth/forget-password",
  RESET_PASSWORD: "/api/Auth/verify",
  VERIFY_EMAIL: "/api/Auth/verify-email",
  RESEND_VERIFICATION: "/api/Auth/resend-verification",

  // Dashboard
  DASHBOARD: "/api/Dashboard/dashboard",
  RECENT_ACTIVITY: "/api/Dashboard/recent",
  SEND_REMINDER: "/api/Dashboard/reminder",

  // Groups
  CREATE_GROUP: "/api/Group/CreateGroup",
  ALL_GROUPS: "/api/Group/GetAllGroupByUser",
  GROUP_OVERVIEW: "/api/Group/GetGroupOverview",
  ADD_USERS_TO_GROUP: "/api/Group/AddUsersToGroup",
  DELETE_GROUP: "/api/Group/DeleteGroup",

  // Expenses
  ADD_EXPENSE: "/api/Expense/AddExpense",
  UPDATE_EXPENSE: "/api/Expense/UpdateExpense",
  DELETE_EXPENSE: "/api/Expense/DeleteExpense",
  GET_EXPENSE: "/api/Expense",

  // Settle Up
  SETTLE_UP: "/api/Settleup/settle-up",

  // Users
  ALL_USERS: "/api/User/GetAllUsers",
  USER_SUMMARY: "/api/User/summary",
} as const;
