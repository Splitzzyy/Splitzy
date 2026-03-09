import { apiClient } from "./client";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  SignupRequest,
  GoogleLoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "@/types/api.types";

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<LoginResponse>>(ENDPOINTS.LOGIN, data),

  register: (data: SignupRequest) =>
    apiClient.post<ApiResponse<{ id: number }>>(ENDPOINTS.REGISTER, data),

  googleLogin: (data: GoogleLoginRequest) =>
    apiClient.post<ApiResponse<LoginResponse>>(ENDPOINTS.GOOGLE_LOGIN, data),

  logout: (refreshToken?: string) =>
    apiClient.post(ENDPOINTS.LOGOUT, refreshToken ? { refreshToken } : {}),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post(ENDPOINTS.FORGOT_PASSWORD, data),

  resetPassword: (data: ResetPasswordRequest) =>
    apiClient.post(ENDPOINTS.RESET_PASSWORD, data),

  verifyEmail: (token: string) =>
    apiClient.get(ENDPOINTS.VERIFY_EMAIL, { params: { token } }),

  resendVerification: (email: string) =>
    apiClient.post(ENDPOINTS.RESEND_VERIFICATION, null, {
      params: { email },
    }),
};
