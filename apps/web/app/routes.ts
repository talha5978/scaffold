import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	layout("routes/project-layout.tsx", [
		route("projects/:id/settings", "routes/project-settings.tsx"),
		route("projects/:id/entities", "routes/project-entities.tsx"),
		route("projects/:id/pages", "routes/project-pages.tsx"),
		route("projects/:id/generate", "routes/project-generate.tsx"),
	]),
] satisfies RouteConfig;
