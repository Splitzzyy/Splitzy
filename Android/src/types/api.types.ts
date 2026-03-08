import { ExpenseCategory } from "@/constants/categories";

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

// ─── Auth ────────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface LoginResponse {
  id: number;
  token: string;
  refreshToken?: string; // returned when X-Platform: mobile header is present
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// ─── User / Dashboard ────────────────────────────────────────
export interface PersonAmount {
  id: number;
  name: string;
  amount: number;
}

export interface GroupSummary {
  groupId: number;
  groupName: string;
  netBalance: number;
}

export interface UserDTO {
  userId: number;
  userName: string;
  totalBalance: number;
  youOwe: number;
  youAreOwed: number;
  oweTo: PersonAmount[];
  owedFrom: PersonAmount[];
  groupWiseSummary: GroupSummary[];
}

export interface RecentActivityDTO {
  actor: string;
  action: string;
  expenseName: string;
  groupName: string;
  createdAt: string;
  impact: {
    type: "get_back" | "owe" | "info";
    amount: number;
  };
}

export interface ReminderRequest {
  amount: number;
  owedUserId: number;
  owedToUserId: number;
}

// ─── Groups ──────────────────────────────────────────────────
export interface CreateGroupRequest {
  groupName: string;
  userEmails: string[];
}

export interface AddUsersToGroupRequest {
  userEmails: string[];
}

export interface UserGroupInfo {
  groupId: number;
  groupName: string;
  joinedAt: string;
}

export interface GroupMember {
  memberId: number;
  memberName: string;
  memberEmail: string;
}

export interface GroupExpense {
  expenseId: number;
  name: string;
  amount: number;
  paidBy: string;
  createdAt: string;
  youOwe: number;
  youLent: number;
}

export interface GroupSettlement {
  settlementId: number;
  paidByUserId: number;
  paidToUserId: number;
  amount: number;
  createdAt: string;
}

export interface UserSummaryItem {
  userId: number;
  name: string;
  balance: number;
}

export interface GroupOverview {
  groupId: number;
  name: string;
  createdAt: string;
  groupBalance: number;
  membersCount: number;
  expenses: GroupExpense[];
  settlements: GroupSettlement[];
  balances: {
    totalBalance: number;
    youOwe: number;
    youAreOwed: number;
  };
  members: GroupMember[];
  userSummaries: UserSummaryItem[];
}

// ─── Expenses ────────────────────────────────────────────────
export interface SplitDetailDto {
  userId: number;
  amount: number;
}

export interface CreateExpenseDto {
  groupId: number;
  paidByUserId: number;
  amount: number;
  name: string;
  category: ExpenseCategory;
  splitDetails: SplitDetailDto[];
}

export interface UpdateExpenseDto extends CreateExpenseDto {
  expenseId: number;
}

export interface ExpenseSplitDto {
  userId: number;
  userName: string;
  amount: number;
}

export interface ExpenseDetailsResponse {
  expenseId: number;
  name: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: {
    userId: number;
    userName: string;
  };
  splits: ExpenseSplitDto[];
}

// ─── Settle Up ───────────────────────────────────────────────
export interface SettleUpDTO {
  groupId: number;
  paidByUserId: number;
  paidToUserId: number;
  amount: number;
}

// ─── Users ───────────────────────────────────────────────────
export interface LoginUserDTO {
  name: string;
  email: string;
  createdAt: string | null;
}

export interface UserGroupExpenseDTO {
  userId: number;
  userName: string;
  groups: UserGroupInfo[];
  totalPaid: number;
}
