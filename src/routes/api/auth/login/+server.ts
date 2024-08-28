import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { SignJWT } from "jose";

export async function POST({ request, cookies }) {
	const { password } = await request.json();
	if (password === env.PASSWORD) {
		const secret = new TextEncoder().encode(env.SECRET_KEY);
		const jwt = await new SignJWT({ auth: true })
			.setProtectedHeader({ alg: "HS256" })
			.setIssuedAt()
			.setExpirationTime("2h")
			.sign(secret);
		cookies.set("auth", jwt, { path: "/" });
		return json({ success: true, data: null });
	} else {
		return json({ success: false, error: "Incorrect password" });
	}
}
