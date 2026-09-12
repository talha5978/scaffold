import { redirect } from "react-router";

// Server-side (loader/action) fetches. These run in this app's own Node
// process, which is a different process from the browser, so relative fetch
// URLs don't apply here (Node's fetch needs an absolute URL) and the proxy
// in vite.config.ts/server.ts is irrelevant to this call — it goes straight
// to the backend. What does matter: forwarding the incoming request's
// Cookie header, since the browser attaches its (now same-origin, thanks to
// the proxy) cookie to the request that reached this loader, and the
// backend just needs that same cookie value to validate the session.
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

export async function apiFetchServer<T = unknown>(
	request: Request,
	path: string,
	init: RequestInit = {},
): Promise<T> {
	const cookie = request.headers.get("cookie") ?? "";

	const res = await fetch(`${API_BASE_URL}${path}`, {
		...init,
		headers: { "Content-Type": "application/json", cookie, ...(init.headers ?? {}) },
	});

	if (res.status === 401) {
		throw redirect("/login");
	}

	const body = await res.json().catch(() => null);

	if (!res.ok) {
		throw new Response(body?.error?.message ?? res.statusText, { status: res.status });
	}

	return (body?.data ?? body) as T;
}
