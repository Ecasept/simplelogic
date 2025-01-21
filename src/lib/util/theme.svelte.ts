let theme = $state("auto");

export function setTheme(value: string) {
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
