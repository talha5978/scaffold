import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ProjectDraft } from "@workspace/core";

// Deliberately a flat JSON file, not a real database: this tool has exactly
// one user (you, locally), and a single file that's trivial to open, diff,
// back up, or hand-edit beats standing up SQLite/Postgres for that. If this
// ever needs concurrent writers or querying beyond "give me all of them",
// swap this module out — everything downstream only talks to the exported
// functions below, not to the file directly.
const DATA_DIR = path.resolve(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "projects.json");

async function readAll(): Promise<ProjectDraft[]> {
	try {
		const raw = await fs.readFile(DATA_FILE, "utf-8");
		return JSON.parse(raw) as ProjectDraft[];
	} catch (err: any) {
		if (err.code === "ENOENT") return [];
		throw err;
	}
}

async function writeAll(projects: ProjectDraft[]): Promise<void> {
	await fs.mkdir(DATA_DIR, { recursive: true });
	// Write-then-rename so a crash mid-write can't leave projects.json
	// truncated/corrupt.
	const tmpFile = `${DATA_FILE}.${randomUUID()}.tmp`;
	await fs.writeFile(tmpFile, JSON.stringify(projects, null, 2), "utf-8");
	await fs.rename(tmpFile, DATA_FILE);
}

export const projectsStore = {
	async list(): Promise<ProjectDraft[]> {
		const projects = await readAll();
		return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	},

	async get(id: string): Promise<ProjectDraft | null> {
		const projects = await readAll();
		return projects.find((p) => p.id === id) ?? null;
	},

	async create(data: Partial<ProjectDraft>): Promise<ProjectDraft> {
		const now = new Date().toISOString();
		const project: ProjectDraft = {
			name: "",
			slug: "",
			auth: { jwt: true, googleOAuth: false },
			integrations: { cloudinary: false },
			entities: [],
			pages: [],
			...data,
			id: randomUUID(),
			createdAt: now,
			updatedAt: now,
		};

		const projects = await readAll();
		projects.push(project);
		await writeAll(projects);
		return project;
	},

	async update(id: string, data: Partial<ProjectDraft>): Promise<ProjectDraft | null> {
		const projects = await readAll();
		const index = projects.findIndex((p) => p.id === id);
		if (index === -1) return null;

		const updated: ProjectDraft = {
			...projects[index],
			...data,
			id: projects[index].id,
			createdAt: projects[index].createdAt,
			updatedAt: new Date().toISOString(),
		};

		projects[index] = updated;
		await writeAll(projects);
		return updated;
	},

	async remove(id: string): Promise<boolean> {
		const projects = await readAll();
		const next = projects.filter((p) => p.id !== id);
		if (next.length === projects.length) return false;
		await writeAll(next);
		return true;
	},
};
