import { z } from "zod";

import { ZGraphData, type GraphData } from "$lib/util/types";
import { error, json } from "@sveltejs/kit";

/** @type {import("./$types").RequestHandler} */
export async function GET({ params, locals: { prisma } }) {
	if (params.id === "") {
		return error(400, "no id");
	}
	const id = parseInt(params.id);
	if (Number.isNaN(id)) {
		return error(400, "invalid id");
	}

	const data = await prisma.graph.findUnique({
		select: {
			data: true,
		},
		where: {
			id: id,
		},
	});
	if (data === null) {
		return json({ success: false, error: "Selected circuit does not exist" });
	}

	return json({ success: true, data: JSON.parse(data.data) });
}
