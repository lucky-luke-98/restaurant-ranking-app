/**
 * All platforms call the backend directly.
 * Set EXPO_PUBLIC_API_URL to the production backend URL (e.g. your Render URL).
 * Falls back to localhost for local development.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";

let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

type RequestOptions = Omit<RequestInit, "method" | "body"> & {
  params?: Record<string, string>;
};

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const { params, headers: customHeaders, ...rest } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const query = new URLSearchParams(params).toString();
    url += `?${query}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  const init: RequestInit = {
    method,
    headers,
    ...rest,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API error ${status}: ${body}`);
    this.name = "ApiError";
  }
}

const apiClient = {
  get<T>(path: string, options?: RequestOptions) {
    return request<T>("GET", path, undefined, options);
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("POST", path, body, options);
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("PUT", path, body, options);
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("PATCH", path, body, options);
  },
  delete<T>(path: string, options?: RequestOptions) {
    return request<T>("DELETE", path, undefined, options);
  },
};

export default apiClient;
