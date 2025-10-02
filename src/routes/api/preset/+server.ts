import { presets } from "$lib/server/presets";
import { err } from "$lib/util/error";
import { json } from "@sveltejs/kit";

/** Return the specified preset */
export async function GET({ url }) {
	const idStr = url.searchParams.get("id");
	if (!idStr) {
		return json(err("Missing id"));
	}
	const id = parseInt(idStr);
	if (isNaN(id)) {
		return json(err("Invalid id"));
	}
	const preset = Object.values(presets).find((p) => p.id === id);
	if (!preset) {
		return json(err("Preset not found"));
	}
	return json({ success: true, data: preset });
}
