// API wrapper for backend operations
import { encodePath } from './util.js';

const PREFIX = window.URL_PREFIX || '';

// Backend paths are root-relative without a leading slash (e.g. "deep1/deep2").
// fetch() resolves relative to the current page URL, so we must make every
// request absolute by prepending the URL prefix and a leading slash.
function normalizePath(path) {
	if (!path || path === '/') return PREFIX + '/';
	const absPath = path.startsWith('/') ? path : '/' + path;
	return PREFIX + absPath;
}

function ajax(url, opts = {}) {
	return fetch(url, opts).then(async (res) => {
		const ct = res.headers.get('content-type') || '';
		const data = ct.includes('application/json') ? await res.json() : await res.text();
		if (!res.ok) {
			const msg = (data && data.Error) || (typeof data === 'string' ? data : 'Request failed: ' + res.status);
			const err = new Error(msg);
			err.status = res.status;
			err.data = data;
			throw err;
		}
		return data;
	});
}

export const api = {
	fileList(path, search) {
		let url = normalizePath(path);
		const sep = url.indexOf('?') === -1 ? '?' : '&';
		url = url + sep + 'json=true';
		if (search) url += '&search=' + encodeURIComponent(search);
		return ajax(url);
	},

	fileInfo(path, checksums) {
		let url = normalizePath(path) + '?op=info';
		if (checksums) url += '&checksum=' + encodeURIComponent(checksums);
		return ajax(url);
	},

	upload(path, file, opts = {}) {
		const fd = new FormData();
		fd.append('file', file, file.name);
		if (opts.filename) fd.append('filename', opts.filename);
		if (opts.unzip) fd.append('unzip', 'true');
		if (opts.withpath) fd.append('withpath', 'true');
		if (opts.token) fd.append('token', opts.token);
		return ajax(normalizePath(path), { method: 'POST', body: fd });
	},

	remove(path) {
		return ajax(normalizePath(path), { method: 'DELETE' });
	},

	copy(path, dest) {
		return ajax(normalizePath(path) + '?op=copy', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ to: dest }),
		});
	},

	move(path, dest) {
		return ajax(normalizePath(path) + '?op=move', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ to: dest }),
		});
	},

	save(path, content) {
		return ajax(normalizePath(path), {
			method: 'PUT',
			headers: { 'Content-Type': 'text/plain' },
			body: content,
		});
	},

	sysinfo() {
		return ajax(PREFIX + '/-/sysinfo');
	},

	stats() {
		return ajax(PREFIX + '/-/stats');
	},
};

export { encodePath };
