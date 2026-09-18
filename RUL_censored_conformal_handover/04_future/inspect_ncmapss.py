# -*- coding: utf-8 -*-
"""
N-CMAPSS (C-MAPSS 2) 数据结构探查脚本

用途:
    下载 N-CMAPSS 的 .h5 子集后, 先跑本脚本把文件结构完整打印出来,
    不做任何建模、不做任何绘图、不修改任何数据。

运行:
    python inspect_ncmapss.py                     扫描 DATA_DIR 下所有 .h5
    python inspect_ncmapss.py E:\\ncmapss\\DS01-005.h5   只看指定文件

依赖:
    pip install h5py numpy
"""

import os
import sys
import numpy as np

try:
    import h5py
except ImportError:
    print("缺少 h5py, 请先执行: pip install h5py")
    sys.exit(1)


# ============ 按实际路径修改 ============
DATA_DIR = r"E:\ncmapss"
# =======================================

PREVIEW_ROWS = 5          # 每个数据块预览的行数
BIG_LOAD_LIMIT = 5e7      # 元素数超过此值的数组不整体载入, 只切片预览


def human_size(nbytes):
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if nbytes < 1024.0:
            return "%.2f %s" % (nbytes, unit)
        nbytes /= 1024.0
    return "%.2f PB" % nbytes


def decode_var(ds):
    """把 *_var 数据集解码成变量名列表"""
    arr = np.array(ds)
    try:
        arr = np.array(arr, dtype="U40")
    except (TypeError, ValueError):
        arr = np.array([str(x) for x in np.ravel(arr)], dtype="U40")
    names = [str(x).strip() for x in np.ravel(arr)]
    return names


def match_columns(shape, var_names):
    """判断变量名对应的是第几个维度, 返回 ('row'|'col'|None, n)"""
    if var_names is None or len(shape) < 2:
        return None, None
    n = len(var_names)
    if shape[1] == n:
        return "col", n
    if shape[0] == n:
        return "row", n
    return None, n


def preview_block(hdf, key, var_names):
    ds = hdf[key]
    shape = ds.shape
    dtype = ds.dtype
    n_elem = int(np.prod(shape)) if len(shape) > 0 else 0

    print("-" * 78)
    print("数据集: %s" % key)
    print("  形状 : %s" % (shape,))
    print("  类型 : %s" % dtype)
    print("  元素数: %d   估计内存: %s" % (n_elem, human_size(n_elem * dtype.itemsize)))

    orient, n_var = match_columns(shape, var_names)
    if var_names is not None:
        print("  变量名(%d 个): %s" % (len(var_names), var_names))
        if orient == "col":
            print("  排列 : 行=样本, 列=变量")
        elif orient == "row":
            print("  排列 : 行=变量, 列=样本 (需转置)")
        else:
            print("  排列 : 变量名数量与两个维度都对不上, 需人工确认")

    if len(shape) == 0:
        print("  标量值: %s" % np.array(ds))
        return

    try:
        if orient == "row":
            block = ds[:, :PREVIEW_ROWS]
            block = np.asarray(block).T
        else:
            block = np.asarray(ds[:PREVIEW_ROWS])
    except Exception as e:
        print("  预览失败: %s" % e)
        return

    print("  前 %d 行:" % PREVIEW_ROWS)
    if var_names is not None and orient in ("col", "row"):
        header = "    " + "  ".join(["%14s" % v[:14] for v in var_names])
        print(header)
        for r in block:
            r = np.ravel(r)
            print("    " + "  ".join(["%14.6g" % float(x) for x in r]))
    else:
        for r in block:
            print("    %s" % np.ravel(r))


def summarize_aux(hdf, split):
    """对 A_dev / A_test 做发动机台数、循环数、飞行等级、健康状态统计"""
    akey = "A_%s" % split
    ykey = "Y_%s" % split
    if akey not in hdf:
        return

    a_var = decode_var(hdf["A_var"]) if "A_var" in hdf else None
    A = np.array(hdf[akey])
    if A.ndim == 2 and a_var is not None and A.shape[0] == len(a_var) and A.shape[1] != len(a_var):
        A = A.T

    print("=" * 78)
    print("辅助信息统计: %s   形状 %s" % (akey, (A.shape,)))
    if a_var is None:
        print("  无 A_var, 跳过按列统计")
        return
    print("  列: %s" % a_var)

    col = {name: i for i, name in enumerate(a_var)}

    if "unit" in col:
        units = A[:, col["unit"]].astype(int)
        uniq = np.unique(units)
        print("  发动机台数: %d   编号: %s" % (len(uniq), uniq.tolist()))

        if "cycle" in col:
            cyc = A[:, col["cycle"]].astype(int)
            print("  每台发动机的循环数与样本数:")
            print("    %8s %10s %12s" % ("unit", "n_cycle", "n_sample"))
            for u in uniq:
                m = units == u
                print("    %8d %10d %12d" % (u, cyc[m].max(), m.sum()))

        if "Fc" in col:
            fc = A[:, col["Fc"]].astype(int)
            print("  飞行等级分布(按样本):")
            for v in np.unique(fc):
                print("    Fc=%d : %d" % (v, (fc == v).sum()))
            print("  每台发动机的飞行等级:")
            for u in uniq:
                m = units == u
                print("    unit %3d -> Fc %s" % (u, np.unique(fc[m]).tolist()))

        if "hs" in col:
            hs = A[:, col["hs"]].astype(int)
            print("  健康状态分布(按样本): ", end="")
            print(", ".join(["hs=%d:%d" % (v, (hs == v).sum()) for v in np.unique(hs)]))

    if ykey in hdf:
        Y = np.ravel(np.array(hdf[ykey]))
        print("  RUL 标签 %s : min=%g  max=%g  mean=%.3f" % ((Y.shape,), Y.min(), Y.max(), Y.mean()))


def inspect(path):
    print("#" * 78)
    print("文件: %s" % path)
    print("磁盘体积: %s" % human_size(os.path.getsize(path)))
    print("#" * 78)

    with h5py.File(path, "r") as hdf:
        keys = list(hdf.keys())
        print("顶层键(%d 个): %s" % (len(keys), keys))
        print()

        # 先解码所有变量名表
        var_tables = {}
        for k in keys:
            if k.endswith("_var"):
                try:
                    var_tables[k] = decode_var(hdf[k])
                except Exception as e:
                    print("解码 %s 失败: %s" % (k, e))

        print("变量名表:")
        for k, v in var_tables.items():
            print("  %-10s (%2d): %s" % (k, len(v), v))
        print()

        # 逐个数据块预览
        for k in keys:
            if k.endswith("_var"):
                continue
            prefix = k.split("_dev")[0].split("_test")[0]
            var_names = var_tables.get(prefix + "_var")
            preview_block(hdf, k, var_names)

        print()
        for split in ["dev", "test"]:
            summarize_aux(hdf, split)

    print()


def main():
    if len(sys.argv) > 1:
        targets = sys.argv[1:]
    else:
        if not os.path.isdir(DATA_DIR):
            print("目录不存在: %s   请修改脚本顶部的 DATA_DIR" % DATA_DIR)
            return
        targets = sorted(
            os.path.join(DATA_DIR, f)
            for f in os.listdir(DATA_DIR)
            if f.lower().endswith(".h5")
        )

    if not targets:
        print("没有找到 .h5 文件")
        return

    print("待探查文件数: %d" % len(targets))
    for p in targets:
        if not os.path.isfile(p):
            print("跳过, 文件不存在: %s" % p)
            continue
        try:
            inspect(p)
        except Exception as e:
            print("读取失败 %s : %s" % (p, e))


if __name__ == "__main__":
    main()
