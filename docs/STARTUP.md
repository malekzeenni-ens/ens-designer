# Application Startup Guide

Last updated: 2026-07-14

EnS Designer normally runs as one local Python/FastAPI process. FastAPI serves
both the compiled React application and the API on the same local address. Node
and Vite are needed to build or develop the frontend, but they do not run during
normal use.

Run commands from the repository root:

```powershell
C:\Users\malek\Dropbox\_Etch_n_Shine\AI-Custom-Apps\EnS Designer
```

## URLs

- Application: `http://127.0.0.1:8010`
- Health check: `http://127.0.0.1:8010/healthz`
- API documentation: `http://127.0.0.1:8010/docs`
- Development frontend only: `http://127.0.0.1:5174`

## First-time setup

Create the supported Python 3.13 environment and install backend dependencies:

```powershell
uv venv .venv313 --python cpython-3.13.12-windows-x86_64-none
uv pip install --python .venv313\Scripts\python.exe -r backend\requirements.txt
```

Install frontend dependencies and create the production build:

```powershell
cd frontend
npm.cmd install
npm.cmd run build
cd ..
```

Repeat `npm.cmd run build` after changing frontend source. The generated
`frontend/dist` directory is intentionally not committed to Git.

## Normal startup

Double-click `Start EnS Designer.vbs`, or run:

```powershell
.\ens_launch.ps1
```

The launcher:

1. verifies `.venv313` and `frontend/dist/index.html`;
2. reuses an existing healthy EnS Designer process when available;
3. otherwise starts one hidden FastAPI process on port `8010`;
4. waits for the application-specific health response;
5. opens the application only after startup succeeds.

Startup failures are shown in a Windows message and recorded in
`logs/app-error.log`. Normal server output is written to `logs/app.log`.

## Verify startup

```powershell
Invoke-RestMethod http://127.0.0.1:8010/healthz
Invoke-WebRequest http://127.0.0.1:8010/api/presets -UseBasicParsing
```

The health response must identify this application:

```text
status app
------ ---
ok     ens-designer
```

## Stop the application

```powershell
.\ens_stop.ps1
```

The stop script targets only this project's Uvicorn and Vite processes. It does
not broadly terminate unrelated Python or Node applications.

## Frontend development

Stop the normal application before starting development mode:

```powershell
.\ens_stop.ps1
.\ens_launch_dev.ps1
```

Development mode starts:

- FastAPI with reload on `http://127.0.0.1:8010`;
- Vite with hot reload on `http://127.0.0.1:5174`;
- the browser at the Vite address.

Vite proxies `/api` to FastAPI. After frontend work, run `npm.cmd run build`
again so normal startup serves the latest compiled interface.

## Troubleshooting

### Production frontend is missing or stale

```powershell
cd frontend
npm.cmd run build
cd ..
```

Refresh the browser after rebuilding. Restarting FastAPI is not required for
ordinary static-file changes, although a restart provides the cleanest smoke
test.

### Port 8010 is already in use

First try the project-specific stop command:

```powershell
.\ens_stop.ps1
```

Then inspect the owner of the port without terminating unrelated processes:

```powershell
Get-NetTCPConnection -LocalPort 8010 -ErrorAction SilentlyContinue |
  Select-Object State,LocalAddress,LocalPort,OwningProcess
```

If another application owns the port, stop that application or change the EnS
Designer port consistently in the launcher and Vite proxy.

### Backend import hangs

Use `.venv313`, not the older Python 3.14 `.venv`:

```powershell
.\.venv313\Scripts\python.exe -c "import fastapi; print('fastapi ok')"
$env:PYTHONPATH = "backend"
.\.venv313\Scripts\python.exe -c "import app.main; print('app ok')"
```

### Vite cache errors in development

Vite's cache is outside Dropbox at
`C:\Users\malek\AppData\Local\Temp\vite-cache\ens-designer`. If development
mode reports `EBUSY` or `504 Outdated Optimize Dep`, remove that cache and
restart `ens_launch_dev.ps1`.
