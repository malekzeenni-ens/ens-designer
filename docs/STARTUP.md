# Application Startup Guide

Last updated: 2026-06-14 21:59:49 +01:00

This guide explains how to start the EnS Designer application locally, including
both the backend API and frontend Vite server.

Run all commands from the repository root:

```powershell
C:\Users\malek\Dropbox\_Etch_n_Shine\AI-Custom-Apps\EnS Designer
```

## URLs

- Frontend application: `http://127.0.0.1:5174`
- Backend API docs: `http://127.0.0.1:8001/docs`
- Backend health checks:
  - `http://127.0.0.1:8001/api/fonts`
  - `http://127.0.0.1:8001/api/fonts/manual`

## First-Time Setup

Install Python dependencies with the Python 3.13 environment:

```powershell
uv venv .venv313 --python cpython-3.13.12-windows-x86_64-none
uv pip install --python .venv313\Scripts\python.exe -r backend\requirements.txt
```

Do not use the older `.venv` for backend startup. It was created with Python
3.14 and can hang while importing FastAPI in this project.

Install frontend dependencies:

```powershell
cd frontend
npm.cmd install
cd ..
```

## Start Both Servers

The preferred launcher is:

```powershell
.\ens_launch.ps1
```

The launcher starts:

- Backend: `.venv313\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001`
- Frontend: `npm.cmd run dev` on Vite port `5174`
- Browser: `http://127.0.0.1:5174`

Manual background start commands:

```powershell
$root = "C:\Users\malek\Dropbox\_Etch_n_Shine\AI-Custom-Apps\EnS Designer"
New-Item -ItemType Directory -Force "$root\logs" | Out-Null

# Backend
Start-Process powershell -WindowStyle Hidden -ArgumentList "-Command", "cd '$root\backend'; ..\.venv313\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001 *> '$root\logs\backend.log'"

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
INFO:     Uvicorn running on http://127.0.0.1:8001
INFO:     Application startup complete.
```

Check the frontend log:

```powershell
Get-Content logs\frontend.log -Tail 20
```

Expected frontend output:

```text
VITE v7.x.x ready in Xms
Local: http://127.0.0.1:5174/
```

Check the listening ports:

```powershell
Get-NetTCPConnection -LocalPort 8001,5174 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

Check the frontend proxy reaches the backend:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:5174/api/fonts/manual -UseBasicParsing
```

Open the app in the browser:

```text
http://127.0.0.1:5174
```

## Stop the Servers

Stop only EnS backend processes:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*EnS Designer*.venv313*uvicorn*app.main:app*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
```

Stop only EnS frontend processes:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*EnS Designer*frontend*" -and ($_.CommandLine -like "*vite*" -or $_.CommandLine -like "*npm.cmd run dev*") } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
```

Avoid broad `Stop-Process -Name python,node` unless you intentionally want to
stop unrelated local projects too.

## Troubleshooting

### Backend Hangs During Import

Use `.venv313`, not `.venv`.

```powershell
.\.venv313\Scripts\python.exe -c "import fastapi; print('fastapi ok')"
$env:PYTHONPATH = "backend"
.\.venv313\Scripts\python.exe -c "import app.main; print('app ok')"
```

### Backend Fails With `python-multipart`

`python-multipart==0.0.20` is listed in `backend\requirements.txt`. Reinstall
requirements into `.venv313`:

```powershell
uv pip install --python .venv313\Scripts\python.exe -r backend\requirements.txt
```

### Frontend Shows API Proxy Errors

If the frontend log shows `connect ECONNREFUSED`, confirm the proxy target and
backend port:

- `frontend/vite.config.ts` should proxy `/api` to `http://127.0.0.1:8001`.
- Backend should listen on `127.0.0.1:8001`.

### Port Already In Use Or Stuck In `Bound`

Check all TCP states, not only listeners:

```powershell
Get-NetTCPConnection -LocalPort 8000,8001,5173,5174 -ErrorAction SilentlyContinue |
  Select-Object State,LocalAddress,LocalPort,OwningProcess
```

This project moved away from `8000` and `5173` because another local process
held those ports during development.

### Vite Hangs Before Ready

This project currently uses `vite@7.3.5` and `@vitejs/plugin-react@5.2.0`.
Vite 8 hung during startup/import on the current Windows/Node setup.

If Vite shows cache or dependency optimisation problems, delete the project
cache and restart the frontend:

```powershell
Remove-Item -Recurse -Force "C:\Users\malek\AppData\Local\Temp\vite-cache\ens-designer" -ErrorAction SilentlyContinue
```

### Font Catalog Is Slow

The catalog intentionally derives dropdown metadata from font file paths during
`/api/fonts` scans. This avoids opening more than 1,300 font binaries on
startup. Font binaries are still opened when needed for generation, glyph
browsing, and upload validation.
