import { clientEnv } from '../config/env';
import { ApiError, NetworkError, SessionExpiredError } from './errors';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    const browser = globalThis as typeof globalThis & { document?: { cookie: string } };
    const csrf = browser.document?.cookie
      .split('; ')
      .find((value: string) => value.startsWith('sfo_csrf='))
      ?.split('=')[1];
    response = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? { 'x-csrf-token': decodeURIComponent(csrf) } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new NetworkError();
  }
  const requestId = response.headers.get('x-request-id') ?? undefined;
  const body = (await response.json().catch(() => undefined)) as
    { message?: string; error?: string } | undefined;
  if (response.status === 401) throw new SessionExpiredError();
  if (!response.ok)
    throw new ApiError(
      response.status,
      body?.message ?? body?.error ?? 'API request failed',
      requestId,
    );
  return body as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
