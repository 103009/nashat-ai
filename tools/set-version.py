#!/usr/bin/env python3
"""Stamp a version number on every link to the site's own CSS/JS files.

Why: GitHub Pages lets browsers keep files for 10 minutes. After an update a
browser can mix a fresh page with old JavaScript (e.g. an old js/config.js).
Changing ?v=N on every link after each update forces fresh downloads.

Every importer of a module gets the SAME versioned URL, so each module still
loads only once.

Usage (from the project folder):   python3 tools/set-version.py 10
"""
import pathlib
import re
import sys

if len(sys.argv) != 2 or not sys.argv[1].isdigit():
    sys.exit('usage: python3 tools/set-version.py <number>')
v = sys.argv[1]
root = pathlib.Path(__file__).resolve().parent.parent

patterns = [
    # ES module imports of our own files:  from './ui.js'  /  from './js/ui.js'  /  import('./x.js')
    (re.compile(r"""((?:from|import)\s*\(?\s*['"])(\.{1,2}/(?!vendor/)[\w./-]+?\.js)(?:\?v=\d+)?(['"])"""), r"\g<1>\g<2>?v=" + v + r"\g<3>"),
    # <script src="js/x.js">  and  <link href="css/x.css">
    (re.compile(r"""((?:src|href)=")((?:js|css)/[\w.-]+\.(?:js|css))(?:\?v=\d+)?(")"""), r"\g<1>\g<2>?v=" + v + r"\g<3>"),
]

changed = 0
files = [*root.glob('*.html'), *root.glob('js/*.js')]
for f in files:
    text = f.read_text()
    new = text
    for rx, rep in patterns:
        new = rx.sub(rep, new)
    if new != text:
        f.write_text(new)
        changed += 1
print(f'version {v}: updated {changed} of {len(files)} files')
