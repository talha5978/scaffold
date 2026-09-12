import type { AdminColumnConfig, AdminPageDefinition } from "@workspace/core";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useOutletContext, useParams, useRevalidator } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { apiFetch } from "~/lib/api-client";
import type { ProjectOutletContext } from "./project-layout";

function emptyPage(entityName: string): AdminPageDefinition {
	return {
		id: crypto.randomUUID(),
		title: "",
		routePath: "",
		entity: entityName,
		columns: [],
		searchableFields: [],
	};
}

export default function ProjectPages() {
	const { project } = useOutletContext<ProjectOutletContext>();
	const params = useParams();
	const revalidator = useRevalidator();
	const entities = project.entities ?? [];

	const [pages, setPages] = useState<AdminPageDefinition[]>(project.pages ?? []);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	const updatePage = (index: number, patch: Partial<AdminPageDefinition>) => {
		setPages((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
	};

	const addPage = () => {
		if (entities.length === 0) return;
		setPages((prev) => [...prev, emptyPage(entities[0].name)]);
	};
	const removePage = (index: number) => setPages((prev) => prev.filter((_, i) => i !== index));

	const toggleColumn = (pageIndex: number, fieldName: string, checked: boolean) => {
		setPages((prev) =>
			prev.map((p, i) => {
				if (i !== pageIndex) return p;
				if (checked) {
					const col: AdminColumnConfig = {
						fieldName,
						label: fieldName,
						sortable: true,
						searchable: true,
					};
					return { ...p, columns: [...p.columns, col] };
				}
				return {
					...p,
					columns: p.columns.filter((c) => c.fieldName !== fieldName),
				};
			}),
		);
	};

	const updateColumnLabel = (pageIndex: number, fieldName: string, label: string) => {
		setPages((prev) =>
			prev.map((p, i) =>
				i === pageIndex
					? {
							...p,
							columns: p.columns.map((c) => (c.fieldName === fieldName ? { ...c, label } : c)),
						}
					: p,
			),
		);
	};

	const toggleSearchable = (pageIndex: number, fieldName: string, checked: boolean) => {
		setPages((prev) =>
			prev.map((p, i) =>
				i === pageIndex
					? {
							...p,
							searchableFields: checked
								? [...p.searchableFields, fieldName]
								: p.searchableFields.filter((f) => f !== fieldName),
						}
					: p,
			),
		);
	};

	const save = async () => {
		setSaving(true);
		setSaved(false);
		try {
			pages.map((page) => {
				return page.routePath === "" ? (page.routePath = page.title.toLowerCase()) : page.routePath;
			});
			await apiFetch(`/api/projects/${params.id}`, {
				method: "PUT",
				body: JSON.stringify({ ...project, pages }),
			});
			setSaved(true);
			revalidator.revalidate();
		} catch (error: any) {
			console.log(error.message);
		} finally {
			setSaving(false);
		}
	};

	if (entities.length === 0) {
		return (
			<p className="text-sm text-slate-500">
				Add and save at least one entity first — admin pages are built on top of an entity's fields.
			</p>
		);
	}

	return (
		<div className="space-y-6">
			{pages.map((page, pageIndex) => {
				const entity = entities.find((e) => e.name === page.entity) ?? entities[0];

				return (
					<Card key={page.id}>
						<CardHeader className="flex-row items-center justify-between space-y-0">
							<div className="flex flex-1 gap-3">
								<Input
									placeholder="Page title (e.g. Animals)"
									value={page.title}
									onChange={(e) =>
										updatePage(pageIndex, {
											title: e.target.value,
										})
									}
								/>
								<Select
									value={page.entity}
									onChange={(e) =>
										updatePage(pageIndex, {
											entity: e.target.value,
											columns: [],
											searchableFields: [],
										})
									}
								>
									{entities.map((e) => (
										<option key={e.name} value={e.name}>
											{e.name}
										</option>
									))}
								</Select>
							</div>
							<Button variant="ghost" size="icon" onClick={() => removePage(pageIndex)}>
								<Trash2 className="h-4 w-4 text-red-600" />
							</Button>
						</CardHeader>
						<CardContent className="space-y-3">
							<p className="text-xs text-slate-500">
								Will be served at{" "}
								<code>
									/admin/
									{entity.tableName || entity.name.toLowerCase()}
								</code>
							</p>

							<div className="space-y-1">
								<div className="grid grid-cols-[24px_1fr_1fr_70px] gap-2 px-1 text-xs font-medium text-slate-500">
									<span />
									<span>Field</span>
									<span>Column label</span>
									<span>Searchable</span>
								</div>
								{entity.fields.map((field) => {
									const column = page.columns.find((c) => c.fieldName === field.name);
									return (
										<div
											key={field.name}
											className="grid grid-cols-[24px_1fr_1fr_70px] items-center gap-2"
										>
											<Checkbox
												checked={Boolean(column)}
												onChange={(e) =>
													toggleColumn(pageIndex, field.name, e.target.checked)
												}
											/>
											<span className="text-sm text-slate-700">{field.name}</span>
											<Input
												disabled={!column}
												value={column?.label ?? ""}
												onChange={(e) =>
													updateColumnLabel(pageIndex, field.name, e.target.value)
												}
											/>
											<Checkbox
												className="justify-self-center"
												disabled={!column}
												checked={page.searchableFields.includes(field.name)}
												onChange={(e) =>
													toggleSearchable(pageIndex, field.name, e.target.checked)
												}
											/>
										</div>
									);
								})}
							</div>
						</CardContent>
					</Card>
				);
			})}

			<Button variant="outline" onClick={addPage}>
				<Plus className="h-4 w-4" />
				Add admin page
			</Button>

			<div className="flex items-center gap-3 border-t border-slate-200 pt-6">
				<Button onClick={save} disabled={saving}>
					{saving ? "Saving..." : "Save"}
				</Button>
				{saved && <span className="text-sm text-emerald-600">Saved</span>}
			</div>
		</div>
	);
}
