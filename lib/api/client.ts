import type { ApiErrorBody } from "@/types/api";

export type GetAccessToken = (() => string | null) | null;

export interface ApiClientConfig {
  baseURL: string;
  getAccessToken: GetAccessToken;
}

export interface RequestConfig extends Omit<RequestInit, "body"> {
  body?: object | string;
  params?: Record<string, string>;
}

/**
 * Thrown when the API returns a non-2xx status. Contains status and parsed error body.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorBody | null,
    message?: string
  ) {
    super(message ?? body?.message?.toString() ?? `API error ${status}`);
    this.name = "ApiError";
  }
}

function buildURL(base: string, path: string, params?: Record<string, string>): string {
  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return url.toString();
}

async function parseResponse<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Low-level request helper. Injects Authorization: Bearer if getAccessToken returns a value.
 */
export async function request<T>(
  config: ApiClientConfig,
  method: string,
  path: string,
  options: RequestConfig = {}
): Promise<T> {
  const { baseURL, getAccessToken } = config;
  const { body, params, headers: optHeaders, ...rest } = options;

  const url = buildURL(baseURL, path, params);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(optHeaders as Record<string, string>),
  };

  const token = getAccessToken?.() ?? null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    credentials: "include",
    ...rest,
    headers,
    body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });

  const data = await parseResponse<T>(res);

  if (!res.ok) {
    throw new ApiError(res.status, data as ApiErrorBody | null);
  }

  return data as T;
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(config: ApiClientConfig) {
  const req = <T>(method: string, path: string, options?: RequestConfig) =>
    request<T>(config, method, path, options);

  return {
    get: <T>(path: string, options?: RequestConfig) => req<T>("GET", path, options),
    post: <T>(path: string, body?: object, options?: RequestConfig) =>
      req<T>("POST", path, { ...options, body }),
    patch: <T>(path: string, body?: object, options?: RequestConfig) =>
      req<T>("PATCH", path, { ...options, body }),
    put: <T>(path: string, body?: object, options?: RequestConfig) =>
      req<T>("PUT", path, { ...options, body }),
    delete: <T>(path: string, options?: RequestConfig) => req<T>("DELETE", path, options),
  };
}
