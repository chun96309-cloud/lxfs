# -*- coding: utf-8 -*-
"""
s01_inspect.py   C-MAPSS 结构探查。只 print, 不建模, 不改数据。

先跑这个, 把全部输出贴回来。确认格式无误后再跑 s02 / s03。

运行:
    python s01_inspect.py
    python s01_inspect.py E:\\cmapss        (命令行给数据目录, 覆盖下面的 DATA_DIR)
只改下面的 DATA_DIR。目录里应有 train_FD001.txt, test_FD001.txt, RUL_FD001.txt 等。
"""

import os
import sys
import numpy as np
import pandas as pd

# ============ 按实际路径修改 ============
DATA_DIR = r"E:\cmapss"
SUBSETS = ["FD001", "FD002", "FD003", "FD004"]
LOW_STD = 1e-2            # 近零方差判据: 列标准差低于此值。FD001 的传感器 6 只在 21.60/21.61 两值间跳, std 约 1e-3
# =======================================
if len(sys.argv) > 1:
    DATA_DIR = sys.argv[1]

pd.set_option("display.width", 220)
pd.set_option("display.max_columns", 40)


def read_raw(path):
    return pd.read_csv(path, sep=r"\s+", header=None)


def inspect_trajectory_file(path, kind):
    df = read_raw(path)
    print("=" * 78)
    print("%s   形状: %s" % (path, (df.shape,)))
    print("前 5 行 (列号从 0 计; 0=unit, 1=cycle, 2-4=op1-3, 5-25=s1-s21):")
    print(df.head(5).to_string())
    print("NaN 总数:", int(df.isna().sum().sum()))
    if df.shape[1] != 26:
        print("注意: 列数不是 26, 请贴回此输出")

    per = df.groupby(0)[1].max()
    units = per.index.values
    print("发动机台数: %d   编号范围: %d .. %d   是否连续: %s"
          % (len(units), units.min(), units.max(), bool((np.diff(np.sort(units)) == 1).all())))
    print("每台观测循环数: min %d, 25%% %.0f, median %.0f, mean %.1f, 75%% %.0f, max %d"
          % (per.min(), per.quantile(0.25), per.median(), per.mean(), per.quantile(0.75), per.max()))
    print("总行数是否等于各台循环数之和: %s" % (per.sum() == len(df)))

    std = df.iloc[:, 2:26].std()
    print("列 2-25 的标准差 (列号 -> std; 传感器编号 = 列号 - 4):")
    print("  " + "  ".join(["%d:%.4g" % (c, std[c]) for c in std.index]))
    low = [int(c) for c in std.index if std[c] < LOW_STD]
    print("近零方差列 (std < %g): %s   对应传感器: %s   (列 2-4 是工况设置, 不算传感器)"
          % (LOW_STD, low, [c - 4 for c in low if c >= 5]))
    # 工况设置带有小噪声 (op1 约 +-0.009, op2 约 +-0.0005), 按各自的标称间隔取整后再数组合:
    # op1 取整到 1, op2 取整到 0.05, op3 取整到 10。加 0.0 是为了把 -0.0 归成 0.0。
    ops = pd.DataFrame({
        "op1": (df.iloc[:, 2] / 1.0).round() * 1.0 + 0.0,
        "op2": (df.iloc[:, 3] / 0.05).round() * 0.05 + 0.0,
        "op3": (df.iloc[:, 4] / 10.0).round() * 10.0 + 0.0,
    }).round(2).drop_duplicates().sort_values(["op1", "op2", "op3"])
    print("工况设置 (op1, op2, op3) 按标称值取整后不同组合数: %d   (FD001/FD003 应为 1, FD002/FD004 应为 6)" % len(ops))
    if len(ops) <= 8:
        print(ops.to_string(index=False, header=False))


def inspect_rul_file(path):
    df = read_raw(path)
    v = df.iloc[:, 0].astype(float)
    print("=" * 78)
    print("%s   形状: %s" % (path, (df.shape,)))
    print("前 5 行:", v.head(5).tolist())
    print("RUL: n %d, min %g, median %g, mean %.2f, max %g" % (len(v), v.min(), v.median(), v.mean(), v.max()))


def main():
    if not os.path.isdir(DATA_DIR):
        print("目录不存在: %s   请修改 DATA_DIR" % DATA_DIR)
        return
    print("目录内容:")
    for f in sorted(os.listdir(DATA_DIR)):
        p = os.path.join(DATA_DIR, f)
        if os.path.isfile(p):
            print("  %-28s %10d bytes" % (f, os.path.getsize(p)))
    print()

    for fd in SUBSETS:
        for kind in ["train", "test"]:
            p = os.path.join(DATA_DIR, "%s_%s.txt" % (kind, fd))
            if os.path.isfile(p):
                inspect_trajectory_file(p, kind)
            else:
                print("缺文件:", p)
        p = os.path.join(DATA_DIR, "RUL_%s.txt" % fd)
        if os.path.isfile(p):
            inspect_rul_file(p)
        else:
            print("缺文件:", p)
        print()


if __name__ == "__main__":
    main()
