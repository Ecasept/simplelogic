import { z } from "zod";

import { ZGraphData } from "$lib/util/types";
import { error, json } from "@sveltejs/kit";

/** @type {import("./$types").RequestHandler} */
export async function POST({ request, platform }) {
	// Validate input
	const schema = z.object({ name: z.string(), data: ZGraphData });
	const validationResult = schema.safeParse(await request.json());
	if (!validationResult.success) {
		return error(400, validationResult.error.message);
	}
	const { name, data } = validationResult.data;

	if (typeof platform === "undefined") {
		return error(500);
	}
	const db = platform.env.DB;

	// Check for empty data
	if (
		Object.keys(data.components).length === 0 &&
		Object.keys(data.wires).length === 0
	) {
		return json({
			success: false,
			error: "No data to save - please create a circuit",
		});
	}
	if (name === "") {
		return json({ success: false, error: "Please enter a name" });
	}

	// Check if name already exists
	const { results: checkResults } = await db
		.prepare("SELECT COUNT(*) as count FROM circuits where name = ?")
		.bind(name)
		.run();
	const count = checkResults[0].count as number;
	if (count > 0) {
		return json({ success: false, error: "Name already exists" });
	}

	const statement = platform.env.DB.prepare(
		"INSERT INTO circuits (name, data) VALUES (?, json(?))",
	);
	const query = statement.bind(name, JSON.stringify(data));
	query.run();

	return json({ success: true, data: null });
}
