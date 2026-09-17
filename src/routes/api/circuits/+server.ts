import { err } from "$lib/util/shared/error";
import { readCircuitInput } from "$lib/server/circuitInput";
import { error, json } from "@sveltejs/kit";

/** @type {import("./$types").RequestHandler} */
/** Create a new circuit */
export async function POST({ request, locals: { prisma, auth } }) {
	const session = await auth();
	const userId = session?.user?.id;
	if (!userId) {
		return error(401, err("Unauthorized"));
	}

	const { name, data } = await readCircuitInput(request);

	// Check for empty data
	if (
		Object.keys(data.components).length === 0 &&
		Object.keys(data.wires).length === 0
	) {
		return json(err("Empty circuit"));
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
		orderBy: { createdAt: "asc" },
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
