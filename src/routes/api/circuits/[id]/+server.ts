import { err } from "$lib/util/shared/error.js";
import { error, json } from "@sveltejs/kit";
import { ZGraphData } from "$lib/util/shared/types";

/** @type {import("./$types").RequestHandler} */
/** Get a specific circuit by ID */
export async function GET({ params, locals: { prisma, auth } }) {
	const session = await auth();
	const userId = session?.user?.id;
	if (!userId) {
		return error(401, err("Unauthorized"));
	}

	if (params.id === "") {
		return error(400, err("no id"));
	}
	const id = parseInt(params.id);
	if (Number.isNaN(id)) {
		return error(400, err("invalid id"));
	}

	const data = await prisma.circuits.findUnique({
		select: {
			data: true,
		},
		where: {
			id,
			userId,
		},
	});
	if (data === null) {
		return json(err("Selected circuit does not exist"));
	}

	try {
		const graph = ZGraphData.parse(JSON.parse(data.data));
		return json({ success: true, data: graph });
	} catch {
		return json(err("Stored circuit is invalid and cannot be loaded"));
	}
}

/** Delete a specific circuit by ID */
export async function DELETE({ params, locals: { prisma, auth } }) {
	const session = await auth();
	const userId = session?.user?.id;
	if (!userId) {
		return error(401, err("Unauthorized"));
	}

	if (params.id === "") {
		return error(400, err("no id"));
	}
	const id = parseInt(params.id);
	if (Number.isNaN(id)) {
		return error(400, err("invalid id"));
	}

	const circuit = await prisma.circuits.findUnique({
		where: { id, userId },
	});
	if (circuit === null) {
		return json(err("Selected circuit does not exist"));
	}

	await prisma.circuits.delete({
		where: { id, userId },
	});

	return json({ success: true, data: null });
}
