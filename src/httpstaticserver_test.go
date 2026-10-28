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

// basicAuthRequest builds a request carrying HTTP basic auth credentials.
func basicAuthRequest(user, pass string) *http.Request {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.SetBasicAuth(user, pass)
	return r
}

func TestAccessConfPerUserBasicAuth(t *testing.T) {
	// Global default is read-only (guest); the "admin" username is granted
	// upload+delete via a users rule. auth-type http matches on username.
	conf := AccessConf{
		AuthType: "http",
		Upload:   false,
		Delete:   false,
		Users: []UserControl{
			{Username: "admin", Upload: true, Delete: true},
		},
	}

	adminReq := basicAuthRequest("admin", "secret")
	if !conf.canUpload(adminReq) {
		t.Error("admin should be allowed to upload")
	}
	if !conf.canDelete(adminReq) {
		t.Error("admin should be allowed to delete")
	}

	guestReq := basicAuthRequest("guest", "guest123")
	if conf.canUpload(guestReq) {
		t.Error("guest (not in users) should NOT be allowed to upload")
	}
	if conf.canDelete(guestReq) {
		t.Error("guest (not in users) should NOT be allowed to delete")
	}

	// No credentials at all -> falls back to global default (read-only).
	anonReq := httptest.NewRequest(http.MethodGet, "/", nil)
	if conf.canUpload(anonReq) || conf.canDelete(anonReq) {
		t.Error("anonymous request should fall back to read-only default")
	}
}

func TestAccessConfTokenUpload(t *testing.T) {
	conf := AccessConf{
		AuthType: "http",
		Upload:   false,
		Delete:   false,
		Users: []UserControl{
			{Token: "tok-abc", Upload: true},
		},
	}

	// Token passed in the request body (form value).
	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader("token=tok-abc"))
	r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if !conf.canUpload(r) {
		t.Error("valid token should allow upload")
	}
	// Token never grants delete.
	if conf.canDelete(r) {
		t.Error("token should not grant delete")
	}

	// Unknown token falls back to default (denied).
	r2 := httptest.NewRequest(http.MethodPost, "/", strings.NewReader("token=[REDACTED]"))
	r2.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if conf.canUpload(r2) {
		t.Error("unknown token should not allow upload")
	}
}
