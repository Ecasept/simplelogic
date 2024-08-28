import { env } from "$env/dynamic/private";
import { jwtVerify } from "jose";

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
	let loggedIn = true;
	const token = cookies.get("auth");
	if (typeof token === "string") {
		try {
			const secret = new TextEncoder().encode(env.SECRET_KEY);
			await jwtVerify(token, secret);
		} catch (e) {
			loggedIn = false;
		}
	} else {
		loggedIn = false;
	}

	return {
		loggedIn,
	};
}
