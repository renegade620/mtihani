const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000";

function parseApiError(body: unknown): string {
  if (!body || typeof body !== "object") return "An error occurred";
  const obj = body as Record<string, unknown>;
  if (typeof obj.detail === "string") return obj.detail;
  if (Array.isArray(obj.detail) && obj.detail.length > 0) return String(obj.detail[0]);
  // Field errors: { field: ["error1"] }
  const keys = Object.keys(obj);
  if (keys.length > 0) {
    const first = obj[keys[0]];
    if (Array.isArray(first) && first.length > 0) return String(first[0]);
    if (first) return String(first);
  }
  return "An error occurred";
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Token ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (e) {
    throw new ApiError("Network error. Check your connection and try again.");
  }

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      message = parseApiError(body);
    } catch {
      const text = await res.text().catch(() => "");
      if (text && text.length < 200) message = text;
    }
    if (res.status === 401) localStorage.removeItem("token");
    throw new ApiError(message, res.status);
  }

  try {
    return (await res.json()) as T;
  } catch {
    return undefined as T;
  }
}