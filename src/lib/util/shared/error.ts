export function err(msg: string): App.Error {
	return {
		success: false,
		error: msg,
		message: msg,
	};
}
