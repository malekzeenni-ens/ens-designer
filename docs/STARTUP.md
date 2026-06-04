# Application Startup Guide

This guide explains how to start the EnS Designer application locally, including
both the backend API and frontend Vite server.

Run all commands from the repository root:

```powershell
C:\Users\malek\Dropbox\_Etch_n_Shine\AI-Custom-Apps\EnS Designer
```

## URLs

- Frontend application: `http://127.0.0.1:5173`
- Backend API docs: `http://127.0.0.1:8000/docs`

## First-Time Setup

Install Python dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

If the backend reports that form data requires `python-multipart`, install the
compatible package into the same virtual environment:

```powershell
.\.venv\Scripts\python.exe -m pip install python-multipart==0.0.20
```

Install frontend dependencies:

```powershell
cd frontend
npm.cmd install
cd ..
```

## Start Both Servers

Both servers should be started as hidden background processes. Run this block
from the repository root:

```powershell
$root = "C:\Users\malek\Dropbox\_Etch_n_Shine\AI-Custom-Apps\EnS Designer"
New-Item -ItemType Directory -Force "$root\logs" | Out-Null

# Backend
Start-Process powershell -WindowStyle Hidden -ArgumentList "-Command", "cd '$root\backend'; ..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 *> '$root\logs\backend.log'"

# Frontend
Start-Process powershell -WindowStyle Hidden -ArgumentList "-Command", "cd '$root\frontend'; npm.cmd run dev *> '$root\logs\frontend.log'"
```

## Verify Startup

Check the backend log:

```powershell
Get-Content logs\backend.log -Tail 20
```

Expected backend output:

```text
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

Check the frontend log:

```powershell
Get-Content logs\frontend.log -Tail 20
```

Expected frontend output:

```text
VITE v8.x.x ready in Xms
Local: http://127.0.0.1:5173/
```

Check the listening ports:

```powershell
Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

Open the app in the browser:

```text
http://127.0.0.1:5173
```

## Stop the Servers

Stop the backend and frontend processes:

```powershell
Stop-Process -Name "python","node" -Force -ErrorAction SilentlyContinue
```

If you need to stop only the backend:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*uvicorn app.main:app*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
```

If you need to stop only the frontend:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*vite --host 127.0.0.1*" -or $_.CommandLine -like "*npm.cmd run dev*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
```

## Troubleshooting

### Backend Fails With `python-multipart`

Install the compatible package and restart the backend:

```powershell
.\.venv\Scripts\python.exe -m pip install python-multipart==0.0.20
```

Confirm the import works:

```powershell
.\.venv\Scripts\python.exe -c "from multipart.multipart import parse_options_header; print('ok')"
```

### Frontend Shows API Proxy Errors

If the frontend log shows `connect ECONNREFUSED 127.0.0.1:8000`, the frontend
is running but the backend is not. Start or restart the backend, then refresh
the browser.

### Vite Cache Errors

If Vite shows `EBUSY` or `504 Outdated Optimize Dep`, delete the Vite cache and
restart the frontend:

```powershell
Remove-Item -Recurse -Force "C:\Users\malek\AppData\Local\Temp\vite-cache\ens-designer" -ErrorAction SilentlyContinue
```

### Port Already In Use

Find the process using a port:

```powershell
Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

Then stop the specific process:

```powershell
Stop-Process -Id <PROCESS_ID> -Force
```
