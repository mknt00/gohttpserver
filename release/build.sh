#!/bin/bash -
# Build gohttpserver for multiple platforms.
# Source lives in ./src (package main). Output goes to ./release.
# Safe to run from anywhere; it cds to the repository root.

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Version: best-effort from git tags; fall back to "dev" when not a git repo.
if VERSION=$(git describe --abbrev=0 --tags 2>/dev/null); then
	REVCNT=$(git rev-list --count HEAD 2>/dev/null || echo 0)
	DEVCNT=$(git rev-list --count "$VERSION" 2>/dev/null || echo 0)
	if [ "$REVCNT" != "$DEVCNT" ]; then
		VERSION="$VERSION.dev$(expr "$REVCNT" - "$DEVCNT")"
	fi
else
	VERSION="dev"
fi
echo "VER: $VERSION"

GITCOMMIT=$(git rev-parse HEAD 2>/dev/null || echo unknown)
BUILDTIME=$(date -u +%Y/%m/%d-%H:%M:%S)

LDFLAGS="-X main.VERSION=$VERSION -X main.BUILDTIME=$BUILDTIME -X main.GITCOMMIT=$GITCOMMIT"
if [ -n "${EX_LDFLAGS:-}" ]; then
	LDFLAGS="$LDFLAGS $EX_LDFLAGS"
fi

mkdir -p release

build() {
	echo "build $1/$2 -> release/gohttpserver-${3:-""}"
	GOOS=$1 GOARCH=$2 CGO_ENABLED=0 go build \
		-ldflags "$LDFLAGS" \
		-o "release/gohttpserver-${3:-""}" \
		./src
}

build linux arm linux-arm
build darwin amd64 mac-amd64
build linux amd64 linux-amd64
build linux 386 linux-386
build windows amd64 win-amd64.exe
