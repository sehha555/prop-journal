#!/bin/bash
# Mac 版啟動：解除下載時的隔離標記（不然 macOS 會擋沒簽名的程式），再啟動
cd "$(dirname "$0")" || exit 1
xattr -cr . 2>/dev/null
./prop-journal
