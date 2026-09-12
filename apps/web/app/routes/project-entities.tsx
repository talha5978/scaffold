import type { EntityDefinition, EntityField, FieldType } from "@workspace/core";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useOutletContext, useParams, useRevalidator } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { apiFetch } from "~/lib/api-client";
import { slugify } from "~/lib/utils";
import type { ProjectOutletContext } from "./project-layout";

const FIELD_TYPES: FieldType[] = [
	"uuid",
	"string",
	"text",
	"integer",
	"decimal",
	"boolean",
	"datetime",
	"image_url",
	"json",
];

function emptyField(): EntityField {
	return { name: "", type: "string", required: false, unique: false };
}

function emptyEntity(): EntityDefinition {
	return { name: "", tableName: "", fields: [emptyField()] };
}

export default function ProjectEntities() {
	const { project } = useOutletContext<ProjectOutletContext>();
	const params = useParams();
	const revalidator = useRevalidator();

	const [entities, setEntities] = useState<EntityDefinition[]>(project.entities ?? []);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	const updateEntity = (index: number, patch: Partial<EntityDefinition>) => {
		setEntities((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
	};

	const updateField = (entityIndex: number, fieldIndex: number, patch: Partial<EntityField>) => {
		setEntities((prev) =>
			prev.map((e, i) =>
				i === entityIndex
					? { ...e, fields: e.fields.map((f, fi) => (fi === fieldIndex ? { ...f, ...patch } : f)) }
					: e,
			),
		);
	};

	const addEntity = () => setEntities((prev) => [...prev, emptyEntity()]);
	const removeEntity = (index: number) => setEntities((prev) => prev.filter((_, i) => i !== index));
	const addField = (entityIndex: number) =>
		setEntities((prev) =>
			prev.map((e, i) => (i === entityIndex ? { ...e, fields: [...e.fields, emptyField()] } : e)),
		);
	const removeField = (entityIndex: number, fieldIndex: number) =>
		setEntities((prev) =>
			prev.map((e, i) =>
				i === entityIndex ? { ...e, fields: e.fields.filter((_, fi) => fi !== fieldIndex) } : e,
			),
		);

	const save = async () => {
		setSaving(true);
		setSaved(false);
		try {
			await apiFetch(`/api/projects/${params.id}`, {
				method: "PUT",
				body: JSON.stringify({ ...project, entities }),
			});
			setSaved(true);
			revalidator.revalidate();
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<p className="text-sm text-slate-500">
				<code>id</code>, <code>created_at</code>, and <code>updated_at</code> are added to every
				entity automatically — no need to define them here.
			</p>

			{entities.map((entity, entityIndex) => (
				<Card key={entityIndex}>
					<CardHeader className="flex-row items-center justify-between space-y-0">
						<div className="flex-1 space-y-3">
							<Input
								placeholder="Entity name (e.g. Animal)"
								value={entity.name}
								onChange={(e) =>
									updateEntity(entityIndex, {
										name: e.target.value,
										tableName: entity.tableName || slugify(e.target.value),
									})
								}
								className="font-medium"
							/>
							<Input
								placeholder="table_name"
								value={entity.tableName}
								onChange={(e) =>
									updateEntity(entityIndex, { tableName: slugify(e.target.value) })
								}
								className="text-xs text-slate-500"
							/>
						</div>
						<Button variant="ghost" size="icon" onClick={() => removeEntity(entityIndex)}>
							<Trash2 className="h-4 w-4 text-red-600" />
						</Button>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="grid grid-cols-[1fr_120px_70px_70px_1fr_32px] gap-2 px-1 text-xs font-medium text-slate-500">
							<span>Field name</span>
							<span>Type</span>
							<span>Required</span>
							<span>Unique</span>
							<span>Default</span>
							<span />
						</div>
						{entity.fields.map((field, fieldIndex) => (
							<div
								key={fieldIndex}
								className="grid grid-cols-[1fr_120px_70px_70px_1fr_32px] items-center gap-2"
							>
								<Input
									value={field.name}
									placeholder="field_name"
									onChange={(e) =>
										updateField(entityIndex, fieldIndex, { name: e.target.value })
									}
								/>
								<Select
									value={field.type}
									onChange={(e) =>
										updateField(entityIndex, fieldIndex, {
											type: e.target.value as FieldType,
										})
									}
								>
									{FIELD_TYPES.map((type) => (
										<option key={type} value={type}>
											{type}
										</option>
									))}
								</Select>
								<Checkbox
									className="justify-self-center"
									checked={field.required}
									onChange={(e) =>
										updateField(entityIndex, fieldIndex, { required: e.target.checked })
									}
								/>
								<Checkbox
									className="justify-self-center"
									checked={field.unique ?? false}
									onChange={(e) =>
										updateField(entityIndex, fieldIndex, { unique: e.target.checked })
									}
								/>
								<Input
									value={String(field.defaultValue ?? "")}
									placeholder="optional"
									onChange={(e) =>
										updateField(entityIndex, fieldIndex, {
											defaultValue: e.target.value || undefined,
										})
									}
								/>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => removeField(entityIndex, fieldIndex)}
								>
									<Trash2 className="h-3.5 w-3.5 text-red-600" />
								</Button>
							</div>
						))}
						<Button variant="outline" size="sm" onClick={() => addField(entityIndex)}>
							<Plus className="h-3.5 w-3.5" />
							Add field
						</Button>
					</CardContent>
				</Card>
			))}

			<Button variant="outline" onClick={addEntity}>
				<Plus className="h-4 w-4" />
				Add entity
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
