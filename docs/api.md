# prop-journal API 契約

後端 FastAPI，prefix `/api`，全部 JSON。開發時前端 3000 → 後端 8000（Next rewrites）；
正式時 FastAPI 直接 serve `frontend/out`。

共用篩選 query（stats / trades / dashboard 都吃）：
`account_id`（int，可省 = 全部）、`date_from`、`date_to`（YYYY-MM-DD，紐約日期）、`symbol_root`（NQ/MNQ/ES/MES）

## accounts
- `GET /api/accounts` → `[Account]`
- `POST /api/accounts` body `{firm, name, kind: "eval"|"funded", starting_balance, note?, profit_target?}` → Account
- `PATCH /api/accounts/{id}` 任意欄位（含 `status: "active"|"passed"|"failed"|"closed"`）
- `DELETE /api/accounts/{id}`

Account = `{id, firm, name, kind, starting_balance, profit_target, status, created_at, note}`

## trades
- `GET /api/trades?<篩選>&missing_r=1` → `[Trade]`（`missing_r=1` 只回沒補停損的）
- `POST /api/trades` 手 key，body = Trade 去掉 id / 推導欄位
- `PATCH /api/trades/{id}` body `{planned_stop_pts?, setup?, note?}` → Trade（重算 R）
- `DELETE /api/trades/{id}`
- `POST /api/trades/import` multipart：`account_id`、`file` → `{added, skipped, importer: "topstepx"}`；認不出格式回 400 `{detail, known_importers}`

Trade = `{id, account_id, external_id, contract, symbol_root, direction: "long"|"short", size,
entry_time, exit_time (ISO UTC), entry_price, exit_price, pnl, commissions, fees,
planned_stop_pts, setup, note, risk_usd, r_multiple, session}`

session ∈ `"asia"|"london"|"ny_am"|"ny_pm"|"off"`

## expenses / certificates / setups
- `GET|POST /api/expenses`，`DELETE /api/expenses/{id}`
  Expense = `{id, account_id|null, kind: "eval"|"reset"|"activation"|"subscription"|"other", amount, date, note}`
- `GET|POST /api/certificates`，`DELETE /api/certificates/{id}`
  Certificate = `{id, account_id, kind: "eval_passed"|"payout", amount|null, date, note}`（v1 不做圖片）
- `GET|POST /api/setups`，`DELETE /api/setups/{id}`  Setup = `{id, name, description}`
- `GET /api/contracts` → `{"NQ": 20, "MNQ": 2, "ES": 50, "MES": 5}`

## dashboard
`GET /api/dashboard` →
```
{
  accounts: [{...Account, balance, pnl, win_rate, trade_count, best_day_pct, last_trade_at}],
  totals: {spent, monthly_recurring, paid_out, net},
  equity: [{date, cum_pnl}],            // 全帳戶、按日
  month: {expectancy_r, sqn, blown_r_count, missing_r_count},   // 本月（紐約月份）
  last_import_at
}
```

## stats
全部吃共用篩選。R 類欄位只算 r_multiple 非 NULL 的交易，回傳附 `r_coverage: {total, with_r}`。

`GET /api/stats/performance` →
```
{ r_coverage, total_pnl, trade_count, win_rate, profit_factor, avg_win, avg_loss,
  max_win, max_loss, max_drawdown, best_day_pct, equity: [{date, cum_pnl}] }
```

`GET /api/stats/sessions` →
```
{ r_coverage,
  by_session: [{key, label, trade_count, win_rate, pnl, avg_r}],
  by_weekday: [...同形], by_hour: [...同形, key=0..23], by_setup: [...同形] }
```

`GET /api/stats/consistency` →
```
{ r_coverage,
  expectancy_r, r_std, sqn, sqn_grade,          // grade: 文字
  daily_pnl_std, daily_pnl_mean,
  r_histogram: [{bucket: "<-2"|"-2"|"-1"|"0"|"+1"|"+2"|"+3"|"+4"|"+5>", count}],
  rolling_expectancy: [{trade_id, exit_time, value}],   // 窗 20
  blown_r: [Trade],                              // r_multiple < -1.5
  setup_r_std: [{setup, r_std, trade_count}],
  avg_trades_win_day, avg_trades_loss_day,
  revenge_size_ratio }                           // 連賠 2 後下一筆 size / 前 20 筆平均，無資料 null
```
