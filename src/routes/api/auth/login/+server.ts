import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import jwt from "jsonwebtoken";

export async function POST({ request, cookies }) {
	const { password } = await request.json();
	console.log(password);
	if (password === env.PASSWORD) {
		const token = jwt.sign({ auth: true }, env.SECRET_KEY, {
			expiresIn: "1d",
		});
		cookies.set("auth", token, { path: "/" });
		return json({ success: true, data: null });
	} else {
		return json({ success: false, error: "Incorrect password" });
	}
}
