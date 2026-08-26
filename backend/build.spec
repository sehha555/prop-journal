# PyInstaller 設定：python -m PyInstaller build.spec（在 backend/ 執行）
from PyInstaller.utils.hooks import collect_submodules

a = Analysis(
    ["desktop.py"],
    pathex=["."],
    datas=[("../frontend/out", "frontend_out")],
    hiddenimports=collect_submodules("app") + collect_submodules("uvicorn"),
)
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, name="prop-journal", console=True, exclude_binaries=True)
coll = COLLECT(exe, a.binaries, a.datas, name="prop-journal")
