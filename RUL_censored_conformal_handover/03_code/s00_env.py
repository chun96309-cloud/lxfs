# -*- coding: utf-8 -*-
"""
s00_env.py   环境自检。只 print, 不建模, 不改数据。对应汇报格式第 1 条 (环境与字体)。

检查:
  1. Python 与 numpy / pandas / scikit-learn 版本
  2. Rscript 是否在 PATH 上, R 版本
  3. 出图要用的字体文件是否存在 (宋体 simsun.ttc, Times New Roman times.ttf)
  4. 数据目录里 FD001 三个文件是否齐全

运行:
    python s00_env.py
    python s00_env.py E:\\cmapss       (命令行给数据目录, 覆盖下面的 DATA_DIR)
"""

import os
import sys
import platform
import shutil
import subprocess

# ============ 按实际路径修改 ============
DATA_DIR = r"E:\cmapss"
FONT_FILES = {
    "宋体 SimSun": r"C:\Windows\Fonts\simsun.ttc",
    "Times New Roman": r"C:\Windows\Fonts\times.ttf",
    "Times New Roman Bold": r"C:\Windows\Fonts\timesbd.ttf",
}
# =======================================
if len(sys.argv) > 1:
    DATA_DIR = sys.argv[1]


def main():
    ok = True
    print("[1] Python 与依赖")
    print("    Python   %s   (%s)" % (platform.python_version(), sys.executable))
    print("    系统     %s %s" % (platform.system(), platform.release()))
    for mod in ["numpy", "pandas", "sklearn"]:
        try:
            m = __import__(mod)
            print("    %-9s %s" % (mod, m.__version__))
        except ImportError:
            print("    %-9s 未安装   -> pip install -r requirements.txt" % mod)
            ok = False
    print()

    print("[2] R")
    rscript = shutil.which("Rscript")
    if rscript is None:
        print("    Rscript 不在 PATH 上。s04 需要它。把 R 的 bin 目录 (例如 C:\\Program Files\\R\\R-4.5.0\\bin) 加进 PATH,")
        print("    或者在 run_all.bat 里把 Rscript 换成完整路径。")
        ok = False
    else:
        try:
            out = subprocess.run([rscript, "--version"], capture_output=True, text=True, timeout=60)
            ver = (out.stdout or out.stderr).strip().splitlines()
            print("    %s" % rscript)
            print("    %s" % (ver[0] if ver else "版本未知"))
        except Exception as e:
            print("    Rscript 存在但无法运行: %s" % e)
            ok = False
    print()

    print("[3] 字体文件 (s04 出图用; 缺宋体或 Times New Roman 则图不能用于论文)")
    for name, path in FONT_FILES.items():
        exists = os.path.isfile(path)
        print("    %-22s %s   %s" % (name, "有" if exists else "缺", path))
        if not exists and name != "Times New Roman Bold":
            ok = False
    print()

    print("[4] 数据目录 %s" % DATA_DIR)
    if not os.path.isdir(DATA_DIR):
        print("    目录不存在。改脚本顶部的 DATA_DIR 或在命令行给出目录。")
        ok = False
    else:
        for f in ["train_FD001.txt", "test_FD001.txt", "RUL_FD001.txt"]:
            p = os.path.join(DATA_DIR, f)
            if os.path.isfile(p):
                print("    %-16s %10d bytes" % (f, os.path.getsize(p)))
            else:
                print("    %-16s 缺" % f)
                ok = False
        others = sorted(x for x in os.listdir(DATA_DIR) if x.endswith(".txt") and "FD001" not in x)
        if others:
            print("    其余文件: %s" % ", ".join(others))
    print()
    print("结论: %s" % ("环境齐全, 可以跑 s01" if ok else "有缺项, 先补齐再跑 s01"))


if __name__ == "__main__":
    main()
