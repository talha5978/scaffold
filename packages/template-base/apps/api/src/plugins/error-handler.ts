import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { ErrorResponse, SuccessResponse } from "~/types/response";
import { ApiError } from "~/utils/ApiError";

async function errorHandlerInternal(fastify: FastifyInstance) {
	fastify.setErrorHandler(async (error: any, request: FastifyRequest, reply: FastifyReply) => {
		let statusCode = 500;
		let errorCode = "INTERNAL_SERVER_ERROR";
		let message = "Something went wrong";
		let details: any = null;

		if (error instanceof ApiError || error.name === "ApiError") {
			statusCode = error.statusCode || 400;
			errorCode = error.code || "BAD_REQUEST";
			message = error.message;
			details = error.details || null;
		} else if (error.validation) {
			statusCode = 400;
			errorCode = "VALIDATION_ERROR";
			message = error.message;
		}

		request.log.error({
			error: error.message,
			reqId: request.id,
			url: request.url,
			method: request.method,
		});

		const errorResponse: ErrorResponse = {
			success: false,
			error: {
				code: errorCode,
				message,
				...(details && { details }),
			},
		};

		return reply.status(statusCode).send(errorResponse);
	});

	fastify.decorateReply("success", function <
		T,
	>(this: FastifyReply, data: T, message?: string, statusCode = 200) {
		return this.status(statusCode).send({
			success: true,
			data,
			...(message && { message }),
		} as SuccessResponse<T>);
	});
}

export default fp(errorHandlerInternal, { name: "error-handler-plugin" });
