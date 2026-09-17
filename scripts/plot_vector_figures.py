# -*- coding: utf-8 -*-
"""
绘制 xlsx 中两块黄底数据的折线图（均值 +/- 标准差），输出矢量图 PDF 与 SVG。
图1: SeNPs release (%) ~ Time (hours), 4 组 x 3 重复
图2: Tumor volume (mm3) ~ Time (days), 4 组 x 6 重复
字体: 英文 Times New Roman 五号(10.5 pt), 中文 SimSun 五号(10.5 pt)
"""

import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import MultipleLocator

# ---------------- 输出目录 ----------------
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------- 轴标题（与 xlsx 中登记的一致，可在此处修改） ----------------
FIG1_XLABEL = "Times (hours)"
FIG1_YLABEL = "SeNPs release (%)"
FIG2_XLABEL = "Time (days)"
FIG2_YLABEL = r"Tumor volume (mm$\mathbf{^3}$)"

# ---------------- 全局字体与线宽 ----------------
plt.rcParams["font.family"] = "serif"
plt.rcParams["font.serif"] = ["Times New Roman", "SimSun", "Liberation Serif"]
plt.rcParams["font.sans-serif"] = ["SimSun"]
plt.rcParams["mathtext.fontset"] = "stix"
plt.rcParams["mathtext.default"] = "bf"
plt.rcParams["font.weight"] = "bold"
plt.rcParams["axes.labelweight"] = "bold"
plt.rcParams["axes.titleweight"] = "bold"
plt.rcParams["axes.unicode_minus"] = False
plt.rcParams["font.size"] = 10.5
plt.rcParams["axes.labelsize"] = 10.5
plt.rcParams["xtick.labelsize"] = 10.5
plt.rcParams["ytick.labelsize"] = 10.5
plt.rcParams["legend.fontsize"] = 10.5
plt.rcParams["pdf.fonttype"] = 42          # 字体以 TrueType 嵌入，保证可编辑矢量
plt.rcParams["ps.fonttype"] = 42
plt.rcParams["svg.fonttype"] = "none"      # SVG 中文字保留为文本对象

# ---------------- 数据块1: 释放曲线 (n=3) ----------------
T1 = np.array([0, 3, 6, 12, 18, 24], dtype=float)
REL = {
    "PBS": np.array([
        [0, 0, 0],
        [13.86, 14.54, 14.91],
        [17.92, 17.19, 17.65],
        [26.71, 27.29, 27.36],
        [36.03, 35.14, 35.61],
        [40.62, 40.83, 41.29],
    ]),
    r"$\mathbf{H_2O_2}$": np.array([
        [0, 0, 0],
        [37.05, 37.95, 37.64],
        [43.37, 42.80, 43.17],
        [53.25, 52.47, 52.80],
        [60.79, 61.27, 60.57],
        [68.65, 68.81, 69.34],
    ]),
    "UTMD": np.array([
        [0, 0, 0],
        [41.14, 42.07, 41.61],
        [49.08, 48.44, 48.63],
        [55.97, 56.41, 56.59],
        [62.35, 63.53, 62.71],
        [73.15, 72.37, 73.26],
    ]),
    r"$\mathbf{H_2O_2}$+UTMD": np.array([
        [0, 0, 0],
        [45.31, 46.22, 45.75],
        [52.86, 53.01, 53.26],
        [63.50, 63.06, 63.65],
        [70.57, 70.42, 70.05],
        [78.83, 79.32, 78.51],
    ]),
}

# ---------------- 数据块2: 肿瘤体积 (n=6) ----------------
T2 = np.array([0, 2, 4, 6, 8, 10, 12, 14], dtype=float)
TUMOR = {
    "OC": np.array([
        [88.4835, 62.6220, 95.6480, 68.4130, 94.7700, 99.2380],
        [152.1000, 147.6000, 164.1520, 164.7135, 175.7120, 173.7765],
        [245.4800, 235.8720, 262.4000, 241.8750, 230.6250, 240.1245],
        [355.0080, 361.2500, 388.8000, 367.8400, 364.5000, 369.8000],
        [496.3750, 522.1995, 535.0000, 514.5525, 494.6060, 503.6520],
        [707.8680, 738.1000, 752.6400, 753.7680, 706.9195, 729.0000],
        [1002.9090, 1148.4380, 1079.0900, 1148.2290, 1030.1920, 1015.2000],
        [1510.9560, 1520.2890, 1594.6880, 1692.5130, 1516.6990, 1663.5300],
    ]),
    "OC+DDP": np.array([
        [97.5560, 93.7750, 85.0000, 97.4700, 94.6400, 92.5120],
        [143.7480, 145.7625, 148.8400, 141.5375, 136.8000, 141.3120],
        [181.4760, 178.5375, 180.2240, 171.0880, 179.5600, 170.5820],
        [181.4760, 183.7500, 174.6360, 168.3375, 190.4400, 175.7120],
        [265.6000, 259.9200, 251.8960, 259.2000, 262.8080, 272.7340],
        [356.2240, 363.9680, 361.2500, 372.6000, 359.8560, 356.3280],
        [428.6875, 445.4235, 463.8900, 432.4500, 463.8900, 435.6550],
        [556.9725, 561.0550, 563.5575, 545.0000, 565.0000, 590.0000],
    ]),
    "OC+SeNPs": np.array([
        [63.8780, 77.1840, 99.2380, 90.3960, 79.2330, 89.7345],
        [158.1425, 158.7600, 159.5280, 153.6000, 149.9160, 158.4375],
        [198.5750, 204.7230, 205.3125, 201.6400, 185.1300, 207.3600],
        [281.2500, 274.3600, 262.4000, 276.8220, 290.5210, 277.7245],
        [381.0240, 356.3720, 377.1960, 372.0875, 375.7000, 378.8950],
        [521.3240, 509.9125, 503.6520, 496.3750, 541.0175, 503.6080],
        [689.5850, 705.6720, 678.0375, 638.1440, 663.0625, 640.0000],
        [906.5990, 950.4000, 896.6295, 874.6400, 861.9075, 868.6305],
    ]),
    "OC+DDP+SeNPs": np.array([
        [69.3375, 86.2125, 99.0945, 90.0000, 80.0000, 98.7840],
        [127.0500, 120.9325, 132.9615, 118.8000, 120.0945, 118.3540],
        [153.1640, 147.8750, 154.6380, 132.9615, 133.2000, 161.6040],
        [153.1640, 147.8750, 154.6380, 132.9615, 133.2000, 161.6040],
        [194.3500, 198.4500, 207.3600, 189.0375, 197.5160, 210.4955],
        [278.4375, 295.2450, 316.8940, 285.7700, 285.9120, 288.6840],
        [299.4145, 328.1040, 335.1600, 299.6715, 288.8000, 295.2450],
        [310.2840, 343.9140, 343.1875, 310.0050, 329.6000, 305.9420],
    ]),
}

# 配色: 参考图四色 (蓝/红/紫/橙)
# 注意: 参考图第四块的 HEX 与 RGB 不一致 (HEX 写 5e994d 为绿色, RGB 251,211,163 为浅橙),
# 色块实际显示为浅橙, 故按 RGB 取 #FBD3A3
COLORS = ["#91ABD2", "#F59694", "#BCA6CD", "#FBD3A3"]
MARKERS = ["s", "o", "^", "v"]


def style_axes(ax, xmajor, ymajor, xlim, ylim):
    """统一坐标轴样式: 加粗黑色边框, 刻度朝外"""
    for side in ("left", "bottom", "right", "top"):
        ax.spines[side].set_linewidth(1.6)
        ax.spines[side].set_color("black")
    ax.tick_params(axis="both", which="major", direction="out",
                   length=5.0, width=1.6, colors="black", top=False, right=False)
    ax.tick_params(axis="both", which="minor", direction="out",
                   length=3.0, width=1.2, top=False, right=False)
    ax.xaxis.set_major_locator(MultipleLocator(xmajor))
    ax.yaxis.set_major_locator(MultipleLocator(ymajor))
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)


def plot_group(ax, x, data_dict, capsize=3.0):
    for i, (name, arr) in enumerate(data_dict.items()):
        mean = arr.mean(axis=1)
        sd = arr.std(axis=1, ddof=1)
        ax.errorbar(x, mean, yerr=sd,
                    color=COLORS[i], marker=MARKERS[i], markersize=5.0,
                    markerfacecolor=COLORS[i], markeredgecolor=COLORS[i],
                    linewidth=1.8, elinewidth=1.3, capsize=capsize,
                    capthick=1.3, label=name, clip_on=False, zorder=3 + i)


def save(fig, stem):
    for ext in ("pdf", "svg"):
        path = os.path.join(OUT_DIR, "{}.{}".format(stem, ext))
        fig.savefig(path, format=ext, bbox_inches="tight", pad_inches=0.05,
                    transparent=False)
        print("saved:", path)


# ---------------- 图1 ----------------
# 画幅加大、纵轴留出上方余量、图例行距收紧, 避免图例文字与曲线重叠
fig1, ax1 = plt.subplots(figsize=(4.0, 3.2), dpi=300)
plot_group(ax1, T1, REL)
style_axes(ax1, xmajor=6, ymajor=20, xlim=(0, 24), ylim=(0, 106))
ax1.set_xlabel(FIG1_XLABEL)
ax1.set_ylabel(FIG1_YLABEL)
leg1 = ax1.legend(loc="upper left", frameon=False, handlelength=1.5,
                  labelspacing=0.22, borderpad=0.15, handletextpad=0.4,
                  borderaxespad=0.3)
save(fig1, "Fig1_SeNPs_release")
plt.close(fig1)

# ---------------- 图2 ----------------
fig2, ax2 = plt.subplots(figsize=(3.35, 2.75), dpi=300)
plot_group(ax2, T2, TUMOR)
style_axes(ax2, xmajor=2, ymajor=400, xlim=(0, 14), ylim=(0, 1800))
ax2.set_xlabel(FIG2_XLABEL)
ax2.set_ylabel(FIG2_YLABEL)
leg2 = ax2.legend(loc="upper left", frameon=False, handlelength=1.8,
                  labelspacing=0.3, borderpad=0.2, handletextpad=0.5)
save(fig2, "Fig2_Tumor_volume")
plt.close(fig2)

# ---------------- 均值与标准差（供核对，不修改原始数据） ----------------
print("\n[Fig1] mean +/- SD (n=3)")
for name, arr in REL.items():
    m = arr.mean(axis=1); s = arr.std(axis=1, ddof=1)
    print(name, ["{:.2f}+/-{:.2f}".format(a, b) for a, b in zip(m, s)])
print("\n[Fig2] mean +/- SD (n=6)")
for name, arr in TUMOR.items():
    m = arr.mean(axis=1); s = arr.std(axis=1, ddof=1)
    print(name, ["{:.1f}+/-{:.1f}".format(a, b) for a, b in zip(m, s)])
