import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { defineConfig } from "vite";

// The backend sets httpOnly JWT cookies with no explicit Domain attribute.
// If the browser ever talks to the API directly (a different port), those
// cookies belong to the API's origin, not the admin app's — and a
// server-side loader running in *this* app's process never sees them on
// incoming requests, because the browser only attaches a cookie to requests
// aimed at the origin that set it. Proxying /api through this app's own
// origin (both in dev, here, and in prod, see server.ts) makes every
// request the browser makes look same-origin, so Set-Cookie/Cookie behave
// the way SSR loaders (see app/lib/api-server.ts) expect.
export default defineConfig({
	plugins: [tailwindcss(), reactRouter()],
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "app"),
		},
	},
	server: {
		port: 5173,
		proxy: {
			"/api": {
				target: process.env.API_BASE_URL ?? "http://localhost:3000",
				changeOrigin: true,
			},
		},
	},
});
