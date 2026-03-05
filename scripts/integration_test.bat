@echo off
REM Comprehensive Integration Test for Crypto App + Sidecar (Windows)
REM Tests the complete flow from frontend request to sidecar response

echo 🧪 Crypto App + Sidecar Integration Test Suite
echo ==============================================

REM Configuration - Set these environment variables or edit here
if "%BACKEND_URL%"=="" set BACKEND_URL=https://refatishere.free.nf/crypto/backend
if "%API_TOKEN%"=="" set API_TOKEN=test-token
if "%SIDECAR_TOKEN%"=="" set SIDECAR_TOKEN=

REM Test counter
set TESTS_RUN=0
set TESTS_PASSED=0

REM Test function
:run_test
set TEST_NAME=%~1
set COMMAND=%~2
set EXPECTED_STATUS=%~3

echo|set /p="Testing: %TEST_NAME%... "
set /a TESTS_RUN=%TESTS_RUN%+1

REM Run the command and capture output
for /f %%i in ('%COMMAND% 2^>nul') do set STATUS=%%i

if "%STATUS%"=="%EXPECTED_STATUS%" (
    echo ✅ PASSED
    set /a TESTS_PASSED=%TESTS_PASSED%+1
) else (
    echo ❌ FAILED (status: %STATUS%, expected: %EXPECTED_STATUS%)
)
goto :eof

REM Test 1: Backend Health Check
call :run_test "Backend Health" "curl -s -o nul -w %%{http_code} %BACKEND_URL%/health.php -H X-API-Token:%API_TOKEN%" 200

REM Test 2: Local Planner (should always work)
call :run_test "Local Planner" "curl -s -o nul -w %%{http_code} -X POST %BACKEND_URL%/api.php?action=planner-intent -H X-API-Token:%API_TOKEN% -H Content-Type:application/json -d {\"provider\":\"local\",\"venue\":\"binance\",\"symbol\":\"BTCUSDT\",\"side\":\"BUY\",\"size\":0.01}" 200

REM Test 3: Sidecar Health (if configured)
if defined PLANNER_SIDECAR_URL (
    call :run_test "Sidecar Health" "curl -s -o nul -w %%{http_code} %PLANNER_SIDECAR_URL%/health" 200
) else (
    echo ⚠️  Sidecar URL not configured, skipping sidecar tests
)

REM Test 4: Sidecar Planner (if configured)
if defined PLANNER_SIDECAR_URL if defined PLANNER_SIDECAR_TOKEN (
    call :run_test "Sidecar Planner" "curl -s -o nul -w %%{http_code} -X POST %BACKEND_URL%/api.php?action=planner-intent -H X-API-Token:%API_TOKEN% -H Content-Type:application/json -d {\"provider\":\"sidecar\",\"venue\":\"pancakeswap\",\"tokenIn\":\"0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82\",\"tokenOut\":\"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c\",\"amountIn\":\"1.0\"}" 200
) else (
    echo ⚠️  Sidecar not fully configured, skipping sidecar planner test
)

REM Test 5: Deep Link Generation
echo|set /p="Testing: Deep Link Generation... "
set /a TESTS_RUN=%TESTS_RUN%+1

curl -s -X POST "%BACKEND_URL%/api.php?action=planner-intent" -H "X-API-Token:%API_TOKEN%" -H "Content-Type:application/json" -d "{\"provider\":\"local\",\"venue\":\"pancakeswap\",\"tokenIn\":\"0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82\",\"tokenOut\":\"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c\",\"amountIn\":\"1.0\"}" > temp_response.txt 2>nul

findstr "pancakeswap.finance/swap" temp_response.txt >nul 2>&1
if %errorlevel%==0 (
    echo ✅ PASSED
    set /a TESTS_PASSED=%TESTS_PASSED%+1
) else (
    echo ❌ FAILED (no deep link found)
)

REM Test 6: Risk Assessment
echo|set /p="Testing: Risk Assessment... "
set /a TESTS_RUN=%TESTS_RUN%+1

curl -s -X POST "%BACKEND_URL%/api.php?action=planner-intent" -H "X-API-Token:%API_TOKEN%" -H "Content-Type:application/json" -d "{\"provider\":\"local\",\"venue\":\"binance\",\"symbol\":\"BTCUSDT\",\"side\":\"BUY\",\"size\":10}" > temp_response.txt 2>nul

findstr "risk_flags" temp_response.txt >nul 2>&1
if %errorlevel%==0 (
    echo ✅ PASSED
    set /a TESTS_PASSED=%TESTS_PASSED%+1
) else (
    echo ❌ FAILED (no risk assessment found)
)

REM Clean up
if exist temp_response.txt del temp_response.txt

REM Summary
echo.
echo 📊 Test Results: %TESTS_PASSED%/%TESTS_RUN% tests passed

if %TESTS_PASSED%==%TESTS_RUN% (
    echo 🎉 All tests passed! Integration is working correctly.
    exit /b 0
) else (
    echo ⚠️  Some tests failed. Check configuration and try again.
    exit /b 1
)