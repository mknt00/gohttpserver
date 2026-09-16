// Theme + dark/light mode management

const PREFIX = window.URL_PREFIX || '';
const THEMES = [
	{ id: 'ocean', name: 'Ocean', color: '#4f6ef7' },
	{ id: 'sunset', name: 'Sunset', color: '#f97316' },
	{ id: 'forest', name: 'Forest', color: '#16a34a' },
	{ id: 'dark', name: 'Dark', color: '#60a5fa' },
];

const LS_THEME = 'ghs-theme';
const LS_DARK = 'ghs-dark';

export function getThemes() {
	return THEMES;
}

function applyTheme(id) {
	const link = document.getElementById('theme-style');
	if (link) link.href = PREFIX + '/-/assets/css/themes/' + id + '.css';
}

function applyDark(enabled) {
	const meta = document.querySelector('meta[name="theme-color"]');
	if (enabled) {
		document.documentElement.style.colorScheme = 'dark';
		if (meta) meta.content = '#0f172a';
	} else {
		document.documentElement.style.colorScheme = 'light';
		const t = THEMES.find(x => x.id === getCurrentTheme());
		if (meta) meta.content = (t ? t.color : '#4f6ef7');
	}
}

export function getCurrentTheme() {
	return localStorage.getItem(LS_THEME) || 'ocean';
}

export function setTheme(id) {
	localStorage.setItem(LS_THEME, id);
	applyTheme(id);
	const t = THEMES.find(x => x.id === id);
	const meta = document.querySelector('meta[name="theme-color"]');
	if (meta && t && !isDark()) meta.content = t.color;
}

export function isDark() {
	return localStorage.getItem(LS_DARK) === '1';
}

export function setDark(enabled) {
	localStorage.setItem(LS_DARK, enabled ? '1' : '0');
	applyDark(enabled);
}

export function prefersDark() {
	return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function initTheme() {
	const theme = getCurrentTheme();
	applyTheme(theme);
	let dark = localStorage.getItem(LS_DARK);
	if (dark === null) {
		dark = prefersDark() ? '1' : '0';
		localStorage.setItem(LS_DARK, dark);
	}
	applyDark(dark === '1');
}
