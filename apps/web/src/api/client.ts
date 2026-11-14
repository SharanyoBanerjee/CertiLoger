const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ error: { code: 'UNKNOWN', message: 'Request failed' } }));
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    return (await res.blob()) as unknown as T;
  }

  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: (token: string) =>
      request<{ user: any }>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      }),
  },

  institutions: {
    list: (token: string) =>
      request<any[]>('/institutions', { headers: { Authorization: `Bearer ${token}` } }),
    get: (id: string, token: string) =>
      request<any>(`/institutions/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
    create: (data: { id: string; name: string }, token: string) =>
      request<any>('/institutions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: 'ACTIVE' | 'DISABLED', token: string) =>
      request<any>(`/institutions/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      }),
  },

  keys: {
    list: (token: string) =>
      request<any[]>('/keys', { headers: { Authorization: `Bearer ${token}` } }),
    get: (keyId: string, token: string) =>
      request<any>(`/keys/${keyId}`, { headers: { Authorization: `Bearer ${token}` } }),
    register: (
      data: { institutionId: string; keyId: string; publicKeyPem: string },
      token: string
    ) =>
      request<any>('/keys/register', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    updateStatus: (keyId: string, status: 'ACTIVE' | 'RETIRED' | 'COMPROMISED', token: string) =>
      request<any>(`/keys/${keyId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      }),
  },

  certificates: {
    issue: (
      data: {
        institutionId: string;
        holderName: string;
        qualification: string;
        grade?: string;
        expiresAt?: string;
      },
      token: string
    ) =>
      request<Blob>('/certificates', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
  },

  lab: {
    gcd: (a: string, b: string) => request<any>(`/lab/gcd?a=${a}&b=${b}`),
    extendedGcd: (a: string, b: string) => request<any>(`/lab/extended-gcd?a=${a}&b=${b}`),
    modInverse: (a: string, m: string) => request<any>(`/lab/mod-inverse?a=${a}&m=${m}`),
    totient: (n: string) => request<any>(`/lab/totient?n=${n}`),
    modExp: (base: string, exp: string, mod: string) =>
      request<any>(`/lab/mod-exp?base=${base}&exp=${exp}&mod=${mod}`),
    isPrimeTrial: (n: string) => request<any>(`/lab/is-prime-trial?n=${n}`),
    millerRabin: (n: string, rounds?: number) =>
      request<any>(`/lab/miller-rabin?n=${n}&rounds=${rounds ?? 20}`),
    toyRsaGenerate: (p: string, q: string, e: string) =>
      request<any>(`/lab/toy-rsa/generate?p=${p}&q=${q}&e=${e}`),
    toyRsaSign: (m: string, d: string, n: string) =>
      request<any>(`/lab/toy-rsa/sign?m=${m}&d=${d}&n=${n}`),
    toyRsaVerify: (s: string, e: string, n: string) =>
      request<any>(`/lab/toy-rsa/verify?s=${s}&e=${e}&n=${n}`),
    checkEuler: (a: string, n: string) => request<any>(`/lab/check-euler?a=${a}&n=${n}`),
    checkFermat: (a: string, p: string) => request<any>(`/lab/check-fermat?a=${a}&p=${p}`),
  },
};
