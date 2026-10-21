export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { credentials: 'same-origin', ...options });
  } catch {
    throw new ApiError(0, '网络连接失败，请检查服务后重试');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body?.message || '服务暂不可用，请稍后重试');
  if (body === null) throw new ApiError(response.status, '服务返回了无效数据');
  return body as T;
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  // 每次写请求取得当前会话 token，登录或退出后不复用旧 token。
  const csrf = await request<{ token: string; headerName: string }>('/auth/csrf');
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
    body: JSON.stringify(body ?? {}),
  });
}
