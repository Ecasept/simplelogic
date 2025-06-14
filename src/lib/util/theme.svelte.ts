type Theme = "auto" | "light" | "dark";

let theme: Theme = $state("auto");

export function setTheme(value: Theme) {
	theme = value;
}

export function getTheme() {
	return theme;
}

export function getThemeClass() {
	if (theme === "auto") {
		return "";
	} else {
		return `theme-${theme} user-theme`;
	}
}
