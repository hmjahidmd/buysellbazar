const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface RequestOptions extends RequestInit {
  token?: string;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ success: boolean; data: T; meta?: any; message?: string }> {
  const { token, params, headers, ...customConfig } = options;

  let url = endpoint.startsWith('http')
    ? endpoint
    : typeof window !== 'undefined'
      ? endpoint
      : `${API_BASE}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const storedToken =
    token || (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);

  if (storedToken) {
    defaultHeaders['Authorization'] = `Bearer ${storedToken}`;
  }

  const response = await fetch(url, {
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    ...customConfig,
  });

  const json = await response.json();

  if (!response.ok) {
    const errorMsg = json?.error?.message || json?.message || 'API request failed';
    throw new Error(errorMsg);
  }

  return json;
}

export default apiClient;
