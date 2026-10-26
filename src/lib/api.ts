export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, { ...options, headers });
    
    const isAuthEndpoint = url.includes('/api/auth/login') || 
                           url.includes('/api/auth/check-email') || 
                           url.includes('/api/auth/reset-password') || 
                           url.includes('/api/auth/activate');

    if (response.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth-expired'));
    }

    // If server returned 500/502/503 during dev server reboot / proxy reconnect, retry with backoff
    if ((response.status === 500 || response.status === 502 || response.status === 503) && retryCount < 2) {
      await new Promise(r => setTimeout(r, 600 * (retryCount + 1)));
      return fetchWithAuth(url, options, retryCount + 1);
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorBody.error || response.statusText);
    }

    return response.json();
  } catch (err: any) {
    // If fetch failed completely due to connection reset or network error, retry with backoff
    if (retryCount < 2 && (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('network'))) {
      await new Promise(r => setTimeout(r, 600 * (retryCount + 1)));
      return fetchWithAuth(url, options, retryCount + 1);
    }
    throw err;
  }
}

export const api = {
  get: (url: string) => fetchWithAuth(url, { method: 'GET' }),
  post: (url: string, body?: any) => fetchWithAuth(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url: string, body?: any) => fetchWithAuth(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (url: string) => fetchWithAuth(url, { method: 'DELETE' }),
};
