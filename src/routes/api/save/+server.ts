/** @type {import("./$types").RequestHandler} */
export async function GET({request, platform}) {
	let result = await platform?.env.DB.prepare("INSERT INTO circuits (id, name, data) VALUES (2, \"a\", \"[1,2,3]\")").run()
	return new Response(JSON.stringify(result))
}