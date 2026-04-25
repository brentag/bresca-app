#!/usr/bin/env bash
# filter-test-output.sh
# Hook de post-test: filtra el output de Jest/Vitest para Claude Code.
# Suprime líneas de ruido (timestamps, coverage verbose, node_modules stack traces)
# y resalta FAIL / PASS de forma limpia.

set -euo pipefail

INPUT=$(cat)

# --- Filtros de supresión ---
FILTERED=$(echo "$INPUT" \
  | grep -v "^node_modules" \
  | grep -v "^\s*at " \
  | grep -v "^Coverage directory" \
  | grep -v "^istanbul" \
  | grep -v "Transform:" \
  | grep -v "^Ran all test suites" \
  | sed 's/\x1B\[[0-9;]*[mK]//g')   # strip ANSI color codes

# --- Resumen compacto ---
FAILS=$(echo "$FILTERED" | grep -c "^FAIL " || true)
PASSES=$(echo "$FILTERED" | grep -c "^PASS " || true)
ERRORS=$(echo "$FILTERED" | grep -E "● |FAILED|Error:" || true)

echo "=== TEST SUMMARY ==="
echo "PASS: $PASSES  |  FAIL: $FAILS"
echo ""

if [ -n "$ERRORS" ]; then
  echo "=== FAILURES ==="
  echo "$ERRORS"
  echo ""
fi

# Líneas FAIL con nombre del archivo
echo "$FILTERED" | grep "^FAIL " || true
