// Utility helpers

export function getExtension(fname) {
	const idx = fname.lastIndexOf('.');
	if (idx <= 0) return '';
	return fname.slice(idx + 1).toLowerCase();
}

export function pathJoin(parts, sep) {
	const separator = sep || '/';
	const replace = new RegExp(separator + '{1,}', 'g');
	return parts.join(separator).replace(replace, separator);
}

export function getQueryString(name) {
	const reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)');
	const r = decodeURI(window.location.search).substr(1).match(reg);
	if (r != null) return r[2].replace(/\+/g, ' ');
	return null;
}

export function formatBytes(value) {
	const bytes = parseFloat(value);
	if (bytes < 0) return '-';
	if (bytes < 1024) return bytes + ' B';
	if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
	if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
	return (bytes / 1073741824).toFixed(1) + ' GB';
}

export function formatTime(ts, fromNow = false) {
	const d = new Date(ts);
	if (fromNow) {
		const diff = Date.now() - d.getTime();
		const mins = Math.round(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return mins + 'm ago';
		const hrs = Math.round(mins / 60);
		if (hrs < 24) return hrs + 'h ago';
		const days = Math.round(hrs / 24);
		if (days < 30) return days + 'd ago';
	}
	return d.toLocaleString();
}

export function escapeHtml(str) {
	const div = document.createElement('div');
	div.textContent = str;
	return div.innerHTML;
}

export function debounce(fn, ms = 200) {
	let t;
	return function (...args) {
		clearTimeout(t);
		t = setTimeout(() => fn.apply(this, args), ms);
	};
}

export function checkPathNameLegal(name) {
	return !/[\/:*<>|]/.test(name);
}

// Encode a path for use in URL, preserving slashes.
// Normalize backslashes to forward slashes first so Windows backend paths
// (e.g. "testdata\中文路径") don't get encoded as %5C.
export function encodePath(path) {
	return path.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');
}
