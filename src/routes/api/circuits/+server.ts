import { err } from "$lib/util/error";
import { ZGraphData } from "$lib/util/types";
import { error, json } from "@sveltejs/kit";
import { z } from "zod";

/** @type {import("./$types").RequestHandler} */
/** Create a new circuit */
export async function POST({ request, locals: { prisma, auth } }) {
	const session = await auth();
	const userId = session?.user?.id;
	if (!userId) {
		return error(401, err("Unauthorized"));
	}

	// Validate input
	const schema = z.object({ name: z.string(), data: ZGraphData });
	const validationResult = schema.safeParse(await request.json());
	if (!validationResult.success) {
		// Don't expose the valid schema in production
		if (import.meta.env.DEV) {
			return error(400, err(validationResult.error.message));
		} else {
			return error(400);
		}
	}
	const { name, data } = validationResult.data;

	// Check for empty data
	if (
		Object.keys(data.components).length === 0 &&
		Object.keys(data.wires).length === 0
	) {
		return json(err("No data to save - please create a circuit"));
	}
	if (name === "") {
		return json(err("Please enter a name"));
	}

	const existingGraph = await prisma.circuits.findUnique({
		where: { userId_name: { userId, name } },
	});

	if (existingGraph !== null) {
		return json(err("Name already exists"));
	}

	await prisma.circuits.create({
		data: {
			name,
			data: JSON.stringify(data),
			userId,
			componentCount: Object.keys(data.components).length,
			wireCount: Object.keys(data.wires).length,
		},
	});

	return json({ success: true, data: null });
}

/** Get all circuits for the user */
export async function GET({ url, locals: { prisma, auth } }) {
	const session = await auth();
	const userId = session?.user?.id;
	if (!userId) {
		return error(401, err("Unauthorized"));
	}

	const page = parseInt(url.searchParams.get("page") ?? "1");
	const perPage = Math.min(
		parseInt(url.searchParams.get("perPage") ?? "10"),
		10,
	);

	const offset = (page - 1) * perPage;

	const items = await prisma.circuits.findMany({
		select: {
			id: true,
			name: true,
			createdAt: true,
			wireCount: true,
			componentCount: true,
		},
		where: { userId },
		skip: offset,
		take: perPage + 1,
	});

	const hasNextPage = items.length > perPage;
	const data = hasNextPage ? items.slice(0, -1) : items;

	return json({
		success: true,
		data: {
			circuits: data,
			pagination: {
				hasNextPage: hasNextPage,
				page,
				perPage,
			},
		},
	});
}
