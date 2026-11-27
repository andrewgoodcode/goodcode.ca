# Email authentication for goodcode.ca

Current state, verified November 26, 2026: DMARC at _dmarc.goodcode.ca is
`v=DMARC1; p=none; ruf=mailto:hello@goodcode.ca;` (monitor only, no rua).
SPF is `v=spf1 include:spf.privateemail.com ~all` (softfail). No CAA record.
A security.txt file is now in the repo at .well-known/security.txt.

## Steps (DNS changes, to be applied in the DNS provider)

1. Add a DMARC aggregate report address, then move to quarantine:
   `_dmarc.goodcode.ca TXT "v=DMARC1; p=quarantine; rua=mailto:hello@goodcode.ca; ruf=mailto:hello@goodcode.ca; pct=100;"`
2. Watch the aggregate reports for two weeks. If no legitimate sender fails,
   move to reject:
   `_dmarc.goodcode.ca TXT "v=DMARC1; p=reject; rua=mailto:hello@goodcode.ca; ruf=mailto:hello@goodcode.ca; pct=100;"`
3. SPF: keep `include:spf.privateemail.com` while the mail provider is
   Private Email. Only move `~all` to `-all` after confirming every
   legitimate sender is covered, because `-all` rejects anything else.
4. CAA, limiting which authorities may issue certificates for the domain:
   `goodcode.ca CAA 0 issue "letsencrypt.org"`
   `goodcode.ca CAA 0 issue "digicert.com"`
   `goodcode.ca CAA 0 issuewild "letsencrypt.org"`
   `goodcode.ca CAA 0 issuewild "digicert.com"`
   `goodcode.ca CAA 0 iodef "mailto:hello@goodcode.ca"`
5. security.txt is served from the repo. Confirm it returns 200 at
   https://goodcode.ca/.well-known/security.txt after deploy.
