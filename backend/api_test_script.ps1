# API Testing Script for Road Risk Prediction System
# Run this script in PowerShell to test all API endpoints

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Road Risk API Testing Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "https://roadrisk-xtdc.onrender.com"
$testResults = @()

# Function to test API endpoint
function Test-APIEndpoint {
    param (
        [string]$testName,
        [string]$method,
        [string]$endpoint,
        [hashtable]$body = @{},
        [string]$sessionCookie = "",
        [string]$expectedStatus,
        [string]$expectedMessage
    )
    
    Write-Host "Testing: $testName" -ForegroundColor Yellow
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($sessionCookie) {
            $headers["Cookie"] = $sessionCookie
        }
        
        $params = @{
            Uri = "$baseUrl$endpoint"
            Method = $method
            Headers $headers
            SessionVariable = "session"
        }
        
        if ($body.Count -gt 0) {
            $params["Body"] = ($body | ConvertTo-Json)
        }
        
        try {
            $response = Invoke-WebRequest @params -UseBasicParsing
            $content = $response.Content | ConvertFrom-Json
            $status = $response.StatusCode
            
            $result = @{
                TestName = $testName
                Status = "PASS"
                ExpectedStatus = $expectedStatus
                ActualStatus = $status
                Response = $content
                SessionCookie = if ($session) { $session.Cookies.GetCookies($baseUrl) } else { $null }
            }
            
        } catch {
            $status = $_.Exception.Response.StatusCode.value__
            $content = $_.Exception.Message
            
            $result = @{
                TestName = $testName
                Status = if ($status -eq $expectedStatus) { "PASS" } else { "FAIL" }
                ExpectedStatus = $expectedStatus
                ActualStatus = $status
                Response = $content
            }
        }
        
        if ($result.Status -eq "PASS") {
            Write-Host "  ✓ PASS - Status: $status" -ForegroundColor Green
        } else {
            Write-Host "  ✗ FAIL - Expected: $expectedStatus, Got: $status" -ForegroundColor Red
        }
        
        return $result
        
    } catch {
        Write-Host "  ✗ ERROR - $($_.Exception.Message)" -ForegroundColor Red
        return @{
            TestName = $testName
            Status = "ERROR"
            Error = $_.Exception.Message
        }
    }
}

Write-Host "`n=== AUTHENTICATION API TESTS ===`n" -ForegroundColor Cyan

# Test 1: Signup with valid credentials
Write-Host "`nTest 1: POST /api/auth/signup (Valid)" -ForegroundColor Magenta
$test1 = Test-APIEndpoint -testName "Signup - Valid Credentials" `
    -method "POST" `
    -endpoint "/api/auth/signup" `
    -body @{email="apitest001@test.com"; password="TestPass123"} `
    -expectedStatus "200"
$testResults += $test1

# Test 2: Signup with duplicate email
Write-Host "`nTest 2: POST /api/auth/signup (Duplicate)" -ForegroundColor Magenta
$test2 = Test-APIEndpoint -testName "Signup - Duplicate Email" `
    -method "POST" `
    -endpoint "/api/auth/signup" `
    -body @{email="apitest001@test.com"; password="TestPass123"} `
    -expectedStatus "409"
$testResults += $test2

# Test 3: Signup with missing fields
Write-Host "`nTest 3: POST /api/auth/signup (Missing Fields)" -ForegroundColor Magenta
$test3 = Test-APIEndpoint -testName "Signup - Missing Fields" `
    -method "POST" `
    -endpoint "/api/auth/signup" `
    -body @{email="apitest002@test.com"} `
    -expectedStatus "400"
$testResults += $test3

# Test 4: Login with valid credentials
Write-Host "`nTest 4: POST /api/auth/login (Valid)" -ForegroundColor Magenta
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body (@{email="apitest001@test.com"; password="TestPass123"} | ConvertTo-Json) `
        -SessionVariable session
    
    Write-Host "  ✓ PASS - Login successful" -ForegroundColor Green
    $sessionCookie = $session.Cookies.GetCookies($baseUrl)[0].ToString()
    Write-Host "  Session Cookie: $sessionCookie" -ForegroundColor Gray
} catch {
    Write-Host "  ✗ FAIL - Login failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Login with invalid password
Write-Host "`nTest 5: POST /api/auth/login (Invalid Password)" -ForegroundColor Magenta
$test5 = Test-APIEndpoint -testName "Login - Invalid Password" `
    -method "POST" `
    -endpoint "/api/auth/login" `
    -body @{email="apitest001@test.com"; password="WrongPassword"} `
    -expectedStatus "401"
$testResults += $test5

# Test 6: Login with non-existent email
Write-Host "`nTest 6: POST /api/auth/login (Non-existent Email)" -ForegroundColor Magenta
$test6 = Test-APIEndpoint -testName "Login - Non-existent Email" `
    -method "POST" `
    -endpoint "/api/auth/login" `
    -body @{email="nonexistent@test.com"; password="TestPass123"} `
    -expectedStatus "401"
$testResults += $test6

# Test 7: Auth status (authenticated)
Write-Host "`nTest 7: GET /api/auth/status (Authenticated)" -ForegroundColor Magenta
try {
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/status" `
        -Method GET `
        -WebSession $session
    
    if ($statusResponse.loggedIn -eq $true) {
        Write-Host "  ✓ PASS - User authenticated" -ForegroundColor Green
        Write-Host "  User: $($statusResponse.email)" -ForegroundColor Gray
    } else {
        Write-Host "  ✗ FAIL - User not authenticated" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Auth status (unauthenticated)
Write-Host "`nTest 8: GET /api/auth/status (Unauthenticated)" -ForegroundColor Magenta
try {
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/status" -Method GET
    
    if ($statusResponse.loggedIn -eq $false) {
        Write-Host "  ✓ PASS - Correctly shows not authenticated" -ForegroundColor Green
    } else {
        Write-Host "  ✗ FAIL - Should show not authenticated" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== SEARCH API TESTS ===`n" -ForegroundColor Cyan

# Test 9: Create search (authenticated)
Write-Host "`nTest 9: POST /api/searches (Authenticated)" -ForegroundColor Magenta
try {
    $searchResponse = Invoke-RestMethod -Uri "$baseUrl/api/searches" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body (@{city="Mumbai"; temperature=28.5; humidity=75} | ConvertTo-Json) `
        -WebSession $session
    
    Write-Host "  ✓ PASS - Search created" -ForegroundColor Green
    Write-Host "  Search ID: $($searchResponse.searchId)" -ForegroundColor Gray
    $searchId = $searchResponse.searchId
} catch {
    Write-Host "  ✗ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 10: Create search (unauthenticated)
Write-Host "`nTest 10: POST /api/searches (Unauthenticated)" -ForegroundColor Magenta
try {
    $searchResponse = Invoke-RestMethod -Uri "$baseUrl/api/searches" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body (@{city="Delhi"} | ConvertTo-Json)
    
    Write-Host "  ✗ FAIL - Should require authentication" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "  ✓ PASS - Correctly blocked unauthenticated request" -ForegroundColor Green
    } else {
        Write-Host "  ✗ FAIL - Wrong error code" -ForegroundColor Red
    }
}

# Test 11: Update search
Write-Host "`nTest 11: PUT /api/searches/:id (Update)" -ForegroundColor Magenta
try {
    if ($searchId) {
        $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/searches/$searchId" `
            -Method PUT `
            -Headers @{"Content-Type"="application/json"} `
            -Body (@{risk_score=60; risk_level="MODERATE"} | ConvertTo-Json) `
            -WebSession $session
        
        Write-Host "  ✓ PASS - Search updated" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 12: Get all searches
Write-Host "`nTest 12: GET /api/searches (All)" -ForegroundColor Magenta
try {
    $allSearches = Invoke-RestMethod -Uri "$baseUrl/api/searches" `
        -Method GET `
        -WebSession $session
    
    Write-Host "  ✓ PASS - Retrieved $($allSearches.Count) searches" -ForegroundColor Green
} catch {
    Write-Host "  ✗ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 13: Get latest search
Write-Host "`nTest 13: GET /api/searches/latest" -ForegroundColor Magenta
try {
    $latestSearch = Invoke-RestMethod -Uri "$baseUrl/api/searches/latest" `
        -Method GET `
        -WebSession $session
    
    Write-Host "  ✓ PASS - Latest search: $($latestSearch.city)" -ForegroundColor Green
} catch {
    Write-Host "  ✗ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 14: Logout
Write-Host "`nTest 14: POST /api/auth/logout" -ForegroundColor Magenta
try {
    $logoutResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/logout" `
        -Method POST `
        -WebSession $session
    
    Write-Host "  ✓ PASS - Logged out successfully" -ForegroundColor Green
} catch {
    Write-Host "  ✗ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 15: Verify logout (auth status should be false)
Write-Host "`nTest 15: GET /api/auth/status (After Logout)" -ForegroundColor Magenta
try {
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/status" `
        -Method GET `
        -WebSession $session
    
    if ($statusResponse.loggedIn -eq $false) {
        Write-Host "  ✓ PASS - Session correctly destroyed" -ForegroundColor Green
    } else {
        Write-Host "  ✗ FAIL - Session still active" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n`n========================================" -ForegroundColor Cyan
Write-Host "         TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passCount = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$errorCount = ($testResults | Where-Object { $_.Status -eq "ERROR" }).Count
$total = $testResults.Count

Write-Host "`nTotal Tests: $total" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host "Errors: $errorCount" -ForegroundColor Yellow

if ($total -gt 0) {
    $passRate = [math]::Round(($passCount / $total) * 100, 2)
    Write-Host "`nPass Rate: $passRate%" -ForegroundColor Cyan
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

# Save results to file
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$reportFile = "api_test_results_$timestamp.json"
$testResults | ConvertTo-Json -Depth 10 | Out-File $reportFile
Write-Host "Results saved to: $reportFile" -ForegroundColor Gray
