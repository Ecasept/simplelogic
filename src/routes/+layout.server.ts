import { env } from "$env/dynamic/private";
import jwt from "jsonwebtoken";

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
	let loggedIn = true;
	const token = cookies.get("auth");
	if (typeof token === "string") {
		try {
			jwt.verify(token, env.SECRET_KEY);
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
