#!/bin/sh
# Bump the app version before pushing a release: phones notice and update themselves.
set -e
cd "$(dirname "$0")/.."
n=$(( $(sed -n 's/^export const VERSION = \([0-9]*\);/\1/p' js/version.js) + 1 ))
sed -i '' "s/^export const VERSION = [0-9]*;/export const VERSION = $n;/" js/version.js
sed -i '' "s/^const CACHE = 'santa-claude-v[0-9]*';/const CACHE = 'santa-claude-v$n';/" sw.js
echo "Version $n"
