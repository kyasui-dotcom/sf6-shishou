#!/bin/bash
# E2E test for sf6-shishou API
# Usage: bash test-e2e.sh [base_url]

BASE="${1:-https://sf6-shishou-api.yasuikunihiro.workers.dev}"
PASS=0
FAIL=0
TOKEN=""

# Find node executable
NODE=$(which node 2>/dev/null || echo "/c/Program Files/nodejs/node.exe")
if [ ! -x "$NODE" ] && [ ! -f "$NODE" ]; then
  echo "ERROR: node not found"; exit 1
fi

red() { printf "\033[31m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }

assert_status() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    green "  PASS: $name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    red "  FAIL: $name (expected $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

assert_json() {
  local name="$1" field="$2" expected="$3" body="$4"
  local actual
  actual=$(echo "$body" | "$NODE" -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d)${field})}catch{console.log('PARSE_ERROR')}})")
  if [ "$actual" = "$expected" ]; then
    green "  PASS: $name ($field = $actual)"
    PASS=$((PASS + 1))
  else
    red "  FAIL: $name ($field expected '$expected', got '$actual')"
    FAIL=$((FAIL + 1))
  fi
}

echo "============================================"
echo " SF6 Shishou API E2E Tests"
echo " Base URL: $BASE"
echo "============================================"
echo ""

# Generate unique test user
RAND=$("$NODE" -e "console.log(Math.random().toString(36).slice(2,8))")
TEST_EMAIL="test-${RAND}@example.com"
TEST_USER="testuser-${RAND}"
TEST_PASS="testpass123"

# --- 1. Health check ---
echo "[1] Health Check"
RES=$(curl -s -o /tmp/e2e-body -w "%{http_code}" "$BASE/api/health")
BODY=$(cat /tmp/e2e-body)
assert_status "GET /api/health" "200" "$RES"
assert_json "health status" ".status" "ok" "$BODY"
echo ""

# --- 2. Register ---
echo "[2] Register"
RES=$(curl -s -o /tmp/e2e-body -w "%{http_code}" -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\",\"mainCharacter\":\"Ryu\"}")
BODY=$(cat /tmp/e2e-body)
assert_status "POST /api/auth/register" "201" "$RES"
TOKEN=$(echo "$BODY" | "$NODE" -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).token)}catch{console.log('')}})")
if [ -n "$TOKEN" ] && [ "$TOKEN" != "undefined" ]; then
  green "  PASS: Got auth token"
  PASS=$((PASS + 1))
else
  red "  FAIL: No auth token"
  FAIL=$((FAIL + 1))
fi
echo ""

# --- 3. Get me ---
echo "[3] Auth - Get Me"
RES=$(curl -s -o /tmp/e2e-body -w "%{http_code}" "$BASE/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")
BODY=$(cat /tmp/e2e-body)
assert_status "GET /api/auth/me" "200" "$RES"
assert_json "username" ".username" "$TEST_USER" "$BODY"
assert_json "plan" ".plan" "free" "$BODY"
echo ""

# --- 4. Create memo ---
echo "[4] Create Memo"
RES=$(curl -s -o /tmp/e2e-body -w "%{http_code}" -X POST "$BASE/api/memos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"myCharacter":"Ryu","opponentCharacter":"Ken","result":"win","memo":"test memo","tags":["対空ミス"],"isPublic":true}')
BODY=$(cat /tmp/e2e-body)
assert_status "POST /api/memos" "201" "$RES"
MEMO_ID=$(echo "$BODY" | "$NODE" -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).id)}catch{console.log('')}})")
assert_json "result" ".result" "win" "$BODY"
echo ""

# --- 5. List memos ---
echo "[5] List Memos"
RES=$(curl -s -o /tmp/e2e-body -w "%{http_code}" "$BASE/api/memos" \
  -H "Authorization: Bearer $TOKEN")
BODY=$(cat /tmp/e2e-body)
assert_status "GET /api/memos" "200" "$RES"
MEMO_COUNT=$(echo "$BODY" | "$NODE" -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).length)}catch{console.log(0)}})")
if [ "$MEMO_COUNT" -ge 1 ]; then
  green "  PASS: Has $MEMO_COUNT memo(s)"
  PASS=$((PASS + 1))
else
  red "  FAIL: Expected at least 1 memo, got $MEMO_COUNT"
  FAIL=$((FAIL + 1))
fi
echo ""

# --- 6. Stats ---
echo "[6] Stats"
RES=$(curl -s -o /tmp/e2e-body -w "%{http_code}" "$BASE/api/stats" \
  -H "Authorization: Bearer $TOKEN")
BODY=$(cat /tmp/e2e-body)
assert_status "GET /api/stats" "200" "$RES"
assert_json "total" ".overall.total" "1" "$BODY"
echo ""

# --- 7. Community memos ---
echo "[7] Community Memos"
RES=$(curl -s -o /tmp/e2e-body -w "%{http_code}" "$BASE/api/community/memos" \
  -H "Authorization: Bearer $TOKEN")
assert_status "GET /api/community/memos" "200" "$RES"
echo ""

# --- 8. AI features require premium ---
echo "[8] AI - Free Plan Block"
RES=$(curl -s -o /tmp/e2e-body -w "%{http_code}" -X POST "$BASE/api/analysis" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}')
assert_status "POST /api/analysis (free)" "403" "$RES"

RES=$(curl -s -o /tmp/e2e-body -w "%{http_code}" -X POST "$BASE/api/counter" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"opponentCharacter":"Ken","annoyingMove":"test"}')
assert_status "POST /api/counter (free)" "403" "$RES"
echo ""

# --- 9. Stripe checkout (auth check only - Stripe account may not be fully active)
echo "[9] Stripe Checkout"
RES=$(curl -s -o /tmp/e2e-body -w "%{http_code}" -X POST "$BASE/api/stripe/checkout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")
BODY=$(cat /tmp/e2e-body)
if [ "$RES" != "401" ] && [ "$RES" != "500" ]; then
  green "  PASS: POST /api/stripe/checkout (HTTP $RES, auth works)"
  PASS=$((PASS + 1))
else
  red "  FAIL: POST /api/stripe/checkout (HTTP $RES)"
  FAIL=$((FAIL + 1))
fi
HAS_URL=$(echo "$BODY" | "$NODE" -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const u=JSON.parse(d).url;console.log(u&&u.startsWith('https://checkout.stripe.com')?'yes':'no')}catch{console.log('no')}})")
if [ "$HAS_URL" = "yes" ]; then
  green "  PASS: Stripe checkout URL returned"
  PASS=$((PASS + 1))
else
  green "  SKIP: Stripe not fully active (expected)"
fi
echo ""

# --- 10. Feedback ---
echo "[10] Feedback"
RES=$(curl -s -o /tmp/e2e-body -w "%{http_code}" -X POST "$BASE/api/feedback" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"テスト要望","category":"feature"}')
assert_status "POST /api/feedback" "201" "$RES"

RES=$(curl -s -o /tmp/e2e-body -w "%{http_code}" "$BASE/api/feedback" \
  -H "Authorization: Bearer $TOKEN")
assert_status "GET /api/feedback" "200" "$RES"
echo ""

# --- 11. Delete memo (cleanup) ---
echo "[11] Delete Memo"
if [ -n "$MEMO_ID" ] && [ "$MEMO_ID" != "undefined" ]; then
  RES=$(curl -s -o /tmp/e2e-body -w "%{http_code}" -X DELETE "$BASE/api/memos/$MEMO_ID" \
    -H "Authorization: Bearer $TOKEN")
  assert_status "DELETE /api/memos/:id" "200" "$RES"
fi
echo ""

# --- 12. Unauthorized access ---
echo "[12] Unauthorized Access"
RES=$(curl -s -o /tmp/e2e-body -w "%{http_code}" "$BASE/api/memos")
assert_status "GET /api/memos (no auth)" "401" "$RES"
echo ""

# --- Summary ---
echo "============================================"
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  green "  ALL TESTS PASSED: $PASS/$TOTAL"
else
  red "  $FAIL FAILED, $PASS passed ($TOTAL total)"
fi
echo "============================================"

rm -f /tmp/e2e-body

exit $FAIL
