"""打包成 exe 的進入點：起 server、開瀏覽器、出錯時視窗停住讓人看得到訊息。"""

import threading
import traceback
import webbrowser

import uvicorn


def open_browser():
    webbrowser.open("http://localhost:8000")


if __name__ == "__main__":
    try:
        from app.main import app  # 先 import，讓 PyInstaller 收得到整個 app 套件

        threading.Timer(1.5, open_browser).start()
        print("prop-journal 啟動中，瀏覽器會自動開 http://localhost:8000；關掉這個視窗就會停止")
        uvicorn.run(app, host="127.0.0.1", port=8000)
    except Exception:
        traceback.print_exc()
        input("啟動失敗，把上面的字截圖回報。按 Enter 關閉")
