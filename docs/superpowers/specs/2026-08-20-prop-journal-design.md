# prop-journal 設計文件

日期：2026-08-20
狀態：草稿待使用者審閱

## 目標

給期貨 prop firm 交易員（本人 + 朋友）用的交易日誌。三個核心：
跨帳戶績效、prop firm 真實淨利（payout 減所有費用）、以 R 為單位的
consistency 統計。靈感來源 myfundedbook.com，取其功能 1 / 4 / 5，
捨棄每週回顧、紀律風控頁。

## 不做的事（YAGNI）

- 多人登入、雲端部署。每個人 clone 各自本機跑，資料在各自電腦
- 即時 API 同步（ProjectX API 要付費且換 firm 就斷）
- 每日風控警示（MLL 距離、連敗提醒）
- Setup 規則 checklist 評分

## 使用者與情境

- 商品：NQ / ES / MNQ / MES（CME 期貨）
- 現役 TopstepX（$50K Combine），之後會換其他 firm → 資料模型以
  「帳戶」為單位、firm 只是帳戶屬性
- 同時有 eval 帳戶與之後的 funded 帳戶
- 每日收盤：匯出 TopstepX Trades CSV → 拖進系統 → 花 2-3 分鐘補
  每筆停損與 setup 標籤

## 架構

前端 Next.js（App Router + Zustand + Tailwind），後端 FastAPI + SQLite。

**單 process 啟動**：Next.js 走 `output: 'export'` 產靜態檔，FastAPI 用
`StaticFiles` 一起 serve。朋友只要 `./start.command` 雙擊就開
`http://localhost:8000`，不用裝 Node（build 產物 commit 進 repo 或
release 附檔）。開發時前後端分開跑（3000 / 8000）。

```
prop-journal/
  backend/
    app/
      main.py          FastAPI 入口、掛靜態檔
      db.py            SQLite 連線、migration
      models.py        pydantic schema
      routers/
        accounts.py
        trades.py      CSV 匯入 + journal 補欄
        expenses.py
        certificates.py
        stats.py       所有統計計算的 API
      importers/
        base.py        Importer 介面：parse(file) -> list[TradeIn]
        topstepx.py    TopstepX CSV
      stats/
        performance.py 勝率 / PF / 回撤 / 權益曲線
        sessions.py    session / 星期 / 小時切片
        consistency.py R 分布 / 期望值 / SQN / 爆 R / 報復性加碼
    tests/
    data/journal.db    (gitignore)
  frontend/
    app/
      page.tsx         Dashboard
      trades/          匯入 + 表格 + journal 側欄
      stats/           三個 tab：績效 / 時段 / consistency
      wall/            證書牆
      expenses/
    store/             Zustand
  start.command
  docs/superpowers/specs/
```

### 為什麼不是 portfolio-tracker 那套 Jinja

要給朋友用且之後可能走 /design 出 mockup，前端獨立比較好長；
靜態匯出讓它仍然是單 process，安裝門檻不比 Jinja 高。

## 資料模型（SQLite）

```
accounts
  id, firm (text), name (text), kind (eval|funded),
  starting_balance (real), status (active|passed|failed|closed),
  created_at, note

trades
  id, account_id -> accounts,
  external_id (text, firm 給的 ID，匯入去重用),
  contract (text, 例 MNQU26), symbol_root (text, 例 MNQ，由 contract 推導),
  direction (long|short), size (int),
  entry_time, exit_time (UTC ISO), entry_price, exit_price,
  pnl (real, 已含手續費的淨額), commissions, fees,
  -- journal 補欄，可為 NULL
  planned_stop_pts (real), setup (text), note (text),
  -- 推導欄位，匯入 / 更新時算好存起來
  risk_usd (real)  = planned_stop_pts * point_value(symbol_root) * size
  r_multiple (real) = pnl / risk_usd
  session (text)   = 由 entry_time 換 America/New_York 後分桶

expenses
  id, account_id (可 NULL，代表不綁帳戶的通用費), kind
  (eval|reset|activation|subscription|other), amount, date, note

certificates
  id, account_id, kind (eval_passed|payout), amount (payout 才有),
  date, image_path (可 NULL), note

setups
  id, name, description   (下拉用的標籤表，使用者自己維護)
```

合約點值寫死在 `backend/app/contracts.py`：
NQ 20 / MNQ 2 / ES 50 / MES 5。其他商品之後加一行。

Session 分桶（紐約時間）：Asia 18:00-03:00、London 03:00-09:30、
NY AM 09:30-12:00、NY PM 12:00-16:00、其他歸 Off-hours。
邊界由 `sessions.py` 一個表定義，使用者要改也只改那裡。

## CSV 匯入

- `Importer` 介面：`detect(header) -> bool`、`parse(file) -> list[TradeIn]`
- TopstepX 欄位：ID, Contract, Size, Entry Time, Exit Time, Duration,
  Entry Price, Exit Price, P&L, Commissions, Fees, Direction
- 去重：(account_id, external_id) 唯一，重複匯入只補新筆
- 匯入後回傳「新增 N 筆、略過 M 筆」並跳到 Trades 頁，未補 journal
  的列標示出來
- 換 firm：新增一個 importer 檔案，不動其他地方
- 手 key：同一張表單，external_id 留空改用 uuid

## 統計定義（stats/）

所有統計皆可按帳戶 / 日期區間 / 商品篩選。R 相關統計**只算
`r_multiple` 非 NULL 的交易**，頁面明示「N 筆中 M 筆有 R」。

### performance.py（A 基本績效）
- 總 P&L、筆數、勝率、Profit Factor（毛利 / 毛損）
- 平均賺 / 平均賠、最大單筆賺賠
- 最大回撤（以累積 P&L 計）
- 權益曲線（每日累積）
- 出金規則數字：單日最佳獲利佔總獲利 %（僅顯示，不做警示）

### sessions.py（B 時段）
- 按 session / 星期幾 / 進場小時，各給：筆數、勝率、總 P&L、平均 R
- 按 setup 同樣切片（D setup 標記與 B 共用同一套切片器）

### consistency.py（A 統計 + B 行為）
統計面：
- R 分布直方圖（-3R 以下到 +5R 以上分桶）
- 期望值 = 平均 R；滾動 20 筆期望值曲線
- 每日 P&L 標準差
- SQN = 平均 R / R 標準差 × √筆數，附 Van Tharp 分級文字
行為面：
- 爆 R：r_multiple < -1.5 的交易清單（實際虧損超過計畫停損 1.5 倍）
- 同 setup 的 R 標準差（越小代表執行越一致）
- 賺錢日 vs 賠錢日的平均交易筆數
- 報復性加碼：連續虧損 2 筆後的下一筆 size 相對前 20 筆平均 size 的倍數

## 頁面

1. **Dashboard**：每個帳戶一列（餘額 = 起始 + 累積 pnl、勝率、筆數、
   狀態）；右側四個數字：總花費、每月固定費、已出金、淨利
2. **Trades**：上方匯入區（選帳戶 + 拖 CSV）、表格、點一列開右側
   journal 欄補停損 / setup / 備註，儲存即重算 R
3. **Stats**：三個 tab（績效 / 時段 / consistency），共用篩選列
4. **Wall**：證書卡片牆，上方兩個總數（funded 資金、累計出金）
5. **Expenses**：表格 + 新增表單

視覺方向由 /design 另出 mockup，本文件不定色盤與排版。

## 錯誤處理

- CSV 欄位對不上任何 importer → 回 400 附「認得的 importer 清單」
- 合約代碼推不出 symbol_root → 該筆仍匯入，r_multiple 留 NULL，
  表格標「未知合約」
- 停損填 0 或負數 → 表單擋掉

## 測試

- importers：用一份 TopstepX 樣本 CSV 驗 parse 與去重
- stats：手算過的小資料集（10 筆）驗 PF、SQN、回撤、session 分桶
- API：每個 router 一組 happy path
- 前端先不寫測試，靠 /design mockup 對照人工驗

## 完成定義

1. 雙擊 start.command 開得起來
2. 匯入 TopstepX CSV → 補 5 筆停損 → Stats 三個 tab 有數字且與手算一致
3. 新增一筆 eval 費 + 一張 payout 證書 → Dashboard 淨利對
