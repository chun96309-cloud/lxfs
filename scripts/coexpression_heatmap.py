# -*- coding: utf-8 -*-
"""
6 个 marker 基因与其余基因的共表达热图。

流程:
  1. 读入表达矩阵 (436 基因 x 6 样本) 与 marker 列表 (6 基因)
  2. CPM 标准化后 log2(CPM+1)  (N 组与 P 组文库大小相差约 4 倍, 必须先标准化)
  3. 每个 marker 与其余基因逐一计算 Pearson 相关系数
  4. 每个 marker 取 |r| 最大的前 TOPN 个基因, 取并集作为热图的列
  5. 对列做层次聚类排序, 输出矢量热图 (PDF + SVG) 与完整相关系数表 (CSV)

用法:
  python coexpression_heatmap.py [expression_matrix.xlsx] [marker_genes.xlsx]
  不带参数时使用下方 EXPR_FILE / MARKER_FILE 的默认路径。
"""

import os
import sys
import numpy as np
import openpyxl
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap, TwoSlopeNorm

# ---------------- 输入输出 ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXPR_FILE = os.path.join(BASE_DIR, "expression_matrix.xlsx")
MARKER_FILE = os.path.join(BASE_DIR, "marker_genes.xlsx")
if len(sys.argv) >= 3:
    EXPR_FILE, MARKER_FILE = sys.argv[1], sys.argv[2]
OUT_STEM = os.path.join(BASE_DIR, "Fig_coexpression_heatmap")

# ---------------- 参数 ----------------
TOPN = 20              # 每个 marker 取 |r| 最大的前 N 个基因
CORR_METHOD = "pearson"  # 在 log2(CPM+1) 上计算
GENE_LABEL_SIZE = 5.5  # 基因名过多, 单独设小字号; 其余文字为五号 10.5

# ---------------- 字体 ----------------
plt.rcParams["font.family"] = "serif"
plt.rcParams["font.serif"] = ["Times New Roman", "SimSun", "Liberation Serif"]
plt.rcParams["font.sans-serif"] = ["SimSun"]
plt.rcParams["mathtext.fontset"] = "stix"
plt.rcParams["axes.unicode_minus"] = False
plt.rcParams["font.size"] = 10.5
plt.rcParams["axes.labelsize"] = 10.5
plt.rcParams["xtick.labelsize"] = 10.5
plt.rcParams["ytick.labelsize"] = 10.5
plt.rcParams["pdf.fonttype"] = 42
plt.rcParams["ps.fonttype"] = 42
plt.rcParams["svg.fonttype"] = "none"


def read_matrix(path):
    """读取 xlsx, 返回 (样本名, 基因名列表, 计数矩阵)"""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    header = [h for h in rows[0] if h is not None]
    samples = header[1:]
    genes, values = [], []
    for r in rows[1:]:
        if r[0] is None:
            continue
        genes.append(str(r[0]))
        values.append([float(r[i + 1]) for i in range(len(samples))])
    return samples, genes, np.array(values, dtype=float)


def pearson_vs_matrix(v, M):
    """向量 v 与矩阵 M 每一行的 Pearson r"""
    vc = v - v.mean()
    Mc = M - M.mean(axis=1, keepdims=True)
    denom = np.sqrt((Mc ** 2).sum(axis=1)) * np.sqrt((vc ** 2).sum())
    denom[denom == 0] = np.nan
    return (Mc @ vc) / denom


def order_by_cluster(M):
    """对列做层次聚类排序; 若无 scipy 则退化为按最大相关的 marker 分组排序"""
    try:
        from scipy.cluster.hierarchy import linkage, leaves_list
        from scipy.spatial.distance import pdist
        d = pdist(M.T, metric="correlation")
        d = np.nan_to_num(d, nan=1.0)
        return leaves_list(linkage(d, method="average", optimal_ordering=True))
    except Exception:
        key = np.argmax(np.abs(M), axis=0)
        val = M[key, np.arange(M.shape[1])]
        return np.lexsort((-val, key))


# ---------------- 1. 读入并标准化 ----------------
samples, genes, counts = read_matrix(EXPR_FILE)
m_samples, marker_ids, _ = read_matrix(MARKER_FILE)
if samples != m_samples:
    raise ValueError("两个文件的样本列不一致: {} vs {}".format(samples, m_samples))

cpm = counts / counts.sum(axis=0, keepdims=True) * 1e6
logcpm = np.log2(cpm + 1.0)
gene_index = {g: i for i, g in enumerate(genes)}

missing = [g for g in marker_ids if g not in gene_index]
if missing:
    raise ValueError("marker 基因不在表达矩阵中: {}".format(missing))

other_genes = [g for g in genes if g not in set(marker_ids)]
other_mat = logcpm[[gene_index[g] for g in other_genes]]

# ---------------- 2. 相关系数矩阵 (6 x 其余基因) ----------------
R = np.vstack([pearson_vs_matrix(logcpm[gene_index[m]], other_mat) for m in marker_ids])

# ---------------- 3. 每个 marker 取 topN, 求并集 ----------------
selected = []
for i in range(len(marker_ids)):
    order = np.argsort(-np.abs(np.nan_to_num(R[i])))[:TOPN]
    for j in order:
        if other_genes[j] not in selected:
            selected.append(other_genes[j])
sel_idx = [other_genes.index(g) for g in selected]
Rsel = R[:, sel_idx]
col_order = order_by_cluster(Rsel)
Rsel = Rsel[:, col_order]
sel_names = [selected[j] for j in col_order]

# ---------------- 4. 绘图 ----------------
# 配色: NPG 蓝白红, 蓝为负相关, 红为正相关, 白为 0
# Pearson r 本身的取值范围是 [-1, 1], 故色标固定为 -1 到 1, 不随数据缩放
cmap = LinearSegmentedColormap.from_list(
    "npg_blue_white_red", ["#3C5488", "#FFFFFF", "#E64B35"])
norm = TwoSlopeNorm(vmin=-1.0, vcenter=0.0, vmax=1.0)

n_col = Rsel.shape[1]
n_row = Rsel.shape[0]
fig_w = max(6.0, n_col * 0.105 + 1.8)
fig_h = n_row * 0.28 + 1.9
fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=300)

im = ax.imshow(Rsel, cmap=cmap, norm=norm, aspect="auto", interpolation="nearest")

ax.set_xticks(np.arange(n_col))
ax.set_xticklabels(sel_names, rotation=90, fontsize=GENE_LABEL_SIZE)
ax.set_yticks(np.arange(n_row))
ax.set_yticklabels(marker_ids, fontsize=8)
ax.set_xticks(np.arange(-0.5, n_col, 1), minor=True)
ax.set_yticks(np.arange(-0.5, n_row, 1), minor=True)
ax.grid(which="minor", color="white", linewidth=0.4)
ax.tick_params(which="minor", length=0)
ax.tick_params(which="major", length=2.0, width=0.8)
for side in ("left", "bottom", "right", "top"):
    ax.spines[side].set_linewidth(0.8)

cbar = fig.colorbar(im, ax=ax, fraction=0.02, pad=0.012,
                    ticks=[-1.0, -0.5, 0.0, 0.5, 1.0])
cbar.set_label("Pearson r", fontsize=10.5)
cbar.ax.tick_params(labelsize=9)
cbar.outline.set_linewidth(0.8)

ax.set_xlabel("Co-expressed genes (top {} per marker, n = {})".format(TOPN, n_col),
              fontsize=10.5, labelpad=6)
ax.set_ylabel("Marker genes", fontsize=10.5)

fig.tight_layout()
for ext in ("pdf", "svg"):
    path = "{}.{}".format(OUT_STEM, ext)
    fig.savefig(path, format=ext, bbox_inches="tight", pad_inches=0.05)
    print("saved:", path)
plt.close(fig)

# ---------------- 5. 导出完整相关系数表 ----------------
csv_path = OUT_STEM + "_correlation_full.csv"
with open(csv_path, "w", encoding="utf-8-sig") as fh:
    fh.write("gene," + ",".join(marker_ids) + ",in_heatmap\n")
    for j, g in enumerate(other_genes):
        fh.write(g + "," + ",".join("{:.4f}".format(R[i, j]) for i in range(n_row)))
        fh.write(",{}\n".format("yes" if g in selected else "no"))
print("saved:", csv_path)

# ---------------- 6. 关键信息输出 ----------------
print("\nsamples:", samples)
print("library size (raw counts):", counts.sum(axis=0).astype(int).tolist())
print("genes in matrix:", len(genes), " markers:", len(marker_ids),
      " others:", len(other_genes))
print("genes kept in heatmap:", n_col)
print("n = 6 samples -> |r| > 0.811 corresponds to P < 0.05 (two-sided)")
print("\ntop 3 co-expressed genes per marker:")
for i, m in enumerate(marker_ids):
    order = np.argsort(-np.abs(np.nan_to_num(R[i])))[:3]
    txt = ", ".join("{} (r = {:.3f})".format(other_genes[j], R[i, j]) for j in order)
    print("  {}: {}".format(m, txt))
