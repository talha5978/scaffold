import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>Admin</title>
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let status = 500;
	let message = "Something went wrong";

	if (isRouteErrorResponse(error)) {
		status = error.status;
		message = error.data || error.statusText;
	} else if (error instanceof Error) {
		message = error.message;
	}

	return (
		<main className="mx-auto max-w-lg py-16 px-4 text-center">
			<h1 className="text-2xl font-semibold">{status}</h1>
			<p className="mt-2 text-slate-600">{message}</p>
		</main>
	);
}
