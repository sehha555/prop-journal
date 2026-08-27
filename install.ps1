# Windows 一鍵安裝 / 更新（PowerShell 貼上）：
#   irm https://raw.githubusercontent.com/sehha555/prop-journal/main/install.ps1 | iex
$Dir = "$HOME\Desktop\prop-journal"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "沒有 git，用 winget 裝..."; winget install --id Git.Git -e --source winget
  Write-Host "裝完請關掉 PowerShell 重開，再貼一次同一行指令"; exit 1
}
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Write-Host "沒有 Python，用 winget 裝..."; winget install --id Python.Python.3.12 -e --source winget
  Write-Host "裝完請關掉 PowerShell 重開，再貼一次同一行指令"; exit 1
}

if (Test-Path "$Dir\.git") { Write-Host "已安裝，更新中..."; git -C $Dir pull --ff-only }
else { Write-Host "下載中..."; git clone https://github.com/sehha555/prop-journal.git $Dir }
Write-Host "完成。啟動中（之後直接雙擊桌面 prop-journal 裡的 start.bat）"
Start-Process "$Dir\start.bat"
