import { LogOut } from "lucide-react";
import { NavLink, Outlet, redirect, useLoaderData, useNavigate } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { Button } from "~/components/ui/button";
import { apiFetch } from "~/lib/api-client";
import { apiFetchServer } from "~/lib/api-server";
import { cn } from "~/lib/utils";

interface AdminUser {
	id: string;
	email: string;
	name: string;
	role: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
	try {
		return await apiFetchServer<{ user: AdminUser }>(request, "/api/auth/admin/me");
	} catch (err) {
		// apiFetchServer already redirects on 401; anything else (network
		// failure, backend down) still shouldn't strand the user on a broken
		// page — send them to the sign-in screen too.
		throw redirect("/login");
	}
}

const NAV_ITEMS: { to: string; label: string }[] = [
	// <forge-nav-links-start>
];

export default function AdminLayout() {
	const { user } = useLoaderData<typeof loader>();
	const navigate = useNavigate();

	const signOut = async () => {
		await apiFetch("/api/auth/signout?isAdmin=true", { method: "POST" });
		navigate("/login");
	};

	return (
		<div className="flex min-h-screen">
			<aside className="flex w-56 flex-col border-r border-slate-200 bg-white">
				<div className="p-4 text-sm font-semibold">{user.name}</div>
				<nav className="flex-1 space-y-1 px-2">
					<NavLink
						to="/admin"
						end
						className={({ isActive }) =>
							cn(
								"block rounded-md px-3 py-2 text-sm",
								isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
							)
						}
					>
						Dashboard
					</NavLink>
					{NAV_ITEMS.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							className={({ isActive }) =>
								cn(
									"block rounded-md px-3 py-2 text-sm",
									isActive
										? "bg-slate-900 text-white"
										: "text-slate-600 hover:bg-slate-100",
								)
							}
						>
							{item.label}
						</NavLink>
					))}
				</nav>
				<div className="p-2">
					<Button variant="ghost" className="w-full justify-start" onClick={signOut}>
						<LogOut className="h-4 w-4" />
						Sign out
					</Button>
				</div>
			</aside>
			<main className="flex-1 overflow-auto">
				<Outlet />
			</main>
		</div>
	);
}
