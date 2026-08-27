#!/bin/bash
# Mac 一鍵安裝 / 更新：
#   curl -fsSL https://raw.githubusercontent.com/sehha555/prop-journal/main/install.sh | bash
set -e
DIR="$HOME/Desktop/prop-journal"

if ! command -v git >/dev/null; then
  echo "沒有 git，先跑：xcode-select --install，裝完再執行一次這行指令"; exit 1
fi
if ! python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)' 2>/dev/null; then
  if command -v brew >/dev/null; then
    echo "Python 太舊或沒有，用 Homebrew 裝..."; brew install python
  else
    echo "沒有 Python 3.11+，到 https://www.python.org/downloads/ 裝完再執行一次這行指令"; exit 1
  fi
fi

if [ -d "$DIR/.git" ]; then
  echo "已安裝，更新中..."; git -C "$DIR" pull --ff-only
else
  echo "下載中..."; git clone https://github.com/sehha555/prop-journal.git "$DIR"
fi
chmod +x "$DIR/start.command"
echo "完成。啟動中（之後直接雙擊桌面 prop-journal 裡的 start.command）"
open "$DIR/start.command"
