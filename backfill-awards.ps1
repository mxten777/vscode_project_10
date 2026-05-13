# 낙찰 데이터 백필 스크립트 (Hobby 플랜 60초 제한 대응)
# 1주 단위로 쪼개서 순차 호출합니다.
# 사용: .\backfill-awards.ps1
# 선택: .\backfill-awards.ps1 -Months 2   (기본값 3개월)

param(
    [int]$Months = 3
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$BASE_URL  = "https://bid-platform.vercel.app"
$SECRET    = "096d0aa26afa4b5c956bf100612166d759fe11834e7e43cb"
$HEADERS   = @{ Authorization = "Bearer $SECRET" }

$totalProcessed = 0
$totalSkipped   = 0
$totalErrors    = 0
$batch          = 0

Write-Host "낙찰 백필 시작 (최근 ${Months}개월, 1주 단위 분할)" -ForegroundColor Cyan

$endDate   = [DateTime]::Today
$startDate = $endDate.AddMonths(-$Months)
$cursor    = $startDate

while ($cursor -lt $endDate) {
    $batchEnd = $cursor.AddDays(6)
    if ($batchEnd -gt $endDate) { $batchEnd = $endDate }

    $from = $cursor.ToString("yyyyMMdd")
    $to   = $batchEnd.ToString("yyyyMMdd")
    $batch++

    $url = "$BASE_URL/api/jobs/backfill-awards?fromDate=$from&toDate=$to"

    Write-Host "`n[$batch] $($cursor.ToString('yyyy-MM-dd')) ~ $($batchEnd.ToString('yyyy-MM-dd'))" -ForegroundColor Yellow

    try {
        $resp = Invoke-RestMethod -Uri $url -Method POST -Headers $HEADERS -TimeoutSec 90 -ErrorAction Stop

        $processed = if ($null -ne $resp.processed) { $resp.processed } else { 0 }
        $skipped   = if ($null -ne $resp.skipped)   { $resp.skipped }   else { 0 }
        $errors    = if ($null -ne $resp.errors)     { $resp.errors }    else { 0 }
        $fetched   = if ($null -ne $resp.fetched)    { $resp.fetched }   else { 0 }

        $totalProcessed += $processed
        $totalSkipped   += $skipped
        $totalErrors    += $errors

        Write-Host "  fetched=$fetched  processed=$processed  skipped=$skipped  errors=$errors" -ForegroundColor Green
        if ($resp.debug -and $resp.debug.Count -gt 0) {
            $resp.debug | ForEach-Object { Write-Host "  debug: $_" -ForegroundColor DarkGray }
        }
    } catch {
        $statusCode = $_.Exception.Response?.StatusCode?.value__ ?? "?"
        Write-Host "  실패 (HTTP $statusCode): $_" -ForegroundColor Red
        $totalErrors++
    }

    Start-Sleep -Seconds 2
    $cursor = $batchEnd.AddDays(1)
}

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "백필 완료"
Write-Host "  총 processed : $totalProcessed"
Write-Host "  총 skipped   : $totalSkipped"
Write-Host "  총 errors    : $totalErrors"
Write-Host "======================================" -ForegroundColor Cyan
