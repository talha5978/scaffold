import { normalizeProjectIR, ProjectIRSchema } from "@workspace/core";
import { Download } from "lucide-react";
import { useState } from "react";
import { useOutletContext } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ApiError, apiFetchBlob } from "~/lib/api-client";
import type { ProjectOutletContext } from "./project-layout";

export default function ProjectGenerate() {
	const { project } = useOutletContext<ProjectOutletContext>();
	const [generating, setGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Same order the backend uses (see apps/api/src/routes/generate.ts):
	// normalize first — that's what derives slug from name, snake_cases
	// identifiers, and adds id/created_at/updated_at — then validate the
	// normalized shape. Validating the raw draft directly would flag things
	// like a blank slug as an error even though normalization fills it in,
	// which would make this preview stricter (and wrong) relative to what
	// the backend actually accepts.
	const normalized = normalizeProjectIR(project);
	const validation = ProjectIRSchema.safeParse(normalized);

	const generate = async () => {
		setGenerating(true);
		setError(null);
		try {
			const blob = await apiFetchBlob("/api/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(project),
			});

			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `${normalized.slug || "generated-app"}.zip`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Failed to generate project");
		} finally {
			setGenerating(false);
		}
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Summary</CardTitle>
				</CardHeader>
				<CardContent className="space-y-1 text-sm">
					<p>
						<span className="text-slate-500">Name:</span> {project.name || "—"}
					</p>
					<p>
						<span className="text-slate-500">Slug:</span> {normalized.slug || "—"}
					</p>
					<p>
						<span className="text-slate-500">Entities:</span> {project.entities?.length ?? 0}
					</p>
					<p>
						<span className="text-slate-500">Admin pages:</span> {project.pages?.length ?? 0}
					</p>
				</CardContent>
			</Card>

			{!validation.success && (
				<Card className="border-amber-300 bg-amber-50">
					<CardHeader>
						<CardTitle className="text-amber-800">Not ready to generate yet</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
							{validation.error.issues.map((issue, i) => (
								<li key={i}>
									{issue.path.join(".") || "project"}: {issue.message}
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}

			{error && <p className="text-sm text-red-600">{error}</p>}

			<Button onClick={generate} disabled={!validation.success || generating}>
				<Download className="h-4 w-4" />
				{generating ? "Generating..." : "Generate & download"}
			</Button>
		</div>
	);
}
