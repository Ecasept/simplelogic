import { env } from "$env/dynamic/private";
import { json, type Handle } from "@sveltejs/kit";
import jwt from "jsonwebtoken";

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith("/api/graphs")) {
		const token = event.cookies.get("auth");
		if (typeof token !== "string") {
			return json({ success: false, error: "Not logged in" });
		}
		try {
			jwt.verify(token, env.SECRET_KEY);
		} catch (e) {
			return json({ success: false, error: "Not logged in" });
		}
	}
	return await resolve(event);
};
