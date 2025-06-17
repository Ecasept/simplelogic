import { env } from "$env/dynamic/private";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { SvelteKitAuth } from "@auth/sveltekit";
import type { Provider } from "@auth/sveltekit/providers";
import GitHub from "@auth/sveltekit/providers/github";

/** Creates a testing provider for testing purposes.
 * It is connected to a locally running OAuth server
 * and returns a mock user profile based on the user agent.
 */
function createTestingProvider(provider: string, ua: string): Provider {
	const testingClient = ua.split(" ")[0].toLowerCase();
	return {
		id: provider,
		name: `${provider} Testing`,
		type: "oauth",
		issuer: "http://localhost:8080",
		clientId: `testing-client-id`,
		clientSecret: "abc",
		userinfo: "http://localhost:8080/userinfo",
		token: "http://localhost:8080/token",
		profile(profile) {
			return {
				name: `John Doe (${testingClient})`,
				email: `${testingClient}@example.com`,
				// Each playwright browser has a unique ID
				// so we can use it to differentiate users in tests
				id: `__test_${testingClient}__`,
				image: "/icon.svg",
			};
		},
	};
}

export const {
	handle: authHandle,
	signIn,
	signOut,
} = SvelteKitAuth(async (event) => {
	const prisma = event.locals.prisma;

	let providers: Provider[] = [
		GitHub({
			clientId: env.GH_CLIENT_ID,
			clientSecret: env.GH_CLIENT_SECRET,
		}),
	];

	if (import.meta.env.DEV) {
		providers.push(
			createTestingProvider(
				"google",
				event.request.headers.get("user-agent") || "unknown",
			),
		);
	}

	return {
		providers: providers,
		trustHost: true,
		secret: env.SECRET_KEY,
		adapter: PrismaAdapter(prisma),
	};
});
