import { presets } from "$lib/server/presets";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	const presetData = Object.values(presets).map((p) => ({
		id: p.id,
		name: p.name,
		img: p.img,
	}));
	return {
		presets: presetData,
	};
};