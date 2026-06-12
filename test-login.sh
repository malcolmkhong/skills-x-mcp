#!/bin/bash
# ─── IndustryX Login Flow Test ─────────────────────────────────
# Tests the demo sign-in redirect behavior

COOKIE_JAR="/tmp/ix-login-test-cookies.txt"
BASE="http://localhost:3000"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  IndustryX Login Flow Test${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

rm -f "$COOKIE_JAR"

# ─── Step 1: Landing page (unauthenticated) ────────────────────
echo -e "${YELLOW}[1] GET / (unauthenticated)${NC}"
LANDING=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
if [ "$LANDING" = "200" ]; then
  echo -e "  ${GREEN}✓${NC} Status: 200"
else
  echo -e "  ${RED}✗${NC} Status: $LANDING (expected 200)"
fi

# ─── Step 2: Get CSRF token ────────────────────────────────────
echo ""
echo -e "${YELLOW}[2] GET /api/auth/csrf${NC}"
CSRF=$(curl -s -c "$COOKIE_JAR" "$BASE/api/auth/csrf" | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])" 2>/dev/null)
if [ -n "$CSRF" ] && [ "$CSRF" != "None" ]; then
  echo -e "  ${GREEN}✓${NC} CSRF token: ${CSRF:0:20}..."
else
  echo -e "  ${RED}✗${NC} Failed to get CSRF token"
  exit 1
fi

# ─── Step 3: Check session before login ────────────────────────
echo ""
echo -e "${YELLOW}[3] GET /api/auth/session (before login)${NC}"
SESSION_BEFORE=$(curl -s -b "$COOKIE_JAR" "$BASE/api/auth/session")
if echo "$SESSION_BEFORE" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if not d.get('user') else 1)" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} No active session (expected)"
else
  echo -e "  ${YELLOW}⚠${NC} Session already active: $SESSION_BEFORE"
fi

# ─── Step 4: Submit demo login ─────────────────────────────────
echo ""
echo -e "${YELLOW}[4] POST /api/auth/callback/demo${NC}"
LOGIN_RESPONSE=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -o /dev/null \
  -w "status:%{http_code} redirect:%{redirect_url}" \
  -X POST "$BASE/api/auth/callback/demo" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=demo@industryx.io&password=demo123&csrfToken=$CSRF")

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | sed 's/.*status:\([0-9]*\).*/\1/')
REDIRECT_URL=$(echo "$LOGIN_RESPONSE" | sed 's/.*redirect:\(.*\)/\1/')

if [ "$HTTP_STATUS" = "302" ]; then
  echo -e "  ${GREEN}✓${NC} Status: 302 (redirect)"
else
  echo -e "  ${RED}✗${NC} Status: $HTTP_STATUS (expected 302)"
fi

if [ -n "$REDIRECT_URL" ]; then
  echo -e "  ${GREEN}✓${NC} Redirects to: $REDIRECT_URL"
  # Check if redirect goes to home (dashboard) or error page
  if echo "$REDIRECT_URL" | grep -q "csrf=true\|error="; then
    echo -e "  ${RED}✗${NC} Redirect contains error/csrf params — LOGIN FAILED"
  elif [ "$REDIRECT_URL" = "$BASE" ] || [ "$REDIRECT_URL" = "$BASE/" ]; then
    echo -e "  ${GREEN}✓${NC} Redirects to home → dashboard will render"
  else
    echo -e "  ${YELLOW}⚠${NC} Unexpected redirect target"
  fi
else
  echo -e "  ${RED}✗${NC} No redirect URL found"
fi

# ─── Step 5: Check cookies for session token ───────────────────
echo ""
echo -e "${YELLOW}[5] Check session cookie${NC}"
if grep -q "next-auth.session-token" "$COOKIE_JAR" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} next-auth.session-token cookie is SET"
else
  echo -e "  ${RED}✗${NC} next-auth.session-token cookie NOT found"
fi

# ─── Step 6: Verify session after login ────────────────────────
echo ""
echo -e "${YELLOW}[6] GET /api/auth/session (after login)${NC}"
SESSION_AFTER=$(curl -s -b "$COOKIE_JAR" "$BASE/api/auth/session")
USER_NAME=$(echo "$SESSION_AFTER" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('name','NONE'))" 2>/dev/null)
USER_ROLE=$(echo "$SESSION_AFTER" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('role','NONE'))" 2>/dev/null)
USER_PLAN=$(echo "$SESSION_AFTER" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('plan','NONE'))" 2>/dev/null)
USER_EMAIL=$(echo "$SESSION_AFTER" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('email','NONE'))" 2>/dev/null)

if [ "$USER_NAME" != "NONE" ]; then
  echo -e "  ${GREEN}✓${NC} Authenticated as: $USER_NAME"
  echo -e "         Email: $USER_EMAIL"
  echo -e "         Role:  $USER_ROLE"
  echo -e "         Plan:  $USER_PLAN"
else
  echo -e "  ${RED}✗${NC} Session not established — $SESSION_AFTER"
fi

# ─── Step 7: Follow the redirect → Dashboard ──────────────────
echo ""
echo -e "${YELLOW}[7] GET / (authenticated — should show dashboard)${NC}"
DASHBOARD=$(curl -s -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" "$BASE/")
if [ "$DASHBOARD" = "200" ]; then
  echo -e "  ${GREEN}✓${NC} Status: 200"
  # Check if the response contains dashboard markers (not landing page)
  BODY=$(curl -s -b "$COOKIE_JAR" "$BASE/")
  if echo "$BODY" | grep -q "Overview\|sidebar\|Dashboard"; then
    echo -e "  ${GREEN}✓${NC} Dashboard content detected in response"
  elif echo "$BODY" | grep -q "One MCP Server"; then
    echo -e "  ${RED}✗${NC} Landing page content detected — session not passed to SSR"
  else
    echo -e "  ${YELLOW}⚠${NC} Could not determine page type from HTML"
  fi
else
  echo -e "  ${RED}✗${NC} Status: $DASHBOARD (expected 200)"
fi

# ─── Step 8: Test bad credentials ──────────────────────────────
echo ""
echo -e "${YELLOW}[8] POST /api/auth/callback/demo (bad credentials)${NC}"
BAD_CSRF=$(curl -s -c /tmp/bad-cookies.txt "$BASE/api/auth/csrf" | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])" 2>/dev/null)
BAD_RESPONSE=$(curl -s -b /tmp/bad-cookies.txt -c /tmp/bad-cookies.txt \
  -o /dev/null \
  -w "status:%{http_code} redirect:%{redirect_url}" \
  -X POST "$BASE/api/auth/callback/demo" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=bad@test.com&password=wrong&csrfToken=$BAD_CSRF")

BAD_STATUS=$(echo "$BAD_RESPONSE" | sed 's/.*status:\([0-9]*\).*/\1/')
BAD_REDIRECT=$(echo "$BAD_RESPONSE" | sed 's/.*redirect:\(.*\)/\1/')

if [ "$BAD_STATUS" = "302" ]; then
  echo -e "  ${GREEN}✓${NC} Status: 302 (redirect)"
  if echo "$BAD_REDIRECT" | grep -q "error="; then
    echo -e "  ${GREEN}✓${NC} Redirects to error page: $BAD_REDIRECT"
  else
    echo -e "  ${YELLOW}⚠${NC} Redirects to: $BAD_REDIRECT"
  fi
else
  echo -e "  ${YELLOW}⚠${NC} Status: $BAD_STATUS"
fi

rm -f /tmp/bad-cookies.txt

# ─── Summary ───────────────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Summary${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Demo login redirects:  ${GREEN}$REDIRECT_URL${NC}"
echo -e "  Bad login redirects:   ${RED}$(echo $BAD_REDIRECT | head -c 80)${NC}"
echo -e "  Session established:   $([ "$USER_NAME" != "NONE" ] && echo "${GREEN}YES${NC}" || echo "${RED}NO${NC}")"
echo -e "  Dashboard reachable:   $([ "$DASHBOARD" = "200" ] && echo "${GREEN}YES${NC}" || echo "${RED}NO${NC}")"
echo ""

rm -f "$COOKIE_JAR"
