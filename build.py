#!/usr/bin/env python3
"""Build the goodcode.ca pages from src/ partials.

Edit the sources, never the built pages:
  1. Change a page in src/ (front matter at the top, content below), or a
     shared block in src/partials/ (head, header, footer, scripts).
  2. Run ./build.py. It writes the assembled pages to the repo root.
  3. Run ./build.py --check to verify the built pages match the sources.
  4. Commit and push the changed files as usual.

The build is pure concatenation plus variable substitution, so the output
is byte-for-byte reproducible. It fails loudly instead of guessing:
unknown front matter keys, missing required values, missing partials, and
any leftover directive or placeholder all stop the build.

Front matter (an HTML comment at the top of each src page):
  title           page title, also used for og:title and twitter:title
  description     meta description; also used for og:description and
                  twitter:description unless og_description is given
  og_description  optional, only when it differs from description
  canonical       canonical URL, also used for og:url
  scripts_before  optional extra script asset, loaded before nav.js
                  (for example site.js on the home page)
  scripts_after   optional extra script asset, loaded after consent.js
                  (for example convo-form.js on the contact page)

The stylesheet version is computed from assets/site.css (first 8 of the
md5), so a stylesheet change needs no manual version edit: rebuild and
every page picks up the new version.

The header partial is shared, so the build stamps aria-current="page"
onto the nav link for the current page (desktop and mobile menu alike).
Pages with no nav link (terms, privacy, cookies, accessibility, 404)
get none; the home page marks the wordmark.
"""
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
PARTIALS = os.path.join(SRC, "partials")

REQUIRED = ("title", "description", "canonical")
OPTIONAL = ("og_description", "scripts_before", "scripts_after")
INCLUDE_RE = re.compile(r"<!-- @include (partials/[A-Za-z0-9_.\-/]+) -->")
PLACEHOLDER_RE = re.compile(r"\{\{[A-Z_]+\}\}")
CURRENT_LINKS = {
    "index.html": ("/",),
    "enoch/index.html": ("/enoch/",),
    "faq/index.html": ("/faq/",),
    "contact/index.html": ("/contact/",),
    "about/index.html": ("/about/",),
}


def script_tag(name):
    return '  <script src="/assets/%s" defer></script>' % name


def parse_front_matter(text, path):
    """Split the leading <!-- ... --> block from a src page."""
    if not text.startswith("<!--\n"):
        raise ValueError("%s: missing front matter comment at the top" % path)
    end = text.find("\n-->\n")
    if end < 0:
        raise ValueError("%s: unterminated front matter comment" % path)
    raw = text[4:end]
    body = text[end + 5:]
    values = {}
    for line in raw.split("\n"):
        if not line.strip():
            continue
        if ": " not in line and not line.endswith(":"):
            raise ValueError("%s: bad front matter line %r" % (path, line))
        key, _, value = line.partition(": ")
        key = key.strip()
        if key not in REQUIRED + OPTIONAL:
            raise ValueError("%s: unknown front matter key %r" % (path, key))
        if key in values:
            raise ValueError("%s: duplicate front matter key %r" % (path, key))
        values[key] = value.strip()
    for key in REQUIRED:
        if key not in values:
            raise ValueError("%s: missing required front matter key %r" % (path, key))
    return values, body


def render_scripts(names):
    if not names:
        return ""
    return "\n".join(script_tag(n) for n in names.split(","))


def expand_includes(text, path):
    def load(match):
        rel = match.group(1)
        full = os.path.join(SRC, rel)
        if not os.path.isfile(full):
            raise ValueError("%s: missing partial %s" % (path, rel))
        with open(full) as f:
            content = f.read()
        if content.endswith("\n\n"):
            raise ValueError("partial %s ends with a blank line" % rel)
        if content.endswith("\n"):
            content = content[:-1]
        return content

    out = INCLUDE_RE.sub(load, text)
    if INCLUDE_RE.search(out):
        raise ValueError("%s: a partial contains an include directive" % path)
    return out


def mark_current_page(out, relpath):
    """Stamp aria-current="page" onto the current page's nav links."""
    hrefs = CURRENT_LINKS.get(relpath)
    if not hrefs:
        return out
    start = out.index('<header class="site-nav">')
    end = out.index('</header>', start)
    head, header, tail = out[:start], out[start:end], out[end:]
    for href in hrefs:
        pattern = re.compile(r'(<a[^>]*href="%s")' % re.escape(href))
        header, n = pattern.subn(r'\1 aria-current="page"', header)
        if n == 0:
            raise ValueError("%s: current-page link %s not found in header" % (relpath, href))
    return head + header + tail


def build_page(relpath, css_version):
    src_path = os.path.join(SRC, relpath)
    with open(src_path) as f:
        text = f.read()
    values, body = parse_front_matter(text, relpath)
    out = expand_includes(body, relpath)
    subs = {
        "{{TITLE}}": values["title"],
        "{{DESCRIPTION}}": values["description"],
        "{{OG_DESCRIPTION}}": values.get("og_description") or values["description"],
        "{{CANONICAL}}": values["canonical"],
        "{{CSS_VERSION}}": css_version,
    }
    for key, value in subs.items():
        out = out.replace(key, value)
    # {{SCRIPTS_BEFORE}} and {{SCRIPTS_AFTER}} occupy whole lines; the
    # replacement eats the line when there is no extra script.
    out = out.replace("{{SCRIPTS_BEFORE}}\n",
                      render_scripts(values.get("scripts_before", "")) + "\n"
                      if values.get("scripts_before") else "")
    out = out.replace("{{SCRIPTS_AFTER}}\n",
                      render_scripts(values.get("scripts_after", "")) + "\n"
                      if values.get("scripts_after") else "")
    out = mark_current_page(out, relpath)
    leftover = PLACEHOLDER_RE.search(out)
    if leftover:
        raise ValueError("%s: unsubstituted placeholder %s" % (relpath, leftover.group(0)))
    if "<!-- @include" in out:
        raise ValueError("%s: leftover include directive" % relpath)
    if "\u2014" in out or "\u2013" in out:
        raise ValueError("%s: em or en dash in built output" % relpath)
    return out


def list_pages():
    pages = []
    for dirpath, _dirnames, filenames in os.walk(SRC):
        if os.path.abspath(dirpath).startswith(os.path.abspath(PARTIALS)):
            continue
        for name in filenames:
            if name.endswith(".html"):
                pages.append(os.path.relpath(os.path.join(dirpath, name), SRC))
    return sorted(pages)


def main(argv):
    check_only = "--check" in argv
    with open(os.path.join(ROOT, "assets", "site.css"), "rb") as f:
        css_version = hashlib.md5(f.read()).hexdigest()[:8]
    pages = list_pages()
    changed = []
    for relpath in pages:
        built = build_page(relpath, css_version)
        dest = os.path.join(ROOT, relpath)
        with open(dest) as f:
            current = f.read()
        if built != current:
            if check_only:
                changed.append(relpath)
            else:
                with open(dest, "w") as f:
                    f.write(built)
                changed.append(relpath)
    if check_only:
        if changed:
            print("out of date: %s" % ", ".join(changed))
            return 1
        print("all %d pages match their sources" % len(pages))
        return 0
    if changed:
        print("rebuilt: %s" % ", ".join(changed))
    else:
        print("no changes: all %d pages already match their sources" % len(pages))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
