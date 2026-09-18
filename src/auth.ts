import { env } from "$env/dynamic/private";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { SvelteKitAuth } from "@auth/sveltekit";
import type { Provider } from "@auth/sveltekit/providers";
import GitHub from "@auth/sveltekit/providers/github";

const TEST_OAUTH_ISSUER = env.TEST_OAUTH_ISSUER ?? "http://localhost:58080";

/** Creates a testing provider for testing purposes.
 * It is connected to a locally running OAuth server
 * and returns a stable profile for the test's unique account ID.
 */
function createTestingProvider(provider: string, testId: string): Provider {
	return {
		id: provider,
		name: `${provider} Testing`,
		type: "oauth",
		issuer: TEST_OAUTH_ISSUER,
		clientId: `testing-client-id`,
		clientSecret: "abc",
		userinfo: `${TEST_OAUTH_ISSUER}/userinfo`,
		token: `${TEST_OAUTH_ISSUER}/token`,
		profile() {
			return {
				name: `John Doe (${testId})`,
				email: `${testId}@example.com`,
				id: `__test_${testId}__`,
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
			// GitHub includes this issuer in its OAuth authorization response.
			issuer: "https://github.com/login/oauth",
			clientId: env.GH_CLIENT_ID,
			clientSecret: env.GH_CLIENT_SECRET,
		}),
	];
	if (import.meta.env.DEV || env.TESTING === "true") {
		providers.push(
			createTestingProvider(
				"google",
				event.request.headers.get("test-id") || "default",
			),
		);
	}

	return {
		providers: providers,
		trustHost: true,
		secret: env.SECRET_KEY,
		adapter: PrismaAdapter(prisma),
		callbacks: {
			session({ session, user }) {
				// Add user ID to session
				return session;
			},
		},
	};
});
