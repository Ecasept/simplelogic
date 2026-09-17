type ThemeSetting = "auto" | "light" | "dark";
type Theme = "light" | "dark";

let themeSetting: ThemeSetting = $state("auto");
let systemTheme: Theme = $state(
	window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
);

window
	.matchMedia("(prefers-color-scheme: dark)")
	.addEventListener("change", (e) => {
		systemTheme = e.matches ? "dark" : "light";
	});

export function setThemeSetting(value: ThemeSetting) {
	themeSetting = value;
}

export function getThemeSetting() {
	return themeSetting;
}

export function getTheme() {
	if (themeSetting === "auto") {
		return systemTheme;
	} else {
		return themeSetting;
	}
}

export function getThemeClass() {
	return `theme-${getTheme()} user-theme`;
}
