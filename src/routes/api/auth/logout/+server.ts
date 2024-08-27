import { json } from "@sveltejs/kit";

export async function POST({ cookies }) {
	cookies.delete("auth", { path: "/" });
	return json({ success: true, data: null });
}
