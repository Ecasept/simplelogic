import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";
import { error, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { authHandle } from "./auth";

const prismaHandle: Handle = async ({ event, resolve }) => {
	if (typeof event.platform?.env.DB === "undefined") {
		console.error("No database connected");
		throw error(500);
	}
	const adapter = new PrismaD1(event.platform?.env.DB);
	event.locals.prisma = new PrismaClient({ adapter });
	return await resolve(event);
};

export const handle: Handle = sequence(prismaHandle, authHandle);
