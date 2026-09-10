# ==============================================================================
# 03_柱状图与群落图.R      运行环境: R 4.5 (Windows); 先运行 01 脚本生成 output/analysis_objects.rds 和 difference_analysis_all.csv
# ------------------------------------------------------------------------------
# 功能: 老师要求的全指标柱状图 (均值 ± SE, Tukey 字母), 按八类指标分图; 另加
#       酶计量散点图, 团聚体粒级组成, 细菌/真菌门水平组成堆叠图, alpha 多样性, NMDS
#       字体: 英文 Times New Roman 五号, 中文 宋体 五号; 输出 PDF + 300 dpi PNG
# ==============================================================================
rm(list = ls())
# install.packages(c("ggplot2", "dplyr", "tidyr", "patchwork", "showtext"))
suppressPackageStartupMessages({
  library(ggplot2); library(dplyr); library(tidyr); library(patchwork); library(showtext)
})

## ---- 0. 路径 -------------------------------------------------------------------
data_dir <- "E:/lxfs"
out_dir  <- file.path(data_dir, "output")
obj  <- readRDS(file.path(out_dir, "analysis_objects.rds"))
dat  <- obj$dat; blocks <- obj$blocks; group_labels <- obj$group_labels
diff <- read.csv(file.path(out_dir, "difference_analysis_all.csv"), check.names = FALSE, stringsAsFactors = FALSE)

font_add("SimSun", regular = "C:/Windows/Fonts/simsun.ttc")
font_add("Times New Roman", regular = "C:/Windows/Fonts/times.ttf",
         bold = "C:/Windows/Fonts/timesbd.ttf", italic = "C:/Windows/Fonts/timesi.ttf")
showtext_auto(); showtext_opts(dpi = 300)
fs <- 10.5
grp_lv  <- names(group_labels)                     # CK ZY KY HJ
grp_col <- c("#0077BB", "#EE7733", "#009988", "#CC3311"); names(grp_col) <- group_labels
dat$GroupL <- factor(group_labels[as.character(dat$Group)], levels = group_labels)

## ---- 1. 显示名 -------------------------------------------------------------------
lab <- c(MAOC_SOC = "MAOC/SOC", POC_SOC = "POC/SOC", MAOC_POC = "MAOC/POC", MRC_SOC = "MRC/SOC (%)", BRC_SOC = "BRC/SOC (%)",
         FRC_SOC = "FRC/SOC (%)", FRC_BRC = "FRC/BRC", C_N = "C/N", C_P = "C/P", S_V = "S/V", C_V = "C/V", AdAl_S = "(Ad/Al)s",
         Lignin_N = "Lignin/N", VSC_SOC = "VSC/SOC (mg/g SOC)", GM_MAOC_MRC = "GM(MAOC, MRC)", GM_ratio = "GM(MAOC/SOC, MRC/SOC)",
         EEA_CN = "ln(BG)/ln(NAG+LAP)", EEA_CP = "ln(BG)/ln(ACP)", EEA_NP = "ln(NAG+LAP)/ln(ACP)",
         Vector_length = "Vector length", Vector_angle = "Vector angle (°)", Agg_gt2 = "> 2 mm (%)", "Agg_0.25_2" = "0.25-2 mm (%)",
         "Agg_lt0.25" = "< 0.25 mm (%)", Bac_Others = "Others", Fun_Others = "Others", B_Chao1 = "Chao1", B_Shannon = "Shannon",
         B_Pielou = "Pielou", B_Simpson = "Simpson", B_Faith_pd = "Faith PD", B_Observed = "Observed species", F_Chao1 = "Chao1",
         F_Shannon = "Shannon", F_Pielou = "Pielou", F_Simpson = "Simpson", F_Observed = "Observed species", BG = "βG",
         pCA = "p-CA", SOC = "SOC (g/kg)", TN = "TN (g/kg)", TP = "TP (g/kg)", EOC = "EOC (g/kg)", AN = "AN (mg/kg)", AP = "AP (mg/kg)",
         POC = "POC (g/kg)", MAOC = "MAOC (g/kg)", BRC = "BRC (g/kg)", FRC = "FRC (g/kg)", MRC = "MRC (g/kg)",
         GMD = "GMD (mm)", MWD = "MWD (mm)", "R0.25" = "R0.25 (%)")
L <- function(v) ifelse(v %in% names(lab), lab[v], v)

## ---- 2. 通用柱状图函数 -----------------------------------------------------------
theme_pub <- function() theme_bw(base_size = fs, base_family = "Times New Roman") +
  theme(panel.grid = element_blank(), strip.background = element_rect(fill = "grey92", colour = NA),
        strip.text = element_text(size = fs), legend.position = "none", axis.title.x = element_blank())

bar_block <- function(vars, ncol = 3, unit_in_strip = TRUE) {
  ms <- dat %>% select(GroupL, all_of(vars)) %>% pivot_longer(-GroupL, names_to = "Var", values_to = "y") %>%
    group_by(Var, GroupL) %>% summarise(m = mean(y, na.rm = TRUE), se = sd(y, na.rm = TRUE) / sqrt(sum(!is.na(y))), .groups = "drop")
  # 字母: 从 difference_analysis_all.csv 的组单元格末尾取
  let <- diff %>% filter(Var %in% vars) %>% select(Var, all_of(grp_lv)) %>%
    pivot_longer(-Var, names_to = "G", values_to = "cell") %>%
    mutate(GroupL = factor(group_labels[G], levels = group_labels), letter = sub(".*\\s", "", cell),
           letter = ifelse(grepl("^[a-z]+$", letter), letter, ""))
  ms <- left_join(ms, let[, c("Var", "GroupL", "letter")], by = c("Var", "GroupL")) %>%
    group_by(Var) %>% mutate(ytxt = m + se + 0.06 * max(m + se, na.rm = TRUE)) %>% ungroup() %>%
    mutate(Var = factor(L(Var), levels = L(vars)))
  ggplot(ms, aes(GroupL, m, fill = GroupL)) +
    geom_col(width = 0.65, colour = "black", linewidth = 0.3) +
    geom_errorbar(aes(ymin = m - se, ymax = m + se), width = 0.25, linewidth = 0.4) +
    geom_text(aes(y = ytxt, label = letter), size = fs / .pt, family = "Times New Roman") +
    facet_wrap(~Var, scales = "free_y", ncol = ncol) +
    scale_fill_manual(values = grp_col) +
    scale_y_continuous(expand = expansion(mult = c(0, 0.12))) +
    labs(y = NULL) + theme_pub()
}
save_fig <- function(p, name, w, h) {
  ggsave(file.path(out_dir, paste0(name, ".pdf")), p, width = w, height = h, units = "cm")
  ggsave(file.path(out_dir, paste0(name, ".png")), p, width = w, height = h, units = "cm", dpi = 300)
}

## ---- 3. 各类指标柱状图 ---------------------------------------------------------------
save_fig(bar_block(blocks[["1_土壤养分与理化"]], 3), "Fig_bar_1_养分理化", 17, 15)
save_fig(bar_block(blocks[["2_碳组分与稳定性"]][1:6], 3), "Fig_bar_2_碳组分", 17, 10)
save_fig(bar_block(blocks[["3_微生物残体_微生物源碳"]], 4), "Fig_bar_3_微生物残体", 17, 10)
ph <- blocks[["4_木质素酚_植物源碳"]]
save_fig(bar_block(ph[1:9], 3), "Fig_bar_4a_木质素酚单体", 17, 15)
save_fig(bar_block(ph[10:19], 4), "Fig_bar_4b_木质素酚分族与比值", 17, 14)
save_fig(bar_block(blocks[["5_酶活性与养分限制"]], 3), "Fig_bar_5a_酶活性", 17, 15)
save_fig(bar_block(blocks[["6_团聚体稳定性"]], 3), "Fig_bar_6a_团聚体", 17, 10)
bac <- blocks[["7_细菌群落"]]; fun <- blocks[["8_真菌群落"]]
save_fig(bar_block(bac[1:11], 4), "Fig_bar_7b_细菌门丰度", 17, 14)
save_fig(bar_block(bac[12:17], 3), "Fig_bar_7c_细菌alpha多样性", 17, 10)
save_fig(bar_block(fun[1:7], 4), "Fig_bar_8b_真菌门丰度", 17, 10)
save_fig(bar_block(fun[8:12], 3), "Fig_bar_8c_真菌alpha多样性", 17, 10)

## ---- 4. 酶计量散点图 (Moorhead et al. 2016) ------------------------------------------------
p_enz <- ggplot(dat, aes(EEA_CP, EEA_CN, colour = GroupL, shape = GroupL)) +
  geom_abline(slope = 1, intercept = 0, linetype = 2, colour = "grey50") +
  geom_point(size = 2.5) +
  scale_colour_manual(values = grp_col) +
  labs(x = "ln(βG)/ln(ACP)", y = "ln(βG)/ln(NAG+LAP)", colour = NULL, shape = NULL) +
  theme_bw(base_size = fs, base_family = "Times New Roman") + theme(panel.grid = element_blank(), legend.position = "right")
p_vec <- ggplot(dat, aes(Vector_length, Vector_angle, colour = GroupL, shape = GroupL)) +
  geom_hline(yintercept = 45, linetype = 2, colour = "grey50") +
  geom_point(size = 2.5) + scale_colour_manual(values = grp_col) +
  labs(x = "Vector length (C limitation)", y = "Vector angle (°; >45 = P limitation)", colour = NULL, shape = NULL) +
  theme_bw(base_size = fs, base_family = "Times New Roman") + theme(panel.grid = element_blank(), legend.position = "right")
save_fig(p_enz + p_vec + plot_layout(guides = "collect") & theme(legend.position = "bottom"), "Fig_5b_酶计量与向量", 17, 8.5)

## ---- 5. 组成堆叠图 (团聚体粒级 / 细菌门 / 真菌门), 按样品 -----------------------------------
stack_plot <- function(vars, title_y, pal) {
  d <- dat %>% select(ID, GroupL, all_of(vars)) %>% pivot_longer(-c(ID, GroupL), names_to = "Taxon", values_to = "v") %>%
    mutate(Taxon = factor(L(Taxon), levels = L(vars)), ID = factor(ID, levels = dat$ID))
  ggplot(d, aes(ID, v, fill = Taxon)) + geom_col(width = 0.8, colour = "white", linewidth = 0.2) +
    facet_grid(~GroupL, scales = "free_x", space = "free_x") +
    scale_fill_manual(values = pal) + scale_y_continuous(expand = c(0, 0)) +
    labs(y = title_y, fill = NULL) +
    theme_bw(base_size = fs, base_family = "Times New Roman") +
    theme(panel.grid = element_blank(), axis.title.x = element_blank(), axis.text.x = element_text(angle = 90, vjust = 0.5),
          strip.background = element_rect(fill = "grey92", colour = NA), legend.position = "right", legend.key.size = grid::unit(0.4, "cm"))
}
pal12 <- c("#0077BB", "#33BBEE", "#009988", "#EE7733", "#CC3311", "#EE3377", "#BBBBBB", "#882255", "#44AA99", "#DDCC77", "#999933", "#332288")
save_fig(stack_plot(blocks[["6_团聚体稳定性"]][1:3], "Aggregate fraction (%)", pal12[c(1, 4, 7)]), "Fig_6b_团聚体粒级组成", 17, 8)
save_fig(stack_plot(bac[1:11], "Relative abundance (%)", pal12[1:11]), "Fig_7a_细菌门组成", 17, 9)
save_fig(stack_plot(fun[1:7], "Relative abundance (%)", pal12[1:7]), "Fig_8a_真菌门组成", 17, 9)

## ---- 6. NMDS (细菌 / 真菌), 用原表的 MDS1/MDS2 --------------------------------------------
nmds_plot <- function(x, y, ttl) {
  d <- data.frame(x = dat[[x]], y = dat[[y]], GroupL = dat$GroupL)
  hull <- d %>% group_by(GroupL) %>% slice(chull(x, y))
  ggplot(d, aes(x, y, colour = GroupL, fill = GroupL, shape = GroupL)) +
    geom_polygon(data = hull, alpha = 0.15, colour = NA) +
    geom_hline(yintercept = 0, linetype = 3, colour = "grey60") + geom_vline(xintercept = 0, linetype = 3, colour = "grey60") +
    geom_point(size = 2.5) + scale_colour_manual(values = grp_col) + scale_fill_manual(values = grp_col) +
    labs(x = "NMDS1", y = "NMDS2", title = ttl, colour = NULL, fill = NULL, shape = NULL) +
    theme_bw(base_size = fs, base_family = "Times New Roman") +
    theme(panel.grid = element_blank(), plot.title = element_text(size = fs, hjust = 0.5))
}
save_fig(nmds_plot("B_MDS1", "B_MDS2", "Bacteria") + nmds_plot("F_MDS1", "F_MDS2", "Fungi") +
           plot_layout(guides = "collect") & theme(legend.position = "bottom"), "Fig_7d_8d_NMDS", 17, 9)

cat("完成. 图保存在:", out_dir, "\n")
