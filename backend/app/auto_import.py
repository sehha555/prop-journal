"""Downloads 自動匯入：找 ~/Downloads 裡 TopstepX 匯出的 trades_export*.csv，匯進日誌後
把檔案搬到「prop-journal 已匯入」子資料夾，避免重複處理；搬進去超過 KEEP_DAYS 天的檔會順手刪掉。由 launchd 監看 Downloads 觸發，
也可以手動跑：.venv/bin/python -m app.auto_import

CSV 沒有帳戶欄，一律匯到 DEFAULT_ACCOUNT。換帳戶（例如過關後拿到 funded）改這裡。
"""

import glob
import logging
import shutil
import subprocess
import time
from pathlib import Path

from .db import DB_PATH, init_db
from .routers.trades import run_import

DEFAULT_ACCOUNT = "50K combine"
DOWNLOADS = Path.home() / "Downloads"
DONE_DIR = DOWNLOADS / "prop-journal 已匯入"
LOG_PATH = DB_PATH.parent / "auto_import.log"
KEEP_DAYS = 2  # 已匯入的檔留幾天再刪


def notify(title: str, text: str) -> None:
    """macOS 右上角通知；失敗（例如非 Mac）就靜靜略過"""
    try:
        subprocess.run(["osascript", "-e", f'display notification "{text}" with title "{title}"'],
                       check=False, capture_output=True, timeout=5)
    except Exception:  # noqa: BLE001
        pass


def scan(downloads: Path = DOWNLOADS, done_dir: Path = DONE_DIR, account: str = DEFAULT_ACCOUNT) -> list[dict]:
    """處理所有符合的檔案，回每個檔的結果。成功才搬檔，失敗留在原地下次再試。"""
    results = []
    for path in sorted(glob.glob(str(downloads / "trades_export*.csv"))):
        path = Path(path)
        try:
            r = run_import(account, path.read_bytes())
        except ValueError as e:
            logging.error("%s：%s", path.name, e)
            results.append({"file": path.name, "error": str(e)})
            continue
        done_dir.mkdir(exist_ok=True)
        shutil.move(str(path), str(done_dir / path.name))
        logging.info("%s：新增 %d 筆、略過 %d 筆", path.name, r["added"], r["skipped"])
        results.append({"file": path.name, "added": r["added"], "skipped": r["skipped"]})
    return results


def purge(done_dir: Path = DONE_DIR, keep_days: int = KEEP_DAYS, now: float | None = None) -> list[str]:
    """刪掉已匯入資料夾裡搬進來超過 keep_days 的檔，回刪掉的檔名"""
    cutoff = (now or time.time()) - keep_days * 86400
    removed = []
    for path in sorted(done_dir.glob("trades_export*.csv")):
        if path.stat().st_mtime < cutoff:
            path.unlink()
            removed.append(path.name)
    if removed:
        logging.info("清掉 %d 個超過 %d 天的已匯入檔：%s", len(removed), keep_days, "、".join(removed))
    return removed


def main() -> None:
    logging.basicConfig(filename=LOG_PATH, level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    init_db()
    results = scan()
    purge()
    for r in results:
        if "error" in r:
            notify("prop-journal 匯入失敗", f"{r['file']}：{r['error']}")
        else:
            notify("prop-journal 匯入完成", f"{r['file']}：新增 {r['added']} 筆、略過 {r['skipped']} 筆")


if __name__ == "__main__":
    main()
