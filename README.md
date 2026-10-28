# gohttpserver

> A human-friendly HTTP file server written in Go.
> Single binary, zero-dependency deployment, with a built-in web UI for browsing, uploading, sharing, and managing files.

[中文用户手册 (Chinese user manual)](./docs/user-manual-zh.md)

---

## Features

- **Single binary** — all frontend assets (CSS / JS / icons) are embedded via Go `embed`. No Node.js, no npm, no build step for the web UI.
- **Beautiful web UI** — grid and list views, sortable by name / size / time, with multiple themes (ocean, sunset, forest, dark).
- **Drag & drop upload** — file and whole-folder upload with a live progress bar (green).
- **Global search** — Google-style keyword search (space = AND, `-` to exclude), backed by a background index rebuilt every 10 minutes.
- **File management** — create folder, rename, delete, copy, move, multi-select batch delete / zip download.
- **File preview** — image lightbox with navigation, Markdown rendering, code syntax highlighting with line numbers, in-browser text editing.
- **Authentication** — HTTP Basic / OpenID / OAuth2-Proxy.
- **Per-user permissions** — grant upload/delete per user (admin can manage, guest can only browse & download) via a `users` rule list, matched by username (Basic auth) or email (OpenID). Rules can be set globally or per-directory in `.ghs.yml`.
- **Security** — directory-level access control (`.ghs.yml`), path-traversal protection, strict `Content-Security-Policy`, hidden-file toggle, checksum (MD5 / SHA1 / SHA256).
- **Mobile friendly** — auto-generated QR codes for quick phone access; one-click iOS `*.ipa` install manifest.
- **Download stats** — in-memory per-file download counters.
- **CORS** — cross-origin enabled by default.
- **Nginx friendly** — reverse-proxy, URL prefix, and `X-Headers` support.

---

## Quick Start

```bash
# Share the current directory on :8000 with upload & delete enabled
gohttpserver -r ./ --port 8000 --upload --delete
# open http://localhost:8000
```

### Install

```bash
# From source
go install github.com/codeskyblue/gohttpserver@latest

# Or download a prebuilt binary from the Releases page.
# Or on macOS:
brew install codeskyblue/tap/gohttpserver
```

### Common flags

```bash
gohttpserver \
  -r ./shared \        # root directory (default ./)
  --port 8000 \        # listen port (default 8000)
  --addr 0.0.0.0 \     # listen address
  --upload \           # enable upload
  --delete \           # enable delete & new-folder
  --title "My Files" \ # site title
  --theme ocean \      # green / black / ocean / sunset / forest / dark
  --debug              # print resolved config at startup
```

### HTTPS

```bash
gohttpserver --cert server.pem --key server.key --port 443
```

### Config file

Command-line flags take precedence over the YAML config:

```bash
gohttpserver --conf config.yaml
```

---

## Per-user access control

Set a read-only default and grant selected users upload/delete rights. Unlisted users (e.g. `guest`) can only browse and download — the buttons are hidden in the UI and the API returns `403`.

```yaml
# config.yaml
upload: false          # default: read-only
delete: false

auth:
  type: http
  http:
    - admin:admin1234
    - guest:guest123

users:
  - username: admin     # matches the Basic-auth login name
    upload: true
    delete: true
  # OpenID users match on email:
  # - email: "admin@example.com"
  #   upload: true
  #   delete: true
```

`users` rules can also live in a `.ghs.yml` file placed in any subdirectory to override permissions for that directory and its children. See [访问控制 (.ghs.yml)](./docs/user-manual-zh.md#访问控制-ghsyml) for details.

---

## Build

```bash
# Current platform
cd src && go build -o gohttpserver .

# Cross-compile for Linux AMD64 (static binary, no CGO)
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o release/gohttpserver-linux-amd64 ./src
```

The web assets are embedded with Go `embed`, so the resulting binary runs with no external files.

---

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/` | File browser (HTML) |
| GET    | `/?json=true` | File list as JSON (includes per-user `auth.upload` / `auth.delete`) |
| POST   | `/{path}` | Upload file, or `?op=copy` / `?op=move` |
| DELETE | `/{path}` | Delete file or directory |
| PUT    | `/{path}` | Save edited file content |
| GET    | `/{path}?op=archive` | Download directory as zip |
| GET    | `/{path}?op=info[&checksum=md5,sha1,sha256]` | File info |
| GET    | `/{path}?download=true` | Force attachment download |

Uploads can also carry a `?token=` query parameter to grant upload via a `users` token rule.

See the [中文用户手册](./docs/user-manual-zh.md) for the full API reference, nginx reverse-proxy setup, and keyboard shortcuts.

---

## Project layout

```
.
├── config.yaml          # example configuration
├── src/                 # Go application source
│   ├── main.go          # entry point, CLI flags, auth middleware
│   ├── httpstaticserver.go  # HTTP handlers, access control
│   └── assets/          # embedded web UI (HTML/CSS/JS)
├── docs/
│   ├── user-manual-zh.md    # full Chinese user manual
│   ├── 功能与设计.md         # architecture & design notes
│   └── 文件清单与用法.md     # file map & usage
├── release/             # build scripts and output binaries
└── LICENSE
```

---

## License

[MIT](LICENSE)
