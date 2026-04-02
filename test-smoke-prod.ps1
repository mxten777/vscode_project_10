# ============================================================================
# test-smoke-prod.ps1
# 배포된 프로덕션 환경 스모크 테스트
# 사용법:
#   .\test-smoke-prod.ps1                          # 기본 (공개 엔드포인트)
#   .\test-smoke-prod.ps1 -Email x@x.com -Password pw  # 인증 포함
# ============================================================================

param(
  [string]$BaseUrl  = "https://bid-platform.vercel.app",
  [string]$Email    = "",
  [string]$Password = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "SilentlyContinue"

$pass = 0
$fail = 0
$skip = 0

# --- helpers ---------------------------------------------------------------

function Invoke-Test {
  param([string]$Name, [scriptblock]$Body)
  Write-Host "`n  > $Name" -ForegroundColor Cyan -NoNewline
  try {
    & $Body
    Write-Host "  [PASS]" -ForegroundColor Green
    $script:pass++
  } catch {
    Write-Host "  [FAIL] $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
  }
}

function Assert-Equal($actual, $expected, $msg) {
  if ($actual -ne $expected) { throw "$msg (expected=$expected, got=$actual)" }
}

function Assert-Contains($actual, $substring, $msg) {
  if ($actual.ToString() -notlike ('*' + $substring + '*')) { throw "$msg (not found: '$substring')" }
}

function Invoke-Json {
  param([string]$Uri, [string]$Method = "GET", $Body = $null, $Session = $null)
  $params = @{ Uri = $Uri; Method = $Method; ContentType = "application/json" }
  if ($Body) { $params.Body = ($Body | ConvertTo-Json -Compress) }
  if ($Session) { $params.WebSession = $Session }
  Invoke-RestMethod @params
}

function Invoke-Raw {
  param([string]$Uri, [string]$Method = "GET", $Body = $null, $Session = $null)
  $params = @{
    Uri = $Uri; Method = $Method; ContentType = "application/json"
    UseBasicParsing = $true; MaximumRedirection = 0
  }
  if ($Body) { $params.Body = ($Body | ConvertTo-Json -Compress) }
  if ($Session) { $params.WebSession = $Session }
  try { Invoke-WebRequest @params }
  catch [System.Net.WebException] { $_.Exception.Response }
  catch { throw }
}

# ── 섹션 헤더 ───────────────────────────────────────────────────────────────

function Write-Section([string]$Title) {
  $line = '-' * 60
  Write-Host "`n$line" -ForegroundColor DarkGray
  Write-Host "  $Title" -ForegroundColor White
  Write-Host "$line" -ForegroundColor DarkGray
}

# ============================================================================
Write-Host "`n[Smoke Test] $BaseUrl" -ForegroundColor Yellow
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
# ============================================================================

Write-Section "1. Health Check"

Invoke-Test "GET /api/health → status:ok" {
  $r = Invoke-Json "$BaseUrl/api/health"
  Assert-Equal $r.status "ok" "status 필드"
  if (-not $r.timestamp) { throw "timestamp 필드 없음" }
}

Write-Section "2. Middleware Redirect (no session)"

Invoke-Test "GET / → /landing 리다이렉트 (302)" {
  $r = Invoke-Raw "$BaseUrl/"
  $status = if ($r.StatusCode) { $r.StatusCode } else { $r.StatusDescription }
  # Vercel이 302 또는 307 반환
  if ($r.StatusCode -notin @(302, 307)) { throw "리다이렉트 아님 (StatusCode=$($r.StatusCode))" }
  $location = $r.Headers["Location"]
  if ($location -notlike "*/landing*") { throw "Location=$location, /landing 아님" }
}

Invoke-Test "GET /analytics → /login 리다이렉트 (302/307)" {
  $r = Invoke-Raw "$BaseUrl/analytics"
  if ($r.StatusCode -notin @(302, 307)) { throw "StatusCode=$($r.StatusCode), 리다이렉트 아님" }
  $location = $r.Headers["Location"]
  if ($location -notlike "*/login*") { throw "Location=$location, /login 아님" }
}

Invoke-Test "GET /favorites → /login 리다이렉트 (302/307)" {
  $r = Invoke-Raw "$BaseUrl/favorites"
  if ($r.StatusCode -notin @(302, 307)) { throw "StatusCode=$($r.StatusCode), 리다이렉트 아님" }
}

Write-Section "3. Signup Zod Validation (POST /api/auth/signup)"

Invoke-Test "Bad email format -> 400 VALIDATION_ERROR" {
  try {
    Invoke-Json "$BaseUrl/api/auth/signup" "POST" @{ email="not-an-email"; password="123456" }
    throw "expected 400 but got success"
  } catch {
    $detail = $_.ErrorDetails.Message
    if ($detail) {
      $obj = $detail | ConvertFrom-Json -ErrorAction SilentlyContinue
      if ($obj -and $obj.code -ne "VALIDATION_ERROR") { throw "code=$($obj.code), expected VALIDATION_ERROR" }
    }
    # 400 class error = pass
  }
}

Invoke-Test "Password 5 chars -> 400 VALIDATION_ERROR" {
  try {
    Invoke-Json "$BaseUrl/api/auth/signup" "POST" @{ email="user@example.com"; password="12345" }
    throw "expected 400 but got success"
  } catch {
    $detail = $_.ErrorDetails.Message
    if ($detail) {
      $obj = $detail | ConvertFrom-Json -ErrorAction SilentlyContinue
      if ($obj -and $obj.code -ne "VALIDATION_ERROR") { throw "code=$($obj.code), expected VALIDATION_ERROR" }
    }
    # 400 class = pass
  }
}

Invoke-Test "Empty body -> 400" {
  try {
    Invoke-Json "$BaseUrl/api/auth/signup" "POST" @{}
    throw "expected 400 but got success"
  } catch {
    # 400 class = pass
  }
}

Write-Section "4. API Auth Protection (no session -> 401)"

Invoke-Test "GET /api/tenders -> 401" {
  try {
    Invoke-Json "$BaseUrl/api/tenders"
    throw "expected 401 but got success"
  } catch {
    $status = $null
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    $obj = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($status -ne 401 -and ($obj -and $obj.code -ne "UNAUTHORIZED")) {
      throw "status=$status, expected UNAUTHORIZED"
    }
  }
}

Invoke-Test "GET /api/alerts/rules -> 401" {
  try {
    Invoke-Json "$BaseUrl/api/alerts/rules"
    throw "expected 401 but got success"
  } catch {
    # 401 class = pass
  }
}

Invoke-Test "GET /api/favorites/list -> 401" {
  try {
    Invoke-Json "$BaseUrl/api/favorites/list"
    throw "expected 401 but got success"
  } catch {
    # 401 class = pass
  }
}

Write-Section "5. Authenticated Tests (-Email / -Password required)"

if (-not $Email -or -not $Password) {
  Write-Host "  [SKIP] pass -Email and -Password to enable this section" -ForegroundColor Yellow
  Write-Host "  example: .\test-smoke-prod.ps1 -Email you@example.com -Password yourpw" -ForegroundColor DarkGray
  $script:skip += 4
} else {
  # 세션 쿠키 유지용 WebSession
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

  Invoke-Test "POST /api/auth/signin -> 200 + user.id" {
    $r = Invoke-Json "$BaseUrl/api/auth/signin" "POST" @{ email=$Email; password=$Password } $session
    if (-not $r.user.id) { throw "user.id missing" }
  }

  Invoke-Test "GET /api/tenders (authed) -> data array" {
    $r = Invoke-Json "$BaseUrl/api/tenders" "GET" $null $session
    if ($null -eq $r.data) { throw "data array missing" }
  }

  Invoke-Test "GET /api/alerts/rules (authed) -> 200" {
    $r = Invoke-Json "$BaseUrl/api/alerts/rules" "GET" $null $session
    if ($null -eq $r.data) { throw "data missing" }
  }

  Invoke-Test "GET /api/bid-analysis/stats (authed) -> has stats" {
    $r = Invoke-Json "$BaseUrl/api/bid-analysis/stats" "GET" $null $session
    if ($null -eq $r.total_bids -and $null -eq $r.stats) { throw "total_bids / stats missing" }
  }
}

$line2 = '=' * 60
Write-Host "`n$line2" -ForegroundColor DarkGray
Write-Host "  PASS $pass  /  FAIL $fail  /  SKIP $skip"
Write-Host "$line2" -ForegroundColor DarkGray

if ($fail -gt 0) { exit 1 } else { exit 0 }
