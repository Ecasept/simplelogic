// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { MAX_CIRCUIT_BODY_BYTES, readCircuitInput } from "./circuitInput";
import { POST } from "../../routes/api/circuits/+server";

const empty = { components: {}, wires: {}, nextId: 0 };
function request(body: string) {
	return new Request("http://localhost/api/circuits", { method: "POST", body });
}

describe("circuit input", () => {
	it("returns validated data and trims names", async () => {
		await expect(
			readCircuitInput(
				request(JSON.stringify({ name: " Circuit ", data: empty })),
			),
		).resolves.toEqual({ name: "Circuit", data: empty });
	});
	it.each([
		"{",
		"null",
		JSON.stringify({ name: " ", data: empty }),
		JSON.stringify({ name: "x", data: { ...empty, nextId: -1 } }),
	])("rejects malformed input", async (body) => {
		await expect(readCircuitInput(request(body))).rejects.toMatchObject({
			status: 400,
		});
	});
	it("rejects an oversized body without trusting Content-Length", async () => {
		await expect(
			readCircuitInput(request(" ".repeat(MAX_CIRCUIT_BODY_BYTES + 1))),
		).rejects.toMatchObject({ status: 413 });
	});
	it("does not query the database on invalid graph data", async () => {
		const prisma = { circuits: { findUnique: vi.fn(), create: vi.fn() } };
		const body = JSON.stringify({ name: "x", data: { ...empty, nextId: -1 } });
		// Only the request, authentication and database members used by POST are mocked.
		const event = {
			request: request(body),
			locals: { prisma, auth: async () => ({ user: { id: "test" } }) },
		} as unknown as Parameters<typeof POST>[0];
		await expect(POST(event)).rejects.toMatchObject({ status: 400 });
		expect(prisma.circuits.findUnique).not.toHaveBeenCalled();
		expect(prisma.circuits.create).not.toHaveBeenCalled();
	});
});
