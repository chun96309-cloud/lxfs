### ===============================
### 1. 加载依赖包
### ===============================
pkgs <- c("readxl", "pheatmap")
for (p in pkgs) {
  if (!requireNamespace(p, quietly = TRUE)) {
    install.packages(p, repos = "https://cloud.r-project.org")
  }
  library(p, character.only = TRUE)
}

### ===============================
### 2. 设置文件路径
### ===============================
WORK_ROOT <- "C:/Users/23027/Desktop/11/画各种图"
dir.create(WORK_ROOT, showWarnings = FALSE, recursive = TRUE)
setwd(WORK_ROOT)
DATA_DIR <- file.path(WORK_ROOT, "data")
OUT_DIR  <- file.path(WORK_ROOT, format(Sys.Date(), "%Y-%m-%d"))
dir.create(OUT_DIR, showWarnings = FALSE, recursive = TRUE)

marker_file <- file.path(DATA_DIR, "marker_genes.txt")
expr_file   <- file.path(DATA_DIR, "expression_matrix.txt")
out_file    <- file.path(OUT_DIR, "marker_background_correlation.csv")
fig_file    <- file.path(OUT_DIR, "Fig_pheatmap_spearman_top50.pdf")

### ===============================
### 3. 读取文件 (txt 与 xlsx 都支持)
### ===============================
read_any <- function(path, header = TRUE) {
  ext <- tolower(tools::file_ext(path))
  if (ext %in% c("xlsx", "xlsm", "xltx")) {
    as.data.frame(readxl::read_excel(path, col_names = header))
  } else {
    read.table(path, header = header, sep = if (ext == "csv") "," else "\t",
               quote = "", comment.char = "", check.names = FALSE,
               stringsAsFactors = FALSE)
  }
}

## marker: 取第一列基因名, 自动跳过表头行
marker_df <- read_any(marker_file, header = FALSE)
marker_genes <- trimws(as.character(marker_df[[1]]))
marker_genes <- marker_genes[nzchar(marker_genes)]
if (startsWith(marker_genes[1], "#") ||
    tolower(marker_genes[1]) %in% c("id", "gene", "geneid")) {
  marker_genes <- marker_genes[-1]
}
marker_genes <- unique(marker_genes)

## 表达矩阵: 第一列作基因名, 不依赖列名叫不叫 "ID"
expr_df <- read_any(expr_file, header = TRUE)
expr_mat <- as.matrix(expr_df[, -1, drop = FALSE])
storage.mode(expr_mat) <- "double"
rownames(expr_mat) <- trimws(as.character(expr_df[[1]]))

### ===============================
### 4. 过滤 + 划分 marker / 背景基因
### ===============================
expr_filtered <- expr_mat[rowSums(expr_mat > 0) >= 1, , drop = FALSE]

missing <- setdiff(marker_genes, rownames(expr_filtered))
if (length(missing) > 0) {
  stop("以下 Marker 基因不在表达矩阵中: ", paste(missing, collapse = ", "))
}

marker_expr     <- expr_filtered[marker_genes, , drop = FALSE]
background_genes <- setdiff(rownames(expr_filtered), marker_genes)
background_expr <- expr_filtered[background_genes, , drop = FALSE]

### ===============================
### 5. Spearman 相关性
### ===============================
cor_matrix <- cor(t(background_expr), t(marker_expr), method = "spearman")

cor_all <- as.data.frame(cor_matrix)
cor_all$MeanAbsCor <- rowMeans(abs(cor_matrix))
cor_all$GeneID <- rownames(cor_matrix)
cor_all <- cor_all[order(-cor_all$MeanAbsCor), ]
cor_all <- cor_all[, c("GeneID", colnames(cor_matrix), "MeanAbsCor")]
write.csv(cor_all, out_file, row.names = FALSE)
cat("已输出相关性排序:", out_file, "\n")

### ===============================
### 6. Top50 热图
### ===============================
top_genes <- head(cor_all$GeneID, min(50, nrow(cor_all)))
cor_top <- cor_matrix[top_genes, , drop = FALSE]

cairo_pdf(fig_file, width = 5.5, height = 8.5, family = "Times New Roman")
pheatmap::pheatmap(
  cor_top,
  main = "Marker genes vs top 50 background genes (Spearman)",
  show_rownames = TRUE,
  show_colnames = TRUE,
  color = colorRampPalette(c("blue", "white", "red"))(200),
  border_color = NA,
  fontsize_row = 6,
  fontsize_col = 10,
  treeheight_row = 20,
  treeheight_col = 20,
  silent = FALSE
)
dev.off()
cat("热图已保存:", fig_file, "\n")
