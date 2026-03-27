import { env } from "$env/dynamic/private";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { SvelteKitAuth } from "@auth/sveltekit";
import type { Provider } from "@auth/sveltekit/providers";
import GitHub from "@auth/sveltekit/providers/github";

const TEST_OAUTH_ISSUER =
	env.TEST_OAUTH_ISSUER ?? "http://localhost:58080";

/** Creates a testing provider for testing purposes.
 * It is connected to a locally running OAuth server
 * and returns a mock user profile based on the user agent.
 */
function createTestingProvider(
	provider: string,
	userAgent: string,
	testId: string,
): Provider {
	// Each project can configure its own ID to get a unique account,
	// and each test inside of the project get its own account through the testId.
	const projectId = userAgent.split(" ")[0].toLowerCase();
	const testingClient = `${projectId}_${testId}`;
	return {
		id: provider,
		name: `${provider} Testing`,
		type: "oauth",
		issuer: TEST_OAUTH_ISSUER,
		clientId: `testing-client-id`,
		clientSecret: "abc",
		userinfo: `${TEST_OAUTH_ISSUER}/userinfo`,
		token: `${TEST_OAUTH_ISSUER}/token`,
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
	if (import.meta.env.DEV || env.TESTING === "true") {
		providers.push(
			createTestingProvider(
				"google",
				event.request.headers.get("user-agent") || "default",
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
