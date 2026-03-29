#!/bin/bash
# Test fallback and backup data modes for the March Madness Dashboard
# Usage:
#   ./scripts/test-fallback.sh fallback   # Test maintenance fallback UI (no data at all)
#   ./scripts/test-fallback.sh backup     # Test backup data mode (primary missing, backup available)
#   ./scripts/test-fallback.sh restore    # Restore normal operation

set -e
cd "$(dirname "$0")/.."

DATA="public/data.json"
BACKUP="public/data.backup.json"
STASH="/tmp/mm-data-stash.json"

case "${1:-}" in
  fallback)
    echo "=== Testing FALLBACK UI mode ==="
    echo "Moving data.json and backup out of the way..."
    [ -f "$DATA" ] && cp "$DATA" "$STASH"
    [ -f "$DATA" ] && mv "$DATA" "${DATA}.disabled"
    [ -f "$BACKUP" ] && mv "$BACKUP" "${BACKUP}.disabled"
    echo "Start dev server: npm run dev"
    echo "Open http://localhost:3000 — you should see the bouncing basketball fallback"
    echo ""
    echo "Run './scripts/test-fallback.sh restore' when done"
    ;;
  backup)
    echo "=== Testing BACKUP DATA mode ==="
    echo "Moving primary data.json out, keeping backup..."
    [ -f "$DATA" ] && cp "$DATA" "$STASH"
    [ ! -f "$BACKUP" ] && [ -f "$DATA" ] && cp "$DATA" "$BACKUP"
    [ -f "$DATA" ] && mv "$DATA" "${DATA}.disabled"
    echo "Start dev server: npm run dev"
    echo "Open http://localhost:3000 — should load normally from backup data"
    echo "Check terminal for: 'data.json not found, using backup'"
    echo ""
    echo "Run './scripts/test-fallback.sh restore' when done"
    ;;
  restore)
    echo "=== Restoring normal operation ==="
    [ -f "${DATA}.disabled" ] && mv "${DATA}.disabled" "$DATA"
    [ -f "${BACKUP}.disabled" ] && mv "${BACKUP}.disabled" "$BACKUP"
    [ ! -f "$DATA" ] && [ -f "$STASH" ] && cp "$STASH" "$DATA"
    echo "Restored. data.json is back in place."
    ;;
  *)
    echo "Usage: ./scripts/test-fallback.sh [fallback|backup|restore]"
    echo ""
    echo "  fallback  — Remove all data files, test maintenance UI"
    echo "  backup    — Remove primary data.json, test backup fallback"
    echo "  restore   — Put everything back to normal"
    exit 1
    ;;
esac
