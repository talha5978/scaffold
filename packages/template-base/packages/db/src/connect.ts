import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";

export function connectDB(connectionString: string) {
	if (!connectionString) {
		throw new Error("Database connection string is missing");
	}

	const client = postgres(connectionString, {
		prepare: false,
		ssl: "require",
	});

	console.log("✅ Database connected");

	const db = drizzle(client, { schema });
	return { db, client };
}
