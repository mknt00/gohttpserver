// File preview: image lightbox, markdown render, code/text preview with syntax highlighting, inline edit
import { api, encodePath } from './api.js';
import { getExtension, escapeHtml } from './util.js';
import { openModal, closeModal, toast } from './ui.js';

const PREFIX = window.URL_PREFIX || '';

const CODE_EXTS = ['go', 'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'c', 'cpp', 'h', 'hpp', 'rs',
	'rb', 'php', 'swift', 'kt', 'sh', 'bash', 'sql', 'css', 'html', 'htm', 'json', 'xml', 'yaml', 'yml', 'md', 'txt', 'log'];
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff'];

// Build an absolute URL for a file from its backend path (root-relative, no leading slash).
function fileURL(f) {
	const p = (f.path || f.name);
	const abs = p.startsWith('/') ? p : '/' + p;
	return PREFIX + encodePath(abs);
}

export function isCodeFile(name) {
	return CODE_EXTS.includes(getExtension(name));
}

export function isImageFile(name) {
	return IMAGE_EXTS.includes(getExtension(name));
}

export function openPreview(f) {
	if (isImageFile(f.name)) return openImagePreview(f);
	if (getExtension(f.name) === 'md') return openMarkdownPreview(f);
	if (isCodeFile(f.name)) return openCodePreview(f);
	// default: download
	window.location.href = fileURL(f) + '?download=true';
}

/* ----------------------------- Image lightbox ----------------------------- */

export function openImagePreview(targetFile) {
	const images = window.appState.files.filter((f) => f.type !== 'dir' && isImageFile(f.name));
	let idx = images.findIndex((f) => f.path === targetFile.path);
	if (idx < 0) idx = 0;

	function show(i) {
		idx = (i + images.length) % images.length;
		const img = images[idx];
		const url = fileURL(img);
		lightboxEl.innerHTML = `
			<button class="lb-close" id="lb-close">&times;</button>
			${images.length > 1 ? `<button class="lb-prev" id="lb-prev">‹</button>` : ''}
			<img src="${url}" alt="${escapeHtml(img.name)}">
			${images.length > 1 ? `<button class="lb-next" id="lb-next">›</button>` : ''}
			<div class="lb-caption">${escapeHtml(img.name)} (${idx + 1}/${images.length})</div>`;
		lightboxEl.querySelector('#lb-close').onclick = closeLightbox;
		if (images.length > 1) {
			lightboxEl.querySelector('#lb-prev').onclick = () => show(idx - 1);
			lightboxEl.querySelector('#lb-next').onclick = () => show(idx + 1);
		}
	}

	const lightboxEl = document.createElement('div');
	lightboxEl.className = 'lightbox';
	document.body.appendChild(lightboxEl);

	function closeLightbox() { lightboxEl.remove(); document.removeEventListener('keydown', onKey); }
	function onKey(e) {
		if (e.key === 'Escape') closeLightbox();
		if (e.key === 'ArrowLeft') show(idx - 1);
		if (e.key === 'ArrowRight') show(idx + 1);
	}
	document.addEventListener('keydown', onKey);
	lightboxEl.addEventListener('click', (e) => { if (e.target === lightboxEl) closeLightbox(); });

	show(idx);
}

/* ----------------------------- Markdown ----------------------------- */

export async function openMarkdownPreview(f) {
	const url = fileURL(f);
	const modal = openModal('<p>Loading…</p>', { title: '📝 ' + escapeHtml(f.name), lg: true });
	try {
		const res = await fetch(url).then((r) => r.text());
		const html = renderMarkdown(res);
		modal.querySelector('.modal-body').innerHTML = `<div class="markdown-body">${html}</div>`;
	} catch (err) {
		modal.querySelector('.modal-body').innerHTML = `<p style="color:#ef4444">${escapeHtml(err.message)}</p>`;
	}
}

// Lightweight markdown renderer with noHTML sanitization (prevents stored XSS)
function renderMarkdown(src) {
	// Escape HTML first
	let html = escapeHtml(src);
	// Remove literal HTML tags (noHTML mode)
	html = html.replace(/&lt;[^&]+?&gt;/g, '');

	const lines = html.split('\n');
	const out = [];
	let inCode = false, codeBuf = [], codeLang = '';
	let inList = false;

	const inline = (s) => {
		// code span
		s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
		// bold + italic
		s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
		s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
		s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
		s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
		// links
		s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
		// images
		s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">');
		return s;
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		// fenced code
		if (/^```/.test(line)) {
			if (inCode) {
				out.push('<pre><code>' + codeBuf.join('\n') + '</code></pre>');
				codeBuf = []; inCode = false;
			} else {
				inCode = true; codeLang = line.slice(3).trim();
			}
			continue;
		}
		if (inCode) { codeBuf.push(line); continue; }

		// headings
		const h = line.match(/^(#{1,6})\s+(.*)/);
		if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
		// hr
		if (/^---+$/.test(line)) { out.push('<hr>'); continue; }
		// blockquote
		if (/^>\s?/.test(line)) { out.push('<blockquote><p>' + inline(line.replace(/^>\s?/, '')) + '</p></blockquote>'); continue; }
		// task list
		if (/^[-*]\s+\[([ x])\]\s+(.*)/.test(line)) {
			const m = line.match(/^[-*]\s+\[([ x])\]\s+(.*)/);
			const checked = m[1] === 'x' ? 'checked' : '';
			out.push('<div><input type="checkbox" disabled ' + checked + '> ' + inline(m[2]) + '</div>');
			continue;
		}
		// unordered list
		if (/^[-*]\s+(.*)/.test(line)) {
			if (!inList) { out.push('<ul>'); inList = true; }
			out.push('<li>' + inline(line.replace(/^[-*]\s+/, '')) + '</li>');
			continue;
		}
		// table
		if (/^\|.+\|$/.test(line)) {
			if (i + 1 < lines.length && /^\|[-:| ]+\|$/.test(lines[i + 1])) {
				// header + separator
				const headers = line.split('|').filter(Boolean).map((c) => `<th>${inline(c.trim())}</th>`).join('');
				i++; // skip separator
				out.push('<table><thead><tr>' + headers + '</tr></thead><tbody>');
				while (i + 1 < lines.length && /^\|.+\|$/.test(lines[i + 1])) {
					i++;
					const cells = lines[i].split('|').filter(Boolean).map((c) => `<td>${inline(c.trim())}</td>`).join('');
					out.push('<tr>' + cells + '</tr>');
				}
				out.push('</table>');
				continue;
			}
		}
		if (inList && !/^[-*]\s+/.test(line)) { out.push('</ul>'); inList = false; }
		// blank line
		if (line.trim() === '') { out.push(''); continue; }
		// paragraph
		out.push('<p>' + inline(line) + '</p>');
	}
	if (inList) out.push('</ul>');
	if (inCode) out.push('<pre><code>' + codeBuf.join('\n') + '</code></pre>');
	return out.join('\n');
}

/* ----------------------------- Code / text preview ----------------------------- */

export async function openCodePreview(f) {
	const url = fileURL(f);
	const modal = openModal('<p>Loading…</p>', {
		title: '📄 ' + escapeHtml(f.name),
		lg: true,
		footer: `<button class="btn btn-sm" id="prev-copy">Copy</button>
			<button class="btn btn-sm btn-primary" id="prev-edit">✎ Edit</button>
			<a class="btn btn-sm" href="${url}?download=true">Download</a>`,
		onOpen: (m) => {
			m.querySelector('#prev-copy').onclick = () => {
				const code = m.querySelector('pre')?.textContent || '';
				navigator.clipboard.writeText(code).then(() => toast('Copied', 'success'));
			};
			m.querySelector('#prev-edit').onclick = () => openInlineEditor(f);
		},
	});
	try {
		const res = await fetch(url).then((r) => r.text());
		renderCode(modal, res, getExtension(f.name));
	} catch (err) {
		modal.querySelector('.modal-body').innerHTML = `<p style="color:#ef4444">${escapeHtml(err.message)}</p>`;
	}
}

function renderCode(modal, source, lang) {
	const escaped = escapeHtml(source);
	const highlighted = highlight(escaped, lang);
	const lines = highlighted.split('\n');
	const lineNums = lines.map((_, i) => `<span>${i + 1}</span>`).join('');
	const html = `<div class="code-wrap"><div class="code-lines">${lineNums}</div><div class="code-code"><pre>${highlighted}</pre></div></div>`;
	modal.querySelector('.modal-body').innerHTML = html;
}

/* ----------------------------- Syntax highlighting ----------------------------- */

function highlight(src, lang) {
	// Regex-based highlighter. We scan the already-HTML-escaped source with a
	// single combined regex so matches never overlap or nest. Tokens are
	// replaced by indexed placeholders, then resolved to <span> tags at the end.
	const patterns = [];
	// strings
	patterns.push(/"(?:[^"\\]|\\.)*"/g);
	patterns.push(/'(?:[^'\\]|\\.)*'/g);
	// comments
	if (['js', 'ts', 'jsx', 'tsx', 'java', 'c', 'cpp', 'h', 'hpp', 'go', 'rs', 'swift', 'kt', 'css', 'sql'].includes(lang)) {
		patterns.push(/\/\/[^\n]*/g);
		patterns.push(/\/\*[\s\S]*?\*\//g);
	}
	if (['py', 'sh', 'bash', 'yaml', 'yml', 'rb'].includes(lang)) patterns.push(/#[^\n]*/g);
	if (lang === 'sql') patterns.push(/--[^\n]*/g);
	if (lang === 'html' || lang === 'htm' || lang === 'xml') patterns.push(/&lt;!--[\s\S]*?--&gt;/g);
	// numbers
	patterns.push(/\b\d+\.?\d*\b/g);
	// keywords
	const kwByLang = {
		go: ['func', 'package', 'import', 'var', 'const', 'type', 'struct', 'interface', 'if', 'else', 'for', 'range', 'return', 'switch', 'case', 'default', 'break', 'continue', 'defer', 'go', 'chan', 'select', 'fallthrough', 'map', 'nil', 'true', 'false'],
		py: ['def', 'class', 'import', 'from', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or', 'with', 'as', 'try', 'except', 'finally', 'raise', 'pass', 'lambda', 'yield', 'None', 'True', 'False', 'self'],
		js: ['function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'class', 'extends', 'new', 'this', 'super', 'import', 'export', 'from', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'async', 'await', 'of', 'true', 'false', 'null', 'undefined'],
		java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'void', 'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'if', 'else', 'for', 'while', 'switch', 'case', 'default', 'break', 'continue', 'return', 'new', 'this', 'super', 'try', 'catch', 'finally', 'throw', 'throws', 'import', 'package'],
		c: ['int', 'char', 'long', 'short', 'float', 'double', 'void', 'struct', 'union', 'enum', 'typedef', 'static', 'const', 'extern', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'sizeof'],
		css: ['@import', '@media', '@font-face', '@keyframes'],
		rust: ['fn', 'let', 'mut', 'pub', 'struct', 'enum', 'impl', 'trait', 'type', 'match', 'if', 'else', 'for', 'while', 'loop', 'return', 'use', 'mod', 'crate', 'self', 'super', 'where', 'move', 'async', 'await'],
		sh: ['if', 'then', 'else', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function', 'in', 'return', 'echo', 'export', 'local'],
		rb: ['def', 'end', 'class', 'module', 'if', 'else', 'elsif', 'unless', 'while', 'for', 'do', 'begin', 'rescue', 'ensure', 'return', 'yield', 'require', 'include', 'attr_accessor', 'self', 'true', 'false', 'nil'],
	};
	const kws = kwByLang[lang];
	if (kws) patterns.push(new RegExp('\\b(' + kws.join('|') + ')\\b', 'g'));

	// Build a master alternation: (pattern1)|(pattern2)|...
	const master = new RegExp(patterns.map((p) => '(' + p.source + ')').join('|'), 'g');

	const tokens = [];
	let result = src.replace(master, (m) => {
		const idx = tokens.length;
		tokens.push(m);
		return `\x00${idx}\x00`;
	});

	// Resolve placeholders to spans. Classify each token.
	result = result.replace(/\x00(\d+)\x00/g, (_, i) => {
		const tok = tokens[i];
		const cls = classifyToken(tok, lang);
		return cls ? `<span class="${cls}">${tok}</span>` : tok;
	});
	return result;
}

function classifyToken(tok, lang) {
	if (/^['"&]/.test(tok)) return 'str';
	if (/^\/\/|^\/\*^|^--|^#[^\n]|^&lt;!/.test(tok)) return 'com';
	if (/^@/.test(tok)) return 'kw';
	if (/^\d/.test(tok)) return 'num';
	return 'kw'; // keyword
}

/* ----------------------------- Inline editor ----------------------------- */

async function openInlineEditor(f) {
	const url = fileURL(f);
	closeModal();
	const modal = openModal('<p>Loading…</p>', {
		title: '✎ Edit ' + escapeHtml(f.name),
		lg: true,
		footer: `<button class="btn" id="edit-cancel">Cancel</button>
			<button class="btn btn-primary" id="edit-save">Save</button>`,
	});
	try {
		const res = await fetch(url).then((r) => r.text());
		modal.querySelector('.modal-body').innerHTML = `<textarea class="inline-editor" id="edit-ta">${escapeHtml(res)}</textarea>`;
		modal.querySelector('#edit-cancel').onclick = closeModal;
		modal.querySelector('#edit-save').onclick = async () => {
			const content = modal.querySelector('#edit-ta').value;
			try {
				await api.save(url, content);
				toast('Saved', 'success');
				closeModal();
			} catch (err) { toast(err.message, 'error'); }
		};
	} catch (err) {
		modal.querySelector('.modal-body').innerHTML = `<p style="color:#ef4444">${escapeHtml(err.message)}</p>`;
	}
}
