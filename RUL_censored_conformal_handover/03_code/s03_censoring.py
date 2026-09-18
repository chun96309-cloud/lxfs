# -*- coding: utf-8 -*-
"""
s03_censoring.py   删失版本。控制台打印, 同时把结果写到 results/ 供 s04 出图。

删失为人工构造 (Type-I 设定): 给每台训练发动机抽一个下线时刻 C_i, 与该机寿命 F_i 无关,
对每台机都记录 C_i (现实含义: 计划性退役日期事先已知)。删失率通过倒推 C_i 分布的上限命中目标。

对每个删失率:
  [A] 打印样本量核算表: 不同 c0 下保留的样本数与发动机数 (全部 / 校准折)
  [B] 对每个 c0 跑五条线, 目标 y = min(RUL, c0), alpha 下的一侧下界, 下界用 c0 封顶:
        E   无删失参照: 用完整数据
        A   丢弃删失机: 只用跑到失效的发动机
        B   把下线当失效: 标签 min(O_i - t, c0)
        Cu  选样本不加权: 保留 C_i - t >= c0 的样本, 权重 1
        Cw  选样本加权:   同上, 权重 1 / S_C(t + c0), S_C 用训练折全部发动机的 C_i 估计
        Cw1 选样本加权, 一机一点校准, 重复 N_REPEAT 次报均值
      指标: 总体覆盖率, 决策区覆盖率 (真实 RUL < c0), 分段覆盖率, 平均下界, 无信息界比例

落盘 (results/):
  s03_units_rXXX.csv                  每台训练发动机的 F, C, O, delta, cal (XXX = 删失率百分数)
  s03_accounting.csv                  样本量核算 (rate, c0, ...)
  s03_methods.csv                     方法结果 (rate, c0, method_code, ...)
  s03_weights.csv                     权重 w(t) (rate, c0, t, w)
  s03_test_predictions_rXXX_cYY.csv   测试集逐点下界: unit, t, rul, L_E, L_A, L_B, L_Cu, L_Cw, L_Cw1

先跑 s01, s02。只改 DATA_DIR。运行时间约几分钟 (CPU)。
"""

import os
import sys
import numpy as np
import pandas as pd

from cmapss_common import (
    load_subset, add_labels_train, add_labels_test, build_features,
    split_engines, fit_model, weighted_lpb, summarize_lpb, print_rows,
)

# ============ 参数 ============
DATA_DIR = r"E:\cmapss"
FD = "FD001"
WINDOW = 30
CAL_FRAC = 0.40
ALPHA = 0.10
SEED = 2026

CENS_RATES = [0.20, 0.40, 0.60]   # 目标删失率
C_MIN = 60                        # 下线时刻的下限 (循环数)
C0_ACCOUNT = [10, 20, 30, 50]     # 核算表用
C0_METHODS = [20, 30, 50]         # 跑方法用 (删掉几个可以缩短时间)
N_REPEAT = 20                     # 一机一点重复次数
RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
# =============================
if len(sys.argv) > 1:
    DATA_DIR = sys.argv[1]      # 命令行给数据目录时覆盖上面的 DATA_DIR

METHOD_LABEL = {
    "E": "E  无删失参照", "A": "A  丢弃删失机", "B": "B  把下线当失效",
    "Cu": "Cu 选样本不加权", "Cw": "Cw 选样本加权", "Cw1": "Cw1 加权一机一点",
}


def to_csv(df, name):
    path = os.path.join(RESULTS_DIR, name)
    df.to_csv(path, index=False, encoding="utf-8-sig")
    print("  写出 %s" % path)


def finite_or_nan(L):
    L = np.asarray(L, float)
    return np.where(np.isfinite(L), L, np.nan)


def gen_censoring(F_by_unit, rate, rng, c_min=C_MIN):
    """C_i ~ Uniform(c_min, U) 取整, 与 F_i 独立。二分 U 使 mean(C_i < F_i) 命中 rate。"""
    units = np.array(sorted(F_by_unit.keys()))
    F = np.array([F_by_unit[u] for u in units], float)
    u01 = rng.random(len(units))

    def C_of(U):
        return np.floor(c_min + u01 * (U - c_min)).astype(int)

    def rate_of(U):
        return float(np.mean(C_of(U) < F))

    lo, hi = float(c_min + 1), float(F.max() * 4)
    for _ in range(80):
        mid = (lo + hi) / 2
        if rate_of(mid) > rate:
            lo = mid
        else:
            hi = mid
    U = lo if abs(rate_of(lo) - rate) < abs(rate_of(hi) - rate) else hi
    C = C_of(U)
    return dict(zip(units.tolist(), C.tolist())), U


def survival_C(C_values):
    """经验生存函数 S_C(v) = P(C >= v)。Type-I 下 C 对每台机都观测到, 直接用经验分布。"""
    C_sorted = np.sort(np.asarray(C_values, float))
    n = len(C_sorted)

    def S(v):
        v = np.asarray(v, float)
        return 1.0 - np.searchsorted(C_sorted, v, side="left") / n

    return S


def run_methods(tr, Xtr, te, Xte, m_tr, m_ca, C_row, O_row, delta_row, C_by_unit, train_u, cal_u, c0, rng, E_cache):
    """返回 (rows, L_dict, weight_fn)。L_dict: method_code -> 测试集逐点下界数组"""
    y_te = te.rul.values
    n_te = len(y_te)
    ones_te = np.ones(n_te)
    t_te = Xte["t"].values

    obs = (tr.cycle.values <= O_row)                  # 观测到的行
    y_c0_true = np.minimum(tr.rul.values, c0)         # 只有 E 允许直接用
    rows, Ls = [], {}

    def add(code, L, n_cal, n_cal_eng):
        r = summarize_lpb(METHOD_LABEL[code], y_te, L, c0)
        r["method_code"] = code; r["n_cal"] = int(n_cal); r["n_cal_eng"] = int(n_cal_eng)
        rows.append(r); Ls[code] = L

    # ---------- E: 无删失参照 (不依赖删失率, 按 c0 缓存) ----------
    if c0 not in E_cache:
        mE = fit_model(Xtr[m_tr], y_c0_true[m_tr], seed=SEED)
        E_cache[c0] = weighted_lpb(mE.predict(Xte), ones_te, mE.predict(Xtr[m_ca]), y_c0_true[m_ca],
                                   np.ones(m_ca.sum()), ALPHA, cap=c0)
    add("E", E_cache[c0], m_ca.sum(), len(cal_u))

    # ---------- A: 丢弃删失机 ----------
    failed = (delta_row == 1)
    sel_tr = m_tr & failed
    sel_ca = m_ca & failed
    if sel_ca.sum() > 0 and sel_tr.sum() > 0:
        mA = fit_model(Xtr[sel_tr], y_c0_true[sel_tr], seed=SEED)
        L = weighted_lpb(mA.predict(Xte), ones_te, mA.predict(Xtr[sel_ca]), y_c0_true[sel_ca], np.ones(sel_ca.sum()), ALPHA, cap=c0)
        add("A", L, sel_ca.sum(), len(set(tr.unit.values[sel_ca])))

    # ---------- B: 把下线当失效 ----------
    y_B = np.minimum(O_row - tr.cycle.values, c0)     # 只用观测得到的量
    sel_tr = m_tr & obs
    sel_ca = m_ca & obs
    mB = fit_model(Xtr[sel_tr], y_B[sel_tr], seed=SEED)
    L = weighted_lpb(mB.predict(Xte), ones_te, mB.predict(Xtr[sel_ca]), y_B[sel_ca], np.ones(sel_ca.sum()), ALPHA, cap=c0)
    add("B", L, sel_ca.sum(), len(set(tr.unit.values[sel_ca])))

    # ---------- C: 选样本 ----------
    keep = obs & ((C_row - tr.cycle.values) >= c0)
    # 保留样本上 min(RUL, c0) 的可观测计算: 失效机且 F - t <= c0 时取 F - t, 否则取 c0
    Ft = tr.F.values - tr.cycle.values
    y_sel = np.where((delta_row == 1) & (Ft <= c0), Ft, c0).astype(float)
    assert np.all(y_sel[keep] == y_c0_true[keep]), "保留样本上的可观测标签应与真值一致"

    sel_tr = m_tr & keep
    sel_ca = m_ca & keep
    if sel_ca.sum() == 0 or sel_tr.sum() == 0:
        print("  c0=%d: 保留样本为空, 跳过 C" % c0)
        return rows, Ls, None
    mC = fit_model(Xtr[sel_tr], y_sel[sel_tr], seed=SEED)
    yhat_ca = mC.predict(Xtr[sel_ca])
    yhat_te = mC.predict(Xte)
    n_ca_eng = len(set(tr.unit.values[sel_ca]))

    # Cu 不加权
    L = weighted_lpb(yhat_te, ones_te, yhat_ca, y_sel[sel_ca], np.ones(sel_ca.sum()), ALPHA, cap=c0)
    add("Cu", L, sel_ca.sum(), n_ca_eng)

    # Cw 加权: w(t) = 1 / S_C(t + c0), S_C 用训练折发动机的 C_i
    S = survival_C([C_by_unit[u] for u in train_u])
    floor = 1.0 / len(train_u)

    def weight_fn(t):
        return 1.0 / np.maximum(S(np.asarray(t, float) + c0), floor)

    w_ca = weight_fn(Xtr["t"].values[sel_ca])
    w_te = weight_fn(t_te)
    L = weighted_lpb(yhat_te, w_te, yhat_ca, y_sel[sel_ca], w_ca, ALPHA, cap=c0)
    add("Cw", L, sel_ca.sum(), n_ca_eng)

    # Cw1 一机一点
    cal_df = pd.DataFrame({"unit": tr.unit.values[sel_ca], "yhat": yhat_ca, "y": y_sel[sel_ca], "w": w_ca})
    reps, L1_first = [], None
    for _ in range(N_REPEAT):
        pick = cal_df.groupby("unit").sample(n=1, random_state=int(rng.integers(1 << 31)))
        L1 = weighted_lpb(yhat_te, w_te, pick.yhat.values, pick.y.values, pick.w.values, ALPHA, cap=c0)
        if L1_first is None:
            L1_first = L1
        reps.append(summarize_lpb("rep", y_te, L1, c0))
    mean_row = pd.DataFrame(reps).drop(columns=["method"]).mean(numeric_only=True).to_dict()
    mean_row["method"] = "Cw1 加权一机一点 (%d次均值)" % N_REPEAT
    mean_row["method_code"] = "Cw1"; mean_row["n_cal"] = n_ca_eng; mean_row["n_cal_eng"] = n_ca_eng
    rows.append(mean_row); Ls["Cw1"] = L1_first

    print("  c0=%d  权重 w(t)=1/S_C(t+c0) 在 t=50/100/150/200/250 处: %s"
          % (c0, ", ".join(["%.2f" % v for v in weight_fn(np.array([50, 100, 150, 200, 250]))])))
    return rows, Ls, weight_fn


def main():
    os.makedirs(RESULTS_DIR, exist_ok=True)
    print("数据集 %s   窗口 %d   校准折比例 %.2f   alpha %.2f   seed %d" % (FD, WINDOW, CAL_FRAC, ALPHA, SEED))
    print("删失为人工构造 (Type-I: 每台机的下线时刻均已知), C_i ~ Uniform(%d, U), 与寿命独立" % C_MIN)
    print()

    tr, te, rul_last = load_subset(DATA_DIR, FD)
    tr = add_labels_train(tr)
    te = add_labels_test(te, rul_last)
    Xtr = build_features(tr, WINDOW)
    Xte = build_features(te, WINDOW)

    train_u, cal_u = split_engines(tr.unit, CAL_FRAC, SEED)
    m_tr = tr.unit.isin(train_u).values
    m_ca = tr.unit.isin(cal_u).values
    F_by_unit = tr.groupby("unit")["F"].first().to_dict()
    print("训练折 %d 台   校准折 %d 台   测试 %d 台 %d 行" % (len(train_u), len(cal_u), te.unit.nunique(), len(te)))
    print()

    all_acc, all_methods, all_weights = [], [], []
    E_cache = {}
    t_grid = np.arange(1, int(tr.F.max()) + 1)

    for rate in CENS_RATES:
        rng = np.random.default_rng(SEED + int(rate * 100))
        C_by_unit, U = gen_censoring(F_by_unit, rate, rng)
        units = tr.unit.values
        C_row = np.array([C_by_unit[u] for u in units])
        F_row = tr.F.values
        O_row = np.minimum(F_row, C_row)
        delta_row = (F_row <= C_row).astype(int)

        eng = pd.DataFrame({"unit": list(F_by_unit.keys())})
        eng["F"] = eng.unit.map(F_by_unit); eng["C"] = eng.unit.map(C_by_unit)
        eng["O"] = np.minimum(eng.F, eng.C); eng["delta"] = (eng.F <= eng.C).astype(int)
        eng["cal"] = eng.unit.isin(cal_u).astype(int)
        rate_tag = "r%03d" % int(round(rate * 100))

        print("#" * 78)
        print("目标删失率 %.2f   实际 %.2f (%d / %d 台被删失)   U = %.1f"
              % (rate, 1 - eng.delta.mean(), int((1 - eng.delta).sum()), len(eng), U))
        print("观测行数 %d / 原始 %d (%.1f%%)   校准折删失 %d / %d 台"
              % ((tr.cycle.values <= O_row).sum(), len(tr), 100 * (tr.cycle.values <= O_row).mean(),
                 int((1 - eng.delta[eng.cal == 1]).sum()), int(eng.cal.sum())))
        print()
        to_csv(eng, "s03_units_%s.csv" % rate_tag)

        # ---- 核算表 ----
        acc = []
        for c0 in C0_ACCOUNT:
            kept_rows = np.maximum(0, np.minimum(eng.O, eng.C - c0))
            kept_eng = (eng.C - c0 >= 1)
            cal = eng.cal == 1
            acc.append({
                "rate": rate, "c0": c0,
                "kept_rows_all": int(kept_rows.sum()),
                "kept_rows_pct": round(100 * kept_rows.sum() / eng.O.sum(), 1),
                "kept_eng_all": int(kept_eng.sum()),
                "kept_rows_cal": int(kept_rows[cal].sum()),
                "kept_eng_cal": int(kept_eng[cal].sum()),
                "obs_rows_all": int(eng.O.sum()),
            })
        all_acc.extend(acc)
        show = pd.DataFrame(acc).rename(columns={
            "kept_rows_all": "保留样本(全部)", "kept_rows_pct": "保留样本占观测(%)", "kept_eng_all": "保留发动机(全部)",
            "kept_rows_cal": "保留样本(校准折)", "kept_eng_cal": "保留发动机(校准折)", "obs_rows_all": "观测样本(全部)"})
        print_rows(show.to_dict("records"), "[A] 样本量核算: 保留样本 = sum max(0, min(O_i, C_i - c0)), 保留发动机 = #{C_i - c0 >= 1}")

        # ---- 方法 ----
        for c0 in C0_METHODS:
            rows, Ls, weight_fn = run_methods(tr, Xtr, te, Xte, m_tr, m_ca, C_row, O_row, delta_row,
                                              C_by_unit, train_u, cal_u, c0, rng, E_cache)
            for r in rows:
                r["rate"] = rate; r["c0"] = c0; r["n_dec"] = int(r.get("n_dec", 0))
            all_methods.extend(rows)
            cols = ["method", "n_cal", "n_cal_eng", "coverage", "cov_dec", "n_dec"] + \
                   [k for k in rows[0].keys() if k.startswith("cov[")] + ["mean_L", "trivial"]
            print_rows([{k: r.get(k, float("nan")) for k in cols} for r in rows],
                       "[B] 删失率 %.2f   c0 = %d   目标 y = min(RUL, %d), 下界封顶 %d, 名义覆盖 %.2f   测试集全部循环"
                       % (rate, c0, c0, c0, 1 - ALPHA))
            if weight_fn is not None:
                all_weights.extend([{"rate": rate, "c0": c0, "t": int(t), "w": float(w)} for t, w in zip(t_grid, weight_fn(t_grid))])
            pred = pd.DataFrame({"unit": te.unit.values, "t": te.cycle.values, "rul": te.rul.values})
            for code in ["E", "A", "B", "Cu", "Cw", "Cw1"]:
                pred["L_" + code] = finite_or_nan(Ls[code]) if code in Ls else np.nan
            to_csv(pred, "s03_test_predictions_%s_c%02d.csv" % (rate_tag, c0))
        print()

    print("[C] 写出汇总")
    to_csv(pd.DataFrame(all_acc), "s03_accounting.csv")
    md = pd.DataFrame(all_methods)
    front = ["rate", "c0", "method_code", "method", "n_cal", "n_cal_eng", "coverage", "cov_dec", "n_dec"]
    md = md[front + [c for c in md.columns if c not in front]]
    to_csv(md, "s03_methods.csv")
    to_csv(pd.DataFrame(all_weights), "s03_weights.csv")
    print()
    print("列说明: coverage 总体覆盖率; cov_dec 决策区覆盖率 (真实 RUL < c0, n_dec 个点); cov[a,b) 分段覆盖率;")
    print("        mean_L 有限下界的均值; trivial 下界为 -inf 的比例; n_cal 校准点数; n_cal_eng 校准发动机数。")


if __name__ == "__main__":
    main()
