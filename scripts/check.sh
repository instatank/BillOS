#!/bin/bash
# BillBud pre-push gate (playbook SOP-ship.md step 3), adapted from
# time-tracker/scripts/check.sh. Lives in the repo so it can't vanish.
#
# 1. Extracts the inline <script type="module"> from index.html -> node --check
# 2. node --check every api/*.js Vercel serverless function (no api/*.mjs here)
# 3. node --check every functions/*.js Cloud Function file
set -e
cd "$(dirname "$0")/.."

node -e '
const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");
const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!m) { console.error("FAIL: no inline <script type=\"module\"> found in index.html"); process.exit(1); }
fs.writeFileSync(require("os").tmpdir() + "/billbud-inline-module.mjs", m[1]);
'
node --check "$(node -e 'process.stdout.write(require("os").tmpdir())')/billbud-inline-module.mjs"
echo "OK  inline module syntax"

# Standalone service workers (plain scripts, not modules)
for f in sw.js firebase-messaging-sw.js; do
  if [ -f "$f" ]; then
    node --check "$f"
    echo "OK  $f"
  fi
done

# Vercel serverless functions
if [ -d api ]; then
  while IFS= read -r f; do
    node --check "$f"
    echo "OK  $f"
  done < <(find api -type f \( -name '*.js' -o -name '*.mjs' \))
fi

# Firebase Cloud Functions (skip node_modules if installed locally)
if [ -d functions ]; then
  while IFS= read -r f; do
    node --check "$f"
    echo "OK  $f"
  done < <(find functions -maxdepth 1 -name '*.js' -type f)
fi

echo "ALL GATES GREEN"
