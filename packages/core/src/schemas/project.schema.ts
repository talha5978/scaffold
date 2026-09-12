import { z } from "zod";

export const FieldTypeSchema = z.enum([
	"uuid",
	"string",
	"text",
	"integer",
	"decimal",
	"boolean",
	"datetime",
	"image_url",
	"json",
]);

export const EntityFieldSchema = z.object({
	name: z.string().min(1),
	type: FieldTypeSchema,
	required: z.boolean().default(false),
	unique: z.boolean().optional().default(false),
	defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const EntityDefinitionSchema = z.object({
	name: z.string().min(1),
	tableName: z.string().min(1),
	fields: z.array(EntityFieldSchema),
});

export const AdminColumnConfigSchema = z.object({
	fieldName: z.string().min(1),
	label: z.string().min(1),
	sortable: z.boolean().default(true),
	searchable: z.boolean().default(true),
});

export const AdminPageDefinitionSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	routePath: z.string().min(1),
	entity: z.string().min(1),
	columns: z.array(AdminColumnConfigSchema),
	searchableFields: z.array(z.string()),
});

export const ProjectIRSchema = z.object({
	name: z.string().min(1),
	slug: z.string().min(1),
	auth: z.object({
		jwt: z.boolean().default(true),
		googleOAuth: z.boolean().default(false),
	}),
	integrations: z.object({
		cloudinary: z.boolean().default(false),
	}),
	entities: z.array(EntityDefinitionSchema),
	pages: z.array(AdminPageDefinitionSchema),
});

/**
 * Draft projects, as stored while being edited in the builder UI, don't need
 * to satisfy ProjectIRSchema yet — a brand-new project has no entities and
 * no name/slug chosen. This is intentionally loose; full validation happens
 * once, via ProjectIRSchema, at generate-time (see apps/api/src/routes/generate.ts).
 */
export const ProjectDraftSchema = z.object({
	id: z.string().min(1),
	createdAt: z.string(),
	updatedAt: z.string(),
	name: z.string().optional().default(""),
	slug: z.string().optional().default(""),
	auth: z
		.object({
			jwt: z.boolean().default(true),
			googleOAuth: z.boolean().default(false),
		})
		.default({ jwt: true, googleOAuth: false }),
	integrations: z
		.object({
			cloudinary: z.boolean().default(false),
		})
		.default({ cloudinary: false }),
	entities: z.array(EntityDefinitionSchema).default([]),
	pages: z.array(AdminPageDefinitionSchema).default([]),
});
