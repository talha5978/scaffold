import { useState } from "react";
import { useOutletContext, useParams, useRevalidator } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { apiFetch } from "~/lib/api-client";
import { slugify } from "~/lib/utils";
import type { ProjectOutletContext } from "./project-layout";

export default function ProjectSettings() {
	const { project } = useOutletContext<ProjectOutletContext>();
	const params = useParams();
	const revalidator = useRevalidator();

	const [name, setName] = useState(project.name ?? "");
	const [slug, setSlug] = useState(project.slug ?? "");
	const [slugTouched, setSlugTouched] = useState(Boolean(project.slug));
	const [jwt, setJwt] = useState(project.auth?.jwt ?? true);
	const [googleOAuth, setGoogleOAuth] = useState(project.auth?.googleOAuth ?? false);
	const [cloudinary, setCloudinary] = useState(project.integrations?.cloudinary ?? false);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	const handleNameChange = (value: string) => {
		setName(value);
		if (!slugTouched) setSlug(slugify(value));
	};

	const save = async () => {
		setSaving(true);
		setSaved(false);
		try {
			await apiFetch(`/api/projects/${params.id}`, {
				method: "PUT",
				body: JSON.stringify({
					...project,
					name,
					slug,
					auth: { jwt, googleOAuth },
					integrations: { cloudinary },
				}),
			});
			setSaved(true);
			revalidator.revalidate();
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Project</CardTitle>
					<CardDescription>Name and slug for the generated app.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="name">Name</Label>
						<Input id="name" value={name} onChange={(e) => handleNameChange(e.target.value)} />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="slug">Slug</Label>
						<Input
							id="slug"
							value={slug}
							onChange={(e) => {
								setSlugTouched(true);
								setSlug(slugify(e.target.value));
							}}
						/>
						<p className="text-xs text-slate-500">
							Used as the package/folder name and zip filename.
						</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Auth</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<label className="flex items-center gap-2 text-sm">
						<Checkbox checked={jwt} onChange={(e) => setJwt(e.target.checked)} />
						JWT cookie auth (admin/public sign-in, refresh tokens)
					</label>
					<label className="flex items-center gap-2 text-sm">
						<Checkbox checked={googleOAuth} onChange={(e) => setGoogleOAuth(e.target.checked)} />
						Google OAuth
					</label>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Integrations</CardTitle>
				</CardHeader>
				<CardContent>
					<label className="flex items-center gap-2 text-sm">
						<Checkbox checked={cloudinary} onChange={(e) => setCloudinary(e.target.checked)} />
						Cloudinary image storage
					</label>
				</CardContent>
			</Card>

			<div className="flex items-center gap-3">
				<Button onClick={save} disabled={saving || !name}>
					{saving ? "Saving..." : "Save"}
				</Button>
				{saved && <span className="text-sm text-emerald-600">Saved</span>}
			</div>
		</div>
	);
}
