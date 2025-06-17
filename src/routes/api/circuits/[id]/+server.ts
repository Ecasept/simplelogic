import { err } from "$lib/util/error.js";
import { error, json } from "@sveltejs/kit";

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

	return json({ success: true, data: JSON.parse(data.data) });
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
