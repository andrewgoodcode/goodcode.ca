#!/usr/bin/env python3
"""Regenerate sitemap.xml from the HTML pages in this repo.

Usage: python3 scripts/generate-sitemap.py
Run on every deploy, or by the sitemap workflow in .github/workflows/sitemap.yml.
The 404 page is excluded. lastmod comes from each file's modification time.
"""
import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://goodcode.ca"

def page_urls():
    urls = []
    for path in sorted(ROOT.rglob("index.html")):
        rel = path.relative_to(ROOT)
        if ".git" in rel.parts:
            continue
        url = "/" if str(rel.parent) == "." else "/" + str(rel.parent).replace("\\", "/") + "/"
        lastmod = datetime.datetime.fromtimestamp(
            path.stat().st_mtime, datetime.timezone.utc).date().isoformat()
        urls.append((url, lastmod))
    urls.sort(key=lambda u: (u[0] != "/", u[0]))
    return urls

def main():
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url, lastmod in page_urls():
        priority = "1.0" if url == "/" else "0.8"
        lines.append("  <url>")
        lines.append(f"    <loc>{BASE}{url}</loc>")
        lines.append(f"    <lastmod>{lastmod}</lastmod>")
        lines.append("    <changefreq>monthly</changefreq>")
        lines.append(f"    <priority>{priority}</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(lines) + "\n")
    print(f"wrote sitemap.xml with {len(page_urls())} URLs")

if __name__ == "__main__":
    main()
