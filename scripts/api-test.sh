#!/usr/bin/env bash
set -euo pipefail
BASE=${API_BASE_URL:-http://127.0.0.1:18080}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
JAR="$TMP/cookies"
BODY="$TMP/body"
HEADERS="$TMP/headers"
COUNT=0

call() {
  local expected=$1 label=$2 method=$3 path=$4
  shift 4
  local status
  status=$(curl --connect-timeout 5 --max-time 20 -sS -D "$HEADERS" -o "$BODY" -w '%{http_code}' -c "$JAR" -b "$JAR" -X "$method" "$BASE$path" "$@")
  if [[ "$status" != "$expected" ]]; then
    printf 'FAIL %s: expected %s, got %s\n' "$label" "$expected" "$status" >&2
    exit 1
  fi
  COUNT=$((COUNT + 1))
  printf 'PASS %02d %s [%s]\n' "$COUNT" "$label" "$status"
}
assert_json() {
  node -e 'const fs=require("node:fs");const body=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(!new Function("b", "return ("+process.argv[2]+")")(body))throw new Error("response assertion failed")' "$BODY" "$1"
}
csrf() {
  call 200 csrf GET /api/auth/csrf
  assert_json 'typeof b.token === "string" && b.token.length > 10 && b.headerName === "X-CSRF-TOKEN"'
  TOKEN=$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).token' "$BODY")
}
login() {
  csrf
  local before after
  before=$(awk '$6 == "JSESSIONID" {print $7}' "$JAR")
  call "$1" "$2" POST /api/auth/login -H 'Content-Type: application/json' -H "X-CSRF-TOKEN: $TOKEN" --data-raw "$3"
  if [[ "$1" == 200 ]]; then
    after=$(awk '$6 == "JSESSIONID" {print $7}' "$JAR")
    # 不打印 Cookie，只断言真实 HTTP 登录更新会话 ID 并设置保护属性。
    [[ -n "$after" && "$after" != "$before" ]]
    grep -Eiq '^set-cookie: JSESSIONID=.*HttpOnly' "$HEADERS"
    grep -Eiq '^set-cookie: JSESSIONID=.*SameSite=Lax' "$HEADERS"
  fi
}

call 200 doctors GET /api/doctors
assert_json 'Array.isArray(b) && b.length === 5 && b[0].id === "doc001" && b[0].name === "张伟医生" && b[0].department === "心内科" && b.every(d => Array.isArray(d.specialties) && typeof d.isActive === "boolean" && !("password" in d) && !("passwordHash" in d))'
call 401 anonymous GET /api/auth/me
call 403 login_without_csrf POST /api/auth/login -H 'Content-Type: application/json' -d '{"username":"patient001","password":"Patient123!"}'
call 403 logout_without_csrf POST /api/auth/logout
csrf
call 403 invalid_csrf POST /api/auth/login -H 'Content-Type: application/json' -H 'X-CSRF-TOKEN: invalid' -d '{}'
call 403 logout_invalid_csrf POST /api/auth/logout -H 'X-CSRF-TOKEN: invalid'
login 401 wrong_password '{"username":"patient001","password":"wrong"}'
assert_json 'b.code === "INVALID_CREDENTIALS"'
login 401 unknown_account '{"username":"missing","password":"wrong"}'
assert_json 'b.code === "INVALID_CREDENTIALS"'
login 400 empty_input '{}'
login 400 null_body 'null'
login 400 null_fields '{"username":null,"password":null}'
LONG=$(node -p 'JSON.stringify({username:"patient001",password:"a".repeat(129)})')
login 400 oversized_password "$LONG"
login 400 malformed_json '{'
login 400 wrong_types '{"username":12,"password":true}'
LONG=$(node -p 'JSON.stringify({username:"a".repeat(65),password:"test"})')
login 400 oversized_username "$LONG"
LONG=$(node -p 'JSON.stringify({username:"patient001",password:"密".repeat(25)})')
login 400 oversized_bcrypt_input "$LONG"
login 200 patient_login '{"username":"  patient001  ","password":"Patient123!","role":"DOCTOR"}'
assert_json 'b.role === "PATIENT" && b.profile.id === "patient001" && !("password" in b.profile)'
OLD_TOKEN=$TOKEN
call 200 patient_me GET /api/auth/me
assert_json 'b.role === "PATIENT" && b.profile.id === "patient001"'
call 403 old_token_after_login POST /api/auth/logout -H "X-CSRF-TOKEN: $OLD_TOKEN"
login 200 second_patient '{"username":"patient002","password":"Patient123!"}'
assert_json 'b.profile.id === "patient002"'
call 200 second_patient_me GET /api/auth/me
assert_json 'b.profile.id === "patient002"'
login 401 failed_account_switch '{"username":"missing","password":"wrong"}'
call 401 failed_switch_clears_old_identity GET /api/auth/me
login 200 restore_second_patient '{"username":"patient002","password":"Patient123!"}'
assert_json 'b.profile.id === "patient002"'
csrf
call 200 logout POST /api/auth/logout -H "X-CSRF-TOKEN: $TOKEN"
call 401 after_logout GET /api/auth/me
login 200 doctor_login '{"username":"dr-zhang-wei","password":"123456"}'
assert_json 'b.role === "DOCTOR" && b.profile.id === "doc001" && !("password" in b.profile)'
call 200 doctor_me GET /api/auth/me
assert_json 'b.role === "DOCTOR"'
csrf
call 200 doctor_logout POST /api/auth/logout -H "X-CSRF-TOKEN: $TOKEN"
call 401 doctor_after_logout GET /api/auth/me
printf 'All %s curl requests passed.\n' "$COUNT"
