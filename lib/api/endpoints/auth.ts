import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ForgotPasswordResponse,
} from "@/types/api";
import type { ApiClient } from "../client";

const PATHS = {
  login: "/auth/login",
  register: "/auth/register",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
  profile: "/users/profile",
  forgotPassword: "/auth/forgot-password",
} as const;

export function createAuthEndpoints(client: ApiClient) {
  return {
    login: (body: LoginInput) => client.post<AuthResponse>(PATHS.login, body),
    register: (body: RegisterInput) => client.post<AuthResponse>(PATHS.register, body),
    refresh: () => client.post<AuthResponse>(PATHS.refresh, {}),
    logout: () => client.post<{ message: string }>(PATHS.logout, {}),
    getProfile: () => client.get<AuthResponse["user"]>(PATHS.profile),
    forgotPassword: (body: ForgotPasswordInput) =>
      client.post<ForgotPasswordResponse>(PATHS.forgotPassword, body),
  };
}

export type AuthEndpoints = ReturnType<typeof createAuthEndpoints>;
