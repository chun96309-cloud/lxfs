# -*- coding: utf-8 -*-
"""
s04_figures.py   读取 results/ 里的 CSV 与原始训练文件, 输出论文与课件用图到 figures/。

字体: 中文 宋体 五号 (10.5 pt), 西文与数字 Times New Roman 五号 (10.5 pt)。
      按 C:\\Windows\\Fonts 下的文件路径加载; 找不到时退到系统里能找到的替代字体并打印警告, 回退的图只供预览。
每张图同时输出 PNG (300 dpi) 与 PDF。只出 F01 到 F11, 不多画。

运行:
    python s04_figures.py                (先跑完 s02, s03)
    python s04_figures.py E:\\cmapss      (命令行给数据目录, 覆盖下面的 DATA_DIR)
依赖: numpy, pandas, matplotlib (>= 3.6, 需要按字形回退)
"""

import os
import sys
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.lines import Line2D
from matplotlib.patches import Patch

# ============ 参数 ============
DATA_DIR = r"E:\cmapss"          # 原始数据目录 (与 s01-s03 一致)
FOCUS_RATE = 0.40                # 重点展示的删失率
FOCUS_C0 = 30                    # 重点展示的观测视野
# =============================
if len(sys.argv) > 1:
    DATA_DIR = sys.argv[1]

CODE_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR = os.path.join(CODE_DIR, "results")
FIG_DIR = os.path.join(CODE_DIR, "figures")
os.makedirs(FIG_DIR, exist_ok=True)

# ---------- 字体 ----------
PT = 10.5   # 五号
FONT_CN = {"name": "SimSun", "paths": [r"C:\Windows\Fonts\simsun.ttc"],
           "fallback": [("WenQuanYi Zen Hei", "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"),
                        ("Noto Sans CJK SC", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc")]}
FONT_EN = {"name": "Times New Roman", "paths": [r"C:\Windows\Fonts\times.ttf", r"C:\Windows\Fonts\timesbd.ttf"],
           "fallback": [("Liberation Serif", "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"),
                        ("DejaVu Serif", "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf")]}


def load_font(spec):
    """按路径把字体登记进 matplotlib, 返回 (family_name, ok)。ok=False 表示用了替代字体。"""
    found = [p for p in spec["paths"] if os.path.isfile(p)]
    if found:
        for p in found:
            font_manager.fontManager.addfont(p)
        return spec["name"], True
    for name, p in spec["fallback"]:
        if os.path.isfile(p):
            font_manager.fontManager.addfont(p)
            return name, False
    return None, False


CN, cn_ok = load_font(FONT_CN)
EN, en_ok = load_font(FONT_EN)
font_ok = cn_ok and en_ok
families = [f for f in (EN, CN) if f] or ["serif"]
if not font_ok:
    print("警告: 未找到宋体或 Times New Roman 字体文件, 已回退到替代字体 (中文: %s, 西文: %s)。此路径的图仅供预览, 论文用图请在 Windows 上重新生成。"
          % (CN, EN))
print("matplotlib %s   pandas %s   字体: %s" % (matplotlib.__version__, pd.__version__,
      "宋体 + Times New Roman 已加载" if font_ok else "回退 (%s / %s)" % (CN, EN)))
print("数据目录: %s   结果目录: %s" % (DATA_DIR, RESULTS_DIR))

# 西文与数字优先用 Times New Roman, 缺的字形 (中文) 逐字回退到宋体 (matplotlib >= 3.6)
plt.rcParams.update({
    "font.family": families, "font.size": PT,
    "axes.titlesize": PT, "axes.labelsize": PT, "xtick.labelsize": PT, "ytick.labelsize": PT,
    "legend.fontsize": PT, "legend.title_fontsize": PT,
    "axes.unicode_minus": False, "axes.edgecolor": "black", "axes.linewidth": 0.6,
    "axes.grid": True, "grid.color": "#E5E5E5", "grid.linewidth": 0.3,
    "xtick.direction": "out", "ytick.direction": "out", "xtick.major.width": 0.6, "ytick.major.width": 0.6,
    "legend.frameon": False, "legend.handlelength": 1.6, "legend.columnspacing": 1.0,
    "pdf.fonttype": 42, "ps.fonttype": 42, "savefig.dpi": 300,
})

CM = 1 / 2.54
RATE_COLS = ["#3D7A5A", "#2E4A6B", "#B23A48", "#E39B26", "#6E7A8A", "#000000"]
RATE_MARKERS = ["o", "^", "s", "D", "*", "P"]
METHOD_LEVELS = ["E", "A", "B", "Cu", "Cw", "Cw1"]
METHOD_LABELS = {"E": "E 无删失参照", "A": "A 丢弃删失机", "B": "B 把下线当失效",
                 "Cu": "Cu 选样本不加权", "Cw": "Cw 选样本加权", "Cw1": "Cw1 加权一机一点"}
METHOD_COLORS = {"E": "#000000", "A": "#B23A48", "B": "#E39B26", "Cu": "#6E7A8A", "Cw": "#2E4A6B", "Cw1": "#3D7A5A"}


def rd(name):
    path = os.path.join(RESULTS_DIR, name)
    if not os.path.isfile(path):
        raise SystemExit("缺文件: %s  请先跑 s02 / s03" % path)
    return pd.read_csv(path, encoding="utf-8-sig")


def new_fig(w, h):
    return plt.subplots(figsize=(w * CM, h * CM))


def save_fig(fig, name):
    fig.savefig(os.path.join(FIG_DIR, name + ".png"), dpi=300, bbox_inches="tight", facecolor="white")
    fig.savefig(os.path.join(FIG_DIR, name + ".pdf"), bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("已保存", name)


def subtitle(ax, text):
    ax.set_title(text, loc="left", fontsize=PT, pad=6)


def legend_below(fig, handles, labels, ncol, title=None, y=-0.02):
    fig.legend(handles, labels, loc="lower center", bbox_to_anchor=(0.5, y), ncol=ncol, title=title, frameon=False)


def bin_labels(df):
    return [c for c in df.columns if c.startswith("cov[")]


rate_tag = "r%03d" % int(round(FOCUS_RATE * 100))
c0_tag = "c%02d" % FOCUS_C0
nominal = float(rd("s02_twosided.csv")["nominal"].iloc[0])

# ================= 数据本身 =================
raw_path = os.path.join(DATA_DIR, "train_FD001.txt")
if os.path.isfile(raw_path):
    raw = pd.read_csv(raw_path, sep=r"\s+", header=None).iloc[:, :26]
    raw.columns = ["unit", "cycle", "op1", "op2", "op3"] + ["s%d" % i for i in range(1, 22)]

    # F01 失效循环数分布
    life = raw.groupby("unit")["cycle"].max()
    fig, ax = new_fig(8.5, 6.5)
    bins = np.arange(0, life.max() + 20, 20)
    ax.hist(life, bins=bins, color="#2E4A6B", edgecolor="white", linewidth=0.3)
    ax.set_xlabel("失效循环数 F"); ax.set_ylabel("发动机台数")
    save_fig(fig, "F01_lifetime_hist")

    # F02 传感器退化轨迹
    sel_units, sel_sensors = [1, 20, 50], ["s2", "s4", "s11", "s15"]
    ucols = ["#2E4A6B", "#E39B26", "#3D7A5A"]
    fig, axes = plt.subplots(2, 2, figsize=(16 * CM, 9 * CM))
    for ax, s in zip(axes.ravel(), sel_sensors):
        for u, c in zip(sel_units, ucols):
            d = raw[raw.unit == u]
            ax.plot(d.cycle, d[s], color=c, linewidth=0.7)
        ax.set_title(s, fontsize=PT, pad=3, backgroundcolor="#F2F2F2")
    for ax in axes[1]:
        ax.set_xlabel("循环 t")
    for ax in axes[:, 0]:
        ax.set_ylabel("传感器读数")
    fig.tight_layout(rect=(0, 0.08, 1, 1))
    legend_below(fig, [Line2D([], [], color=c, linewidth=1.2) for c in ucols], [str(u) for u in sel_units], 3, title="发动机编号")
    save_fig(fig, "F02_sensor_trajectories")
else:
    print("未找到", raw_path, ", 跳过 F01 F02")

# ================= 删失构造 =================
# F03 校准折发动机的观测时间线
u = rd("s03_units_%s.csv" % rate_tag)
u = u[u.cal == 1].sort_values("O").reset_index(drop=True)
u["rank"] = np.arange(1, len(u) + 1)
u["kept_end"] = np.maximum(0, np.minimum(u.O, u.C - FOCUS_C0))
fig, ax = new_fig(16, 9)
ax.hlines(u["rank"], 0, u.kept_end, color="#3D7A5A", linewidth=2.2)
ax.hlines(u["rank"], u.kept_end, u.O, color="#E39B26", linewidth=2.2)
cen, fail = u[u.delta == 0], u[u.delta == 1]
ax.scatter(cen.O, cen["rank"], s=16, facecolor="white", edgecolor="black", linewidth=0.6, zorder=3)
ax.scatter(fail.O, fail["rank"], s=16, color="black", zorder=3)
ax.set_xlabel("循环 t"); ax.set_ylabel("校准折发动机 (按观测长度排序)")
subtitle(ax, "删失率 %.0f%%, c0 = %d; 绿色为保留样本, 橙色为最后 c0 个循环 (丢弃)" % (FOCUS_RATE * 100, FOCUS_C0))
fig.tight_layout(rect=(0, 0.07, 1, 1))
legend_below(fig, [Line2D([], [], marker="o", color="black", markerfacecolor="white", linestyle=""),
                   Line2D([], [], marker="o", color="black", linestyle="")], ["删失", "失效"], 2)
save_fig(fig, "F03_censoring_timeline")

# F04 样本量核算
acc = rd("s03_accounting.csv")
rates = sorted(acc.rate.unique())
fig, axes = plt.subplots(1, 2, figsize=(16 * CM, 7 * CM))
for ax, col, ttl in zip(axes, ["kept_rows_pct", "kept_eng_cal"], ["保留样本占观测样本比例 (%)", "校准折保留发动机 (台)"]):
    for r, c in zip(rates, RATE_COLS):
        d = acc[acc.rate == r].sort_values("c0")
        ax.plot(d.c0, d[col], color=c, linewidth=1.0, marker="o", markersize=3.5)
    ax.set_title(ttl, fontsize=PT, pad=3, backgroundcolor="#F2F2F2"); ax.set_xlabel("观测视野 c0")
fig.tight_layout(rect=(0, 0.1, 1, 1))
legend_below(fig, [Line2D([], [], color=c, marker="o", markersize=3.5) for c in RATE_COLS[:len(rates)]],
             ["%.0f%%" % (r * 100) for r in rates], len(rates), title="删失率")
save_fig(fig, "F04_sample_accounting")

# F05 权重随循环数变化
w = rd("s03_weights.csv")
w = w[np.abs(w.rate - FOCUS_RATE) < 1e-9]
c0s = sorted(w.c0.unique())
fig, ax = new_fig(8.5, 6.5)
for c0, c in zip(c0s, RATE_COLS):
    d = w[w.c0 == c0].sort_values("t")
    ax.plot(d.t, d.w, color=c, linewidth=1.0, label=str(c0))
ax.set_xlabel("循环 t"); ax.set_ylabel("权重 w(t) = 1 / S_C(t + c0)")
subtitle(ax, "删失率 %.0f%%, 下线时刻与寿命独立" % (FOCUS_RATE * 100))
fig.tight_layout(rect=(0, 0.1, 1, 1))
legend_below(fig, [Line2D([], [], color=c) for c in RATE_COLS[:len(c0s)]], [str(c) for c in c0s], len(c0s), title="c0")
save_fig(fig, "F05_weights_vs_t")

# ================= 无删失基线 =================
# F06 分段覆盖率: 全部循环校准 vs 一机一点
b = rd("s02_lpb_summary.csv")
bins_ = bin_labels(b)
labels_ = [c[3:] for c in bins_]
fig, ax = new_fig(8.5, 6.5)
x = np.arange(len(bins_)); bw = 0.31
for k, (code, lab, c) in enumerate([("all", "全部循环校准", "#2E4A6B"), ("one_mean", "一机一点校准 (均值)", "#3D7A5A")]):
    row = b[b.method_code == code].iloc[0]
    ax.bar(x + (k - 0.5) * bw, [row[c_] for c_ in bins_], width=bw, color=c, label=lab)
ax.axhline(nominal, linestyle="--", linewidth=0.8, color="black")
ax.set_xticks(x); ax.set_xticklabels(labels_); ax.set_ylim(0.5, 1.0)
ax.set_xlabel("真实 RUL 区段"); ax.set_ylabel("覆盖率"); ax.grid(axis="x", visible=False)
fig.tight_layout(rect=(0, 0.1, 1, 1))
legend_below(fig, *ax.get_legend_handles_labels(), 2)
save_fig(fig, "F06_baseline_stratified_coverage")

# F11 测试机最后一循环: 按真实 RUL 排序, 点预测与两侧区间 (论文二式)
pr = rd("s02_test_predictions.csv")
pr = pr[pr.is_last == 1].sort_values("rul").reset_index(drop=True)
pr["rank"] = np.arange(1, len(pr) + 1); pr["lo"] = np.maximum(pr.lo, 0)
fig, ax = new_fig(12, 7)
ax.fill_between(pr["rank"], pr.lo, pr.hi, color="#DCE7F2", linewidth=0)
ax.plot(pr["rank"], pr.yhat, color="#6E7A8A", linewidth=0.7, linestyle=":")
ax.scatter(pr["rank"], pr.rul, s=6, color="black", zorder=3)
ax.set_xlabel("测试发动机 (按真实 RUL 排序)"); ax.set_ylabel("RUL (循环)")
subtitle(ax, "点为真实 RUL, 虚线为点预测, 带为 %.0f%% 两侧共形区间" % (nominal * 100))
fig.tight_layout()
save_fig(fig, "F11_twosided_intervals_sorted")

# ================= 删失结果 =================
m = rd("s03_methods.csv")
method_handles = [Line2D([], [], color=METHOD_COLORS[k], marker="o", markersize=3.5) for k in METHOD_LEVELS]
method_patches = [Patch(color=METHOD_COLORS[k]) for k in METHOD_LEVELS]
method_labels = [METHOD_LABELS[k] for k in METHOD_LEVELS]

# F07 覆盖率随删失率 (c0 固定): 总体 与 决策区
m7 = m[m.c0 == FOCUS_C0]
fig, axes = plt.subplots(1, 2, figsize=(16 * CM, 8 * CM), sharey=False)
for ax, col, ttl in zip(axes, ["coverage", "cov_dec"], ["总体覆盖率", "决策区覆盖率 (真实 RUL < %d)" % FOCUS_C0]):
    ax.axhline(nominal, linestyle="--", linewidth=0.8, color="black")
    for k in METHOD_LEVELS:
        d = m7[m7.method_code == k].sort_values("rate")
        ax.plot(d.rate, d[col], color=METHOD_COLORS[k], linewidth=1.0, marker="o", markersize=3.5)
    ax.set_xticks(rates); ax.set_xticklabels(["%.0f%%" % (r * 100) for r in rates])
    ax.set_title(ttl, fontsize=PT, pad=3, backgroundcolor="#F2F2F2"); ax.set_xlabel("删失率")
axes[0].set_ylabel("覆盖率")
fig.suptitle("c0 = %d" % FOCUS_C0, x=0.02, ha="left", fontsize=PT)
fig.tight_layout(rect=(0, 0.14, 1, 0.95)); fig.subplots_adjust(wspace=0.28)
legend_below(fig, method_handles, method_labels, 3)
save_fig(fig, "F07_coverage_vs_censoring_rate")

# F08 分段覆盖率柱状图 (rate, c0 固定)
m8 = m[(m.c0 == FOCUS_C0) & (np.abs(m.rate - FOCUS_RATE) < 1e-9)]
bins_ = bin_labels(m8); labels_ = [c[3:] for c in bins_]
fig, ax = new_fig(16, 8)
x = np.arange(len(bins_)); n = len(METHOD_LEVELS); bw = 0.8 / n
for k, code in enumerate(METHOD_LEVELS):
    row = m8[m8.method_code == code]
    if len(row) == 0:
        continue
    row = row.iloc[0]
    ax.bar(x + (k - (n - 1) / 2) * bw, [row[c_] for c_ in bins_], width=bw, color=METHOD_COLORS[code])
ax.axhline(nominal, linestyle="--", linewidth=0.8, color="black")
ax.set_xticks(x); ax.set_xticklabels(labels_); ax.set_ylim(0, 1.0); ax.grid(axis="x", visible=False)
ax.set_xlabel("真实 RUL 区段"); ax.set_ylabel("覆盖率")
subtitle(ax, "删失率 %.0f%%, c0 = %d" % (FOCUS_RATE * 100, FOCUS_C0))
fig.tight_layout(rect=(0, 0.14, 1, 1))
legend_below(fig, method_patches, method_labels, 3)
save_fig(fig, "F08_stratified_coverage_by_method")

# F09 覆盖率与紧度的取舍 (c0 固定)
m9 = m[m.c0 == FOCUS_C0]
fig, ax = new_fig(12, 9.5)
ax.axhline(nominal, linestyle="--", linewidth=0.8, color="black")
for r, mk in zip(rates, RATE_MARKERS):
    for k in METHOD_LEVELS:
        d = m9[(m9.method_code == k) & (np.abs(m9.rate - r) < 1e-9)]
        ax.scatter(d.mean_L, d.cov_dec, color=METHOD_COLORS[k], marker=mk, s=28, zorder=3)
ax.set_xlabel("平均下界 (循环)"); ax.set_ylabel("决策区覆盖率 (真实 RUL < %d)" % FOCUS_C0)
subtitle(ax, "c0 = %d; 右上为好" % FOCUS_C0)
fig.tight_layout(rect=(0, 0.26, 1, 1))
leg1 = fig.legend([Line2D([], [], color=METHOD_COLORS[k], marker="o", linestyle="", markersize=5) for k in METHOD_LEVELS],
                  method_labels, loc="lower center", bbox_to_anchor=(0.5, 0.11), ncol=3, frameon=False)
fig.add_artist(leg1)
fig.legend([Line2D([], [], color="black", marker=mk, linestyle="", markersize=5) for mk in RATE_MARKERS[:len(rates)]],
           ["%.0f%%" % (r * 100) for r in rates], loc="lower center", bbox_to_anchor=(0.5, -0.01), ncol=len(rates) + 1,
           title="删失率", frameon=False)
save_fig(fig, "F09_coverage_vs_tightness")

# F10 一台测试发动机的下界轨迹
pred = rd("s03_test_predictions_%s_%s.csv" % (rate_tag, c0_tag))
g = pred.groupby("unit").agg(mn=("rul", "min"), mx=("rul", "max"), n=("rul", "size")).reset_index()
cand = g[(g.mn <= 5) & (g.mx >= 60)].sort_values("n", ascending=False)
pick_unit = int(cand.unit.iloc[0]) if len(cand) else int(g.sort_values("mn").unit.iloc[0])
one = pred[pred.unit == pick_unit].sort_values("t")
fig, ax = new_fig(16, 8)
ax.axhline(FOCUS_C0, linestyle=":", linewidth=0.8, color="grey")
ax.plot(one.t, one.rul, color="black", linewidth=1.4)
handles = []
for k in METHOD_LEVELS:
    col = "L_" + k
    if col in one and one[col].notna().any():
        ax.plot(one.t, one[col], color=METHOD_COLORS[k], linewidth=0.9)
        handles.append(Line2D([], [], color=METHOD_COLORS[k]))
ax.set_xlabel("循环 t"); ax.set_ylabel("RUL (循环)")
subtitle(ax, "测试发动机 %d; 黑线为真实 RUL, 彩线为各方法下界; 删失率 %.0f%%, c0 = %d" % (pick_unit, FOCUS_RATE * 100, FOCUS_C0))
fig.tight_layout(rect=(0, 0.14, 1, 1))
legend_below(fig, handles, [METHOD_LABELS[k] for k in METHOD_LEVELS if ("L_" + k) in one and one["L_" + k].notna().any()], 3)
save_fig(fig, "F10_single_engine_trajectory")

print("\n全部完成。图在:", FIG_DIR)
print("F01 失效循环数分布  F02 传感器退化轨迹  F03 删失时间线  F04 样本量核算  F05 权重曲线")
print("F06 基线分段覆盖  F07 覆盖率随删失率  F08 分段覆盖柱状  F09 覆盖率与紧度  F10 单机轨迹  F11 两侧区间排序图")
