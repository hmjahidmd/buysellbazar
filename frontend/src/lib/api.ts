const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

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

  const text = await response.text();
  let json: any = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(
        response.ok
          ? 'Server returned an invalid response. Please try again.'
          : `Login API failed (${response.status}). Check Vercel env vars and MongoDB Atlas Network Access.`
      );
    }
  } else if (!response.ok) {
    throw new Error(
      `Login API failed (${response.status}). MongoDB Atlas may be blocking Vercel IPs — allow 0.0.0.0/0 in Network Access.`
    );
  } else {
    throw new Error('Server returned an empty response. Please try again.');
  }

  if (!response.ok) {
    const errorMsg = json?.error?.message || json?.error || json?.message || 'API request failed';
    throw new Error(typeof errorMsg === 'string' ? errorMsg : 'API request failed');
  }

  return json;
}

export default apiClient;
