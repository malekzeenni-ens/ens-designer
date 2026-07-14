param(
    [switch]$NoBrowser,
    [int]$StartupTimeoutSeconds = 30
)

$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Python = Join-Path $Root ".venv313\Scripts\python.exe"
$FrontendIndex = Join-Path $Root "frontend\dist\index.html"
$Logs = Join-Path $Root "logs"
$StandardLog = Join-Path $Logs "app.log"
$ErrorLog = Join-Path $Logs "app-error.log"
$PidFile = Join-Path $Logs "ens-designer.pid"
$AppUrl = "http://127.0.0.1:8010"
$HealthUrl = "$AppUrl/healthz"

function Show-StartupError {
    param([string]$Message)

    Write-Error $Message -ErrorAction Continue
    try {
        $Shell = New-Object -ComObject WScript.Shell
        [void]$Shell.Popup($Message, 0, "EnS Designer", 16)
    }
    catch {
        # The console error above remains available when a popup cannot be shown.
    }
}

function Test-EnSHealth {
    try {
        $Response = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 1
        return $Response.status -eq "ok" -and $Response.app -eq "ens-designer"
    }
    catch {
        return $false
    }
}

if (-not (Test-Path -LiteralPath $Python)) {
    Show-StartupError "The EnS Designer Python environment is missing. Expected: $Python"
    exit 1
}

if (-not (Test-Path -LiteralPath $FrontendIndex)) {
    Show-StartupError (
        "The production frontend has not been built.`n`n" +
        "Run this command once from the EnS Designer folder:`n" +
        "cd frontend; npm.cmd run build"
    )
    exit 1
}

New-Item -ItemType Directory -Force -Path $Logs | Out-Null

if (Test-EnSHealth) {
    if (-not $NoBrowser) {
        Start-Process $AppUrl
    }
    exit 0
}

try {
    $Process = Start-Process `
        -FilePath $Python `
        -ArgumentList @(
            "-m", "uvicorn", "app.main:app",
            "--host", "127.0.0.1",
            "--port", "8010"
        ) `
        -WorkingDirectory (Join-Path $Root "backend") `
        -WindowStyle Hidden `
        -RedirectStandardOutput $StandardLog `
        -RedirectStandardError $ErrorLog `
        -PassThru
    Set-Content -LiteralPath $PidFile -Value $Process.Id -Encoding ascii
}
catch {
    Show-StartupError "EnS Designer could not start: $($_.Exception.Message)"
    exit 1
}

$Deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
while ((Get-Date) -lt $Deadline) {
    if (Test-EnSHealth) {
        if (-not $NoBrowser) {
            Start-Process $AppUrl
        }
        exit 0
    }

    if ($Process.HasExited) {
        break
    }

    Start-Sleep -Milliseconds 250
    $Process.Refresh()
}

if (-not $Process.HasExited) {
    Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
}
Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue

$Details = ""
if (Test-Path -LiteralPath $ErrorLog) {
    $Details = (Get-Content -LiteralPath $ErrorLog -Tail 12) -join [Environment]::NewLine
}
if (-not $Details) {
    $Details = "No additional error details were recorded."
}

Show-StartupError (
    "EnS Designer did not become ready within $StartupTimeoutSeconds seconds.`n`n" +
    $Details
)
exit 1
