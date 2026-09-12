/// <reference types="node" />
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema.ts",
	out: "./migrations",
	dbCredentials: {
		url: process.env.PG_CONNECTION_STRING!,
	},
	verbose: true,
	strict: true,
});
