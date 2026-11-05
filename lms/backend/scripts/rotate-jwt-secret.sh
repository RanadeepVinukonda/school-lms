#!/usr/bin/env bash
# ==============================================================================
# rotate-jwt-secret.sh — Zero-downtime JWT Secret Rotation
# ==============================================================================
#
# Strategy: dual-key rotation
#  1. Generate a NEW secret and add it alongside the CURRENT one
#  2. Deploy so both secrets are valid simultaneously
#  3. Re-issue all tokens with the NEW secret (graceful transition)
#  4. Remove the OLD secret after the token expiry window (24h)
#
# Usage:
#   ./scripts/rotate-jwt-secret.sh                # rotate with auto-generated secret
#   ./scripts/rotate-jwt-secret.sh --dry-run       # preview without making changes
#   ./scripts/rotate-jwt-secret.sh --force         # skip confirmation prompt
#
# Prerequisites:
#   - openssl installed
#   - Environment file (.env / .env.production) writable
# ==============================================================================

set -euo pipefail

DRY_RUN=false
FORCE=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --force) FORCE=true ;;
  esac
done

# ── Configuration ─────────────────────────────────────────────────────────────

ENV_FILE="${ENV_FILE:-./.env}"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE="./.env.production"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ No .env or .env.production found in current directory."
  echo "   Usage: cd lms/backend && bash scripts/rotate-jwt-secret.sh"
  exit 1
fi

# ── Generate new secret ───────────────────────────────────────────────────────

NEW_SECRET=$(openssl rand -hex 32)
echo "🔑 Generated new JWT secret: ${NEW_SECRET:0:16}...${NEW_SECRET: -16}"

# ── Read current secret ───────────────────────────────────────────────────────

CURRENT_SECRET=$(grep -E '^SUPABASE_JWT_SECRET=' "$ENV_FILE" | head -1 | cut -d= -f2- || echo "")

if [ -z "$CURRENT_SECRET" ]; then
  echo "⚠️  No current SUPABASE_JWT_SECRET found in $ENV_FILE"
  echo "   Will add as new secret."
fi

# ── Implement dual-key rotation ───────────────────────────────────────────────

# 1. Store current secret as PREVIOUS_JWT_SECRET (if exists)
# 2. Set SUPABASE_JWT_SECRET to new value

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "── Dry Run ──────────────────────────────────────────────────────────"
  echo "Would update $ENV_FILE:"
  echo "  PREVIOUS_JWT_SECRET=$CURRENT_SECRET"
  echo "  SUPABASE_JWT_SECRET=$NEW_SECRET"
  if [ -n "$CURRENT_SECRET" ]; then
    echo ""
    echo "After 24h token expiry window, remove PREVIOUS_JWT_SECRET"
    echo "Deploy instructions:"
    echo "  1. docker compose down"
    echo "  2. docker compose up -d"
  fi
  echo "──────────────────────────────────────────────────────────────────────"
  exit 0
fi

# ── Confirmation ──────────────────────────────────────────────────────────────

if [ "$FORCE" != true ] && [ -n "$CURRENT_SECRET" ]; then
  echo ""
  echo "⚠️  This will rotate the JWT secret in $ENV_FILE"
  echo "   Current: ${CURRENT_SECRET:0:16}...${CURRENT_SECRET: -16}"
  echo "   New:     ${NEW_SECRET:0:16}...${NEW_SECRET: -16}"
  echo ""
  read -rp "Continue? [y/N] " CONFIRM
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Aborted."
    exit 1
  fi
fi

# ── Apply rotation ────────────────────────────────────────────────────────────

# Backup
cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d_%H%M%S)"
echo "📦 Backed up to ${ENV_FILE}.bak.*"

# Move current to previous (if exists)
if [ -n "$CURRENT_SECRET" ]; then
  if grep -q '^PREVIOUS_JWT_SECRET=' "$ENV_FILE"; then
    sed -i "s|^PREVIOUS_JWT_SECRET=.*|PREVIOUS_JWT_SECRET=$CURRENT_SECRET|" "$ENV_FILE"
  else
    echo "PREVIOUS_JWT_SECRET=$CURRENT_SECRET" >> "$ENV_FILE"
  fi
fi

# Set new secret
if grep -q '^SUPABASE_JWT_SECRET=' "$ENV_FILE"; then
  sed -i "s|^SUPABASE_JWT_SECRET=.*|SUPABASE_JWT_SECRET=$NEW_SECRET|" "$ENV_FILE"
else
  echo "SUPABASE_JWT_SECRET=$NEW_SECRET" >> "$ENV_FILE"
fi

echo "✅ JWT secret rotated successfully."
echo ""
echo "Next steps:"
echo "  1. Deploy: docker compose down && docker compose up -d"
echo "  2. Verify tokens still work (old tokens valid until expiry)"
echo "  3. After 24h, remove PREVIOUS_JWT_SECRET from $ENV_FILE"
echo "  4. Deploy again to finalize removal"
