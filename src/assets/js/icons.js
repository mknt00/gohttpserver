// SVG icon strings per file type. Injected via innerHTML.
// Each icon is a 24x24 viewBox SVG, currentColor inherits the type color.

function svg(inner) {
	return `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" style="display:inline-block;vertical-align:middle">${inner}</svg>`;
}

const ICONS = {
	dir: svg('<path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>'),
	code: svg('<path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>'),
	image: svg('<path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z"/>'),
	audio: svg('<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>'),
	video: svg('<path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>'),
	archive: svg('<path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 12H6v-2h8v2zm4-4H6v-2h12v2zm0-4H6V8h12v2z"/>'),
	pdf: svg('<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM9 13v4H7v-4h2zm8 4h-2v-4h2v4zm-4-4v4h-2v-4h2zM13 9V3.5L18.5 9H13z"/>'),
	apple: svg('<path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>'),
	android: svg('<path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-1.4-.59-2.96-.92-4.47-.92s-3.07.33-4.47.92L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/>'),
	windows: svg('<path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801z"/>'),
	text: svg('<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/>'),
};

// Map file extensions to icon keys
const EXT_MAP = {
	// code
	go: 'code', py: 'code', js: 'code', ts: 'code', jsx: 'code', tsx: 'code',
	java: 'code', c: 'code', cpp: 'code', h: 'code', hpp: 'code', rs: 'code',
	rb: 'code', php: 'code', swift: 'code', kt: 'code', scala: 'code',
	sh: 'code', bash: 'code', zsh: 'code', sql: 'code', r: 'code',
	// image
	jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', bmp: 'image',
	webp: 'image', svg: 'image', tiff: 'image', ico: 'image',
	// audio
	mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio', aac: 'audio', wma: 'audio',
	// video
	mp4: 'video', webm: 'video', mov: 'video', avi: 'video', mkv: 'video', flv: 'video',
	// archive
	zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
	bz2: 'archive', xz: 'archive', tgz: 'archive',
	// pdf
	pdf: 'pdf',
	// apple
	ipa: 'apple', dmg: 'apple',
	// android
	apk: 'android',
	// windows
	exe: 'windows', msi: 'windows',
	// text
	md: 'text', txt: 'text', log: 'text', json: 'text', xml: 'text',
	yaml: 'text', yml: 'text', csv: 'text', ini: 'text', conf: 'text',
	css: 'text', html: 'text', htm: 'text',
};

export function getIcon(file) {
	if (file.type === 'dir') {
		if (file.name === '.git') return ICONS.code;
		return ICONS.dir;
	}
	const ext = (file.name || '').split('.').pop().toLowerCase();
	const key = EXT_MAP[ext] || 'text';
	return ICONS[key];
}

export function getIconClass(file) {
	if (file.type === 'dir') return 'icon-dir';
	const ext = (file.name || '').split('.').pop().toLowerCase();
	const key = EXT_MAP[ext] || 'text';
	return 'icon-' + key;
}

export { ICONS };
