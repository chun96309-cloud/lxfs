# -*- coding: utf-8 -*-
# 6 个 marker 基因与其余基因的共表达热图 (ComplexHeatmap 版)
#
# 流程与 Python 版一致:
#   1. 读入表达矩阵与 marker 列表
#   2. CPM 标准化后 log2(CPM+1)
#   3. 每个 marker 与其余基因逐一计算 Pearson 相关系数
#   4. 每个 marker 取 |r| 最大的前 TOPN 个基因, 取并集
#   5. 列做层次聚类排序, 输出横版与竖版 PDF, 并导出完整相关系数表
#
# 依赖: readxl, ComplexHeatmap, circlize
#   install.packages(c("readxl", "circlize"))
#   if (!require("BiocManager")) install.packages("BiocManager")
#   BiocManager::install("ComplexHeatmap")

suppressPackageStartupMessages({
  library(readxl)
  library(ComplexHeatmap)
  library(circlize)
  library(grid)
})

## ---------------- 工作目录 ----------------
## 直接把工作目录切到这里, 之后所有相对路径都以它为准:
##   <WORK_ROOT>/data/          输入数据 (xlsx)
##   <WORK_ROOT>/YYYY-MM-DD/    当天的输出, 每天自动新建一个文件夹
WORK_ROOT <- "C:/Users/23027/Desktop/11/画各种图"
dir.create(WORK_ROOT, showWarnings = FALSE, recursive = TRUE)
setwd(WORK_ROOT)
DATA_DIR <- file.path(WORK_ROOT, "data")
dir.create(DATA_DIR, showWarnings = FALSE, recursive = TRUE)
OUT_DIR <- file.path(WORK_ROOT, format(Sys.Date(), "%Y-%m-%d"))
dir.create(OUT_DIR, showWarnings = FALSE, recursive = TRUE)

## ---------------- 输入文件与参数 ----------------
## 输入文件: 同名的 .txt 和 .xlsx 都支持, 优先用存在的那个
pick_file <- function(stem) {
  for (ext in c(".txt", ".tsv", ".csv", ".xlsx")) {
    cand <- file.path(DATA_DIR, paste0(stem, ext))
    if (file.exists(cand)) return(cand)
  }
  file.path(DATA_DIR, paste0(stem, ".xlsx"))
}
EXPR_FILE   <- pick_file("expression_matrix")
MARKER_FILE <- pick_file("marker_genes")
TOPN        <- 20      # 每个 marker 取 |r| 最大的前 N 个基因
FONT        <- "Times New Roman"
GENE_FS     <- 5.5     # 基因名字号
MARKER_FS   <- 8       # marker 名字号
TITLE_FS    <- 10.5    # 标题与图例字号 (五号)

args <- commandArgs(trailingOnly = TRUE)
if (length(args) >= 2) {
  EXPR_FILE <- args[1]
  MARKER_FILE <- args[2]
}

## ---------------- 1. 读入 ----------------
## 按扩展名读取 xlsx 或文本表格 (制表符/逗号分隔)
read_table_any <- function(path, header = TRUE) {
  ext <- tolower(tools::file_ext(path))
  if (ext %in% c("xlsx", "xlsm", "xltx")) {
    as.data.frame(read_excel(path, col_names = header))
  } else {
    sep <- if (ext == "csv") "," else "\t"
    read.table(path, header = header, sep = sep, quote = "",
               comment.char = "", check.names = FALSE,
               stringsAsFactors = FALSE)
  }
}

read_matrix <- function(path) {
  df <- read_table_any(path, header = TRUE)
  df <- df[, colSums(!is.na(df)) > 0, drop = FALSE]   # 去掉全空列
  ids <- as.character(df[[1]])
  m <- as.matrix(df[, -1, drop = FALSE])
  storage.mode(m) <- "double"
  rownames(m) <- ids
  m
}

## 读取 marker 基因名。支持单列基因名文件 (可有可无表头), 或与表达矩阵同结构的文件
read_marker_ids <- function(path) {
  df <- read_table_any(path, header = FALSE)
  ids <- trimws(as.character(df[[1]]))
  ids <- ids[nzchar(ids)]
  if (length(ids) && (startsWith(ids[1], "#") ||
                      tolower(ids[1]) %in% c("id", "gene", "geneid"))) {
    ids <- ids[-1]                                     # 跳过表头
  }
  ids
}

expr <- read_matrix(EXPR_FILE)
marker_ids <- read_marker_ids(MARKER_FILE)
if (!all(marker_ids %in% rownames(expr))) {
  stop("marker 基因不在表达矩阵中: ",
       paste(setdiff(marker_ids, rownames(expr)), collapse = ", "))
}

## ---------------- 2. CPM 标准化 ----------------
cpm <- sweep(expr, 2, colSums(expr), "/") * 1e6
L <- log2(cpm + 1)

other_ids <- setdiff(rownames(L), marker_ids)
Lm <- L[marker_ids, , drop = FALSE]
Lo <- L[other_ids, , drop = FALSE]

## ---------------- 3. 相关系数矩阵 (6 x 其余基因) ----------------
R <- cor(t(Lm), t(Lo), method = "pearson")

## ---------------- 4. 每个 marker 取 topN, 求并集 ----------------
selected <- character(0)
for (i in seq_len(nrow(R))) {
  ord <- order(abs(R[i, ]), decreasing = TRUE)[seq_len(TOPN)]
  selected <- union(selected, colnames(R)[ord])
}
Rsel <- R[, selected, drop = FALSE]

## 列聚类排序 (1 - Pearson 相关距离, average linkage), 两版共用同一顺序
d_genes <- as.dist(1 - cor(Rsel))
hc_genes <- hclust(d_genes, method = "average")

## ---------------- 5. 绘图 ----------------
col_fun <- colorRamp2(c(-1, 0, 1), c("#3C5488", "#FFFFFF", "#E64B35"))
n_gene <- ncol(Rsel)
gene_title <- sprintf("Co-expressed genes (top %d per marker, n = %d)", TOPN, n_gene)
marker_title <- "Marker genes"

legend_param <- list(
  title = "Pearson r",
  at = c(-1, -0.5, 0, 0.5, 1),
  title_gp = gpar(fontsize = TITLE_FS, fontfamily = FONT, fontface = "bold"),
  labels_gp = gpar(fontsize = 9, fontfamily = FONT, fontface = "bold"),
  border = "black"
)

## 横版: marker 作行, 基因作列
ht_h <- Heatmap(
  Rsel,
  name = "Pearson r",
  col = col_fun,
  cluster_rows = FALSE,
  cluster_columns = hc_genes,
  show_column_dend = FALSE,
  row_names_side = "left",
  column_names_side = "bottom",
  row_names_gp = gpar(fontsize = MARKER_FS, fontfamily = FONT, fontface = "bold"),
  column_names_gp = gpar(fontsize = GENE_FS, fontfamily = FONT, fontface = "bold"),
  row_title = marker_title,
  column_title = gene_title,
  column_title_side = "bottom",
  row_title_gp = gpar(fontsize = TITLE_FS, fontfamily = FONT, fontface = "bold"),
  column_title_gp = gpar(fontsize = TITLE_FS, fontfamily = FONT, fontface = "bold"),
  rect_gp = gpar(col = "white", lwd = 0.4),
  border = TRUE,
  heatmap_legend_param = legend_param
)

path_h <- file.path(OUT_DIR, "Fig_coexpression_heatmap_horizontal.pdf")
cairo_pdf(path_h, width = max(6, n_gene * 0.105 + 2.2),
          height = nrow(Rsel) * 0.28 + 2.2, family = FONT)
draw(ht_h, heatmap_legend_side = "right", merge_legend = TRUE)
dev.off()
cat("saved:", normalizePath(path_h), "\n")

## 竖版: 基因作行, marker 作列
Rt <- t(Rsel)
ht_v <- Heatmap(
  Rt,
  name = "Pearson r",
  col = col_fun,
  cluster_rows = hc_genes,
  cluster_columns = FALSE,
  show_row_dend = FALSE,
  row_names_side = "left",
  column_names_side = "bottom",
  row_names_gp = gpar(fontsize = GENE_FS, fontfamily = FONT, fontface = "bold"),
  column_names_gp = gpar(fontsize = MARKER_FS, fontfamily = FONT, fontface = "bold"),
  row_title = gene_title,
  column_title = marker_title,
  column_title_side = "bottom",
  row_title_gp = gpar(fontsize = TITLE_FS, fontfamily = FONT, fontface = "bold"),
  column_title_gp = gpar(fontsize = TITLE_FS, fontfamily = FONT, fontface = "bold"),
  rect_gp = gpar(col = "white", lwd = 0.4),
  border = TRUE,
  heatmap_legend_param = legend_param
)

path_v <- file.path(OUT_DIR, "Fig_coexpression_heatmap_vertical.pdf")
cairo_pdf(path_v, width = ncol(Rt) * 0.28 + 3.0,
          height = max(4, nrow(Rt) * 0.105 + 1.8), family = FONT)
draw(ht_v, heatmap_legend_side = "right", merge_legend = TRUE)
dev.off()
cat("saved:", normalizePath(path_v), "\n")

## ---------------- 6. 导出完整相关系数表 ----------------
## 相关系数 -> t 检验 P 值 (df = n - 2), 再做 BH 多重检验校正
n_sample <- ncol(L)
df_t <- n_sample - 2
tstat <- R * sqrt(df_t) / sqrt(pmax(1 - R^2, 1e-12))
P <- 2 * pt(abs(tstat), df = df_t, lower.tail = FALSE)
Q <- matrix(p.adjust(as.vector(P), method = "BH"), nrow = nrow(P),
            dimnames = dimnames(P))

out_tab <- data.frame(gene = colnames(R), stringsAsFactors = FALSE)
for (i in seq_len(nrow(R))) {
  m <- rownames(R)[i]
  out_tab[[paste0("r_", m)]] <- round(R[i, ], 4)
  out_tab[[paste0("P_", m)]] <- signif(P[i, ], 4)
  out_tab[[paste0("BH_q_", m)]] <- signif(Q[i, ], 4)
}
out_tab$in_heatmap <- ifelse(colnames(R) %in% selected, "yes", "no")
csv_path <- file.path(OUT_DIR, "Fig_coexpression_heatmap_correlation_full.csv")
write.csv(out_tab, csv_path, row.names = FALSE, fileEncoding = "UTF-8")
cat("saved:", normalizePath(csv_path), "\n")

## ---------------- 7. 关键信息 ----------------
cat("\nsamples:", paste(colnames(expr), collapse = ", "), "\n")
cat("library size (raw counts):", paste(colSums(expr), collapse = ", "), "\n")
cat("genes in matrix:", nrow(expr), " markers:", length(marker_ids),
    " others:", length(other_ids), "\n")
cat("genes kept in heatmap:", n_gene, "\n")
cat(sprintf("n = %d samples -> |r| > 0.811 corresponds to P < 0.05 (two-sided)\n",
            n_sample))
cat(sprintf("pairs with P < 0.05: %d / %d\n", sum(P < 0.05), length(P)))
cat(sprintf("pairs with BH q < 0.05: %d / %d\n\n", sum(Q < 0.05), length(Q)))
cat("top 3 co-expressed genes per marker:\n")
for (i in seq_len(nrow(R))) {
  ord <- order(abs(R[i, ]), decreasing = TRUE)[1:3]
  cat(sprintf("  %s: %s\n", rownames(R)[i],
              paste(sprintf("%s (r = %.3f)", colnames(R)[ord], R[i, ord]),
                    collapse = ", ")))
}
