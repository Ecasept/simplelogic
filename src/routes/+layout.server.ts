import { env } from "$env/dynamic/private";
import { jwtVerify } from "jose";

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
	let loggedIn = false;
	const token = cookies.get("auth");
	if (typeof token === "string") {
		try {
			const secret = new TextEncoder().encode(env.SECRET_KEY);
			await jwtVerify(token, secret);
			loggedIn = true;
		} catch (e) {
			// Invalid token
		}
	}
	return {
		loggedIn,
	};
}
