# gohttpserver 中文用户手册

> 一个使用 Go 编写的人性化 HTTP 文件服务器。
> 单二进制文件，零依赖部署，内置美观的 Web 界面，支持文件浏览、上传、分享与管理。

---

## 目录

- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [安装与运行](#安装与运行)
- [Docker 部署](#docker-部署)
- [Web 界面使用指南](#web-界面使用指南)
  - [界面概览](#界面概览)
  - [主题与深色模式](#主题与深色模式)
  - [文件浏览（网格 / 列表）](#文件浏览网格--列表)
  - [搜索](#搜索)
  - [上传文件](#上传文件)
  - [新建文件夹](#新建文件夹)
  - [文件操作（右键菜单）](#文件操作右键菜单)
  - [多选与批量操作](#多选与批量操作)
  - [文件预览](#文件预览)
  - [二维码与手机访问](#二维码与手机访问)
  - [IPA 安装（iOS）](#ipa-安装ios)
  - [视频播放](#视频播放)
- [键盘快捷键](#键盘快捷键)
- [认证与权限](#认证与权限)
- [访问控制 (.ghs.yml)](#访问控制-ghsyml)
- [配置选项](#配置选项)
- [Nginx 反向代理](#nginx-反向代理)
- [API 接口](#api-接口)
- [开发者构建](#开发者构建)

---

## 功能特性

- 🖥️ **单二进制文件** — 所有前端资源（CSS / JS / 图标）嵌入二进制，无需 Node.js、npm 或任何构建步骤
- 🎨 **多彩主题** — 海洋橙、日落粉、森林绿、深色模式，一键切换
- 📁 **双视图** — 卡片网格视图 + 列表视图自由切换，支持按名称 / 大小 / 修改时间排序
- 📤 **拖拽上传** — 支持文件拖拽上传、整个文件夹上传，带进度显示
- 🔍 **全局搜索** — 支持 Google 风格关键词搜索（空格 = AND，`-` 排除）
- 👆 **右键菜单** — 打开、下载、复制、移动、重命名、删除、校验和、分享二维码
- ✅ **多选操作** — 支持 Shift 多选、Ctrl 点选，批量删除 / 打包下载
- 👁️ **文件预览** — 图片灯箱（左右导航）、Markdown 渲染、代码语法高亮（含行号）、在线编辑
- 🔐 **安全** — HTTP Basic / OpenID / OAuth2-Proxy 认证，`.ghs.yml` 目录级权限控制
- 📱 **二维码** — 自动生成下载二维码，IPA 一键生成 iOS 安装清单
- 📊 **下载统计** — 实时记录文件下载次数
- 🔒 **校验和** — 在线计算 MD5 / SHA1 / SHA256
- 🌐 **CORS** — 默认开启跨域支持
- ⚡ **nginx 友好** — 支持反向代理、URL 前缀、X-Headers

---

## 快速开始

```bash
# 安装
go install github.com/codeskyblue/gohttpserver@latest

# 共享当前目录，监听 8000 端口，开启上传
gohttpserver -r ./ --port 8000 --upload

# 浏览器打开
# http://localhost:8000
```

---

## 安装与运行

### 方式一：go install（推荐）

```bash
go install github.com/codeskyblue/gohttpserver@latest
gohttpserver --help
```

### 方式二：下载二进制

从 [GitHub Releases](https://github.com/codeskyblue/gohttpserver/releases) 下载对应平台的二进制文件。

### 方式三：Mac Homebrew

```bash
brew install codeskyblue/tap/gohttpserver
```

### 常用启动参数

```bash
gohttpserver \
  -r ./shared \        # 根目录（默认 ./）
  --port 8000 \        # 端口（默认 8000）
  --addr 0.0.0.0 \     # 监听地址
  --upload \           # 开启上传
  --delete \           # 开启删除和新建文件夹
  --title "我的文件" \  # 站点标题
  --theme ocean \      # 主题：ocean / sunset / forest / dark
  --debug              # 调试模式（打印配置）
```

### HTTPS

```bash
gohttpserver --cert server.pem --key server.key --port 443
```

### 配置文件

使用 YAML 配置文件（命令行参数优先级更高）：

```bash
gohttpserver --conf config.yml
```

示例 `config.yml`：

```yaml
addr: ":4000"
title: "我的文件服务器"
theme: ocean
upload: true
delete: true
xheaders: true
```

---

## Docker 部署

```bash
# 共享当前目录
docker run -it --rm -p 8000:8000 -v $PWD:/app/public \
  codeskyblue/gohttpserver

# 带认证
docker run -it --rm -p 8000:8000 -v $PWD:/app/public \
  codeskyblue/gohttpserver \
  --auth-type http --auth-http admin:secret
```

构建镜像：

```bash
docker build -t codeskyblue/gohttpserver -f docker/Dockerfile .
```

---

## Web 界面使用指南

### 界面概览

```
┌──────────────────────────────────────────────────────┐
│  📁 我的文件      [ 搜索框…… ]      ⊞ 🌙 🎨 ⬆上传 │  ← 顶部导航栏
├──────────────────────────────────────────────────────┤
│  📁 Home / documents / 2024 /                       │  ← 面包屑导航
├──────────────────────────────────────────────────────┤
│  [← Back] [Hidden 👁‍🗨] [📁 New]         0 selected │  ← 工具栏
├──────────────────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐    │
│  │   📂   │  │   📄   │  │   🖼    │  │   📄   │    │  ← 文件网格
│  │  src   │  │ main.go│  │photo.jp│  │README.m│    │
│  │ folder │  │ 2.3 KB │  │ 1.2 MB │  │ 4.5 KB │    │
│  └────────┘  └────────┘  └────────┘  └────────┘    │
└──────────────────────────────────────────────────────┘
```

### 主题与深色模式

点击导航栏右侧按钮切换：

| 按钮 | 功能 |
|------|------|
| 🎨 | 打开主题选择器：海洋橙 / 日落粉 / 森林绿 / 深色 |
| 🌙 / ☀ | 切换深色 / 浅色模式 |

主题和深色模式偏好会自动保存到浏览器本地存储，下次访问自动恢复。首次访问会根据系统 `prefers-color-scheme` 自动选择。

### 文件浏览（网格 / 列表）

点击导航栏 **⊞** 按钮切换视图：

- **网格视图**（默认）— 卡片式展示，文件类型彩色图标
- **列表视图** — 表格展示，点击列标题排序：
  - 名称 ▲▼（文件夹始终在前）
  - 大小 ▲▼
  - 修改时间 ▲▼

点击文件夹进入，点击文件则根据类型预览或下载。

### 搜索

在顶部导航栏的搜索框输入关键词，支持 Google 语法：

| 搜索式 | 含义 |
|--------|------|
| `hello world` | 路径同时包含 hello **和** world |
| `hello -world` | 路径包含 hello **但不包含** world |
| `.go` | 查找所有 .go 文件 |

搜索结果最多返回 50 条。搜索支持防抖输入，键入后 300ms 自动搜索。

### 上传文件

点击导航栏 **⬆ 上传** 按钮（或按 `Ctrl+U`）打开上传面板：

- **拖拽上传** — 将文件拖入虚线区域
- **点击选择** — 点击区域选择文件（可多选）
- **上传文件夹** — 点击「📁 Upload folder」按钮选择整个文件夹，保留目录结构

每个文件显示独立进度条。上传完成后自动刷新文件列表。

> 使用 curl 上传：
> ```bash
> curl -F file=@report.pdf http://localhost:8000/docs/
> # 上传并解压 zip
> curl -F file=@pkg.zip -F unzip=true http://localhost:8000/docs/
> # 上传文件夹（保留路径）
> curl -F file=@path/to/file.txt -F withpath=true http://localhost:8000/
> ```

### 新建文件夹

点击工具栏 **📁 New** 按钮，输入文件夹名即可在当前目录创建。

### 文件操作（右键菜单）

在任意文件或文件夹上 **右键单击** 打开上下文菜单：

| 操作 | 说明 |
|------|------|
| 📂 打开 | 进入文件夹 / 预览文件 |
| ⬇ 下载 | 直接下载文件 |
| ⧉ 复制到… | 弹出对话框输入目标路径（绝对路径，如 `/backup/`） |
| ✂ 移动到… | 弹出对话框输入目标路径，即重命名或移动 |
| ✎ 重命名 | 弹出对话框输入新名称 |
| # 校验和 | 计算并显示 MD5 / SHA1 / SHA256 |
| ⊞ 二维码 | 生成下载二维码（APK / IPA 显示安装二维码） |
| ℹ 信息 | 查看文件名、类型、大小、修改时间、下载次数、校验和 |
| 🗑 删除 | 删除文件（需确认，按住 Alt 点击跳过确认） |

### 多选与批量操作

- **单击文件卡片** — 选中 / 取消选中（卡片左上角显示勾选框）
- **Shift + 单击** — 范围多选
- **Ctrl + A** — 全选当前目录

选中后工具栏右侧显示操作按钮：

| 按钮 | 功能 |
|------|------|
| 1 selected | 显示选中数量 |
| Delete | 批量删除（需删除权限） |
| Zip | 打包下载为 zip |
| Clear | 取消选中 |

### 文件预览

点击文件根据类型自动预览：

#### 🖼 图片

打开灯箱模式：
- **← →** 方向键切换上一张 / 下一张
- **Esc** 关闭
- 点击背景关闭

#### 📝 Markdown

渲染为带样式的 HTML，支持：
- 标题、加粗、斜线、删除线
- 代码块（带语法高亮）、行内代码
- 列表、任务列表、表格
- 链接、图片、引用块

> 安全说明：渲染前会先对 HTML 实体进行转义，防止上传的 README.md 中嵌入恶意脚本（防存储型 XSS）。

#### 💻 代码 / 文本

打开代码预览面板：
- 语法高亮（支持 Go / Python / JS / TS / Java / C / C++ / Rust / Ruby / PHP / Shell / CSS / HTML / JSON / YAML / Markdown / SQL 等）
- 行号显示
- **Copy** — 一键复制代码
- **✎ Edit** — 在线编辑并保存
- **Download** — 下载文件

#### 🎬 视频

mp4 / webm / ogg / mov / avi / mkv 格式自动跳转内置播放器。

### 二维码与手机访问

点击导航栏 **View in Phone**（或文件右键菜单的 ⊞）生成当前页面 / 文件的二维码，手机扫码即可访问。

### IPA 安装（iOS）

点击 `.ipa` 文件的二维码或安装链接，自动生成 iOS 安装清单（plist）：
- 服务端为 https 时直接使用
- http 时使用 plist 代理（默认 `https://plistproxy.herokuapp.com/plist`，可用 `--plistproxy` 自定义）

### 视频播放

点击视频文件自动跳转内置播放器页面，支持播放控制。

---

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + A` | 全选当前目录所有文件 |
| `Delete` | 删除选中文件（需确认） |
| `F2` | 重命名当前选中的文件（仅选中 1 个时生效） |
| `Ctrl + F` | 聚焦搜索框 |
| `Ctrl + U` | 打开上传面板 |
| `Esc` | 关闭弹窗 / 关闭菜单 / 取消选中 |
| `← →` | 图片灯箱中切换上一张 / 下一张 |

> 当焦点在输入框（搜索、重命名等）时，快捷键不会触发。

---

## 认证与权限

### HTTP Basic 认证

```bash
gohttpserver --auth-type http --auth-http user1:pass1 --auth-http user2:pass2
```

### OpenID 认证

```bash
gohttpserver --auth-type openid --auth-openid https://login.example.com/openid/
```

### OAuth2-Proxy

配合 [oauth2-proxy](https://github.com/oauth2-proxy/oauth2-proxy) 使用，从请求头读取用户信息：

```bash
gohttpserver --auth-type oauth2-proxy
```

| Header | 含义 |
|--------|------|
| `X-Auth-Request-Email` | 用户 ID |
| `X-Auth-Request-Fullname` | 显示名称（URL 编码） |
| `X-Auth-Request-User` | 昵称 |

---

## 访问控制 (.ghs.yml)

在子目录中创建 `.ghs.yml` 文件，可覆盖该目录及子目录的权限：

```yaml
---
upload: false
delete: false
users:
  - email: "admin@example.com"
    delete: true
    upload: true
    token: mysecrettoken123
```

### 隐藏 / 显示特定文件

```yaml
---
accessTables:
  - regex: '\.private$'
    allow: false
  - regex: 'public\.txt$'
    allow: true
```

`regex` 为正则表达式，匹配文件名。`accessTables` 按顺序匹配，先命中先生效。

### 目录权限继承

子目录继承父目录的 `.ghs.yml` 权限，同名配置子目录覆盖父目录。

示例目录结构：

```
root/
├── foo/
│   ├── .ghs.yml      ← foo 内允许上传/删除
│   └── world.txt
└── bar/
    └── hello.txt     ← bar 内禁止上传/删除
```

---

## 配置选项

### 命令行参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `-r, --root` | `./` | 根目录 |
| `--port` | `8000` | 监听端口 |
| `--addr` | 空 | 监听地址（如 `127.0.0.1:8000`） |
| `--prefix` | 空 | URL 前缀，如 `/files` |
| `--cert` | 空 | TLS 证书路径 |
| `--key` | 空 | TLS 私钥路径 |
| `--theme` | `black` | 主题：ocean / sunset / forest / dark |
| `--upload` | `false` | 开启上传 |
| `--delete` | `false` | 开启删除和新建文件夹 |
| `--title` | `Go HTTP File Server` | 站点标题 |
| `--auth-type` | 空 | 认证类型：http / openid / oauth2-proxy |
| `--auth-http` | 空 | Basic 认证（可多次，如 `user:pass`） |
| `--auth-openid` | 空 | OpenID 认证地址 |
| `--xheaders` | `false` | 使用 nginx 反向代理时开启 |
| `--debug` | `false` | 调试模式 |
| `--conf` | 空 | YAML 配置文件路径 |
| `--no-index` | `false` | 禁用搜索索引 |
| `--deep-path-max-depth` | `5` | 单目录自动合并深度（-1 关闭） |
| `--google-tracker-id` | 空 | Google Analytics ID（空则禁用） |
| `-p, --plistproxy` | herokuapp | plist 代理地址 |

### 配置文件格式

YAML 格式，字段名与命令行参数一致：

```yaml
addr: ":4000"
title: "文件服务器"
theme: sunset
upload: true
delete: true
xheaders: true
debug: true
auth:
  type: http
  http:
    - admin:secret123
    - user:pass456
```

命令行参数优先级高于配置文件。

---

## Nginx 反向代理

推荐配置（假设 gohttpserver 监听 `127.0.0.1:8200`）：

```nginx
server {
  listen 80;
  server_name files.example.com;

  location / {
    proxy_pass http://127.0.0.1:8200;
    proxy_redirect off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 0;  # 取消上传大小限制
  }
}
```

启动时加上 `--xheaders`：

```bash
gohttpserver --prefix /files --addr :8200 --xheaders
```

带 URL 前缀的 nginx 配置：

```nginx
location /files {
  proxy_pass http://127.0.0.1:8200;
  proxy_redirect off;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  client_max_body_size 0;
}
```

---

## API 接口

### 文件列表

```
GET /path/to/dir/?json=true
GET /path/to/dir/?json=true&search=keyword
```

响应：

```json
{
  "files": [
    {
      "name": "report.pdf",
      "path": "docs/report.pdf",
      "type": "file",
      "size": 102400,
      "mtime": 1700000000000,
      "downloadCount": 5
    }
  ],
  "auth": {
    "upload": true,
    "delete": true,
    "users": null,
    "AccessTables": null
  }
}
```

### 文件信息

```
GET /path/file.txt?op=info
GET /path/file.txt?op=info&checksum=md5,sha1,sha256
```

响应：

```json
{
  "name": "file.txt",
  "type": "text",
  "size": 1024,
  "path": "file.txt",
  "mtime": 1700000000000,
  "extra": {
    "md5": "d41d8cd98f00b204e9800998ecf8427e",
    "sha1": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "downloadCount": 3
}
```

### 打包下载

```
GET /path/to/dir/?op=archive
```

返回该目录的 zip 文件。

### 复制

```
POST /path/file.txt?op=copy
Content-Type: application/json

{"to": "/destination/file.txt"}
```

### 移动 / 重命名

```
POST /path/file.txt?op=move
Content-Type: application/json

{"to": "/destination/newname.txt"}
```

### 保存（在线编辑）

```
PUT /path/file.txt
Content-Type: text/plain

文件内容……
```

### 删除

```
DELETE /path/file.txt
```

### 系统信息

```
GET /-/sysinfo
```

```json
{"version": "1.0.0"}
```

### 下载统计

```
GET /-/stats
```

```json
{
  "downloads": [
    {"path": "report.pdf", "downloads": 5},
    {"path": "photo.jpg", "downloads": 2}
  ]
}
```

### 用户信息

```
GET /-/user
```

返回当前登录用户信息（OpenID / OAuth2-Proxy）。

### Android 包信息

```
GET /-/apk/info/some.apk
```

返回包名、主 Activity、版本号。

---

## 开发者构建

### 开发版

```bash
go build
./gohttpserver
```

### 单二进制发布

```bash
go build -ldflags "-s -w" -o gohttpserver .
```

### 自定义主题

在 `assets/css/themes/` 目录下创建 `yourtheme.css`，使用 CSS 变量定义颜色：

```css
:root {
  --accent: #4f6ef7;     /* 主强调色 */
  --accent-2: #06b6d4;   /* 次强调色（渐变） */
  --bg: #f0f4ff;         /* 页面背景 */
  --surface: #ffffff;    /* 卡片 / 表面 */
  --surface-2: #e8eefb;  /* 次级表面 */
  --border: #d4dcf5;     /* 边框 */
  --text: #1a2238;       /* 主文字 */
  --text-muted: #697290; /* 次要文字 */
  --nav-bg: linear-gradient(135deg, #4f6ef7, #06b6d4); /* 导航栏背景 */
}
```

在 `assets/js/theme.js` 的 `THEMES` 数组中注册：

```js
{ id: 'yourtheme', name: '我的主题', color: '#4f6ef7' }
```

---

## 常见问题

**Q: 如何隐藏以 `.` 开头的文件（如 `.git`）？**
A: 默认已隐藏。点击工具栏 **Hidden** 按钮可切换显示。

**Q: 上传文件大小有限制吗？**
A: 默认无限制。如使用 nginx，请设置 `client_max_body_size 0`。

**Q: 如何只允许特定用户上传？**
A: 在目录中创建 `.ghs.yml`，配置 `users` 列表并指定 `token`，上传时携带 `token` 参数。

**Q: 支持中文文件名吗？**
A: 完全支持，包括中文路径和中文搜索。

---

## 许可证

[MIT](LICENSE)
