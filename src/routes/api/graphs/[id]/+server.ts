import { z } from "zod";

import { ZGraphData, type GraphData } from "$lib/util/types";
import { error, json } from "@sveltejs/kit";

/** @type {import("./$types").RequestHandler} */
export async function GET({ params, platform }) {
	if (typeof platform === "undefined") {
		return error(500);
	}

	if (params.id === "") {
		return error(400, "empty name");
	}

	const db = platform.env.DB;

	const data = (await db
		.prepare("SELECT data FROM circuits WHERE id=?")
		.bind(params.id)
		.first("data")) as string | null;

	if (data === null) {
		return json({ success: false, error: "Selected circuit does not exist" });
	}

	return json({ success: true, data: JSON.parse(data) });
}
