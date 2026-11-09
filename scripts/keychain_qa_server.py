"""Isolated local QA server for Keychain browser validation (K5).

Serves the real font library and the compiled frontend, but writes Keychain
and Cake Topper history to a separate data root so browser exports never
touch the owner's history. Binds to 127.0.0.1 only.

Usage (from the repository root):
    .venv313\\Scripts\\python.exe scripts\\keychain_qa_server.py --port 8012 --data-root <temp folder>
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

import uvicorn  # noqa: E402

from app.history_store import HistoryStore  # noqa: E402
from app.keychain_history import KeychainHistoryStore  # noqa: E402
from app.main import create_app  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--port", type=int, default=8012)
    parser.add_argument("--data-root", type=Path, required=True,
                        help="Folder for isolated history files (backend/data/ is created inside it).")
    args = parser.parse_args()
    data_root = args.data_root.resolve()
    if data_root == ROOT or ROOT in data_root.parents and (data_root / "fonts").exists():
        parser.error("--data-root must be a separate folder, not the project root.")
    app = create_app()
    app.state.history_store = HistoryStore(data_root)
    app.state.keychain_history_store = KeychainHistoryStore(data_root)
    print(f"Keychain QA server: http://127.0.0.1:{args.port} (history in {data_root / 'backend' / 'data'})", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="info")


if __name__ == "__main__":
    main()
