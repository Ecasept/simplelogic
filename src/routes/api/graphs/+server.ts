import { ZGraphData } from "$lib/util/types";
import { error, json } from "@sveltejs/kit";
import { z } from "zod";

/** @type {import("./$types").RequestHandler} */
export async function POST({ request, locals: { prisma } }) {
	// Validate input
	const schema = z.object({ name: z.string(), data: ZGraphData });
	const validationResult = schema.safeParse(await request.json());
	if (!validationResult.success) {
		return error(400, validationResult.error.message);
	}
	const { name, data } = validationResult.data;

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

	const existingGraph = await prisma.graph.findUnique({
		where: { name: name },
	});

	if (existingGraph !== null) {
		return json({ success: false, error: "Name already exists" });
	}

	const graph = await prisma.graph.create({
		data: {
			name: name,
			data: JSON.stringify(data),
		},
	});

	return json({ success: true, data: graph.id });
}

export async function GET({ url, locals: { prisma } }) {
	const page = parseInt(url.searchParams.get("page") ?? "1");
	const perPage = Math.min(parseInt(url.searchParams.get("limit") ?? "10"), 10);

	const offset = (page - 1) * perPage;

	const items = await prisma.graph.findMany({
		select: {
			id: true,
			name: true,
		},
		skip: offset,
		take: perPage + 1,
	});

	const hasNextPage = items.length > perPage;
	const data = hasNextPage ? items.slice(0, -1) : items;

	return json({
		success: true,
		data: {
			graphs: data,
			hasNextPage: hasNextPage,
			pagination: {
				page,
				perPage,
			},
		},
	});
}
