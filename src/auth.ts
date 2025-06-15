import { env } from "$env/dynamic/private";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { SvelteKitAuth } from "@auth/sveltekit";
import type { Provider } from "@auth/sveltekit/providers";
import GitHub from "@auth/sveltekit/providers/github";

function createTestingProvider(provider: string): Provider {
	return {
		id: provider,
		name: `${provider} Testing`,
		type: "oauth",
		issuer: "http://localhost:8080",
		clientId: "testing-client-id",
		clientSecret: "abc",
		userinfo: "http://localhost:8080/userinfo",
		token: "http://localhost:8080/token",
		profile(profile) {
			return {
				name: "John Doe",
				email: "john@doe.com",
				id: "1234567890",
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
		providers.push(createTestingProvider("google"));
	}

	return {
		providers: providers,
		trustHost: true,
		secret: env.SECRET_KEY,
		adapter: PrismaAdapter(prisma),
	};
});
