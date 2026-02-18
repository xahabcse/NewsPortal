param(
    [string]$BaseUrl = "http://localhost:5000",
    [string]$ApiVersion = "v1",
    [string]$PostgresUser = "newsadmin",
    [string]$PostgresPassword = "NewsPortal@123",
    [string]$PostgresDb = "newsportal"
)

$ErrorActionPreference = "Stop"
$results = @()

function Add-Result {
    param(
        [string]$Name,
        [bool]$Passed,
        [string]$Details
    )
    $script:results += [PSCustomObject]@{
        Test    = $Name
        Status  = $(if ($Passed) { "PASS" } else { "FAIL" })
        Details = $Details
    }
}

function Invoke-JsonPost {
    param(
        [string]$Url,
        [hashtable]$Body,
        [hashtable]$Headers = @{}
    )
    return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 8) -Headers $Headers
}

function Exec-Psql {
    param([string]$Sql)
    $sqlWithNewline = $Sql.TrimEnd() + "`n"
    $out = $sqlWithNewline | docker exec -i newsportal-db sh -c "PGPASSWORD='$PostgresPassword' psql -U $PostgresUser -d $PostgresDb -t -A"
    return $out
}

try {
    $null = docker inspect newsportal-api | Out-Null
    $null = docker inspect newsportal-mcp | Out-Null
    Add-Result "ContainersExist" $true "newsportal-api and newsportal-mcp found"
}
catch {
    Add-Result "ContainersExist" $false $_.Exception.Message
}

try {
    $healthResponse = Invoke-WebRequest -Method Get -Uri "$BaseUrl/api/$ApiVersion/NewsSources" -UseBasicParsing
    Add-Result "ApiHealth" ($healthResponse.StatusCode -eq 200) "statusCode=$($healthResponse.StatusCode)"
}
catch {
    Add-Result "ApiHealth" $false $_.Exception.Message
}

try {
    $sources = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/$ApiVersion/NewsSources"
    $count = @($sources).Count
    Add-Result "ApiNewsSources" ($count -gt 0) "count=$count"
}
catch {
    Add-Result "ApiNewsSources" $false $_.Exception.Message
}

try {
    $latest = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/$ApiVersion/News/latest?page=1&pageSize=5"
    $items = @($latest.items).Count
    Add-Result "ApiLatestNews" ($latest.page -eq 1 -and $latest.pageSize -eq 5) "page=$($latest.page), pageSize=$($latest.pageSize), items=$items"
}
catch {
    Add-Result "ApiLatestNews" $false $_.Exception.Message
}

try {
    $search = Invoke-JsonPost -Url "$BaseUrl/api/$ApiVersion/News/search" -Body @{
        query    = "bangladesh"
        page     = 1
        pageSize = 5
    }
    $items = @($search.items).Count
    Add-Result "ApiSearchNews" ($search.page -eq 1 -and $search.pageSize -eq 5) "page=$($search.page), pageSize=$($search.pageSize), items=$items"
}
catch {
    Add-Result "ApiSearchNews" $false $_.Exception.Message
}

try {
    $suffix = Get-Random -Minimum 10000 -Maximum 99999
    $username = "smoke_$suffix"
    $email = "smoke_$suffix@example.com"
    $password = "SmokeTest@123"

    $register = Invoke-JsonPost -Url "$BaseUrl/api/$ApiVersion/Auth/register" -Body @{
        username  = $username
        email     = $email
        password  = $password
        firstName = "Smoke"
        lastName  = "Tester"
    }

    $login = Invoke-JsonPost -Url "$BaseUrl/api/$ApiVersion/Auth/login" -Body @{
        username = $username
        password = $password
    }

    $token = $login.token
    $me = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/$ApiVersion/Auth/me" -Headers @{ Authorization = "Bearer $token" }
    $valid = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/$ApiVersion/Auth/validate" -Headers @{ Authorization = "Bearer $token" }

    $pass = ($register.username -eq $username) -and ($me.username -eq $username) -and ($valid.valid -eq $true)
    Add-Result "ApiAuthFlow" $pass "registered=$($register.username), me=$($me.username), tokenValid=$($valid.valid)"
}
catch {
    Add-Result "ApiAuthFlow" $false $_.Exception.Message
}

try {
    $mcpInspect = docker inspect -f "status={{.State.Status}} restart={{.RestartCount}}" newsportal-mcp
    $isRunning = $mcpInspect -match "status=running"
    Add-Result "McpContainer" $isRunning $mcpInspect
}
catch {
    Add-Result "McpContainer" $false $_.Exception.Message
}

try {
    $mcpLogs = docker logs --tail 400 newsportal-mcp 2>&1
    $scheduled = ($mcpLogs | Select-String -SimpleMatch "Background jobs scheduled successfully" -Quiet)
    $fatal = ($mcpLogs | Select-String -SimpleMatch "Application terminated unexpectedly" -Quiet)
    Add-Result "McpStartupLogs" ($scheduled -and -not $fatal) "scheduled=$scheduled, fatal=$fatal"
}
catch {
    Add-Result "McpStartupLogs" $false $_.Exception.Message
}

try {
    $recurringCountRaw = Exec-Psql -Sql "select count(*) from hangfire.""set"" where key = 'recurring-jobs';"
    $recurringCount = [int](($recurringCountRaw -join "") -replace "\s", "")

    $lastExecutionRaw = Exec-Psql -Sql "select value from hangfire.hash where key = 'recurring-job:news-fetch-all' and field = 'LastExecution' limit 1;"
    $lastExecution = (($lastExecutionRaw -join "") -replace "\s", "")

    $pass = ($recurringCount -ge 2)
    Add-Result "McpHangfireState" $pass "recurringJobs=$recurringCount, lastExecution=$lastExecution"
}
catch {
    Add-Result "McpHangfireState" $false $_.Exception.Message
}

$results | Format-Table -AutoSize

$failed = @($results | Where-Object { $_.Status -eq "FAIL" }).Count
if ($failed -gt 0) {
    Write-Host ""
    Write-Host "Smoke test FAILED with $failed failing checks."
    exit 1
}

Write-Host ""
Write-Host "Smoke test PASSED."
exit 0
