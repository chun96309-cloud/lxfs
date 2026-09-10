# ==============================================================================
# 04_相关性分析图.R      运行环境: R 4.5 (Windows); 先运行 01 脚本
# ------------------------------------------------------------------------------
# 只出相关性图:
#   (1) 以 MAOC (含 MAOC/SOC) 为目标变量: 各指标与之的 Pearson r 条形图, 按指标类别分面
#   (2) 以 MRC (含 MRC/SOC, FRC) 为目标变量: 同上
#   (3) 总相关性: 核心指标 Pearson 相关矩阵热图
#   (4) 不同数据类型 (八类指标块) 两两之间的相关热图, 共 28 组, 每组一张 + 合并成一个多页 PDF
#   (5) 各指标块与稳定性碳目标的 Mantel 检验热图
# ==============================================================================
rm(list = ls())
# install.packages(c("ggplot2", "dplyr", "tidyr", "Hmisc", "corrplot", "vegan", "showtext"))
suppressPackageStartupMessages({
  library(ggplot2); library(dplyr); library(tidyr); library(Hmisc); library(corrplot); library(vegan); library(showtext)
})
data_dir <- "E:/lxfs"
out_dir  <- file.path(data_dir, "output"); pair_dir <- file.path(out_dir, "cor_block_pairs"); dir.create(pair_dir, showWarnings = FALSE)
obj <- readRDS(file.path(out_dir, "analysis_objects.rds")); dat <- obj$dat; blocks <- obj$blocks

font_add("SimSun", regular = "C:/Windows/Fonts/simsun.ttc")
font_add("Times New Roman", regular = "C:/Windows/Fonts/times.ttf",
         bold = "C:/Windows/Fonts/timesbd.ttf", italic = "C:/Windows/Fonts/timesi.ttf")
showtext_auto(); showtext_opts(dpi = 300)
fs <- 10.5

## ---- 显示名与块名 ------------------------------------------------------------------
lab <- c(MAOC_SOC = "MAOC/SOC", POC_SOC = "POC/SOC", MAOC_POC = "MAOC/POC", MRC_SOC = "MRC/SOC", BRC_SOC = "BRC/SOC", FRC_SOC = "FRC/SOC",
         FRC_BRC = "FRC/BRC", C_N = "C/N", C_P = "C/P", S_V = "S/V", C_V = "C/V", AdAl_S = "(Ad/Al)s", Lignin_N = "Lignin/N",
         VSC_SOC = "VSC/SOC", GM_MAOC_MRC = "GM(MAOC,MRC)", GM_ratio = "GM(ratio)", EEA_CN = "EEA C:N", EEA_CP = "EEA C:P",
         EEA_NP = "EEA N:P", Vector_length = "Vector length", Vector_angle = "Vector angle", Agg_gt2 = ">2 mm",
         "Agg_0.25_2" = "0.25-2 mm", "Agg_lt0.25" = "<0.25 mm", Bac_Others = "Bac. Others", Fun_Others = "Fun. Others",
         B_Chao1 = "Bac. Chao1", B_Shannon = "Bac. Shannon", B_Pielou = "Bac. Pielou", B_Simpson = "Bac. Simpson",
         B_Faith_pd = "Bac. Faith PD", B_Observed = "Bac. Observed", F_Chao1 = "Fun. Chao1", F_Shannon = "Fun. Shannon",
         F_Pielou = "Fun. Pielou", F_Simpson = "Fun. Simpson", F_Observed = "Fun. Observed", BG = "βG", pCA = "p-CA")
L <- function(v) unname(ifelse(v %in% names(lab), lab[v], v))
bname <- setNames(c("Soil nutrients", "SOC fractions", "Microbial residues", "Lignin phenols", "Enzymes", "Aggregates", "Bacteria", "Fungi"), names(blocks))
bname_cn <- setNames(c("土壤养分与理化", "碳组分与稳定性", "微生物残体", "木质素酚", "酶活性与养分限制", "团聚体稳定性", "细菌群落", "真菌群落"), names(blocks))
stars <- function(p) ifelse(is.na(p), "", ifelse(p < 0.001, "***", ifelse(p < 0.01, "**", ifelse(p < 0.05, "*", ""))))

## ---- 全变量相关矩阵 (去掉常数列) ------------------------------------------------------
all_vars <- unlist(blocks, use.names = FALSE)
all_vars <- all_vars[sapply(all_vars, function(v) sd(dat[[v]], na.rm = TRUE) > 0)]
rc <- rcorr(as.matrix(dat[, all_vars]), type = "pearson"); R <- rc$r; Pm <- rc$P
var_block <- setNames(rep(names(blocks), lengths(blocks)), unlist(blocks, use.names = FALSE))[all_vars]

theme_c <- function() theme_bw(base_size = fs, base_family = "Times New Roman") +
  theme(panel.grid = element_blank(), strip.background = element_rect(fill = "grey92", colour = NA), strip.text = element_text(size = fs))
save_fig <- function(p, name, w, h, dir = out_dir) {
  ggsave(file.path(dir, paste0(name, ".pdf")), p, width = w, height = h, units = "cm", limitsize = FALSE)
  ggsave(file.path(dir, paste0(name, ".png")), p, width = w, height = h, units = "cm", dpi = 300, limitsize = FALSE)
}

## ---- (1)(2) 目标变量相关条形图 -------------------------------------------------------------
target_bar <- function(tgs) {
  d <- do.call(rbind, lapply(tgs, function(t) {
    v <- setdiff(all_vars, c(tgs, "GM_ratio"))
    data.frame(Target = L(t), Var = v, Block = var_block[v], r = R[v, t], p = Pm[v, t])
  }))
  d <- d %>% mutate(sig = ifelse(p < 0.05, "P < 0.05", "P >= 0.05"), star = stars(p),
                    Block = factor(bname[Block], levels = bname), Target = factor(Target, levels = L(tgs))) %>%
    group_by(Target, Block) %>% arrange(Block, r) %>% ungroup() %>%
    mutate(Var = factor(L(Var), levels = unique(L(Var))))
  ggplot(d, aes(r, Var, fill = sig)) +
    geom_vline(xintercept = 0, colour = "grey40") +
    geom_col(width = 0.7) +
    geom_text(aes(label = star, x = ifelse(r >= 0, r + 0.03, r - 0.03), hjust = ifelse(r >= 0, 0, 1)), size = fs / .pt, family = "Times New Roman") +
    facet_grid(Block ~ Target, scales = "free_y", space = "free_y") +
    scale_fill_manual(values = c("P < 0.05" = "#CC3311", "P >= 0.05" = "#BBBBBB"), name = NULL) +
    scale_x_continuous(limits = c(-1.15, 1.15), breaks = seq(-1, 1, 0.5)) +
    labs(x = "Pearson r (n = 16)", y = NULL) + theme_c() +
    theme(strip.text.y = element_text(angle = 0), legend.position = "bottom", axis.text.y = element_text(size = fs - 1.5))
}
save_fig(target_bar(c("MAOC", "MAOC_SOC")), "Fig_cor_target_MAOC", 18, 34)
save_fig(target_bar(c("MRC", "MRC_SOC", "FRC")), "Fig_cor_target_MRC", 22, 34)

## ---- (3) 总相关矩阵 ----------------------------------------------------------------------
core <- c("SOC", "TN", "TP", "AN", "AP", "pH", "C_N", "C_P", "EOC", "POC", "MAOC", "MAOC_SOC",
          "BRC", "FRC", "MRC", "MRC_SOC", "FRC_BRC", "V", "S", "C", "P", "VSC", "VSC_SOC", "S_V", "C_V", "Lignin_N",
          "BG", "NAG", "LAP", "ACP", "EEA_NP", "Vector_length", "Vector_angle", "GMD", "MWD", "R0.25",
          "Proteobacteria", "Acidobacteriota", "Actinobacteriota", "Chloroflexi", "B_Chao1", "B_Shannon",
          "Ascomycota", "Basidiomycota", "F_Chao1", "F_Shannon")
Rc <- R[core, core]; Pc <- Pm[core, core]; diag(Pc) <- 1; dimnames(Rc) <- dimnames(Pc) <- list(L(core), L(core))
draw_total <- function() {
  par(family = "Times New Roman", ps = fs)
  corrplot(Rc, method = "color", type = "lower", diag = FALSE, order = "original",
           p.mat = Pc, sig.level = c(0.001, 0.01, 0.05), insig = "label_sig", pch.cex = 0.6, pch.col = "black",
           col = colorRampPalette(c("#2166AC", "#F7F7F7", "#B2182B"))(200), tl.col = "black", tl.cex = 0.8, tl.srt = 90, cl.cex = 0.8, mar = c(0, 0, 0, 0))
}
pdf(file.path(out_dir, "Fig_cor_total.pdf"), width = 22 / 2.54, height = 22 / 2.54); draw_total(); dev.off()
png(file.path(out_dir, "Fig_cor_total.png"), width = 22, height = 22, units = "cm", res = 300); draw_total(); dev.off()

## ---- (4) 指标块两两相关热图 ----------------------------------------------------------------
pair_heat <- function(b1, b2) {
  v1 <- intersect(blocks[[b1]], all_vars); v2 <- intersect(blocks[[b2]], all_vars)
  d <- expand.grid(x = v2, y = v1, stringsAsFactors = FALSE)
  d$r <- R[cbind(d$y, d$x)]; d$p <- Pm[cbind(d$y, d$x)]; d$star <- stars(d$p)
  d$x <- factor(L(d$x), levels = L(v2)); d$y <- factor(L(d$y), levels = rev(L(v1)))
  ggplot(d, aes(x, y, fill = r)) + geom_tile(colour = "white", linewidth = 0.3) +
    geom_text(aes(label = star), size = fs / .pt, family = "Times New Roman", vjust = 0.75) +
    scale_fill_gradient2(low = "#2166AC", mid = "#F7F7F7", high = "#B2182B", limits = c(-1, 1), name = "r") +
    scale_x_discrete(position = "top") +
    labs(x = bname[b2], y = bname[b1]) + theme_c() +
    theme(axis.text.x = element_text(angle = 45, hjust = 0), legend.key.height = grid::unit(0.8, "cm"))
}
bn <- names(blocks); pairs <- combn(bn, 2)
plots <- list()
for (k in seq_len(ncol(pairs))) {
  b1 <- pairs[1, k]; b2 <- pairs[2, k]
  n1 <- length(intersect(blocks[[b1]], all_vars)); n2 <- length(intersect(blocks[[b2]], all_vars))
  p <- pair_heat(b1, b2); plots[[k]] <- p
  save_fig(p, sprintf("cor_%s_vs_%s", bname_cn[b1], bname_cn[b2]), w = 4 + 0.62 * n2, h = 3.5 + 0.55 * n1, dir = pair_dir)
}
pdf(file.path(out_dir, "Fig_cor_block_pairs_all.pdf"), width = 21 / 2.54, height = 18 / 2.54); for (p in plots) print(p); dev.off()

## ---- (5) Mantel 热图: 各指标块 vs 目标 -----------------------------------------------------
scaled_dist <- function(vars) { m <- as.matrix(dat[, vars, drop = FALSE]); m <- m[, apply(m, 2, sd) > 0, drop = FALSE]; dist(scale(m)) }
resp <- list("Stability block" = scaled_dist(c("MAOC", "MAOC_SOC", "MRC", "MRC_SOC")), MAOC = scaled_dist("MAOC"),
             "MAOC/SOC" = scaled_dist("MAOC_SOC"), MRC = scaled_dist("MRC"), "MRC/SOC" = scaled_dist("MRC_SOC"), FRC = scaled_dist("FRC"))
set.seed(2025); mt <- list()
for (b in setdiff(bn, "2_碳组分与稳定性")) {
  vs <- setdiff(intersect(blocks[[b]], all_vars), c("BRC_SOC", "FRC_SOC", "MRC_SOC", "MRC", "FRC"))
  for (rn in names(resp)) { m <- mantel(scaled_dist(vs), resp[[rn]], method = "spearman", permutations = 999)
    mt[[length(mt) + 1]] <- data.frame(Block = bname[b], Response = rn, r = m$statistic, p = m$signif) }
}
mt <- do.call(rbind, mt); mt$star <- stars(mt$p)
mt$Block <- factor(mt$Block, levels = rev(bname)); mt$Response <- factor(mt$Response, levels = names(resp))
p_mt <- ggplot(mt, aes(Response, Block, fill = r)) + geom_tile(colour = "white", linewidth = 0.4) +
  geom_text(aes(label = sprintf("%.2f%s", r, star)), size = fs / .pt, family = "Times New Roman") +
  scale_fill_gradient2(low = "#2166AC", mid = "#F7F7F7", high = "#B2182B", limits = c(-0.6, 0.6), name = "Mantel r") +
  scale_x_discrete(position = "top") + labs(x = NULL, y = NULL) + theme_c() + theme(legend.key.height = grid::unit(0.8, "cm"))
save_fig(p_mt, "Fig_mantel_blocks_vs_targets", 15, 9)
write.csv(mt, file.path(out_dir, "mantel_blocks_vs_targets_v2.csv"), row.names = FALSE)
cat("完成. 图在", out_dir, "和", pair_dir, "\n")
