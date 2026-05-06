const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Fetch wrapper que envía JWT desde cookie automáticamente.
 * Todas las llamadas al backend pasan por esta función.
 */
export async function api<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    credentials: 'include', // Envía cookies HttpOnly
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Helper methods
export const apiGet = <T>(endpoint: string) => api<T>(endpoint);
export const apiPost = <T>(endpoint: string, data: any) => api<T>(endpoint, { method: 'POST', body: JSON.stringify(data) });
export const apiPut = <T>(endpoint: string, data: any) => api<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) });
export const apiPatch = <T>(endpoint: string, data?: any) => api<T>(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined });
export const apiDelete = <T>(endpoint: string) => api<T>(endpoint, { method: 'DELETE' });
