$root = 'C:\Users\malek\Dropbox\_Etch_n_Shine\AI-Custom-Apps\EnS Designer'
$python = "$root\.venv313\Scripts\python.exe"

New-Item -ItemType Directory -Force "$root\logs" | Out-Null

Start-Process powershell -WindowStyle Hidden -ArgumentList @(
    '-ExecutionPolicy', 'Bypass',
    '-Command',
    "Set-Location '$root\backend'; & '$python' -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001 *> '$root\logs\backend.log'"
)

Start-Process powershell -WindowStyle Hidden -ArgumentList @(
    '-ExecutionPolicy', 'Bypass',
    '-Command',
    "Set-Location '$root\frontend'; npm.cmd run dev *> '$root\logs\frontend.log'"
)

Start-Sleep -Seconds 6
Start-Process 'http://127.0.0.1:5174'
