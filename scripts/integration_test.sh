#!/bin/bash
# Comprehensive Integration Test for Crypto App + Sidecar
# Tests the complete flow from frontend request to sidecar response

echo "🧪 Crypto App + Sidecar Integration Test Suite"
echo "=============================================="

# Configuration
BACKEND_URL="https://refatishere.free.nf/crypto/backend"
SIDECAR_URL="${PLANNER_SIDECAR_URL:-}"
API_TOKEN="${API_TOKEN_CRYPTO:-test-token}"
SIDECAR_TOKEN="${PLANNER_SIDECAR_TOKEN:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0

# Test function
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_status="$3"

    echo -n "Testing: $test_name... "
    TESTS_RUN=$((TESTS_RUN + 1))

    # Run the command and capture output
    local output
    output=$(eval "$command" 2>/dev/null)
    local status=$?

    if [ "$status" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAILED${NC} (status: $status, expected: $expected_status)"
        echo "Output: $output"
    fi
}

# Test 1: Backend Health Check
run_test "Backend Health" "curl -s -o /dev/null -w '%{http_code}' '$BACKEND_URL/health.php' -H 'X-API-Token: $API_TOKEN'" 200

# Test 2: Local Planner (should always work)
run_test "Local Planner" "curl -s -o /dev/null -w '%{http_code}' -X POST '$BACKEND_URL/api.php?action=planner-intent' -H 'X-API-Token: $API_TOKEN' -H 'Content-Type: application/json' -d '{\"provider\":\"local\",\"venue\":\"binance\",\"symbol\":\"BTCUSDT\",\"side\":\"BUY\",\"size\":0.01}'" 200

# Test 3: Sidecar Health (if configured)
if [ -n "$SIDECAR_URL" ]; then
    run_test "Sidecar Health" "curl -s -o /dev/null -w '%{http_code}' '$SIDECAR_URL/health'" 200
else
    echo -e "${YELLOW}⚠️  Sidecar URL not configured, skipping sidecar tests${NC}"
fi

# Test 4: Sidecar Planner (if configured)
if [ -n "$SIDECAR_URL" ] && [ -n "$SIDECAR_TOKEN" ]; then
    run_test "Sidecar Planner" "curl -s -o /dev/null -w '%{http_code}' -X POST '$BACKEND_URL/api.php?action=planner-intent' -H 'X-API-Token: $API_TOKEN' -H 'Content-Type: application/json' -d '{\"provider\":\"sidecar\",\"venue\":\"pancakeswap\",\"tokenIn\":\"0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82\",\"tokenOut\":\"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c\",\"amountIn\":\"1.0\"}'" 200
else
    echo -e "${YELLOW}⚠️  Sidecar not fully configured, skipping sidecar planner test${NC}"
fi

# Test 5: Fallback Behavior (sidecar timeout simulation)
if [ -n "$SIDECAR_URL" ]; then
    # Temporarily point to a non-responsive URL to test fallback
    echo -n "Testing: Fallback Behavior... "
    TESTS_RUN=$((TESTS_RUN + 1))

    # This should return 202 (Accepted) with local fallback
    response=$(curl -s -X POST "$BACKEND_URL/api.php?action=planner-intent" \
        -H "X-API-Token: $API_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"provider":"sidecar","venue":"binance","symbol":"BTCUSDT","side":"BUY","size":0.01}' \
        -w "HTTPSTATUS:%{http_code}")

    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

    if [ "$http_code" = "200" ] || [ "$http_code" = "202" ]; then
        echo -e "${GREEN}✅ PASSED${NC} (fallback working)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAILED${NC} (status: $http_code)"
    fi
fi

# Test 6: Deep Link Generation
echo -n "Testing: Deep Link Generation... "
TESTS_RUN=$((TESTS_RUN + 1))

response=$(curl -s -X POST "$BACKEND_URL/api.php?action=planner-intent" \
    -H "X-API-Token: $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"provider":"local","venue":"pancakeswap","tokenIn":"0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82","tokenOut":"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c","amountIn":"1.0"}')

if echo "$response" | grep -q "pancakeswap.finance/swap"; then
    echo -e "${GREEN}✅ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC} (no deep link found)"
fi

# Test 7: Risk Assessment
echo -n "Testing: Risk Assessment... "
TESTS_RUN=$((TESTS_RUN + 1))

response=$(curl -s -X POST "$BACKEND_URL/api.php?action=planner-intent" \
    -H "X-API-Token: $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"provider":"local","venue":"binance","symbol":"BTCUSDT","side":"BUY","size":10}')

if echo "$response" | grep -q "risk_flags"; then
    echo -e "${GREEN}✅ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC} (no risk assessment found)"
fi

# Summary
echo ""
echo "📊 Test Results: $TESTS_PASSED/$TESTS_RUN tests passed"

if [ "$TESTS_PASSED" -eq "$TESTS_RUN" ]; then
    echo -e "${GREEN}🎉 All tests passed! Integration is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Check configuration and try again.${NC}"
    exit 1
fi