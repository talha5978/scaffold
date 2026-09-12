import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import ejs from "ejs";
import { ZipArchive } from "archiver";
import { type ProjectIR } from "@workspace/core";
import { injectSlot } from "./writers/injector";

// `archiver` and this file both ship as native ESM output (tsup, format: "esm"),
// so there is no CommonJS `__dirname` global available at runtime. It has to be
// derived from `import.meta.url` instead, or every path.join(__dirname, ...)
// below throws "__dirname is not defined" the moment this runs outside a CJS
// shim (i.e. any time it's run from the built dist/, not just under tsx).
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface GenerateEngineOptions {
	ir: ProjectIR;
	templateBaseDir: string;
	outputTempDir: string;
}

/**
 * Copies packages/template-base into a scratch build folder, layers the
 * generated schema/route/page files for each entity on top of it, zips the
 * result, and returns a readable stream of the zip. The caller is
 * responsible for piping/sending that stream (see apps/api routes/generate.ts).
 */
export async function generateProjectZip({ ir, templateBaseDir, outputTempDir }: GenerateEngineOptions) {
	const buildId = `build-${ir.slug}-${Date.now()}`;
	const buildPath = path.join(outputTempDir, buildId);

	await fs.copy(templateBaseDir, buildPath);

	for (const entity of ir.entities) {
		const pageConfig = ir.pages.find((p) => p.entity === entity.name);

		// --- Drizzle schema ---
		const schemaTemplatePath = path.join(__dirname, "templates/db/schema.ts.ejs");
		const schemaTemplate = await fs.readFile(schemaTemplatePath, "utf-8");
		const renderedSchema = ejs.render(schemaTemplate, { entity });

		const schemaFilePath = path.join(buildPath, `packages/db/src/schema/${entity.tableName}.ts`);
		await fs.outputFile(schemaFilePath, renderedSchema);

		const schemaIndexPath = path.join(buildPath, "packages/db/src/schema/index.ts");
		await injectSlot(
			schemaIndexPath,
			"// <forge-schema-export-start>",
			`export * from './${entity.tableName}';`,
		);

		// --- Fastify CRUD routes ---
		const routeTemplatePath = path.join(__dirname, "templates/api/routes.ts.ejs");
		const routeTemplate = await fs.readFile(routeTemplatePath, "utf-8");
		const renderedRoute = ejs.render(routeTemplate, {
			entity,
			page: pageConfig,
		});

		const routeFilePath = path.join(buildPath, `apps/api/src/routes/${entity.tableName}.ts`);
		await fs.outputFile(routeFilePath, renderedRoute);

		// Route registration lives in server.ts, next to the `authRoutes` register
		// call and the `<forge-routes-start>` marker — NOT app.ts (that file
		// doesn't exist in template-base). Wiring this into app.ts is a no-op:
		// injectSlot() silently bails out when the target file doesn't exist, so
		// the previous version of this function generated route files that were
		// never actually registered with Fastify, with no error to say so.
		const serverTsPath = path.join(buildPath, "apps/api/src/server.ts");
		// Two separate markers on purpose: the routes marker sits inside the
		// `server()` function body, and `import` is a top-level-only statement —
		// injecting it at the same marker as the register() call would produce
		// a syntax error (import mid-function). The imports marker sits above
		// the function declaration instead.
		await injectSlot(
			serverTsPath,
			"// <forge-route-imports-start>",
			`import { ${entity.tableName}Routes } from './routes/${entity.tableName}';`,
		);
		await injectSlot(
			serverTsPath,
			"// <forge-routes-start>",
			`await fastify.register(${entity.tableName}Routes, { prefix: '/api' });`,
		);

		// --- Admin portal page ---
		// AdminPageDefinition is explicitly about admin-portal pages, and every
		// other piece of the template (adminAuthToken cookies, ADMIN_URL, the
		// admin:dev/build/start scripts) agrees: this belongs under apps/admin,
		// using React Router's flat-file convention so `admin.<table>.tsx` nests
		// under the `admin.tsx` layout route automatically. It previously wrote
		// to apps/web, an app that was never generated for the admin portal.
		const pageTemplatePath = path.join(__dirname, "templates/web/table.tsx.ejs");
		const pageTemplate = await fs.readFile(pageTemplatePath, "utf-8");
		const renderedPage = ejs.render(pageTemplate, { entity, pageConfig });

		const pageFilePath = path.join(buildPath, `apps/admin/app/routes/admin.${entity.tableName}.tsx`);
		await fs.outputFile(pageFilePath, renderedPage);

		// Registers the sidebar link for this page (see NAV_ITEMS in
		// apps/admin/app/routes/admin.tsx) — without this, the page exists and
		// is reachable by URL, but there's no way to navigate to it from the UI.
		const adminLayoutPath = path.join(buildPath, "apps/admin/app/routes/admin.tsx");
		const navLabel = (pageConfig?.title ?? entity.name).replace(/'/g, "\\'");
		await injectSlot(
			adminLayoutPath,
			"// <forge-nav-links-start>",
			`\t{ to: '/admin/${entity.tableName}', label: '${navLabel}' },`,
		);
	}

	const archive = new ZipArchive({
		zlib: { level: 9 },
	});

	archive.on("end", () => {
		fs.remove(buildPath).catch((err) => {
			console.error(`Failed to clean up build directory ${buildPath}:`, err);
		});
	});

	archive.directory(buildPath, false);
	await archive.finalize();

	return archive;
}
