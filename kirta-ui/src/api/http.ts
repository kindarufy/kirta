function apiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL ?? "";
  if (fromEnv) return fromEnv;

  return "/api";
}

export function apiUrl(path: string): string {
  const base = apiBaseUrl().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

async function readErrorMessage(res: Response): Promise<string | undefined> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = JSON.parse(trimmed) as { message?: string; error?: string };
    return parsed.message ?? parsed.error ?? trimmed;
  } catch {
    return trimmed;
  }
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(apiUrl(path), init);
  return res;
}

export async function apiGetJson<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const msg = (await readErrorMessage(res)) ?? res.statusText;
    throw new HttpError(msg || `HTTP ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export async function apiGetText(path: string): Promise<string> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const msg = (await readErrorMessage(res)) ?? res.statusText;
    throw new HttpError(msg || `HTTP ${res.status}`, res.status);
  }
  return res.text();
}

export async function apiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  const res = await apiFetch(path, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const msg = (await readErrorMessage(res)) ?? res.statusText;
    throw new HttpError(msg || `HTTP ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export async function apiPostJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: typeof body === "undefined" ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = (await readErrorMessage(res)) ?? res.statusText;
    throw new HttpError(msg || `HTTP ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}
