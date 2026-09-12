export type FieldType =
	"uuid" | "string" | "text" | "integer" | "decimal" | "boolean" | "datetime" | "image_url" | "json";

export interface EntityField {
	name: string;
	type: FieldType;
	required: boolean;
	unique?: boolean;
	defaultValue?: string | number | boolean;
}

export interface EntityDefinition {
	name: string;
	tableName: string;
	fields: EntityField[];
}

export interface AdminColumnConfig {
	fieldName: string;
	label: string;
	sortable: boolean;
	searchable: boolean;
}

export interface AdminPageDefinition {
	id: string;
	title: string;
	routePath: string;
	entity: string;
	columns: AdminColumnConfig[];
	searchableFields: string[];
}

export interface ProjectIR {
	name: string;
	slug: string;
	auth: {
		jwt: boolean;
		googleOAuth: boolean;
	};
	integrations: {
		cloudinary: boolean;
	};
	entities: EntityDefinition[];
	pages: AdminPageDefinition[];
}

/**
 * A project as it lives in the local draft store while it's being built in
 * the UI — same shape as ProjectIR, but every IR field is optional (a fresh
 * draft has no entities/pages yet) plus storage metadata. Drafts are only
 * required to satisfy ProjectIRSchema in full at generate-time, not while
 * being edited — see normalizeProjectIR / ProjectIRSchema.parse in the
 * /api/generate route.
 */
export interface ProjectDraft extends Partial<ProjectIR> {
	id: string;
	createdAt: string;
	updatedAt: string;
}
