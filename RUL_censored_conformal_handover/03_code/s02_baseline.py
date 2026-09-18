# -*- coding: utf-8 -*-
"""
s02_baseline.py   无删失基线。跑通六步流程, 控制台打印, 同时把结果写到 results/ 供 s04 出图。

内容:
  1. 点预测精度 (RMSE), 分别在测试机最后一个循环 (与论文二可比) 和全部循环上
  2. 论文二那种两侧分裂共形区间: 覆盖率与平均宽度。覆盖率应接近 1 - ALPHA
  3. 一侧下界 (CMR-LPB, 无删失, 权重全为 1):
       3a 校准集用校准折全部循环
       3b 校准集每台校准机只抽一个循环 (一机一点), 重复 N_REPEAT 次报均值与标准差

落盘 (results/):
  s02_point_metrics.csv     RMSE
  s02_twosided.csv          两侧区间的 q, 宽度, 覆盖率
  s02_lpb_summary.csv       一侧下界汇总表 (method_code: all / one_mean / one_sd)
  s02_test_predictions.csv  测试集逐点: unit, t, is_last, rul, yhat, lo, hi, L_all, L_one (一机一点第一次抽样)

先跑 s01 确认格式。只改 DATA_DIR。
"""

import os
import sys
import numpy as np
import pandas as pd

from cmapss_common import (
    load_subset, add_labels_train, add_labels_test, build_features,
    split_engines, fit_model, rmse, split_conformal_twosided, weighted_lpb,
    summarize_lpb, print_rows, RUL_MAX, DEFAULT_BINS,
)

# ============ 参数 ============
DATA_DIR = r"E:\cmapss"
FD = "FD001"
WINDOW = 30
CAL_FRAC = 0.40
ALPHA = 0.10
SEED = 2026
N_REPEAT = 20          # 一机一点方案的重复次数
RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
# =============================
if len(sys.argv) > 1:
    DATA_DIR = sys.argv[1]      # 命令行给数据目录时覆盖上面的 DATA_DIR


def to_csv(df, name):
    path = os.path.join(RESULTS_DIR, name)
    df.to_csv(path, index=False, encoding="utf-8-sig")
    print("  写出 %s" % path)


def main():
    os.makedirs(RESULTS_DIR, exist_ok=True)
    print("数据集 %s   窗口 %d   校准折比例 %.2f   alpha %.2f   seed %d" % (FD, WINDOW, CAL_FRAC, ALPHA, SEED))
    tr, te, rul_last = load_subset(DATA_DIR, FD)
    tr = add_labels_train(tr)
    te = add_labels_test(te, rul_last)
    print("训练: %d 行, %d 台   测试: %d 行, %d 台" % (len(tr), tr.unit.nunique(), len(te), te.unit.nunique()))

    Xtr = build_features(tr, WINDOW)
    Xte = build_features(te, WINDOW)
    print("特征维数: %d" % Xtr.shape[1])

    train_u, cal_u = split_engines(tr.unit, CAL_FRAC, SEED)
    m_tr = tr.unit.isin(train_u).values
    m_ca = tr.unit.isin(cal_u).values
    print("训练折 %d 台 %d 行   校准折 %d 台 %d 行" % (len(train_u), m_tr.sum(), len(cal_u), m_ca.sum()))
    print()

    # ---- 点预测 ----
    model = fit_model(Xtr[m_tr], tr.rul.values[m_tr], seed=SEED)
    yhat_cal = model.predict(Xtr[m_ca])
    y_cal = tr.rul.values[m_ca]
    yhat_te = model.predict(Xte)
    y_te = te.rul.values
    last = te.is_last.values

    pm = [
        {"set": "test_last", "n": int(last.sum()), "rmse": rmse(y_te[last], yhat_te[last])},
        {"set": "test_all", "n": int(len(y_te)), "rmse": rmse(y_te, yhat_te)},
        {"set": "cal", "n": int(len(y_cal)), "rmse": rmse(y_cal, yhat_cal)},
    ]
    print("[1] 点预测精度")
    for r in pm:
        print("    RMSE %-10s (n=%d): %.3f" % (r["set"], r["n"], r["rmse"]))
    print()

    # ---- 两侧区间 (论文二 SCP) ----
    lo, hi, q = split_conformal_twosided(yhat_cal, y_cal, yhat_te, ALPHA)
    cov_last = float(np.mean((y_te[last] >= lo[last]) & (y_te[last] <= hi[last])))
    cov_all = float(np.mean((y_te >= lo) & (y_te <= hi)))
    print("[2] 两侧分裂共形区间 (得分 |y - yhat|, 校准折全部循环, n_cal=%d)" % len(y_cal))
    print("    q = %.3f   区间宽度 = %.3f (所有点等宽)" % (q, 2 * q))
    print("    覆盖率 最后一循环: %.4f   全部循环: %.4f   名义: %.2f" % (cov_last, cov_all, 1 - ALPHA))
    print()

    # ---- 一侧下界, 全部循环校准 ----
    ones_cal = np.ones(len(y_cal))
    ones_te = np.ones(len(y_te))
    L_all = weighted_lpb(yhat_te, ones_te, yhat_cal, y_cal, ones_cal, ALPHA, cap=None)
    r_all = summarize_lpb("LPB 全部循环校准 (n_cal=%d)" % len(y_cal), y_te, L_all)
    r_all["method_code"] = "all"
    rows = [r_all]

    # ---- 一侧下界, 一机一点校准 ----
    cal_df = tr.loc[m_ca, ["unit"]].copy()
    cal_df["yhat"] = yhat_cal
    cal_df["y"] = y_cal
    rng = np.random.default_rng(SEED)
    reps = []
    L_one_first = None
    for r in range(N_REPEAT):
        pick = cal_df.groupby("unit").sample(n=1, random_state=int(rng.integers(1 << 31)))
        L_one = weighted_lpb(yhat_te, ones_te, pick.yhat.values, pick.y.values, np.ones(len(pick)), ALPHA, cap=None)
        if L_one_first is None:
            L_one_first = L_one
        reps.append(summarize_lpb("rep", y_te, L_one))
    rep_df = pd.DataFrame(reps).drop(columns=["method", "n"])
    mean_row = rep_df.mean(numeric_only=True).to_dict()
    sd_row = rep_df.std(numeric_only=True).to_dict()
    mean_row["method"] = "LPB 一机一点校准 均值 (n_cal=%d, %d 次)" % (len(cal_u), N_REPEAT)
    sd_row["method"] = "LPB 一机一点校准 标准差"
    mean_row["n"] = len(y_te); sd_row["n"] = ""
    mean_row["method_code"] = "one_mean"; sd_row["method_code"] = "one_sd"
    rows.append(mean_row)
    rows.append(sd_row)

    print_rows(rows, "[3] 一侧下界 (无删失, 权重全为 1, 不封顶)   测试集全部循环 n=%d, 名义覆盖 %.2f" % (len(y_te), 1 - ALPHA))
    print("分段边界:", DEFAULT_BINS, "  RUL 封顶", RUL_MAX)
    print("说明: 测试点来自 %d 台机, 同机相关, 覆盖率的不确定性按发动机数衡量, 不按点数。" % te.unit.nunique())
    print()

    # ---- 落盘 ----
    print("[4] 写出结果")
    to_csv(pd.DataFrame(pm), "s02_point_metrics.csv")
    to_csv(pd.DataFrame([{"q": q, "width": 2 * q, "cov_last": cov_last, "cov_all": cov_all,
                          "nominal": 1 - ALPHA, "n_cal": len(y_cal), "alpha": ALPHA}]), "s02_twosided.csv")
    to_csv(pd.DataFrame(rows), "s02_lpb_summary.csv")
    pred = pd.DataFrame({
        "unit": te.unit.values, "t": te.cycle.values, "is_last": last.astype(int),
        "rul": y_te, "yhat": yhat_te, "lo": lo, "hi": hi,
        "L_all": np.where(np.isfinite(L_all), L_all, np.nan),
        "L_one": np.where(np.isfinite(L_one_first), L_one_first, np.nan),
    })
    to_csv(pred, "s02_test_predictions.csv")


if __name__ == "__main__":
    main()
