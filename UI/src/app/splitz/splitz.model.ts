export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        id: number;
        token: string;
    };
}
export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
}
export interface RegisterResponse {
    success: boolean;
    id?: string;
    message?: string;
}

export interface GoogleLoginRequest{
    idToken: string
}
export interface GoogleLoginResponse{
    success: boolean;
    message: string;
    data: any;
}
export interface ResetData {
    token: string,
    newPassword: string,
}

export interface SettleUpRequest {
  groupId: number;
  paidByUserId: number;
  paidToUserId: number;
  amount: number;
}
export interface AddMembersRequest {
    groupId: number
    userEmails: string[];
}
export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

// ReminderRequest Model 
export interface ReminderRequest {
  owedUserId: number;
  owedToUserId: number;
  amount: number;
}
export interface OwedFrom {
  name: string;
  amount: number;
  id: number;
}
export interface SplitMember {
  id: number;
  name: string;
  amount: number;
  isSelected: boolean;
  avatarLetter: string;
  customAmount?: number;
}

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