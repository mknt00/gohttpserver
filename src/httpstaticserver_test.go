package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestHTTPStaticServerSetsContentSecurityPolicy(t *testing.T) {
	root, err := os.MkdirTemp("", "gohttpserver-csp-*")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(root)

	server := NewHTTPStaticServer(root, true)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/", nil)

	server.ServeHTTP(recorder, request)

	if got := recorder.Header().Get("Content-Security-Policy"); got != contentSecurityPolicy {
		t.Fatalf("Content-Security-Policy header = %q, want %q", got, contentSecurityPolicy)
	}
}

func TestReadmePreviewEscapesHTML(t *testing.T) {
	// The new markdown renderer (preview.js) must escape raw HTML before
	// rendering so uploaded README.md cannot inject scripts (stored XSS).
	data, err := os.ReadFile("assets/js/preview.js")
	if err != nil {
		t.Fatal(err)
	}
	src := string(data)

	// renderMarkdown must run escapeHtml on its input source so any raw HTML
	// in uploaded markdown is neutralised before it becomes render output.
	if !strings.Contains(src, "let html = escapeHtml(src)") {
		t.Fatal("renderMarkdown must escape HTML entities on the source before rendering")
	}
}
