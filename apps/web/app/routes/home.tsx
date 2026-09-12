import type { ProjectDraft } from "@workspace/core";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useRevalidator } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { apiFetch } from "~/lib/api-client";
import type { Route } from "./+types/home";

export async function clientLoader() {
	const { projects } = await apiFetch<{ projects: ProjectDraft[] }>("/api/projects", {
		headers: { "Content-Type": "application/json" },
	});
	return { projects };
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const { projects } = loaderData;
	const navigate = useNavigate();
	const revalidator = useRevalidator();
	const [creating, setCreating] = useState(false);

	const createProject = async () => {
		setCreating(true);
		try {
			const { project } = await apiFetch<{ project: ProjectDraft }>("/api/projects", {
				method: "POST",
				body: JSON.stringify({ name: "Untitled project" }),
			});
			navigate(`/projects/${project.id}/settings`);
		} finally {
			setCreating(false);
		}
	};

	const deleteProject = async (id: string) => {
		if (!confirm("Delete this project? This can't be undone.")) return;
		await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
		revalidator.revalidate();
	};

	return (
		<main className="mx-auto max-w-3xl px-6 py-12">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Scaffold</h1>
					<p className="text-sm text-slate-500">Define a project, then generate the app.</p>
				</div>
				<Button onClick={createProject} disabled={creating}>
					<Plus className="h-4 w-4" />
					New project
				</Button>
			</div>

			<div className="mt-8 space-y-3">
				{projects.length === 0 && (
					<Card>
						<CardContent className="py-8 text-center text-sm text-slate-500">
							No projects yet. Create one to get started.
						</CardContent>
					</Card>
				)}

				{projects.map((project) => (
					<Card key={project.id}>
						<CardContent className="flex items-center justify-between py-4">
							<button
								className="text-left"
								onClick={() => navigate(`/projects/${project.id}/settings`)}
							>
								<div className="font-medium">{project.name || "Untitled project"}</div>
								<div className="text-xs text-slate-500">
									{project.entities?.length ?? 0} entities &middot;{" "}
									{project.pages?.length ?? 0} admin pages
								</div>
							</button>
							<Button variant="ghost" size="icon" onClick={() => deleteProject(project.id)}>
								<Trash2 className="h-4 w-4 text-red-600" />
							</Button>
						</CardContent>
					</Card>
				))}
			</div>
		</main>
	);
}
