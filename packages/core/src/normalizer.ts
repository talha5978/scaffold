import type { EntityDefinition, ProjectIR } from "./types/ir";

function toSnakeCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1_$2")
		.replace(/[\s-]+/g, "_")
		.toLowerCase();
}

function normalizeEntity(entity: EntityDefinition): EntityDefinition {
	const tableName = toSnakeCase(entity.tableName || entity.name);

	const normalizedFields = entity.fields.map((field) => ({
		...field,
		name: toSnakeCase(field.name),
	}));

	const hasId = normalizedFields.some((f) => f.name === "id");
	if (!hasId) {
		normalizedFields.unshift({
			name: "id",
			type: "uuid",
			required: true,
			unique: true,
		});
	}

	const hasCreatedAt = normalizedFields.some((f) => f.name === "created_at");
	if (!hasCreatedAt) {
		normalizedFields.push({
			name: "created_at",
			type: "datetime",
			required: true,
		});
	}

	const hasUpdatedAt = normalizedFields.some((f) => f.name === "updated_at");
	if (!hasUpdatedAt) {
		normalizedFields.push({
			name: "updated_at",
			type: "datetime",
			required: true,
		});
	}

	return {
		name: entity.name,
		tableName,
		fields: normalizedFields,
	};
}

export function normalizeProjectIR(raw: unknown): ProjectIR {
	const parsed = raw as ProjectIR;

	const normalizedEntities = (parsed.entities || []).map(normalizeEntity);

	const normalizedPages = (parsed.pages || []).map((page) => {
		// The generator always writes the admin page for an entity to
		// `/admin/<tableName>` (it uses React Router's flat-file convention,
		// which ties the URL directly to the filename — see
		// packages/generator/src/engine.ts). Whatever routePath was typed into
		// the builder UI was silently discarded, which is worse than not having
		// the field: it implies a promise the generator doesn't keep. Deriving
		// it here means the IR that reaches the generator, and whatever the UI
		// echoes back to the user, both reflect what will actually be built.
		const linkedEntity = normalizedEntities.find((e) => e.name === page.entity);
		const routePath = linkedEntity ? `/admin/${linkedEntity.tableName}` : page.routePath;

		return {
			...page,
			routePath,
			searchableFields: page.searchableFields.map(toSnakeCase),
			columns: page.columns.map((col) => ({
				...col,
				fieldName: toSnakeCase(col.fieldName),
			})),
		};
	});

	return {
		...parsed,
		slug: toSnakeCase(parsed.slug || parsed.name),
		entities: normalizedEntities,
		pages: normalizedPages,
	};
}
