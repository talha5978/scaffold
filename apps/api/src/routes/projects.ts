import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ProjectDraftSchema } from "@workspace/core";
import { ApiError } from "~/utils/ApiError";
import { projectsStore } from "~/store/projects-store";

// id/createdAt/updatedAt are set by the store, never by the client — this is
// the shape of what a create/update request body may legally contain.
const ProjectDraftInputSchema = ProjectDraftSchema.partial();

export async function projectsRoutes(fastify: FastifyInstance) {
	fastify.get("/api/projects", async (_request: FastifyRequest, reply: FastifyReply) => {
		const projects = await projectsStore.list();
		return reply.success({ projects });
	});

	fastify.get("/api/projects/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		const { id } = request.params as { id: string };
		const project = await projectsStore.get(id);

		if (!project) {
			throw new ApiError("Project not found", 404, "NOT_FOUND");
		}

		return reply.success({ project });
	});

	fastify.post("/api/projects", async (request: FastifyRequest, reply: FastifyReply) => {
		const parseResult = ProjectDraftInputSchema.safeParse(request.body ?? {});

		if (!parseResult.success) {
			throw new ApiError("Invalid project data", 400, "INVALID_PROJECT", {
				issues: parseResult.error.issues,
			});
		}

		const project = await projectsStore.create(parseResult.data);
		return reply.success({ project }, "Project created", 201);
	});

	fastify.put("/api/projects/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		const { id } = request.params as { id: string };
		const parseResult = ProjectDraftInputSchema.safeParse(request.body ?? {});
		console.log(parseResult, request.body, parseResult?.error?.issues);
		if (!parseResult.success) {
			throw new ApiError("Invalid project data", 400, "INVALID_PROJECT", {
				issues: parseResult.error.issues,
			});
		}

		const project = await projectsStore.update(id, parseResult.data);

		if (!project) {
			throw new ApiError("Project not found", 404, "NOT_FOUND");
		}

		return reply.success({ project }, "Project saved");
	});

	fastify.delete("/api/projects/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		const { id } = request.params as { id: string };
		const removed = await projectsStore.remove(id);

		if (!removed) {
			throw new ApiError("Project not found", 404, "NOT_FOUND");
		}

		return reply.success(null, "Project deleted");
	});
}
