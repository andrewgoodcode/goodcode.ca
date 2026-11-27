# Cloudflare headers for goodcode.ca

GitHub Pages cannot set security headers from the repo, so headers are set
in Cloudflare, in front of GitHub Pages. No DNS change is made by this file.
Apply the rules below in the Cloudflare dashboard for goodcode.ca, then
verify with curl -I https://goodcode.ca/.

## Transform Rule: add response headers (all paths)

| Header | Value |
|---|---|
| Strict-Transport-Security | max-age=63072000; includeSubDomains |
| Content-Security-Policy | default-src 'self'; script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' mailto:; object-src 'none' |
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |

Notes:

- style-src allows 'unsafe-inline' because the site uses inline style
  attributes and inline SVG presentation attributes.
- script-src does not allow 'unsafe-inline': all site scripts are external
  files under /assets/, and Google Analytics loads only after consent.
- HSTS has no preload flag. Add preload only after confirming the site
  serves HTTPS on every subdomain, because preload is hard to undo.
- The same headers apply to enoch.goodcode.ca. Set them for that zone too,
  with the same values, except the CSP connect-src and the GA host stay the
  same (Google Analytics is the same provider on both sites).
