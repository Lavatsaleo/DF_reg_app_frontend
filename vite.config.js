import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/*
 * Content Security Policy for the production build. The built app loads only its own files and
 * calls the API on the same origin, so anything injected from elsewhere is refused by the browser.
 * The dev server is left alone because hot reload needs inline scripts and a websocket.
 * frame-ancestors and HSTS can't be set from a meta tag; the web server should send them as headers
 * (see docs/SECURITY.md).
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  // React sets style attributes at runtime; no external stylesheets are loaded.
  "style-src 'self' 'unsafe-inline'",
  // Signatures are drawn to data: URLs and CSV downloads use blob: URLs.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src 'none'",
  "worker-src 'none'",
  "manifest-src 'self'",
].join('; ')

function contentSecurityPolicy() {
  return {
    name: 'df-content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  build: {
    // Source maps would publish the full source code alongside the site.
    sourcemap: false,
  },
})
