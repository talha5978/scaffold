const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export class ApiError extends Error {
	status: number;
	code?: string;
	details?: unknown;

	constructor(message: string, status: number, code?: string, details?: unknown) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
	const res = await fetch(`${API_BASE_URL}${path}`, {
		...init,
		headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
	});

	const body = await res.json().catch(() => null);

	if (!res.ok) {
		throw new ApiError(
			body?.error?.message ?? res.statusText,
			res.status,
			body?.error?.code,
			body?.error?.details,
		);
	}

	return (body?.data ?? body) as T;
}

/** For endpoints that return a raw binary/zip body rather than the JSON envelope. */
export async function apiFetchBlob(path: string, init: RequestInit = {}): Promise<Blob> {
	const res = await fetch(`${API_BASE_URL}${path}`, init);

	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new ApiError(body?.error?.message ?? res.statusText, res.status, body?.error?.code);
	}

	return res.blob();
}
