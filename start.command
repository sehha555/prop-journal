#!/bin/bash
# 雙擊啟動 prop-journal。第一次會自動建 Python 環境（需要 Python 3.11+）。
cd "$(dirname "$0")/backend" || exit 1

if [ ! -x .venv/bin/python ]; then
  echo "第一次啟動，建立環境中..."
  python3 -m venv .venv || { echo "找不到 python3，請先安裝 Python"; read -r; exit 1; }
  .venv/bin/pip install -q --only-binary=:all: -r requirements.txt || { echo "安裝失敗"; read -r; exit 1; }
fi

if lsof -iTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port 8000 已有程式在用，直接開瀏覽器"
else
  .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
  sleep 1.5
fi
open "http://localhost:8000"
wait
