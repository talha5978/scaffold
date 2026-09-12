import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), reactRouter()],
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "app"),
		},
	},

	// dotenv-cli (see root package.json's "dev"/"build" scripts) populates
	// process.env before turbo/vite ever start, but Vite only exposes
	// VITE_-prefixed vars to client code via import.meta.env. API_BASE_URL is
	// intentionally not VITE_-prefixed (it's shared across apps in .env.example),
	// so it's injected explicitly here instead of renaming it everywhere.
	define: {
		"import.meta.env.VITE_API_BASE_URL": JSON.stringify(
			process.env.API_BASE_URL ?? "http://localhost:4000",
		),
	},
	server: {
		port: 5173,
	},
	preview: {
		port: 5173,
	},
});
