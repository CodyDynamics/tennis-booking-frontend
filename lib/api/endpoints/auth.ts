import type {
  AuthConfig,
  AuthResponse,
  LoginInput,
  RegisterInput,
  RegisterRequestOtpResponse,
  VerifyRegisterOtpInput,
  ForgotPasswordInput,
  ForgotPasswordResponse,
  RequestLoginOtpInput,
  VerifyLoginOtpInput,
  UpdateOwnProfileBody,
  ResetPasswordInput,
} from "@/types/api";
import type { ApiClient } from "../client";

const PATHS = {
  login: "/auth/login",
  registerRequestOtp: "/auth/register/request-otp",
  registerVerifyOtp: "/auth/register/verify-otp",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
  profile: "/users/profile",
  config: "/auth/config",
  forgotPassword: "/auth/forgot-password",
  requestLoginOtp: "/auth/request-login-otp",
  verifyLoginOtp: "/auth/verify-login-otp",
  changePassword: "/auth/change-password",
} as const;

export function createAuthEndpoints(client: ApiClient) {
  return {
    getConfig: () => client.get<AuthConfig>(PATHS.config),
    login: (body: LoginInput) => client.post<AuthResponse>(PATHS.login, body),
    requestRegisterOtp: (body: RegisterInput) =>
      client.post<RegisterRequestOtpResponse>(PATHS.registerRequestOtp, body),
    verifyRegisterOtp: (body: VerifyRegisterOtpInput) =>
      client.post<AuthResponse>(PATHS.registerVerifyOtp, body),
    refresh: () => client.post<AuthResponse>(PATHS.refresh, {}),
    logout: () => client.post<{ message: string }>(PATHS.logout, {}),
    getProfile: () => client.get<AuthResponse["user"]>(PATHS.profile),
    updateProfile: (body: UpdateOwnProfileBody) =>
      client.patch<AuthResponse["user"]>(PATHS.profile, body),
    forgotPassword: (body: ForgotPasswordInput) =>
      client.post<ForgotPasswordResponse>(PATHS.forgotPassword, body),
    resetPassword: (body: ResetPasswordInput) =>
      client.post<{ message: string }>("/auth/reset-password", body),
    requestLoginOtp: (body: RequestLoginOtpInput) =>
      client.post<{ message: string }>(PATHS.requestLoginOtp, body),
    verifyLoginOtp: (body: VerifyLoginOtpInput) =>
      client.post<AuthResponse>(PATHS.verifyLoginOtp, body),
    changePassword: (body: { currentPassword: string; newPassword: string }) =>
      client.post<{ message: string }>(PATHS.changePassword, body),
  };
}

export type AuthEndpoints = ReturnType<typeof createAuthEndpoints>;
