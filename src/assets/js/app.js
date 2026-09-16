// Main application entry point
import { api, encodePath } from './api.js';
import { getExtension, pathJoin, getQueryString, formatBytes, formatTime, escapeHtml, debounce, checkPathNameLegal } from './util.js';
import { getIcon, getIconClass } from './icons.js';
import * as theme from './theme.js';
import { toast, openModal, closeModal, openContextMenu, closeContextMenu, renderBreadcrumb, renderList, renderGrid, renderEmpty, updateSelectionUI } from './ui.js';
import { setupUpload } from './upload.js';
import { openPreview } from './preview.js';

const PREFIX = window.URL_PREFIX || '';

// Backend paths are root-relative without a leading slash (e.g. "deep1/deep2").
// Convert to a canonical root-absolute form ("/deep1/deep2") for our own use.
function canonicalPath(path) {
	if (!path || path === '/') return '/';
	const p = path.split('?')[0];
	return p.startsWith('/') ? p : '/' + p;
}

const state = {
	files: [],
	auth: { upload: false, delete: false },
	user: { email: '', name: '' },
	path: '/',
	search: getQueryString('search') || '',
	showHidden: false,
	view: localStorage.getItem('ghs-view') || 'list',
	sort: { key: 'name', dir: 1 },
	selected: new Set(),
	lastSelected: null,
	mtimeFromNow: false,
};

/* ----------------------------- Data loading ----------------------------- */

async function loadFileList(path) {
	// path is root-absolute ("/deep1/deep2"); api.fileList prepends the prefix.
	path = path || state.path || '/';
	try {
		const search = state.search ? '?search=' + encodeURIComponent(state.search) : '';
		const res = await api.fileList(path + search);
		state.files = filterAndSort(res.files || []);
		state.auth = res.auth || {};
		render();
	} catch (err) {
		toast(err.message, 'error');
	}
}

function filterAndSort(files) {
	let list = files.filter((f) => {
		if (!state.showHidden && f.name.slice(0, 1) === '.') return false;
		return true;
	});
	const { key, dir } = state.sort;
	list.sort((a, b) => {
		// dirs first unless sorting by size
		if (key !== 'size') {
			if (a.type === 'dir' && b.type !== 'dir') return -1;
			if (a.type !== 'dir' && b.type === 'dir') return 1;
		}
		let va, vb;
		switch (key) {
			case 'size': va = a.size || 0; vb = b.size || 0; break;
			case 'mtime': va = a.mtime || 0; vb = b.mtime || 0; break;
			default: va = (a.name || '').toLowerCase(); vb = (b.name || '').toLowerCase();
		}
		if (va < vb) return -1 * dir;
		if (va > vb) return 1 * dir;
		return 0;
	});
	return list;
}

/* ----------------------------- Rendering ----------------------------- */

function render() {
	renderBreadcrumb(state.path, navigateTo);
	// v-show auth-gated buttons via DOM
	document.getElementById('upload-btn').style.display = state.auth.upload ? '' : 'none';
	document.getElementById('btn-newfolder').style.display = state.auth.delete ? '' : 'none';

	const ctx = {
		sort: state.sort,
		selected: state.selected,
		canDelete: state.auth.delete,
	};

	if (state.view === 'list') {
		renderList(state.files, ctx);
	} else {
		renderGrid(state.files, ctx);
	}
	updateSelectionUI(state.selected, state.auth.delete);
	bindItemEvents();
	bindSortEvents();
}

/* ----------------------------- Navigation ----------------------------- */

function navigateTo(reqPath) {
	// Store path as canonical root-absolute (no prefix, leading slash).
	state.path = canonicalPath(reqPath);
	const search = state.search ? '?search=' + encodeURIComponent(state.search) : '';
	// The browser URL must be fully absolute (prefix + path) so history.back()
	// and pushState never resolve relative to the current page.
	const browserURL = PREFIX + state.path + search;
	loadFileList(state.path).then(() => {
		window.history.pushState({}, '', browserURL);
		state.selected.clear();
	});
}

function loadFileOrDir(reqPath) {
	navigateTo(reqPath);
}

/* ----------------------------- Item events ----------------------------- */

function bindItemEvents() {
	const view = document.getElementById('file-view');

	// Click on row/card
	view.querySelectorAll('.file-row, .file-card').forEach((el) => {
		el.addEventListener('click', (e) => {
			// checkbox
			if (e.target.classList.contains('card-check')) {
				toggleSelect(el.dataset.path, e.shiftKey);
				return;
			}
			const isDir = el.dataset.type === 'dir';
			const path = el.dataset.path;
			if (e.shiftKey) {
				toggleSelect(path, true);
				return;
			}
			if (isDir) {
				loadFileOrDir(encodePath(path));
			} else {
				handleFileClick(path);
			}
		});

		el.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			const path = el.dataset.path;
			if (!state.selected.has(path)) {
				state.selected.clear();
				state.selected.add(path);
				render();
			}
			const f = state.files.find((x) => x.path === path);
			if (f) showContextMenu(e.clientX, e.clientY, f);
		});
	});

	// Action buttons in list view
	view.querySelectorAll('.info-btn').forEach((b) => {
		b.onclick = (e) => { e.stopPropagation(); showInfo(b.dataset.path); };
	});
	view.querySelectorAll('.del-btn').forEach((b) => {
		b.onclick = (e) => { e.stopPropagation(); deletePath(b.dataset.path, b); };
	});
	view.querySelectorAll('.qr-btn').forEach((b) => {
		b.onclick = (e) => { e.stopPropagation(); genQrcode(b.dataset.path); };
	});
}

function handleFileClick(path) {
	const f = state.files.find((x) => x.path === path);
	if (!f) return;
	const ext = getExtension(f.name).toLowerCase();
	const videoExt = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
	const imageExt = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff'];
	if (videoExt.includes(ext)) {
		window.location.href = PREFIX + '/-/video-player' + encodePath(path);
	} else {
		openPreview(f);
	}
}

/* ----------------------------- Context menu ----------------------------- */

function showContextMenu(x, y, f) {
	const enc = encodePath(f.path || f.name);
	const items = [];
	items.push({ label: 'Open', icon: '📂', action: () => f.type === 'dir' ? loadFileOrDir(enc) : handleFileClick(f.path) });
	if (f.type !== 'dir') {
		items.push({ label: 'Download', icon: '⬇', action: () => { window.location.href = PREFIX + (enc.startsWith('/') ? '' : '/') + enc + '?download=true'; } });
	}
	items.push({ divider: true });
	if (state.auth.upload) {
		items.push({ label: 'Copy to…', icon: '⧉', action: () => promptCopyMove(f, 'copy') });
		items.push({ label: 'Move to…', icon: '✂', action: () => promptCopyMove(f, 'move') });
		items.push({ label: 'Rename', icon: '✎', action: () => promptRename(f) });
	}
	items.push({ label: 'Checksums', icon: '#', action: () => showChecksums(f) });
	if (['apk', 'ipa'].includes(getExtension(f.name))) {
		items.push({ label: 'QR Code / Install', icon: '⊞', action: () => genQrcode(enc) });
	}
	items.push({ divider: true });
	items.push({ label: 'Info', icon: 'ℹ', action: () => showInfo(enc) });
	if (state.auth.delete) {
		items.push({ label: 'Delete', icon: '🗑', danger: true, action: () => deletePath(f.path) });
	}
	openContextMenu(x, y, items);
}

/* ----------------------------- Selection ----------------------------- */

function toggleSelect(path, shift) {
	if (shift && state.lastSelected) {
		const idxs = state.files.map((f) => f.path);
		const a = idxs.indexOf(state.lastSelected);
		const b = idxs.indexOf(path);
		if (a >= 0 && b >= 0) {
			const [s, e] = a < b ? [a, b] : [b, a];
			for (let i = s; i <= e; i++) state.selected.add(idxs[i]);
		}
	} else if (state.selected.has(path)) {
		state.selected.delete(path);
	} else {
		state.selected.add(path);
	}
	state.lastSelected = path;
	render();
}

/* ----------------------------- File operations ----------------------------- */

async function showInfo(path) {
	try {
		const res = await api.fileInfo(path);
		const rows = [
			['Name', res.name],
			['Type', res.type],
			['Size', formatBytes(res.size)],
			['Modified', formatTime(res.mtime)],
			['Path', res.path],
		];
		if (res.downloadCount) rows.push(['Downloads', String(res.downloadCount)]);
		if (res.extra && typeof res.extra === 'object') {
			Object.keys(res.extra).forEach((k) => rows.push([k, String(res.extra[k])]));
		}
		const html = rows.map((r) => `<div class="info-row"><div class="info-label">${escapeHtml(r[0])}</div><div class="info-value">${escapeHtml(r[1])}</div></div>`).join('');
		openModal(html, { title: '📄 ' + escapeHtml(res.name) });
	} catch (err) {
		toast(err.message, 'error');
	}
}

async function showChecksums(f) {
	const html = `<p>Computing checksums for <b>${escapeHtml(f.name)}</b>…</p>`;
	const modal = openModal(html, { title: '# Checksums' });
	try {
		const res = await api.fileInfo(encodePath(f.name), 'md5,sha1,sha256');
		const extra = res.extra || {};
		const rows = [
			['MD5', extra.md5 || '—'],
			['SHA1', extra.sha1 || '—'],
			['SHA256', extra.sha256 || '—'],
		];
		const body = modal.querySelector('.modal-body');
		body.innerHTML = `<div class="info-table">` +
			rows.map((r) => `<div class="info-row"><div class="info-label">${r[0]}</div><div class="info-value">${escapeHtml(r[1])}</div></div>`).join('') +
			`</div>`;
	} catch (err) {
		modal.querySelector('.modal-body').innerHTML = `<p style="color:#ef4444">${escapeHtml(err.message)}</p>`;
	}
}

async function deletePath(path) {
	const f = state.files.find((x) => x.path === path);
	const name = f ? f.name : path;
	if (!window.confirm('Delete ' + name + '?')) return;
	try {
		await api.remove(encodePath(path));
		toast('Deleted ' + name, 'success');
		state.selected.delete(path);
		loadFileList();
	} catch (err) {
		toast(err.message, 'error');
	}
}

function promptRename(f) {
	const html = `<div class="form-row"><label>New name</label><input id="rename-input" value="${escapeHtml(f.name)}"></div>`;
	const footer = `<button class="btn" id="rename-cancel">Cancel</button><button class="btn btn-primary" id="rename-ok">Rename</button>`;
	openModal(html, {
		title: '✎ Rename',
		footer,
		onOpen: (modal) => {
			const input = modal.querySelector('#rename-input');
			input.focus();
			input.select();
			modal.querySelector('#rename-cancel').onclick = closeModal;
			modal.querySelector('#rename-ok').onclick = async () => {
				const newName = input.value.trim();
				if (!newName || newName === f.name) { closeModal(); return; }
				if (!checkPathNameLegal(newName)) { toast('Name should not contain \\/:*<>|', 'error'); return; }
				const dest = encodePath(pathJoin([f.path.split('/').slice(0, -1).join('/'), newName]));
				try {
					await api.move(encodePath(f.path), dest);
					toast('Renamed', 'success');
					closeModal();
					loadFileList();
				} catch (err) { toast(err.message, 'error'); }
			};
		},
	});
}

function promptCopyMove(f, op) {
	const html = `<div class="form-row"><label>Destination path (absolute, e.g. /target/)</label><input id="cm-input" placeholder="/"></div>`;
	const footer = `<button class="btn" id="cm-cancel">Cancel</button><button class="btn btn-primary" id="cm-ok">${op === 'copy' ? 'Copy' : 'Move'}</button>`;
	openModal(html, {
		title: op === 'copy' ? '⧉ Copy to' : '✂ Move to',
		footer,
		onOpen: (modal) => {
			const input = modal.querySelector('#cm-input');
			input.focus();
			modal.querySelector('#cm-cancel').onclick = closeModal;
			modal.querySelector('#cm-ok').onclick = async () => {
				const dest = input.value.trim();
				if (!dest) return;
				try {
					if (op === 'copy') await api.copy(encodePath(f.path), dest);
					else await api.move(encodePath(f.path), dest);
					toast(op === 'copy' ? 'Copied' : 'Moved', 'success');
					closeModal();
					loadFileList();
				} catch (err) { toast(err.message, 'error'); }
			};
		},
	});
}

/* ----------------------------- QR code ----------------------------- */

function genQrcode(path) {
	const urlPath = location.origin + (path.startsWith('/') ? '' : '/') + encodePath(path);
	const html = `<div style="text-align:center">
		<div id="qrcode-canvas" style="display:inline-block"></div>
		<p style="margin-top:12px"><a href="${escapeHtml(urlPath)}" target="_blank">${escapeHtml(urlPath)}</a></p>
	</div>`;
	openModal(html, { title: '⊞ QR Code', onOpen: (modal) => {
		if (window.QRCode) {
			modal.querySelector('#qrcode-canvas').innerHTML = '';
			new QRCode(modal.querySelector('#qrcode-canvas'), { text: encodeURI(urlPath), width: 220, height: 220 });
		}
	}});
}

/* ----------------------------- Sorting ----------------------------- */

function bindSortEvents() {
	document.querySelectorAll('.file-list th[data-sort]').forEach((th) => {
		th.onclick = () => {
			const key = th.dataset.sort;
			if (state.sort.key === key) state.sort.dir *= -1;
			else { state.sort.key = key; state.sort.dir = 1; }
			state.files = filterAndSort(state.files);
			render();
		};
	});
}

/* ----------------------------- Toolbar / nav ----------------------------- */

function setupToolbar() {
	document.getElementById('btn-back').onclick = () => history.back();
	document.getElementById('btn-hidden').onclick = () => {
		state.showHidden = !state.showHidden;
		loadFileList();
	};
	document.getElementById('btn-newfolder').onclick = makeDirectory;
	document.getElementById('upload-btn').onclick = () => openUploadModal();
	document.getElementById('view-toggle').onclick = toggleView;
	document.getElementById('dark-toggle').onclick = toggleDark;
	document.getElementById('theme-btn').onclick = toggleThemeMenu;

	// Selection actions
	document.getElementById('sel-clear').onclick = () => { state.selected.clear(); render(); };
	document.getElementById('sel-delete').onclick = deleteSelected;
	document.getElementById('sel-archive').onclick = archiveSelected;

	// Search
	const searchInput = document.getElementById('search-input');
	if (searchInput) {
		searchInput.value = state.search;
		searchInput.addEventListener('input', debounce((e) => {
			state.search = e.target.value;
			loadFileList();
		}, 300));
	}
}

function toggleView() {
	state.view = state.view === 'grid' ? 'list' : 'grid';
	localStorage.setItem('ghs-view', state.view);
	render();
}

function toggleDark() {
	const dark = !theme.isDark();
	theme.setDark(dark);
	document.getElementById('dark-icon').textContent = dark ? '☀' : '🌙';
}

function toggleThemeMenu() {
	const menu = document.getElementById('theme-menu');
	const themes = theme.getThemes();
	if (menu.classList.contains('open')) { menu.classList.remove('open'); return; }
	menu.innerHTML = themes.map((t) => `<button data-theme="${t.id}"><span class="theme-swatch" style="background:${t.color}"></span>${t.name}</button>`).join('');
	menu.querySelectorAll('button').forEach((b) => {
		b.onclick = () => {
			theme.setTheme(b.dataset.theme);
			menu.classList.remove('open');
		};
	});
	menu.classList.add('open');
}

async function makeDirectory() {
	const name = window.prompt('New folder name:');
	if (!name) return;
	if (!checkPathNameLegal(name)) { toast('Name should not contain \\/:*<>|', 'error'); return; }
	try {
		await api.upload(encodePath(pathJoin([state.path, name])), new File([], ''), {});
		toast('Folder created', 'success');
		loadFileList();
	} catch (err) { toast(err.message, 'error'); }
}

async function deleteSelected() {
	if (!window.confirm('Delete ' + state.selected.size + ' item(s)?')) return;
	for (const p of state.selected) {
		try { await api.remove(encodePath(p)); } catch (err) { toast(err.message, 'error'); }
	}
	toast('Deleted', 'success');
	state.selected.clear();
	loadFileList();
}

function archiveSelected() {
	// Use first selected for now; zip endpoint works per-path
	const first = state.selected.values().next().value;
	if (first) {
		const enc = encodePath(first);
		window.location.href = PREFIX + (enc.startsWith('/') ? '' : '/') + enc + '/?op=archive';
	}
}

/* ----------------------------- Upload ----------------------------- */

function openUploadModal() {
	const html = `
		<div class="dropzone" id="dropzone">
			<div class="dz-icon">⬆</div>
			<p><b>Drag & drop</b> files here, or click to browse</p>
			<p style="font-size:12px">Supports files and whole folders</p>
			<input type="file" id="file-input" multiple style="display:none">
			<input type="file" id="folder-input" webkitdirectory multiple style="display:none">
		</div>
		<div style="margin-top:10px;text-align:center">
			<button class="btn btn-sm" id="folder-btn">📁 Upload folder</button>
		</div>
		<div class="upload-list" id="upload-list"></div>`;
	openModal(html, { title: '⬆ Upload', lg: false, onOpen: (modal) => setupUpload(modal, () => loadFileList()) });
}

/* ----------------------------- Keyboard shortcuts ----------------------------- */

function setupKeyboard() {
	document.addEventListener('keydown', (e) => {
		if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
		if (e.key === 'Escape') { closeModal(); closeContextMenu(); state.selected.clear(); render(); }
		if (e.ctrlKey && e.key === 'a') { e.preventDefault(); state.selected = new Set(state.files.map((f) => f.path)); render(); }
		if (e.ctrlKey && e.key === 'f') { e.preventDefault(); document.getElementById('search-input')?.focus(); }
		if (e.ctrlKey && e.key === 'u') { e.preventDefault(); openUploadModal(); }
		if (e.key === 'Delete' && state.selected.size) { e.preventDefault(); deleteSelected(); }
		if (e.key === 'F2' && state.selected.size === 1) {
			e.preventDefault();
			const path = state.selected.values().next().value;
			const f = state.files.find((x) => x.path === path);
			if (f) promptRename(f);
		}
	});
}

/* ----------------------------- Init ----------------------------- */

async function init() {
	theme.initTheme();
	document.getElementById('dark-icon').textContent = theme.isDark() ? '☀' : '🌙';
	setupToolbar();
	setupKeyboard();


	// initial load — derive canonical path from the browser URL (strip prefix)
	state.path = stripPrefix(location.pathname);
	loadFileList(state.path);

	window.onpopstate = () => {
		if (location.search.match(/\?search=/)) { location.reload(); return; }
		state.path = stripPrefix(location.pathname);
		loadFileList(state.path);
	};
}

// Strip the URL prefix from a browser pathname to get the root-absolute path.
function stripPrefix(pathname) {
	if (PREFIX && pathname.startsWith(PREFIX)) {
		pathname = pathname.slice(PREFIX.length);
	}
	return canonicalPath(pathname);
}

document.addEventListener('DOMContentLoaded', init);

// expose for inline handlers
window.appState = state;
