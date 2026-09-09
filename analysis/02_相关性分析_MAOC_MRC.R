# ==============================================================================
# 02_相关性分析_MAOC_MRC.R      运行环境: R 4.5 (Windows); 先运行 01 脚本生成 output/analysis_objects.rds
# ------------------------------------------------------------------------------
# 功能 (老师要求的第二步: 分别以 MRC 和 MAOC 为目标变量做关联性分析):
#   (1) 目标变量 (MAOC, MAOC/SOC, MRC, MRC/SOC, FRC, MAOC-MRC 几何平均) 与全部指标的
#       Pearson / Spearman 相关, 按指标类别分块打印, 附 BH 校正 P
#   (2) 核心指标总相关矩阵 (Hmisc::rcorr), 打印下三角并保存 CSV
#   (3) 各指标类别 (块) 与稳定性碳块之间的 Mantel 检验 (vegan)
#   (4) 图: 核心指标相关热图 (corrplot); 目标变量 x 全指标热图 (ggplot2); MRC/FRC 与 MAOC 散点回归
#       字体: 英文 Times New Roman 五号 (10.5 pt), 中文 宋体 五号; 输出 PDF + 300 dpi PNG
# ==============================================================================
rm(list = ls())
# install.packages(c("Hmisc", "corrplot", "ggplot2", "vegan", "showtext", "dplyr"))
suppressPackageStartupMessages({
  library(dplyr); library(Hmisc); library(corrplot); library(ggplot2); library(vegan); library(showtext)
})
options(width = 250, scipen = 6)

## ---- 0. 路径: 只需改这里 -------------------------------------------------------
data_dir <- "E:/lxfs"
out_dir  <- file.path(data_dir, "output")
obj      <- readRDS(file.path(out_dir, "analysis_objects.rds"))
dat <- obj$dat; blocks <- obj$blocks; group_labels <- obj$group_labels

## ---- 字体: 宋体 + Times New Roman, 五号 = 10.5 pt ---------------------------------
font_add("SimSun", regular = "C:/Windows/Fonts/simsun.ttc")
font_add("Times New Roman", regular = "C:/Windows/Fonts/times.ttf",
         bold = "C:/Windows/Fonts/timesbd.ttf", italic = "C:/Windows/Fonts/timesi.ttf")
showtext_auto(); showtext_opts(dpi = 300)
fs <- 10.5   # 五号

## ---- 1. 目标变量与预测变量 -------------------------------------------------------
targets <- c("MAOC", "MAOC_SOC", "MRC", "MRC_SOC", "FRC", "GM_MAOC_MRC")
pred_df <- do.call(rbind, lapply(names(blocks), function(b) data.frame(Block = b, Var = blocks[[b]])))
pred_df <- pred_df[!pred_df$Var %in% c("GM_ratio"), ]     # 与 GM_MAOC_MRC 重复, 不作预测变量

stars <- function(p) ifelse(is.na(p), "", ifelse(p < 0.001, "***", ifelse(p < 0.01, "**", ifelse(p < 0.05, "*", ""))))

cor_tab <- function(target) {
  y <- dat[[target]]
  out <- lapply(seq_len(nrow(pred_df)), function(i) {
    v <- pred_df$Var[i]; x <- dat[[v]]; ok <- is.finite(x) & is.finite(y)
    if (v == target || sum(ok) < 5 || sd(x[ok]) == 0)
      return(data.frame(Block = pred_df$Block[i], Var = v, n = sum(ok), r = NA, p = NA, rho = NA, p_rho = NA))
    pe <- cor.test(x[ok], y[ok]); sp <- suppressWarnings(cor.test(x[ok], y[ok], method = "spearman"))
    data.frame(Block = pred_df$Block[i], Var = v, n = sum(ok),
               r = unname(pe$estimate), p = pe$p.value, rho = unname(sp$estimate), p_rho = sp$p.value)
  })
  out <- do.call(rbind, out)
  out$p_BH <- p.adjust(out$p, method = "BH")
  out$Sig  <- stars(out$p); out$Sig_rho <- stars(out$p_rho); out$Sig_BH <- stars(out$p_BH)
  out$Target <- target
  out
}

cor_all <- do.call(rbind, lapply(targets, cor_tab))
write.csv(cor_all, file.path(out_dir, "correlation_targets_vs_all.csv"), row.names = FALSE)

## ---- 2. 逐目标变量、逐块打印 (块内按 |r| 降序) ---------------------------------------
for (tg in targets) {
  cat("\n\n==================== 目标变量:", tg, " (Pearson r / Spearman rho; n = 16) ====================\n")
  ct <- cor_all[cor_all$Target == tg, ]
  for (b in names(blocks)) {
    x <- ct[ct$Block == b & !is.na(ct$r), ]; if (nrow(x) == 0) next
    x <- x[order(-abs(x$r)), ]
    cat("\n--", b, "--\n")
    print(data.frame(Var = x$Var, r = round(x$r, 3), P = signif(x$p, 3), Sig = x$Sig,
                     rho = round(x$rho, 3), P_rho = signif(x$p_rho, 3), Sig_rho = x$Sig_rho,
                     P_BH = signif(x$p_BH, 3), Sig_BH = x$Sig_BH), row.names = FALSE)
  }
}

## ---- 3. 汇总矩阵: 全指标 x 目标变量 (r 加星号) --------------------------------------
cat("\n\n==================== 汇总: 各指标与目标变量的 Pearson r (星号: 未校正 P) ====================\n")
wide <- cor_all %>% mutate(cell = ifelse(is.na(r), "-", sprintf("%.2f%s", r, Sig))) %>%
  select(Block, Var, Target, cell) %>% tidyr::pivot_wider(names_from = Target, values_from = cell)
wide <- wide[match(pred_df$Var, wide$Var), ]
print(as.data.frame(wide), row.names = FALSE)

cat("\n---- MAOC 与 MRC 显著相关指标的异同 (P<0.05) ----\n")
sA <- cor_all$Var[cor_all$Target == "MAOC" & !is.na(cor_all$p) & cor_all$p < 0.05]
sR <- cor_all$Var[cor_all$Target == "MRC"  & !is.na(cor_all$p) & cor_all$p < 0.05]
cat("同时与 MAOC 和 MRC 显著: ", paste(intersect(sA, sR), collapse = ", "), "\n")
cat("只与 MAOC 显著:          ", paste(setdiff(sA, sR), collapse = ", "), "\n")
cat("只与 MRC 显著:           ", paste(setdiff(sR, sA), collapse = ", "), "\n")

## ---- 4. 核心指标总相关矩阵 -----------------------------------------------------------
core <- c("SOC", "TN", "TP", "AN", "AP", "pH", "C_N", "C_P", "EOC", "POC", "MAOC", "MAOC_SOC",
          "BRC", "FRC", "MRC", "MRC_SOC", "FRC_BRC", "VSC", "VSC_SOC", "S_V", "C_V", "Lignin_N",
          "BG", "NAG", "LAP", "ACP", "Vector_length", "Vector_angle", "GMD", "MWD", "R0.25",
          "B_Shannon", "B_Chao1", "F_Shannon", "F_Chao1",
          "Proteobacteria", "Acidobacteriota", "Actinobacteriota", "Ascomycota", "Basidiomycota")
rc <- rcorr(as.matrix(dat[, core]), type = "pearson")
R <- rc$r; P <- rc$P; diag(P) <- 1
cat("\n\n==================== 核心指标 Pearson 相关矩阵 (下三角, 星号 * <0.05 ** <0.01 *** <0.001) ====================\n")
M <- matrix("", nrow(R), ncol(R), dimnames = dimnames(R))
for (i in seq_len(nrow(R))) for (j in seq_len(ncol(R))) if (i > j) M[i, j] <- sprintf("%.2f%s", R[i, j], stars(P[i, j]))
print(as.data.frame(M[, -ncol(M)]), quote = FALSE)
write.csv(round(R, 3), file.path(out_dir, "core_cor_r.csv")); write.csv(signif(P, 3), file.path(out_dir, "core_cor_P.csv"))

## ---- 5. Mantel 检验: 各指标块 vs 稳定性碳块 -----------------------------------------------
cat("\n\n==================== Mantel 检验 (Spearman, 999 次置换): 各指标块距离 vs 目标距离 ====================\n")
scaled_dist <- function(vars) {
  m <- as.matrix(dat[, vars, drop = FALSE]); m <- m[, apply(m, 2, function(x) all(is.finite(x)) && sd(x) > 0), drop = FALSE]
  dist(scale(m))
}
resp <- list(稳定性碳块_MAOC_MAOCSOC_MRC_MRCSOC = scaled_dist(c("MAOC", "MAOC_SOC", "MRC", "MRC_SOC")),
             MAOC = scaled_dist("MAOC"), MRC = scaled_dist("MRC"), GM_MAOC_MRC = scaled_dist("GM_MAOC_MRC"))
set.seed(2025)
mt <- list()
for (b in setdiff(names(blocks), "2_碳组分与稳定性")) {
  vs <- setdiff(blocks[[b]], c(targets, "GM_ratio", "BRC_SOC", "FRC_SOC", "MRC_SOC"))
  db <- scaled_dist(vs)
  for (rn in names(resp)) {
    m <- mantel(db, resp[[rn]], method = "spearman", permutations = 999)
    mt[[length(mt) + 1]] <- data.frame(Block = b, Response = rn, Mantel_r = round(m$statistic, 3), P = round(m$signif, 3))
  }
}
mt <- do.call(rbind, mt); mt$Sig <- stars(mt$P)
print(mt, row.names = FALSE)
write.csv(mt, file.path(out_dir, "mantel_blocks_vs_targets.csv"), row.names = FALSE)

## ---- 6. 图 -------------------------------------------------------------------------------
save_both <- function(name, expr, w, h) {
  pdf(file.path(out_dir, paste0(name, ".pdf")), width = w / 2.54, height = h / 2.54); expr(); dev.off()
  png(file.path(out_dir, paste0(name, ".png")), width = w, height = h, units = "cm", res = 300); expr(); dev.off()
}

# 6.1 核心指标相关热图 (corrplot)
save_both("Fig_cor_matrix_core", function() {
  par(family = "Times New Roman", ps = fs)
  corrplot(R, method = "color", type = "upper", diag = FALSE, order = "original",
           p.mat = P, sig.level = c(0.001, 0.01, 0.05), insig = "label_sig", pch.cex = 0.7, pch.col = "black",
           col = colorRampPalette(c("#2166AC", "#F7F7F7", "#B2182B"))(200),
           tl.col = "black", tl.cex = 0.85, tl.srt = 45, cl.cex = 0.85, mar = c(0, 0, 0, 0))
}, w = 20, h = 20)

# 6.2 目标变量 x 全指标热图 (ggplot2)
hm <- cor_all %>% filter(!is.na(r)) %>%
  mutate(Var = factor(Var, levels = rev(pred_df$Var)), Target = factor(Target, levels = targets),
         Block = factor(sub("^\\d_", "", Block), levels = sub("^\\d_", "", names(blocks))))
p_hm <- ggplot(hm, aes(Target, Var, fill = r)) +
  geom_tile(colour = "white", linewidth = 0.3) +
  geom_text(aes(label = Sig), size = fs / .pt, family = "Times New Roman", vjust = 0.75) +
  scale_fill_gradient2(low = "#2166AC", mid = "#F7F7F7", high = "#B2182B", limits = c(-1, 1), name = "Pearson r") +
  facet_grid(Block ~ ., scales = "free_y", space = "free_y", switch = "y") +
  scale_x_discrete(labels = c("MAOC", "MAOC/SOC", "MRC", "MRC/SOC", "FRC", "GM(MAOC,MRC)"), position = "top") +
  labs(x = NULL, y = NULL) +
  theme_bw(base_size = fs, base_family = "Times New Roman") +
  theme(strip.placement = "outside", strip.text.y.left = element_text(angle = 0, family = "SimSun", size = fs),
        strip.background = element_rect(fill = "grey92", colour = NA),
        axis.text.x = element_text(angle = 45, hjust = 0), panel.grid = element_blank(),
        legend.position = "right", legend.key.height = grid::unit(1.2, "cm"))
ggsave(file.path(out_dir, "Fig_heatmap_targets_vs_all.pdf"), p_hm, width = 15, height = 32, units = "cm")
ggsave(file.path(out_dir, "Fig_heatmap_targets_vs_all.png"), p_hm, width = 15, height = 32, units = "cm", dpi = 300)

# 6.3 散点回归: 微生物残体 -> MAOC (老师的方向: MRC 指向 MAOC)
pairs_xy <- list(c("MRC", "MAOC"), c("FRC", "MAOC"), c("BRC", "MAOC"), c("MRC_SOC", "MAOC_SOC"),
                 c("VSC", "MAOC"), c("VSC_SOC", "MAOC_SOC"))
sc <- do.call(rbind, lapply(pairs_xy, function(p) {
  ct <- cor.test(dat[[p[1]]], dat[[p[2]]])
  data.frame(x = dat[[p[1]]], y = dat[[p[2]]], Group = group_labels[as.character(dat$Group)],
             panel = sprintf("%s vs %s\nr = %.2f, P = %.3f", p[2], p[1], ct$estimate, ct$p.value),
             xlab = p[1], ylab = p[2])
}))
sc$panel <- factor(sc$panel, levels = unique(sc$panel)); sc$Group <- factor(sc$Group, levels = group_labels)
p_sc <- ggplot(sc, aes(x, y)) +
  geom_smooth(method = "lm", formula = y ~ x, colour = "grey30", fill = "grey80", linewidth = 0.6) +
  geom_point(aes(colour = Group, shape = Group), size = 2.2) +
  facet_wrap(~panel, scales = "free", ncol = 3) +
  scale_colour_manual(values = c("#7F7F7F", "#1B9E77", "#D95F02", "#7570B3")) +
  labs(x = NULL, y = NULL) +
  theme_bw(base_size = fs, base_family = "Times New Roman") +
  theme(panel.grid = element_blank(), legend.position = "bottom", strip.background = element_rect(fill = "grey92", colour = NA))
ggsave(file.path(out_dir, "Fig_scatter_residue_vs_MAOC.pdf"), p_sc, width = 18, height = 13, units = "cm")
ggsave(file.path(out_dir, "Fig_scatter_residue_vs_MAOC.png"), p_sc, width = 18, height = 13, units = "cm", dpi = 300)

cat("\n完成. 结果文件夹: ", out_dir, "\n",
    "  correlation_targets_vs_all.csv / core_cor_r.csv / core_cor_P.csv / mantel_blocks_vs_targets.csv\n",
    "  Fig_cor_matrix_core / Fig_heatmap_targets_vs_all / Fig_scatter_residue_vs_MAOC (.pdf + .png)\n")
