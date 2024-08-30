import { env } from "$env/dynamic/private";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";
import { error, json, type Handle } from "@sveltejs/kit";
import { jwtVerify } from "jose";

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith("/api/graphs")) {
		const token = event.cookies.get("auth");
		if (typeof token !== "string") {
			return json({ success: false, error: "Not logged in" });
		}
		try {
			let loggedIn = true;
			const secret = new TextEncoder().encode(env.SECRET_KEY);
			await jwtVerify(token, secret);
		} catch (e) {
			return json({ success: false, error: "Not logged in" });
		}
	}

	// Create Prisma Client
	if (typeof event.platform?.env.DB === "undefined") {
		console.error("No database connected");
		throw error(500);
	}
	const adapter = new PrismaD1(event.platform?.env.DB);
	event.locals.prisma = new PrismaClient({ adapter });

	return await resolve(event);
};
