$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Python = Join-Path $Root ".venv313\Scripts\python.exe"
$PidFile = Join-Path $Root "logs\ens-designer.pid"
$Stopped = @()

$Candidates = Get-CimInstance Win32_Process | Where-Object {
    $IsBackend = (
        $_.ExecutablePath -eq $Python -and
        $_.CommandLine -like "*-m uvicorn app.main:app*"
    )
    $IsDevelopmentFrontend = (
        $_.Name -eq "node.exe" -and
        $_.CommandLine -like "*$Root*frontend*" -and
        $_.CommandLine -like "*vite*"
    )
    $IsBackend -or $IsDevelopmentFrontend
}

foreach ($Candidate in $Candidates) {
    Stop-Process -Id $Candidate.ProcessId -Force -ErrorAction SilentlyContinue
    $Stopped += $Candidate.ProcessId
}

Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue

if ($Stopped.Count -gt 0) {
    Write-Output "Stopped EnS Designer process(es): $($Stopped -join ', ')"
}
else {
    Write-Output "EnS Designer is not running."
}
