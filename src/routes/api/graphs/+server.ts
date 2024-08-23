import { ZGraphData } from "$lib/util/types";
import { error, json } from "@sveltejs/kit";
import { z } from "zod";

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
	const count = (await db
		.prepare("SELECT COUNT(*) AS count FROM circuits WHERE name = ?")
		.bind(name)
		.first("count")) as number;
	if (count > 0) {
		return json({ success: false, error: "Name already exists" });
	}

	const { results } = await db
		.prepare(
			"INSERT INTO circuits (name, data) VALUES (?, json(?)) RETURNING id",
		)
		.bind(name, JSON.stringify(data))
		.run();

	return json({ success: true, data: results[0].id });
}

export async function GET({ url, platform }) {
	if (typeof platform === "undefined") {
		return error(500);
	}
	const db = platform.env.DB;

	const page = parseInt(url.searchParams.get("page") ?? "1");
	const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10"), 10);

	const offset = (page - 1) * limit;

	const statement = db
		.prepare("SELECT id, name FROM circuits LIMIT ? OFFSET ?")
		.bind(limit, offset);
	const { results } = await statement.run();

	const res = db
		.prepare("SELECT 1 FROM circuits LIMIT 1 OFFSET ?")
		.bind(offset + limit)
		.first();
	const hasNextPage = res !== null;

	return json({
		success: true,
		data: {
			graphs: results,
			pagination: {
				page,
				limit,
				hasNextPage,
			},
		},
	});
}
