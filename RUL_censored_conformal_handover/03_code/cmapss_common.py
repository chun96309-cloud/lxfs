# -*- coding: utf-8 -*-
"""
cmapss_common.py
C-MAPSS 公共函数: 读数据, 造标签, 滑动窗口特征, 按发动机划分, 点预测模型,
分裂共形 (两侧区间 / 一侧下界 / 加权一侧下界), 覆盖率报表。

只提供函数, 不画图, 不落盘。被 s02_baseline.py 与 s03_censoring.py 导入。

依赖: numpy, pandas, scikit-learn
"""

import os
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

# ---------------- 常量 ----------------
COLS = ["unit", "cycle", "op1", "op2", "op3"] + ["s%d" % i for i in range(1, 22)]

# 论文二去掉的七个近零方差传感器: 1, 5, 6, 10, 16, 18, 19
SENSORS_KEEP = [2, 3, 4, 7, 8, 9, 11, 12, 13, 14, 15, 17, 20, 21]

RUL_MAX = 125            # 标签封顶, 与论文二一致
DEFAULT_BINS = [(0, 15), (15, 30), (30, 60), (60, RUL_MAX + 1)]


# ---------------- 读数据 ----------------
def load_subset(data_dir, fd):
    """读 train_FDxxx.txt / test_FDxxx.txt / RUL_FDxxx.txt, 返回 (train_df, test_df, rul_last_array)"""
    def _read(name):
        path = os.path.join(data_dir, name)
        if not os.path.isfile(path):
            raise FileNotFoundError(path)
        df = pd.read_csv(path, sep=r"\s+", header=None)
        return df

    tr = _read("train_%s.txt" % fd)
    te = _read("test_%s.txt" % fd)
    rul = _read("RUL_%s.txt" % fd)

    for d in (tr, te):
        if d.shape[1] < 26:
            raise ValueError("列数 %d 少于 26, 文件格式与预期不符" % d.shape[1])
        extra = [c for c in d.columns if c >= 26]
        if extra:
            d.drop(columns=extra, inplace=True)
        d.columns = COLS
        d["unit"] = d["unit"].astype(int)
        d["cycle"] = d["cycle"].astype(int)

    rul_last = rul.iloc[:, 0].astype(float).values
    return tr, te, rul_last


# ---------------- 标签 ----------------
def add_labels_train(tr):
    """训练集: 每台机跑到失效。F = 失效循环, rul_true = F - t, rul = min(rul_true, RUL_MAX)"""
    tr = tr.sort_values(["unit", "cycle"]).reset_index(drop=True)
    tr["F"] = tr.groupby("unit")["cycle"].transform("max")
    tr["rul_true"] = tr["F"] - tr["cycle"]
    tr["rul"] = np.minimum(tr["rul_true"], RUL_MAX)
    return tr


def add_labels_test(te, rul_last):
    """测试集: 每台机在失效前截断, RUL 文件给最后一刻的真实 RUL, 往前推得每个循环的 RUL"""
    te = te.sort_values(["unit", "cycle"]).reset_index(drop=True)
    T_last = te.groupby("unit")["cycle"].transform("max")
    last = rul_last[te["unit"].values - 1]          # RUL 文件第 k 行对应 unit k
    te["rul_true"] = last + (T_last - te["cycle"])
    te["rul"] = np.minimum(te["rul_true"], RUL_MAX)
    te["is_last"] = (te["cycle"] == T_last)
    return te


# ---------------- 特征 ----------------
def build_features(df, window=30, sensors=SENSORS_KEEP, use_ops=False):
    """
    对已按 (unit, cycle) 排序且 index 已重置的 df 构造特征。
    每个传感器: 当前值, 最近 window 个循环的滚动均值, 滚动标准差 (只用过去, 无泄漏)。
    再加循环序号 t。返回与 df 行对齐的 DataFrame。
    """
    parts = [df[["cycle"]].rename(columns={"cycle": "t"})]
    if use_ops:
        parts.append(df[["op1", "op2", "op3"]])
    g = df.groupby("unit")
    for s in sensors:
        c = "s%d" % s
        parts.append(df[[c]])
        rm = g[c].rolling(window, min_periods=1).mean().reset_index(level=0, drop=True)
        rs = g[c].rolling(window, min_periods=1).std().reset_index(level=0, drop=True).fillna(0.0)
        parts.append(rm.rename(c + "_rm"))
        parts.append(rs.rename(c + "_rs"))
    X = pd.concat(parts, axis=1)
    X = X.loc[df.index]
    return X


# ---------------- 划分 ----------------
def split_engines(units, cal_frac, seed):
    """按发动机划分。返回 (train_units_set, cal_units_set)"""
    rng = np.random.default_rng(seed)
    u = np.array(sorted(set(int(x) for x in units)))
    rng.shuffle(u)
    n_cal = int(round(len(u) * cal_frac))
    return set(u[n_cal:].tolist()), set(u[:n_cal].tolist())


# ---------------- 点预测 ----------------
def fit_model(X, y, seed=0):
    m = HistGradientBoostingRegressor(
        max_iter=300, learning_rate=0.05, max_leaf_nodes=31,
        min_samples_leaf=30, l2_regularization=1.0, random_state=seed,
    )
    m.fit(X, y)
    return m


def rmse(y, yhat):
    return float(np.sqrt(np.mean((np.asarray(y) - np.asarray(yhat)) ** 2)))


# ---------------- 共形 ----------------
def split_conformal_twosided(yhat_cal, y_cal, yhat_test, alpha):
    """论文二的 SCP: 得分 |y - yhat|, 区间 yhat +- q。返回 (lo, hi, q)"""
    s = np.abs(np.asarray(y_cal) - np.asarray(yhat_cal))
    n = len(s)
    k = int(np.ceil((n + 1) * (1 - alpha)))
    q = np.inf if k > n else float(np.sort(s)[k - 1])
    return yhat_test - q, yhat_test + q, q


def weighted_lpb(yhat_test, w_test, yhat_cal, y_cal, w_cal, alpha, cap=None):
    """
    论文一 Algorithm 1 的 CMR 版本 (一侧下界)。
    得分 V_j = yhat_j - y_j。对每个测试点 x:
        p_j  = w_j / (sum w + w(x)),  p_inf = w(x) / (sum w + w(x))
        eta(x) = Quantile_{1-alpha}( sum_j p_j delta_{V_j} + p_inf delta_inf )
        L(x) = yhat(x) - eta(x),  再与 cap 取较小者
    w 全为 1 时退化为普通分裂共形。eta = inf 时 L = -inf (无信息界)。
    """
    yhat_test = np.asarray(yhat_test, float)
    w_test = np.asarray(w_test, float)
    V = np.asarray(yhat_cal, float) - np.asarray(y_cal, float)
    w_cal = np.asarray(w_cal, float)

    order = np.argsort(V)
    Vs = V[order]
    ws = w_cal[order]
    cumw = np.cumsum(ws)
    W = cumw[-1]

    thr = (1.0 - alpha) * (W + w_test)              # 每个测试点自己的阈值
    idx = np.searchsorted(cumw, thr, side="left")   # 第一个累计权重 >= 阈值的位置
    eta = np.full(len(yhat_test), np.inf)
    ok = idx < len(Vs)
    eta[ok] = Vs[idx[ok]]
    L = yhat_test - eta
    if cap is not None:
        L = np.minimum(L, cap)
    return L


# ---------------- 报表 ----------------
def summarize_lpb(name, rul, L, c0=None, bins=DEFAULT_BINS):
    """返回一行指标 dict。rul 为真实 (已封顶) RUL, L 为下界 (可含 -inf)"""
    rul = np.asarray(rul, float)
    L = np.asarray(L, float)
    row = {"method": name, "n": len(rul)}
    row["coverage"] = float(np.mean(rul >= L))
    if c0 is not None:
        dec = rul < c0
        row["cov_dec"] = float(np.mean(rul[dec] >= L[dec])) if dec.any() else float("nan")
        row["n_dec"] = int(dec.sum())
    for lo, hi in bins:
        m = (rul >= lo) & (rul < hi)
        label = "cov[%d,%d)" % (lo, hi) if hi <= RUL_MAX else "cov[%d,%d]" % (lo, RUL_MAX)
        row[label] = float(np.mean(rul[m] >= L[m])) if m.any() else float("nan")
    fin = np.isfinite(L)
    row["mean_L"] = float(np.mean(L[fin])) if fin.any() else float("nan")
    row["trivial"] = float(np.mean(~fin))
    return row


def print_rows(rows, title=None):
    if title:
        print(title)
    df = pd.DataFrame(rows)
    with pd.option_context("display.width", 250, "display.max_columns", 30, "display.float_format", "{:.4f}".format):
        print(df.to_string(index=False))
    print()
