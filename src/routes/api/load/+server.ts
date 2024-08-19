export async function GET({platform}) {
    let result = await platform?.env.DB.prepare("SELECT * FROM circuits LIMIT 5").run();
    return new Response(JSON.stringify(result?.results))
}