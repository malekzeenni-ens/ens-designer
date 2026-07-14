$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Python = Join-Path $Root ".venv313\Scripts\python.exe"

New-Item -ItemType Directory -Force (Join-Path $Root "logs") | Out-Null

Start-Process powershell -WindowStyle Hidden -ArgumentList @(
    "-ExecutionPolicy", "Bypass",
    "-Command",
    "Set-Location '$Root\backend'; & '$Python' -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8010 *> '$Root\logs\backend.log'"
)

Start-Process powershell -WindowStyle Hidden -ArgumentList @(
    "-ExecutionPolicy", "Bypass",
    "-Command",
    "Set-Location '$Root\frontend'; npm.cmd run dev *> '$Root\logs\frontend.log'"
)

Start-Sleep -Seconds 6
Start-Process "http://127.0.0.1:5174"
