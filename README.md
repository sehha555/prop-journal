# prop-journal

期貨 prop firm 交易日誌：跨帳戶績效、payout 減費用的真實淨利、以 R 為單位的 consistency 統計。

## 使用

1. 下載或 `git clone` 這個 repo
2. 雙擊 `start.command`（macOS；第一次會自動建環境，需要 Python 3.11+）
3. 瀏覽器開 http://localhost:8000

資料存在 `backend/data/journal.db`，只在你自己電腦上。

## 每日流程

1. TopstepX → Trades 分頁 → EXPORT 匯出 CSV
2. 交易頁選帳戶、拖入 CSV
3. 每筆補「計畫停損（點數）」和 setup 標籤，沒補的只算 $ 不算 R

## 換 prop firm

在 `backend/app/importers/` 加一個檔案實作 `Importer`，註冊進 `KNOWN_IMPORTERS`。
合約點值在 `backend/app/contracts.py`，時段切法在 `backend/app/sessions.py`。

## 開發

```
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest
.venv/bin/python -m uvicorn app.main:app --reload      # 8000
cd ../frontend && npm install && npm run dev            # 3000，/api 轉到 8000
npm run build                                           # 產 frontend/out，FastAPI 直接 serve
```

設計文件：`docs/superpowers/specs/`，API 契約：`docs/api.md`。
