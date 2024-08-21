import { error, json } from "@sveltejs/kit";
import { z } from "zod";

export async function POST({ request, platform }) {
	// Validate input
	const schema = z.object({ name: z.string() });
	const validationResult = schema.safeParse(await request.json());
	if (!validationResult.success) {
		return error(400);
	}
	const { name } = validationResult.data;

	if (typeof platform === "undefined") {
		return error(500);
	}

	if (name === "") {
		return json({ success: false, error: "Please enter a name" });
	}

	const db = platform.env.DB;

	const { results } = await db
		.prepare("SELECT data FROM circuits WHERE name=?")
		.bind(name)
		.run();

	if (results.length === 0) {
		return json({ success: false, error: "Selected circuit does not exist" });
	}

	return json({ success: true, data: JSON.parse(results[0].data) });
}
