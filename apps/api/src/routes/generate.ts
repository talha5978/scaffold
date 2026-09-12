import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProjectIRSchema, normalizeProjectIR } from "@workspace/core";
import { generateProjectZip } from "@workspace/generator";
import { ApiError } from "~/utils/ApiError";

// Same reasoning as packages/generator/src/engine.ts: this module runs as
// native ESM (apps/api's package.json has "type": "module"), so __dirname
// doesn't exist as a bare global — it has to be derived explicitly.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function generateRoutes(fastify: FastifyInstance) {
	fastify.post("/api/generate", async (request: FastifyRequest, reply: FastifyReply) => {
		// Normalize first, then validate — in that order. normalizeProjectIR is
		// what derives slug from name, snake_cases identifiers, and adds the
		// implicit id/created_at/updated_at fields; ProjectIRSchema requires
		// slug/tableNames to already be non-empty. Validating the raw body
		// first would reject exactly the inputs normalization exists to fix
		// (e.g. a project with a name but no slug typed in yet).
		const ir = normalizeProjectIR(request.body);
		const parseResult = ProjectIRSchema.safeParse(ir);

		if (!parseResult.success) {
			// zod v4 reshuffled .flatten()/.format() into top-level functions
			// (z.flattenError, etc.) and it's not worth pinning down exactly
			// which instance methods survived as deprecated aliases — `.issues`
			// is the one part of the error shape that's been stable across
			// zod's major versions.
			throw new ApiError("Invalid project definition", 400, "INVALID_PROJECT_IR", {
				issues: parseResult.error.issues,
			});
		}

		const templateBaseDir = path.resolve(__dirname, "../../../../packages/template-base");
		const outputTempDir = path.resolve(__dirname, "../../tmp");

		let zipStream: Awaited<ReturnType<typeof generateProjectZip>>;
		try {
			zipStream = await generateProjectZip({ ir: parseResult.data, templateBaseDir, outputTempDir });
		} catch (err) {
			request.log.error(err, "project generation failed");
			throw new ApiError("Failed to generate project", 500, "GENERATION_FAILED");
		}

		reply.header("Content-Type", "application/zip");
		reply.header("Content-Disposition", `attachment; filename="${parseResult.data.slug}.zip"`);

		return reply.send(zipStream);
	});
}
