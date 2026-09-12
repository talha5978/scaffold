import type { ProjectDraft } from "@workspace/core";
import { ArrowLeft } from "lucide-react";
import { NavLink, Outlet, useLoaderData, useParams } from "react-router";
import { cn } from "~/lib/utils";
import { apiFetch } from "~/lib/api-client";
import type { Route } from "./+types/project-layout";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const { project } = await apiFetch<{ project: ProjectDraft }>(`/api/projects/${params.id}`);
	return { project };
}

export type ProjectOutletContext = {
	project: ProjectDraft;
};

const TABS = [
	{ to: "settings", label: "Settings" },
	{ to: "entities", label: "Entities" },
	{ to: "pages", label: "Admin pages" },
	{ to: "generate", label: "Generate" },
];

export default function ProjectLayout({ loaderData }: Route.ComponentProps) {
	const { project } = loaderData;
	const params = useParams();

	return (
		<div className="mx-auto max-w-4xl px-6 py-8">
			<NavLink
				to="/"
				className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
			>
				<ArrowLeft className="h-3.5 w-3.5" />
				All projects
			</NavLink>

			<h1 className="mt-2 text-2xl font-bold">{project.name || "Untitled project"}</h1>

			<nav className="mt-6 flex gap-1 border-b border-slate-200">
				{TABS.map((tab) => (
					<NavLink
						key={tab.to}
						to={`/projects/${params.id}/${tab.to}`}
						className={({ isActive }) =>
							cn(
								"border-b-2 px-3 py-2 text-sm font-medium",
								isActive
									? "border-slate-900 text-slate-900"
									: "border-transparent text-slate-500 hover:text-slate-900",
							)
						}
					>
						{tab.label}
					</NavLink>
				))}
			</nav>

			<div className="py-6">
				<Outlet context={{ project } satisfies ProjectOutletContext} />
			</div>
		</div>
	);
}
