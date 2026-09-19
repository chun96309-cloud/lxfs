# ==============================================================================
# 06_四框相关性热图.R
# ------------------------------------------------------------------------------
# 独立脚本, 不依赖其他脚本。只读 文章数据.xlsx 的"汇总"表, 输出老师手写四个框的相关性热图。
# 要换指标: 只改下面【配置区】里的 box1 ~ box4 和 pairs 两处, 其余不用动。
#
# 运行环境: R 4.5 (Windows) / RStudio
# 第一次运行先装包:
#   install.packages(c("readxl", "ggplot2", "dplyr", "tidyr", "patchwork", "showtext"))
# ==============================================================================
rm(list = ls())
suppressPackageStartupMessages({
  library(readxl); library(ggplot2); library(dplyr); library(tidyr); library(patchwork); library(showtext)
})
options(width = 250, scipen = 6)

# ==============================================================================
# 【配置区】只改这一段
# ==============================================================================

## ---- 1. 路径 -----------------------------------------------------------------
data_file <- "E:/lxfs/文章数据.xlsx"        # 数据文件, 读其中的"汇总"sheet
out_dir   <- "E:/lxfs/output_四框相关性"     # 图和表的输出文件夹, 不存在会自动建

## ---- 2. 四个框的指标 (改这里就行; 名称必须是下面【可用指标清单】里的) --------------
box1 <- c("pH", "SOC", "TN", "TP", "EOC", "POC", "MAOC", "AN", "AP", "Lignin/N", "MAOC/SOC")
box2 <- c("BNC", "FNC", "MNC", "BNC/SOC", "FNC/SOC", "MNC/SOC")
box3 <- c("pHB", "VA", "PHBA", "SA", "p-CA", "SAL", "AV", "FA", "AS", "TLP", "TLP/SOC")
box4 <- c("SOC", "POC", "MAOC", "EOC", "MAOC/SOC")

## 框的标题 (显示在图的坐标轴标题上)
box_title <- c(box1 = "土壤理化与碳氮磷",
               box2 = "微生物残体碳",
               box3 = "木质素酚",
               box4 = "SOC 及其组分")

## ---- 3. 做哪几组相关 (老师手写的四个箭头; 想加组就在后面追加一行) ------------------
pairs <- list(
  c("box1", "box2"),   # 理化  x  微生物残体
  c("box2", "box3"),   # 微生物残体  x  木质素酚
  c("box3", "box4"),   # 木质素酚  x  SOC 组分
  c("box1", "box3")    # 理化  x  木质素酚
)

## ---- 4. 出图选项 ---------------------------------------------------------------
cor_method  <- "pearson"   # "pearson" 或 "spearman"
show_r      <- TRUE        # TRUE = 格子里写相关系数, FALSE = 只写星号
ratio_unit  <- "percent"   # 所有 X/SOC 比值的单位: "percent" (%) 或 "fraction" (0-1)
p_adjust    <- "none"      # 多重校正: "none" 或 "BH" (每组热图内部校正)
cell_cm     <- 1.00        # 每个格子的边长 (cm), 图的大小按格子数自动算; 字号会随之自动调整
combine_fig <- TRUE        # TRUE = 额外输出一张把四组拼在一起的大图

# ==============================================================================
# 以下不用改
# ==============================================================================
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)

## ---- 字体: 中文宋体, 英文 Times New Roman, 五号 (10.5 pt) --------------------------
if (.Platform$OS.type == "windows") {
  try(font_add("SimSun", regular = "C:/Windows/Fonts/simsun.ttc"), silent = TRUE)
  try(font_add("Times New Roman", regular = "C:/Windows/Fonts/times.ttf",
               bold = "C:/Windows/Fonts/timesbd.ttf", italic = "C:/Windows/Fonts/timesi.ttf"), silent = TRUE)
}
showtext_auto(); showtext_opts(dpi = 300)
FEN <- "Times New Roman"; FCN <- "SimSun"; fs <- 10.5

## ---- 读数据 ----------------------------------------------------------------------
raw <- as.data.frame(read_excel(data_file, sheet = "汇总", .name_repair = "minimal"))
raw <- raw[!is.na(raw[[1]]) & grepl("^S\\d+$", raw[[1]]), ]
nm  <- trimws(names(raw)); nm[1:2] <- c("ID", "Group"); names(raw) <- nm
for (j in 3:ncol(raw)) raw[[j]] <- suppressWarnings(as.numeric(as.character(raw[[j]])))
cat("读入样本数:", nrow(raw), " 列数:", ncol(raw), "\n")

## ---- 组装分析表: 原始列 + 改名 + 派生指标 ---------------------------------------------
rawcol <- function(x) raw[[x]]
k   <- if (ratio_unit == "percent") 100 else 1
usuf <- if (ratio_unit == "percent") " (%)" else ""

dat <- data.frame(ID = raw$ID, Group = raw$Group, check.names = FALSE)
# 原始理化与碳组分
for (v in c("pH", "SOC", "TN", "TP", "EOC", "AN", "AP", "POC", "MAOC",
            "C/N", "C/P", "βG", "NAG", "LAP", "ACP", "Vector length", "Vector angle",
            "pHB", "VA", "PHBA", "SA", "p-CA", "SAL", "AV", "FA", "AS", "Lignin/N",
            "GMD", "MWD", "R0.25")) {
  if (v %in% names(raw)) dat[[v]] <- rawcol(v)
}
# 微生物残体碳: 原表 BRC/FRC/MRC (residue) 按老师要求改名为 BNC/FNC/MNC (necromass)
dat[["BNC"]] <- rawcol("BRC"); dat[["FNC"]] <- rawcol("FRC"); dat[["MNC"]] <- rawcol("MRC")
# 比值一律由原始值重算, 保证单位一致 (原表 MAOC/SOC 是小数、MRC/SOC 是百分数, 不混用)
dat[["MAOC/SOC"]] <- dat$MAOC / dat$SOC * k
dat[["POC/SOC"]]  <- dat$POC  / dat$SOC * k
dat[["EOC/SOC"]]  <- dat$EOC  / dat$SOC * k
dat[["BNC/SOC"]]  <- dat$BNC  / dat$SOC * k
dat[["FNC/SOC"]]  <- dat$FNC  / dat$SOC * k
dat[["MNC/SOC"]]  <- dat$MNC  / dat$SOC * k
dat[["FNC/BNC"]]  <- dat$FNC  / dat$BNC
# 木质素酚: 9 个组成成分总和 TLP, 以及 TLP/SOC
phenol9 <- c("pHB", "VA", "PHBA", "SA", "p-CA", "SAL", "AV", "FA", "AS")
dat[["TLP"]]     <- rowSums(dat[, phenol9])
dat[["TLP/SOC"]] <- dat$TLP / dat$SOC            # mg/g SOC
# 木质素酚分族 (备选, 想用直接写进 box 即可)
dat[["V"]] <- dat$VA + dat$AV
dat[["S"]] <- dat$SA + dat$SAL + dat$AS
dat[["C"]] <- dat[["p-CA"]] + dat$FA
dat[["P"]] <- dat$pHB + dat$PHBA
dat[["VSC"]]   <- dat$V + dat$S + dat$C
dat[["S/V"]]   <- dat$S / dat$V
dat[["C/V"]]   <- dat$C / dat$V
dat[["(Ad/Al)s"]] <- dat$SA / dat$SAL

cat("\n===== 【可用指标清单】 box1~box4 里只能写下面这些名字 =====\n")
print(setdiff(names(dat), c("ID", "Group")))

## ---- 显示用标签 (带单位) --------------------------------------------------------------
unit <- c(SOC = "g/kg", TN = "g/kg", TP = "g/kg", EOC = "g/kg", POC = "g/kg", MAOC = "g/kg",
          AN = "mg/kg", AP = "mg/kg", BNC = "g/kg", FNC = "g/kg", MNC = "g/kg",
          pHB = "mg/kg", VA = "mg/kg", PHBA = "mg/kg", SA = "mg/kg", `p-CA` = "mg/kg",
          SAL = "mg/kg", AV = "mg/kg", FA = "mg/kg", AS = "mg/kg", TLP = "mg/kg",
          V = "mg/kg", S = "mg/kg", C = "mg/kg", P = "mg/kg", VSC = "mg/kg",
          `βG` = "nmol/h/g", NAG = "nmol/h/g", LAP = "nmol/h/g", ACP = "nmol/h/g",
          GMD = "mm", MWD = "mm", R0.25 = "%")
lab_of <- function(v) {
  if (grepl("/SOC$", v) && v != "TLP/SOC") return(paste0(v, usuf))
  if (v == "TLP/SOC") return("TLP/SOC (mg/g SOC)")
  if (v %in% names(unit)) return(paste0(v, " (", unit[[v]], ")"))
  v
}
star <- function(p) ifelse(is.na(p), "", ifelse(p < 0.001, "***", ifelse(p < 0.01, "**", ifelse(p < 0.05, "*", ""))))

## ---- 核心: 一组框 x 框的相关热图 ---------------------------------------------------------
boxes <- list(box1 = box1, box2 = box2, box3 = box3, box4 = box4)

cor_pair <- function(bxA, bxB) {
  vA <- boxes[[bxA]]; vB <- boxes[[bxB]]
  miss <- setdiff(c(vA, vB), names(dat))
  if (length(miss)) stop("这些指标名在数据里找不到, 请检查 box 设置: ", paste(miss, collapse = ", "))
  g <- expand.grid(x = vB, y = vA, stringsAsFactors = FALSE)
  res <- t(mapply(function(a, b) {
    ct <- suppressWarnings(cor.test(dat[[a]], dat[[b]], method = cor_method))
    c(r = unname(ct$estimate), p = ct$p.value)
  }, g$y, g$x))
  g$r <- res[, "r"]; g$p <- res[, "p"]
  if (p_adjust != "none") g$p <- p.adjust(g$p, method = p_adjust)
  g$star <- star(g$p)
  g$txt  <- if (show_r) paste0(sprintf("%.2f", g$r), g$star) else g$star
  out <- g
  # 字号按格子宽度自动缩放, 保证数字不溢出格子
  txt_size <- max(4.5, min(fs - 1.5, 0.82 * cell_cm / (max(nchar(g$txt)) * 0.01765)))
  # 画图
  g$x <- factor(g$x, levels = vB, labels = sapply(vB, lab_of))
  g$y <- factor(g$y, levels = rev(vA), labels = sapply(rev(vA), lab_of))
  p <- ggplot(g, aes(x, y, fill = r)) +
    geom_tile(colour = "white", linewidth = 0.5) +
    geom_text(aes(label = txt, colour = abs(r) > 0.6), size = txt_size / .pt, family = FEN, show.legend = FALSE) +
    scale_colour_manual(values = c(`TRUE` = "white", `FALSE` = "black")) +
    scale_fill_gradient2(low = "#2166AC", mid = "#F7F7F7", high = "#B2182B", limits = c(-1, 1),
                         breaks = c(-1, -0.5, 0, 0.5, 1), name = if (cor_method == "pearson") "Pearson r" else "Spearman rho") +
    scale_x_discrete(position = "top", expand = c(0, 0)) + scale_y_discrete(expand = c(0, 0)) +
    labs(x = box_title[[bxB]], y = box_title[[bxA]]) +
    theme_bw(base_size = fs, base_family = FEN) +
    theme(panel.grid = element_blank(),
          axis.text.x = element_text(angle = 45, hjust = 0, size = fs - 1),
          axis.text.y = element_text(size = fs - 1),
          axis.title  = element_text(family = FCN, size = fs),
          legend.key.height = grid::unit(1.1, "cm"), legend.key.width = grid::unit(0.45, "cm"),
          legend.title = element_text(size = fs - 1), legend.text = element_text(size = fs - 2))
  list(plot = p, tab = out, nx = length(vB), ny = length(vA))
}

## ---- 逐组出图 + 打印结果 ------------------------------------------------------------------
plots <- list(); tabs <- list()
for (i in seq_along(pairs)) {
  bxA <- pairs[[i]][1]; bxB <- pairs[[i]][2]
  r <- cor_pair(bxA, bxB)
  nm_i <- sprintf("Fig%d_%s_vs_%s", i, box_title[[bxA]], box_title[[bxB]])
  w <- 5.5 + cell_cm * r$nx; h <- 4.5 + cell_cm * r$ny
  ggsave(file.path(out_dir, paste0(nm_i, ".pdf")), r$plot, width = w, height = h, units = "cm", limitsize = FALSE)
  ggsave(file.path(out_dir, paste0(nm_i, ".png")), r$plot, width = w, height = h, units = "cm", dpi = 300, limitsize = FALSE)
  t2 <- r$tab; names(t2)[1:2] <- c(box_title[[bxB]], box_title[[bxA]])
  write.csv(t2, file.path(out_dir, paste0(nm_i, ".csv")), row.names = FALSE, fileEncoding = "UTF-8")
  plots[[i]] <- r$plot; tabs[[i]] <- t2
  cat("\n\n############", i, box_title[[bxA]], " x ", box_title[[bxB]],
      sprintf("  (%s, n = %d; * P<0.05, ** P<0.01, *** P<0.001)", cor_method, nrow(dat)), "############\n")
  pr <- r$tab[, c(2, 1, 3, 4, 5)]; names(pr) <- c("指标A", "指标B", "r", "P", "Sig")
  pr$r <- round(pr$r, 3); pr$P <- signif(pr$P, 3)
  print(pr[order(-abs(pr$r)), ], row.names = FALSE)
  cat("\n-- 显著 (P<0.05) 的组合 --\n")
  s <- pr[pr$P < 0.05, ]; if (nrow(s)) print(s, row.names = FALSE) else cat("无\n")
}

## ---- 四组拼图 --------------------------------------------------------------------------
if (combine_fig && length(plots) == 4) {
  comb <- (plots[[1]] + plots[[2]]) / (plots[[3]] + plots[[4]]) +
    plot_layout(guides = "collect") + plot_annotation(tag_levels = "a", tag_prefix = "(", tag_suffix = ")") &
    theme(plot.tag = element_text(size = fs, face = "bold", family = FEN),
          plot.margin = ggplot2::margin(4, 30, 4, 4))   # 右边留白, 防止斜排的列名被裁掉
  ggsave(file.path(out_dir, "Fig0_四组合并.pdf"), comb, width = 34, height = 30, units = "cm", limitsize = FALSE)
  ggsave(file.path(out_dir, "Fig0_四组合并.png"), comb, width = 34, height = 30, units = "cm", dpi = 300, limitsize = FALSE)
}

cat("\n\n完成. 图和 CSV 在:", out_dir, "\n")
cat("BRC/FRC/MRC 已按要求改名为 BNC/FNC/MNC (microbial necromass carbon)。\n")
