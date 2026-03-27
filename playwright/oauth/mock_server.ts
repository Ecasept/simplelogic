import { OAuth2Server } from "oauth2-mock-server";

const server = new OAuth2Server();
const port = Number(process.env.TEST_OAUTH_PORT ?? 58080);
const issuerUrl = process.env.TEST_OAUTH_ISSUER ?? `http://localhost:${port}`;

export async function startMockServer() {
	server.issuer.keys.generate("RS256");
	server.issuer.url = issuerUrl;
	console.log("OAuth2 mock server started at", server.issuer.url);

	await server.start(port);
}

export async function stopMockServer() {
	await server.stop();
	console.log("OAuth2 mock server stopped");
}

startMockServer();
