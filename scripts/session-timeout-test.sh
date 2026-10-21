#!/usr/bin/env bash
set -euo pipefail
# 仅针对已单独启动的 SESSION_TIMEOUT=1m 测试实例，不修改正式 30 分钟配置。
BASE=${TIMEOUT_API_URL:-http://127.0.0.1:18082}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
curl -fsS -c "$TMP/jar" "$BASE/api/auth/csrf" > "$TMP/csrf"
TOKEN=$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).token' "$TMP/csrf")
curl -fsS -b "$TMP/jar" -c "$TMP/jar" -H "X-CSRF-TOKEN: $TOKEN" -H 'Content-Type: application/json' \
  -d '{"username":"patient001","password":"Patient123!"}' "$BASE/api/auth/login" > "$TMP/login"
node -e 'if(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).profile.id!=="patient001")process.exit(1)' "$TMP/login"
echo 'PASS timeout test login on isolated 1-minute instance'
sleep 65
STATUS=$(curl -sS -o "$TMP/me" -w '%{http_code}' -b "$TMP/jar" "$BASE/api/auth/me")
[[ "$STATUS" == 401 ]] || { echo "FAIL timeout expected 401, got $STATUS"; exit 1; }
echo 'PASS timeout session naturally expires after 65 idle seconds'
