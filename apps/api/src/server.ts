import type { FastifyInstance } from "fastify";
import errorHandlerPlugin from "~/plugins/error-handler";
import fastifyCors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { generateRoutes } from "~/routes/generate";
import { projectsRoutes } from "~/routes/projects";

export async function server(fastify: FastifyInstance) {
	await fastify.register(errorHandlerPlugin);

	// Scaffold's own tool has one frontend (the builder UI, apps/web) and no
	// auth — ADMIN_URL doesn't apply here, that's a template-base/generated-app
	// concept (the admin portal it produces). Keeping it in the origin list
	// silently passed `undefined` to fastify/cors, which isn't necessarily
	// wrong but implies an app that doesn't exist in this repo.

	await fastify.register(fastifyCors, {
		origin: [process.env.WEB_URL!],
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		credentials: true,
		allowedHeaders: ["Content-Type", "Authorization"],
		exposedHeaders: ["Set-Cookie"],
	});

	await fastify.register(helmet, {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", "data:", "https:"],
			},
		},
		crossOriginEmbedderPolicy: false,
	});

	await fastify.register(generateRoutes);
	await fastify.register(projectsRoutes);
}
