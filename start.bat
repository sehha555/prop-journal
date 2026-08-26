@echo off
chcp 65001 >nul
REM 雙擊啟動 prop-journal（Windows）。第一次會自動建 Python 環境，需先安裝 Python 3.11+
cd /d "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
  echo 第一次啟動，建立環境中...
  python -m venv .venv || (echo 找不到 Python，請先到 Microsoft Store 安裝 Python 3.12 後再雙擊 & pause & exit /b 1)
  .venv\Scripts\pip install -q --only-binary=:all: -r requirements.txt || (echo 安裝失敗 & pause & exit /b 1)
)

start "" http://localhost:8000
.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
