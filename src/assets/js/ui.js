// UI helpers: modal, toast, context menu, file grid/list rendering
import { formatBytes, formatTime, escapeHtml, encodePath, getExtension } from './util.js';
import { getIcon, getIconClass } from './icons.js';

const PREFIX = window.URL_PREFIX || '';

/* ----------------------------- Toast ----------------------------- */

export function toast(msg, type = 'info', ms = 2600) {
	const container = document.getElementById('toast-container');
	const el = document.createElement('div');
	el.className = 'toast toast-' + type;
	el.textContent = msg;
	container.appendChild(el);
	setTimeout(() => {
		el.style.opacity = '0';
		el.style.transition = 'opacity 0.3s';
		setTimeout(() => el.remove(), 300);
	}, ms);
}

/* ----------------------------- Modal ----------------------------- */

export function openModal(html, opts = {}) {
	closeModal();
	const overlay = document.createElement('div');
	overlay.className = 'modal-overlay';
	overlay.innerHTML = `
		<div class="modal${opts.lg ? ' modal-lg' : ''}">
			<div class="modal-header">
				<h3>${opts.title || ''}</h3>
				<button class="modal-close" id="modal-close">&times;</button>
			</div>
			<div class="modal-body">${html}</div>
			${opts.footer ? `<div class="modal-footer">${opts.footer}</div>` : ''}
		</div>`;
	document.body.appendChild(overlay);
	overlay.querySelector('#modal-close').onclick = closeModal;
	if (opts.onOpen) opts.onOpen(overlay);
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) closeModal();
	});
	overlay._onClose = opts.onClose;
	return overlay;
}

export function closeModal() {
	const existing = document.querySelector('.modal-overlay');
	if (existing) {
		// onClose may return false to veto the close (e.g. uploads in progress)
		if (existing._onClose && existing._onClose() === false) return;
		existing.remove();
	}
}

/* ----------------------------- Context menu ----------------------------- */

export function openContextMenu(x, y, items) {
	closeContextMenu();
	const menu = document.createElement('div');
	menu.className = 'context-menu';
	menu.style.left = x + 'px';
	menu.style.top = y + 'px';
	items.forEach((item) => {
		if (item.divider) {
			menu.appendChild(document.createElement('hr'));
			return;
		}
		const btn = document.createElement('button');
		if (item.danger) btn.className = 'danger';
		btn.innerHTML = `<span class="cm-icon">${item.icon || ''}</span><span>${escapeHtml(item.label)}</span>`;
		btn.onclick = () => {
			closeContextMenu();
			item.action();
		};
		menu.appendChild(btn);
	});
	document.body.appendChild(menu);
	// Clamp into viewport
	const rect = menu.getBoundingClientRect();
	if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
	if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
	setTimeout(() => {
		document.addEventListener('click', closeContextMenu, { once: true });
	}, 0);
}

export function closeContextMenu() {
	const existing = document.querySelector('.context-menu');
	if (existing) existing.remove();
}

/* ----------------------------- File rendering ----------------------------- */

export function renderEmpty() {
	document.getElementById('file-view').innerHTML = '';
	const es = document.getElementById('empty-state');
	if (es) es.style.display = '';
}

export function renderBreadcrumb(pathname, onNavigate) {
	const bc = document.getElementById('breadcrumb');
	if (!bc) return;
	const pathnameClean = decodeURIComponent(pathname).split('?')[0];
	const parts = pathnameClean.split('/').filter(Boolean);
	let html = `<li><a href="#" data-path="/">📁 Home</a></li>`;
	let acc = '';
	parts.forEach((p, i) => {
		acc += '/' + p;
		const isLast = i === parts.length - 1;
		if (isLast) {
			html += `<li class="sep">/</li><li class="current">${escapeHtml(decodeURIComponent(p))}</li>`;
		} else {
			html += `<li class="sep">/</li><li><a href="#" data-path="${encodePath(acc)}">${escapeHtml(decodeURIComponent(p))}</a></li>`;
		}
	});
	bc.innerHTML = html;
	bc.querySelectorAll('a[data-path]').forEach((a) => {
		a.onclick = (e) => {
			e.preventDefault();
			onNavigate(a.dataset.path);
		};
	});
}

function fileRowActions(f, ctx) {
	const enc = encodePath(f.path || f.name);
	const isDir = f.type === 'dir';
	let html = '';
	if (isDir) {
		html += `<a class="btn btn-sm" href="${PREFIX}/${enc}/?op=archive" title="Download as zip">Zip</a>`;
	} else {
		html += `<a class="btn btn-sm" href="${PREFIX}/${enc}?download=true" title="Download">⬇</a>`;
	}
	html += `<button class="btn btn-sm info-btn" title="Info" data-path="${enc}">ℹ</button>`;
	if (isDir) {
		html += `<button class="btn btn-sm qr-btn" data-path="${enc}">QR</button>`;
	} else {
		const ext = getExtension(f.name);
		if (['apk', 'ipa'].includes(ext)) {
			html += `<button class="btn btn-sm qr-btn" data-path="${enc}">QR</button>`;
		}
	}
	if (ctx.canDelete) {
		html += `<button class="btn btn-sm btn-danger del-btn" title="Delete" data-path="${escapeHtml(f.path)}">🗑</button>`;
	}
	return html;
}

export function renderList(files, ctx) {
	const view = document.getElementById('file-view');
	const es = document.getElementById('empty-state');
	if (!files.length) { renderEmpty(); return; }
	if (es) es.style.display = 'none';
	const sort = ctx.sort || { key: 'name', dir: 1 };
	let html = `<div class="file-list"><table><thead><tr>
		<th data-sort="name">Name<span class="sort-arrow">${sort.key === 'name' ? (sort.dir === 1 ? '▲' : '▼') : ''}</span></th>
		<th data-sort="size">Size<span class="sort-arrow">${sort.key === 'size' ? (sort.dir === 1 ? '▲' : '▼') : ''}</span></th>
		<th data-sort="mtime">Modified<span class="sort-arrow">${sort.key === 'mtime' ? (sort.dir === 1 ? '▲' : '▼') : ''}</span></th>
		<th>Actions</th>
		</tr></thead><tbody>`;
	files.forEach((f) => {
		const enc = encodePath(f.path || f.name);
		const selected = ctx.selected.has(f.path) ? ' selected' : '';
		const isDir = f.type === 'dir';
		const icon = getIcon(f);
		html += `<tr data-path="${escapeHtml(f.path)}" class="file-row${selected}">
			<td><a class="row-name" href="${PREFIX}/${isDir ? enc + '/' : enc}" data-path="${enc}" data-type="${f.type}">
				<span class="row-icon ${getIconClass(f)}">${icon}</span>${escapeHtml(f.name)}</a></td>
			<td>${isDir ? '—' : formatBytes(f.size)}</td>
			<td>${formatTime(f.mtime)}</td>
			<td><div class="row-actions">${fileRowActions(f, ctx)}</div></td>
		</tr>`;
	});
	html += `</tbody></table></div>`;
	view.innerHTML = html;
}

export function renderGrid(files, ctx) {
	const view = document.getElementById('file-view');
	const es = document.getElementById('empty-state');
	if (!files.length) { renderEmpty(); return; }
	if (es) es.style.display = 'none';
	let html = `<div class="file-grid">`;
	files.forEach((f) => {
		const enc = encodePath(f.name);
		const selected = ctx.selected.has(f.path) ? ' selected' : '';
		const isDir = f.type === 'dir';
		const icon = getIcon(f);
		html += `<div class="file-card${selected}" data-path="${escapeHtml(f.path)}" data-type="${f.type}">
			<div class="card-check" data-path="${escapeHtml(f.path)}">${selected ? '✓' : ''}</div>
			<div class="card-icon ${getIconClass(f)}">${icon}</div>
			<div class="card-name">${escapeHtml(f.name)}</div>
			<div class="card-meta">${isDir ? 'folder' : formatBytes(f.size)}</div>
		</div>`;
	});
	html += `</div>`;
	view.innerHTML = html;
}

export function updateSelectionUI(selected, canDelete) {
	const badge = document.getElementById('selection-info');
	const count = document.getElementById('sel-count');
	if (selected.size > 0) {
		badge.style.display = '';
		count.textContent = selected.size;
	} else {
		badge.style.display = 'none';
	}
}
