// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "../../routes/api/circuits/[id]/+server";

const empty = { components: {}, wires: {}, nextId: 0 };
async function load(data: string) {
	const event = {
		params: { id: "1" },
		locals: {
			auth: async () => ({ user: { id: "owner" } }),
			prisma: { circuits: { findUnique: async () => ({ data }) } },
		},
	} as unknown as Parameters<typeof GET>[0];
	return (await GET(event)).json();
}
describe("stored circuit validation", () => {
	it.each(["{", JSON.stringify({ ...empty, nextId: -1 })])(
		"rejects corrupt legacy records",
		async (data) => {
			expect(await load(data)).toMatchObject({ success: false });
		},
	);
	it("returns the parsed graph instead of the stored object", async () => {
		expect(await load(JSON.stringify({ ...empty, ignored: true }))).toEqual({
			success: true,
			data: empty,
		});
	});
});
