import { OAuth2Server } from "oauth2-mock-server";

const server = new OAuth2Server();

export async function startMockServer() {
	server.issuer.keys.generate("RS256");
	server.issuer.url = "http://localhost:8080";
	console.log("OAuth2 mock server started at", server.issuer.url);
	await server.start(8080);
}

export async function stopMockServer() {
	await server.stop();
	console.log("OAuth2 mock server stopped");
}

startMockServer();
