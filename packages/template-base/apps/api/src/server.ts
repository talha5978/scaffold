import type { FastifyInstance } from "fastify";
import errorHandlerPlugin from "~/plugins/error-handler";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import { connectDB } from "@workspace/db";
import { authRoutes } from "~/routes/auth.routes";
import helmet from "@fastify/helmet";
import csrf from "@fastify/csrf-protection";
// <forge-route-imports-start>
// <forge-route-imports-end>

export async function server(fastify: FastifyInstance) {
	await fastify.register(errorHandlerPlugin);

	await fastify.register(fastifyCors, {
		origin: [process.env.ADMIN_URL!, process.env.WEB_URL!],
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

	await fastify.register(csrf, {
		cookieOpts: { httpOnly: true, secure: process.env.NODE_ENV === "production" },
	});

	await fastify.register(fastifyCookie);

	const dbConnection = await connectDB(process.env.PG_CONNECTION_STRING!);
	fastify.decorate("db", dbConnection.db);

	await fastify.register(authRoutes, { prefix: "/api/auth" });
	// <forge-routes-start>
	// <forge-routes-end>
}
