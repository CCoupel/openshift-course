#!/usr/bin/env bash
# Script CI unique (commands.ci) - derive de .github/workflows/ci.yml
# Appele par qa, deploy et (a terme) les workflows. STRICT=--strict-i18n pour une PR vers main.
set -euo pipefail
STRICT="${STRICT:-}"
node --check assets/engine.js
node --check assets/plan.js
node --check assets/i18n.js
node tools/validate.js $STRICT
npm ci --ignore-scripts
node tools/check-pptx.js --selftest
node tools/check-pptx.js $STRICT
