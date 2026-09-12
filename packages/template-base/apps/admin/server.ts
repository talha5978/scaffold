import { createRequestHandler } from "@react-router/express";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

// Mirrors vite.config.ts's dev-mode proxy — same reasoning: the browser must
// only ever talk to this app's own origin so the backend's httpOnly cookies
// come back scoped to it, and loaders in this process can forward them
// straight through (see app/lib/api-server.ts).
app.use(
	"/api",
	createProxyMiddleware({
		target: process.env.API_BASE_URL ?? "http://localhost:3000",
		changeOrigin: true,
	}),
);

app.use(express.static("build/client", { maxAge: "1h" }));

app.use(
	createRequestHandler({
		// @ts-expect-error -- generated at build time by `react-router build`
		build: () => import("./build/server/index.js"),
	}),
);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
	console.log(`Admin server running on port ${port}`);
});
