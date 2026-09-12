// Client-side fetches. Paths are relative ("/api/...") on purpose — see
// vite.config.ts (dev) / server.ts (prod) for the proxy that forwards these
// to the real backend while keeping everything same-origin from the
// browser's point of view, which is what lets cookie-based auth work at all
// across the admin app and the API being on different ports.
export class ApiError extends Error {
	status: number;
	code?: string;

	constructor(message: string, status: number, code?: string) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
	}
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
	const res = await fetch(path, {
		...init,
		credentials: "include",
		headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
	});

	const body = await res.json().catch(() => null);

	if (!res.ok) {
		throw new ApiError(body?.error?.message ?? res.statusText, res.status, body?.error?.code);
	}

	return (body?.data ?? body) as T;
}
