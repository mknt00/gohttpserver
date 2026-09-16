// Drag-and-drop upload with progress + folder upload
import { api } from './api.js';
import { encodePath } from './util.js';
import { closeModal, toast } from './ui.js';

export function setupUpload(modal, onDone) {
	const dropzone = modal.querySelector('#dropzone');
	const fileInput = modal.querySelector('#file-input');
	const folderInput = modal.querySelector('#folder-input');
	const folderBtn = modal.querySelector('#folder-btn');
	const list = modal.querySelector('#upload-list');

	// Track in-flight uploads so the modal cannot be closed while running.
	const uploads = { active: 0 };
	const prevOnClose = modal._onClose;
	modal._onClose = () => {
		if (uploads.active > 0) {
			toast(`Upload in progress (${uploads.active} file${uploads.active > 1 ? 's' : ''}) — please wait`, 'warning');
			return false;
		}
		return prevOnClose ? prevOnClose() : true;
	};

	dropzone.addEventListener('click', () => fileInput.click());
	folderBtn.onclick = (e) => { e.stopPropagation(); folderInput.click(); };

	['dragenter', 'dragover'].forEach((ev) => {
		dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
	});
	['dragleave', 'drop'].forEach((ev) => {
		dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); });
	});
	dropzone.addEventListener('drop', (e) => {
		const items = e.dataTransfer.items;
		if (items && items.length && items[0].webkitGetAsEntry) {
			handleDataTransferItems(items, list, onDone, uploads);
		} else {
			handleFiles(e.dataTransfer.files, list, onDone, false, uploads);
		}
	});

	fileInput.onchange = () => { handleFiles(fileInput.files, list, onDone, false, uploads); fileInput.value = ''; };
	folderInput.onchange = () => { handleFiles(folderInput.files, list, onDone, true, uploads); folderInput.value = ''; };
}

function handleDataTransferItems(items, list, onDone, uploads) {
	const entries = [];
	for (let i = 0; i < items.length; i++) {
		entries.push(items[i].webkitGetAsEntry());
	}
	entries.forEach((entry) => {
		if (entry.isFile) {
			entry.file((file) => {
				uploadFile(file, list, onDone, false, uploads);
			});
		} else if (entry.isDirectory) {
			uploadDirectory(entry, list, onDone, uploads);
		}
	});
}

function uploadDirectory(dirEntry, list, onDone, uploads) {
	const reader = dirEntry.createReader();
	reader.readEntries((entries) => {
		entries.forEach((entry) => {
			if (entry.isFile) {
				entry.file((file) => {
					// reconstruct relative path
					uploadFile(file, list, onDone, false, uploads);
				});
			} else if (entry.isDirectory) {
				uploadDirectory(entry, list, onDone, uploads);
			}
		});
	});
}

function handleFiles(fileList, list, onDone, withPath, uploads) {
	Array.from(fileList).forEach((file) => {
		uploadFile(file, list, onDone, withPath, uploads);
	});
}

function uploadFile(file, list, onDone, withPath, uploads) {
	uploads.active++;
	const uid = 'u-' + Math.random().toString(36).slice(2);
	const itemEl = document.createElement('div');
	itemEl.className = 'upload-item';
	itemEl.innerHTML = `
		<span class="uf-name">${escapeHtml(file.name)}</span>
		<span class="uf-progress"><span class="uf-bar" style="width:0%"></span></span>
		<span class="uf-status">0%</span>`;
	list.appendChild(itemEl);

	const bar = itemEl.querySelector('.uf-bar');
	const status = itemEl.querySelector('.uf-status');
	const PREFIX = window.URL_PREFIX || '';
	const path = PREFIX + (window.appState ? window.appState.path : '/');
	const filename = withPath && file.webkitRelativePath ? file.webkitRelativePath : file.name;

	// Simulated progress: keeps the bar moving even for small/fast uploads
	// where the browser fires few or no onprogress events. Real progress
	// events take over as soon as they arrive.
	let simulated = 0;
	const simTimer = setInterval(() => {
		simulated += (90 - simulated) * 0.12;
		if (simulated > 88) simulated = 88;
		bar.style.width = simulated + '%';
		status.textContent = Math.round(simulated) + '%';
	}, 200);

	const xhr = new XMLHttpRequest();
	xhr.open('POST', path);

	const fd = new FormData();
	fd.append('file', file, filename);
	if (withPath) fd.append('withpath', 'true');

	xhr.upload.onprogress = (e) => {
		if (e.lengthComputable) {
			clearInterval(simTimer);
			const pct = Math.round((e.loaded / e.total) * 100);
			bar.style.width = pct + '%';
			status.textContent = pct + '%';
		}
	};

	xhr.onload = () => {
		clearInterval(simTimer);
		uploads.active--;
		if (xhr.status >= 200 && xhr.status < 300) {
			bar.style.width = '100%';
			status.textContent = '✓';
			if (onDone) onDone();
		} else {
			status.textContent = '✗';
			itemEl.style.opacity = '0.6';
		}
	};

	xhr.onerror = () => { clearInterval(simTimer); uploads.active--; status.textContent = '✗'; itemEl.style.opacity = '0.6'; };
	xhr.send(fd);
}

function escapeHtml(s) {
	const d = document.createElement('div');
	d.textContent = s;
	return d.innerHTML;
}
