// Thin GraphQL client for the existing NexusPOS backend (no separate server).

export class ApiError extends Error {
  code: string;
  constructor(message: string, code = 'ERROR') {
    super(message);
    this.code = code;
  }
}

type Handlers = {
  getToken: () => string | null;
  getEndpoint: () => string | null;
  /** Called when the server rejects our session (expired / device revoked). */
  onUnauthenticated: (code: string) => void;
};

let handlers: Handlers = {
  getToken: () => null,
  getEndpoint: () => null,
  onUnauthenticated: () => {},
};

export const configureApi = (h: Handlers) => {
  handlers = h;
};

async function post(endpoint: string, query: string, variables: Record<string, any>, token: string | null, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

const SESSION_CODES = ['UNAUTHENTICATED', 'DEVICE_NOT_PAIRED', 'WAITER_APP_DISABLED'];

export async function gql<T = any>(query: string, variables: Record<string, any> = {}, opts: { endpoint?: string; auth?: boolean } = {}): Promise<T> {
  const endpoint = opts.endpoint || handlers.getEndpoint();
  if (!endpoint) throw new ApiError('Server address is not set', 'NO_ENDPOINT');
  const token = opts.auth === false ? null : handlers.getToken();
  let res: Response;
  try {
    res = await post(endpoint, query, variables, token);
  } catch {
    throw new ApiError('Cannot reach the server. Check Wi-Fi and the server address.', 'NETWORK');
  }
  let body: any;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(`Server error (HTTP ${res.status})`, 'SERVER');
  }
  if (body.errors?.length) {
    const err = body.errors[0];
    const code = err.extensions?.code || 'ERROR';
    // Only treat as a lost session when we sent a token; a wrong PIN also says UNAUTHENTICATED.
    if (token && SESSION_CODES.includes(code)) handlers.onUnauthenticated(code);
    throw new ApiError(err.message, code);
  }
  return body.data as T;
}

/**
 * Accepts what staff type ("192.168.1.20:5002", "https://shop.vercel.app")
 * and finds the GraphQL endpoint: local server uses /graphql, Vercel /api/graphql.
 */
export async function resolveEndpoint(input: string): Promise<string> {
  let base = input.trim().replace(/\/+$/, '');
  if (!base) throw new ApiError('Enter the server address');
  if (!/^https?:\/\//i.test(base)) base = `http://${base}`;
  const candidates = /\/graphql$/i.test(base) ? [base] : [`${base}/graphql`, `${base}/api/graphql`];
  for (const url of candidates) {
    try {
      const res = await post(url, '{ __typename }', {}, null, 8000);
      if (res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.data?.__typename) return url;
      }
    } catch {
      // try the next candidate
    }
  }
  throw new ApiError(`No POS server found at ${base}`, 'NETWORK');
}
